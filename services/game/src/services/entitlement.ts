import { SubscriptionTier } from '@memory-game/shared';

/**
 * Plan rules shared by every payment source (Stripe, Apple, Google, admin grants).
 *
 * One record per user. Each source owns one entry in `sources` and only ever
 * writes that entry. The user's tier is derived from all entries, so an event
 * from one source can never remove a plan paid through another.
 *
 * Pure functions only: no I/O, so the rules are unit-testable.
 */

export type PlanSource = 'stripe' | 'apple' | 'google' | 'manual';

/**
 * ACTIVE     paid and renewing
 * CANCELLED  will not renew, but paid until expiresAt
 * GRACE      renewal payment failing, store is retrying; access until expiresAt
 * EXPIRED    period over
 * REVOKED    refunded or revoked; access ends immediately
 */
export type SourceStatus = 'ACTIVE' | 'CANCELLED' | 'GRACE' | 'EXPIRED' | 'REVOKED';

export interface SourceEntry {
  tier: SubscriptionTier;
  status: SourceStatus;
  /** ISO time. Missing means no expiry (admin grants, and legacy records until backfilled). */
  expiresAt?: string;
  /** Stripe subscription id, Apple originalTransactionId, Google purchase token. */
  externalId?: string;
  /** Stripe customer id. */
  customerId?: string;
  /** Store product id (Apple, Google). */
  productId?: string;
  /** Apple: Production or Sandbox. */
  environment?: string;
  /** Whether the source will renew at expiresAt. */
  willRenew?: boolean;
  /** ISO time of the newest event applied. Used to drop stale events. */
  lastEventAt: string;
  /** Id of the newest event applied. Used to drop duplicates. */
  lastEventId: string;
}

export interface PlanRecord {
  userId: string;
  sources?: Partial<Record<PlanSource, SourceEntry>>;
  /** Optimistic-lock counter for conditional writes. */
  version?: number;

  // Derived and legacy top-level fields. Kept in sync on every write so old
  // readers (admin stats, Stripe portal, GSIs) keep working.
  tier?: SubscriptionTier | string;
  status?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  effectiveDate?: string;
  startDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlanEvent {
  userId: string;
  source: PlanSource;
  tier: SubscriptionTier;
  status: SourceStatus;
  expiresAt?: Date;
  externalId?: string;
  customerId?: string;
  productId?: string;
  environment?: string;
  willRenew?: boolean;
  /** When the provider says the event happened. */
  eventAt: Date;
  /** Provider event id (Stripe event id, Apple notificationUUID, ...). */
  eventId: string;
}

export const DEFAULT_GRACE_MS = 24 * 60 * 60 * 1000;

const TIER_RANK: Record<string, number> = {
  [SubscriptionTier.Free]: 0,
  [SubscriptionTier.Light]: 1,
  [SubscriptionTier.Standard]: 2,
  [SubscriptionTier.Premium]: 3,
};

const SOURCE_ORDER: PlanSource[] = ['stripe', 'apple', 'google', 'manual'];

export function tierRank(tier: string | undefined): number {
  return TIER_RANK[tier ?? ''] ?? 0;
}

export function toTier(value: string | undefined): SubscriptionTier {
  switch ((value ?? '').toUpperCase()) {
    case 'LIGHT':
      return SubscriptionTier.Light;
    case 'STANDARD':
      return SubscriptionTier.Standard;
    case 'PREMIUM':
      return SubscriptionTier.Premium;
    default:
      return SubscriptionTier.Free;
  }
}

/**
 * The record's sources. Records written before this change have no `sources`
 * map; they are read as one entry with no expiry, which is exactly how they
 * behaved before (active while status is ACTIVE). The backfill script replaces
 * them with real data from Stripe.
 */
export function sourcesOf(record: PlanRecord | null | undefined): Partial<Record<PlanSource, SourceEntry>> {
  if (!record) return {};
  if (record.sources) return record.sources;

  const legacyActive = record.status === 'ACTIVE';
  const entry: SourceEntry = {
    tier: toTier(record.tier as string),
    status: legacyActive ? 'ACTIVE' : 'EXPIRED',
    lastEventAt: record.updatedAt ?? new Date(0).toISOString(),
    lastEventId: 'legacy',
  };
  if (record.stripeSubscriptionId) {
    return {
      stripe: {
        ...entry,
        externalId: record.stripeSubscriptionId,
        customerId: record.stripeCustomerId,
      },
    };
  }
  return { manual: entry };
}

/** Whether one source currently grants its tier. */
export function entryGrantsAccess(entry: SourceEntry | undefined, now: Date, graceMs = DEFAULT_GRACE_MS): boolean {
  if (!entry) return false;
  if (entry.status === 'EXPIRED' || entry.status === 'REVOKED') return false;
  if (!entry.expiresAt) return true;
  const end = Date.parse(entry.expiresAt);
  if (Number.isNaN(end)) return false;
  return now.getTime() < end + graceMs;
}

export interface EffectivePlan {
  tier: SubscriptionTier;
  /** The source giving that tier, or null when FREE. */
  source: PlanSource | null;
  entry: SourceEntry | null;
}

/** Highest tier among the sources that currently grant access. */
export function effectivePlan(
  record: PlanRecord | null | undefined,
  now: Date = new Date(),
  graceMs = DEFAULT_GRACE_MS
): EffectivePlan {
  const sources = sourcesOf(record);
  let best: EffectivePlan = { tier: SubscriptionTier.Free, source: null, entry: null };
  for (const name of SOURCE_ORDER) {
    const entry = sources[name];
    if (!entryGrantsAccess(entry, now, graceMs)) continue;
    if (tierRank(entry!.tier) > tierRank(best.tier)) {
      best = { tier: entry!.tier, source: name, entry: entry! };
    }
  }
  return best;
}

/** A paid plan that is not from `except` and currently grants access. */
export function otherPaidSource(
  record: PlanRecord | null | undefined,
  except: PlanSource,
  now: Date = new Date()
): PlanSource | null {
  const sources = sourcesOf(record);
  for (const name of SOURCE_ORDER) {
    if (name === except || name === 'manual') continue;
    const entry = sources[name];
    if (entry && entry.tier !== SubscriptionTier.Free && entryGrantsAccess(entry, now)) return name;
  }
  return null;
}

export type ApplyResult =
  | { changed: true; record: PlanRecord }
  | { changed: false; reason: 'duplicate' | 'stale' | 'old-subscription' };

const TERMINAL: SourceStatus[] = ['EXPIRED', 'REVOKED'];

/**
 * Apply one provider event to a record. Returns the new record, or why the
 * event was ignored. Never touches other sources.
 */
export function applyPlanEvent(
  current: PlanRecord | null,
  event: PlanEvent,
  now: Date = new Date()
): ApplyResult {
  const sources = { ...sourcesOf(current) };
  const existing = sources[event.source];

  if (existing) {
    if (existing.lastEventId === event.eventId) {
      return { changed: false, reason: 'duplicate' };
    }
    // Ending an old subscription must not end its replacement. Stripe upgrades
    // through Checkout cancel the previous subscription, which then sends a
    // "deleted" event for an id we no longer track.
    if (
      existing.externalId &&
      event.externalId &&
      existing.externalId !== event.externalId &&
      TERMINAL.includes(event.status) &&
      !TERMINAL.includes(existing.status)
    ) {
      return { changed: false, reason: 'old-subscription' };
    }
    if (Date.parse(existing.lastEventAt) > event.eventAt.getTime()) {
      return { changed: false, reason: 'stale' };
    }
  }

  const entry: SourceEntry = {
    tier: event.tier,
    status: event.status,
    lastEventAt: event.eventAt.toISOString(),
    lastEventId: event.eventId,
  };
  if (event.expiresAt) entry.expiresAt = event.expiresAt.toISOString();
  const externalId = event.externalId ?? existing?.externalId;
  if (externalId) entry.externalId = externalId;
  const customerId = event.customerId ?? existing?.customerId;
  if (customerId) entry.customerId = customerId;
  const productId = event.productId ?? existing?.productId;
  if (productId) entry.productId = productId;
  const environment = event.environment ?? existing?.environment;
  if (environment) entry.environment = environment;
  if (event.willRenew !== undefined) entry.willRenew = event.willRenew;

  sources[event.source] = entry;
  return { changed: true, record: withDerivedFields(current, event.userId, sources, now) };
}

/** Rebuild the top-level fields from `sources`. */
export function withDerivedFields(
  current: PlanRecord | null,
  userId: string,
  sources: Partial<Record<PlanSource, SourceEntry>>,
  now: Date = new Date()
): PlanRecord {
  const nowIso = now.toISOString();
  const draft: PlanRecord = {
    ...(current ?? {}),
    userId,
    sources,
    version: (current?.version ?? 0) + 1,
    startDate: current?.startDate ?? nowIso,
    createdAt: current?.createdAt ?? nowIso,
    updatedAt: nowIso,
  };
  const plan = effectivePlan(draft, now);
  draft.tier = plan.tier;
  draft.status = plan.tier === SubscriptionTier.Free ? 'INACTIVE' : 'ACTIVE';
  draft.effectiveDate = current?.effectiveDate ?? nowIso;

  const stripe = sources.stripe;
  if (stripe?.customerId) draft.stripeCustomerId = stripe.customerId;
  if (stripe?.externalId) draft.stripeSubscriptionId = stripe.externalId;

  if (plan.entry?.expiresAt) {
    draft.currentPeriodEnd = plan.entry.expiresAt;
  } else {
    delete draft.currentPeriodEnd;
  }
  return draft;
}

/** Map a Stripe subscription status to a source status. */
export function stripeStatus(status: string, cancelAtPeriodEnd: boolean): SourceStatus {
  switch (status) {
    case 'active':
    case 'trialing':
      return cancelAtPeriodEnd ? 'CANCELLED' : 'ACTIVE';
    case 'past_due':
      return 'GRACE';
    default:
      // canceled, unpaid, incomplete, incomplete_expired, paused
      return 'EXPIRED';
  }
}
