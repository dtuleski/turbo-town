/**
 * One-time backfill: give every subscriptions record a `sources` map.
 *
 * - Records with a Stripe subscription: read the subscription from Stripe and
 *   store its real status and period end (the old code stored now + 30 days).
 * - Records without one (admin grants): become a `manual` source, no expiry.
 * - Records that already have `sources` are skipped.
 *
 * Dry run by default (reads only). `--apply` writes, each record guarded by a
 * condition on its current updatedAt, so a concurrent write makes it skip.
 *
 * Usage (from services/game):
 *   npx tsc -p scripts/tsconfig.backfill.json
 *   AWS_PROFILE=dashden-new node /tmp/backfill-plan-sources/scripts/backfill-plan-sources.js \
 *     --table memory-game-subscriptions-prod \
 *     --stripe-secret-arn <arn of the Stripe secret key>   [--apply]
 */
import Stripe from 'stripe';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import {
  PlanRecord,
  applyPlanEvent,
  effectivePlan,
  sourcesOf,
  withDerivedFields,
} from '../src/services/entitlement';
import { stripeSubscriptionToPlanEvent } from '../src/services/stripe.service';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const table = arg('table');
  const secretArn = arg('stripe-secret-arn');
  const apply = process.argv.includes('--apply');
  if (!table || !secretArn) {
    console.error('Required: --table <name> --stripe-secret-arn <arn>');
    process.exit(2);
  }
  const region = process.env.AWS_REGION || 'us-east-1';
  const doc = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));
  const secrets = new SecretsManagerClient({ region });
  const key = (await secrets.send(new GetSecretValueCommand({ SecretId: secretArn }))).SecretString ?? '';
  const stripe = new Stripe(key, { apiVersion: '2022-11-15' });

  const items: PlanRecord[] = [];
  let startKey: Record<string, unknown> | undefined;
  do {
    const page = await doc.send(new ScanCommand({ TableName: table, ExclusiveStartKey: startKey }));
    items.push(...((page.Items as PlanRecord[]) ?? []));
    startKey = page.LastEvaluatedKey;
  } while (startKey);

  const now = new Date();
  const rows: string[][] = [];
  let changed = 0;
  let written = 0;

  for (const item of items) {
    const user = `…${item.userId.slice(-6)}`;
    const before = `${item.tier}/${item.status}`;
    if (item.sources) {
      rows.push([user, before, 'skip (already migrated)', '', '']);
      continue;
    }

    let next: PlanRecord;
    let note = '';
    if (item.stripeSubscriptionId) {
      let sub: Stripe.Subscription | null = null;
      try {
        sub = await stripe.subscriptions.retrieve(item.stripeSubscriptionId);
      } catch (e: any) {
        note = `stripe lookup failed: ${e?.code ?? e?.message}`;
      }
      const legacy = { ...item, sources: sourcesOf(item) };
      if (sub) {
        const result = applyPlanEvent(
          legacy,
          stripeSubscriptionToPlanEvent(sub, {
            userId: item.userId,
            customerId: typeof sub.customer === 'string' ? sub.customer : sub.customer?.id,
            eventAt: now,
            eventId: 'backfill',
          }),
          now
        );
        next = result.changed ? result.record : withDerivedFields(item, item.userId, legacy.sources, now);
        note = note || `stripe ${sub.status}`;
      } else {
        // Unknown in Stripe: keep the current behaviour, flag for review.
        next = withDerivedFields(item, item.userId, legacy.sources, now);
        note += ' (kept as is)';
      }
    } else {
      next = withDerivedFields(item, item.userId, sourcesOf(item), now);
      note = 'admin grant';
    }

    const plan = effectivePlan(next, now);
    const after = `${next.tier}/${next.status}`;
    const lost = item.status === 'ACTIVE' && item.tier !== 'FREE' && plan.tier === 'FREE';
    rows.push([user, before, after + (lost ? '  <-- LOSES ACCESS' : ''), plan.entry?.expiresAt?.slice(0, 10) ?? 'no expiry', note]);
    changed++;

    if (apply) {
      try {
        await doc.send(
          new PutCommand({
            TableName: table,
            Item: next,
            ConditionExpression: 'attribute_not_exists(#v) AND #u = :u',
            ExpressionAttributeNames: { '#v': 'version', '#u': 'updatedAt' },
            ExpressionAttributeValues: { ':u': item.updatedAt },
          })
        );
        written++;
      } catch (e: any) {
        console.error(`write skipped for ${user}: ${e?.name}`);
      }
    }
  }

  console.log(['user', 'before', 'after', 'expires', 'note'].join(' | '));
  for (const r of rows) console.log(r.join(' | '));
  console.log(`\n${items.length} records, ${changed} to migrate, ${apply ? `${written} written` : 'dry run: nothing written'}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
