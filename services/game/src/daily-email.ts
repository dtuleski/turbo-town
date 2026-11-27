/**
 * Daily Email Digest Lambda (DashDen-DailyEmail-<stage>, handler dist/daily-email.handler)
 * Sends personalized email digests to opted-in users via Resend.
 *
 * Runs every 15 minutes (N1): each run sends what is due in each user's local time. The digest email
 * and the digest push at 8am local, the challenge push at 12pm local, each at most once per local
 * date (claims on the email-prefs item). Push and the challenge section stay off until their table
 * and secret env vars are set.
 */

import https from 'https';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { SNSClient } from '@aws-sdk/client-sns';
import { addDays, challengeDayOf } from '@memory-game/shared';
import type { ChallengeLanguage } from '@memory-game/shared';
import { EmailPrefsService } from './services/email-prefs.service';
import type { SendKind } from './services/email-prefs.service';
import { ChallengeService, createChallengeService } from './services/challenge.service';
import { PushDeviceRepository } from './repositories/push-device.repository';
import type { PushDevice } from './repositories/push-device.repository';
import type { StoredChallenge } from './repositories/challenge.repository';
import type { ChallengeMyEntry } from './types/challenge';
import { dueSends, resolveLanguage, resolveTimeZone } from './notifications/due';
import type { DueSends } from './notifications/due';
import { pushText } from './notifications/texts';
import { challengeSectionHtml } from './notifications/challenge-section';
import type { DayResults } from './notifications/challenge-section';
import { loadApnsConfig } from './notifications/apns-config';
import type { ApnsConfig } from './notifications/apns-config';
import { PushSender, mapWithConcurrency } from './notifications/push-sender';
import type { PushMessage, PushResult } from './notifications/push-sender';
import { logger } from './utils/logger';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' }));

const EMAIL_PREFS_TABLE = process.env.EMAIL_PREFS_TABLE_NAME || 'memory-game-email-prefs-prod';
const LEADERBOARD_TABLE = process.env.LEADERBOARD_TABLE_NAME || 'memory-game-leaderboard-entries-prod';
const AGGREGATES_TABLE = process.env.AGGREGATES_TABLE_NAME || 'memory-game-user-aggregates-prod';
const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const FROM_EMAIL = 'DashDen <admin@dashden.app>';
const APP_URL = 'https://dashden.app';

async function sendViaResend(to: string, subject: string, html: string): Promise<void> {
  const body = JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html });
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.resend.com',
      path: '/emails',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) resolve();
        else reject(new Error(`Resend error ${res.statusCode}: ${data}`));
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

const ALL_GAMES = [
  'MEMORY_MATCH', 'MATH_CHALLENGE', 'WORD_PUZZLE', 'LANGUAGE_LEARNING',
  'SUDOKU', 'JIGSAW_PUZZLE', 'BUBBLE_POP', 'SEQUENCE_MEMORY', 'CODE_A_BOT',
  'GEO_QUIZ', 'HISTORY_QUIZ', 'CIVICS_QUIZ', 'HANGMAN', 'TIC_TAC_TOE',
  'MATH_MAZE', 'PATTERN_RECALL', 'SPACE_ENTRY',
];

const GAME_NAMES: Record<string, string> = {
  MEMORY_MATCH: '🃏 Memory Match', MATH_CHALLENGE: '🧮 Math Challenge',
  WORD_PUZZLE: '🔤 Word Puzzle', LANGUAGE_LEARNING: '🌍 Language Learning',
  SUDOKU: '9️⃣ Sudoku', JIGSAW_PUZZLE: '🧩 Jigsaw Puzzle',
  BUBBLE_POP: '🫧 Bubble Pop', SEQUENCE_MEMORY: '🧠 Sequence Memory',
  CODE_A_BOT: '🤖 Code-a-Bot', GEO_QUIZ: '🌍 Geo Quiz',
  HISTORY_QUIZ: '📜 History Quiz', CIVICS_QUIZ: '🇺🇸 Civics Quiz',
  HANGMAN: '🪢 Hangman', TIC_TAC_TOE: '❌ Tic Tac Toe',
  MATH_MAZE: '🧮 Math Maze', PATTERN_RECALL: '🧩 Pattern Recall',
  SPACE_ENTRY: '🚀 Space Entry',
};

interface EmailPrefs { userId: string; email: string; username: string; dailyDigest: boolean }
/** An opted-in prefs item as scanned: the toggle fields plus locale and send claims (DC1). */
export interface DigestUser extends EmailPrefs {
  updatedAt?: string;
  timeZone?: string;
  language?: string;
  lastDigestEmailOn?: string;
  lastDigestPushOn?: string;
  lastChallengePushOn?: string;
}
interface LeaderboardEntry { userId: string; username: string; score: number; gameType: string; date: string }
interface Aggregate { userId: string; gameType: string; username: string; bestScore: number; gamesPlayed: number }

/** Push sends in flight at once (NFR-DC-4). */
export const PUSH_CONCURRENCY = 10;
/** A run stops starting new sends this long before the Lambda timeout; the next run continues. */
export const STOP_MARGIN_MS = 30_000;

/** Data shared by every digest of a run, loaded once (existing digest content). */
export interface DigestData {
  recentEntries: LeaderboardEntry[];
  bestByUser: Map<string, LeaderboardEntry>;
  topToday: LeaderboardEntry[];
  rankedToday: LeaderboardEntry[];
  allAggregates: Aggregate[];
}

type ChallengeDeps = Pick<ChallengeService, 'ensureChallenge' | 'getDayResults' | 'getMyEntry' | 'hasPlayed'>;

export interface TickDeps {
  /** Opted-in prefs items (`dailyDigest = true`); a failure fails the run. */
  scanOptedInUsers(): Promise<DigestUser[]>;
  loadDigestData(now: Date): Promise<DigestData>;
  claims: {
    claimSend(userId: string, kind: SendKind, localDate: string): Promise<boolean>;
    releaseSend(userId: string, kind: SendKind, localDate: string): Promise<void>;
  };
  /** Absent when DAILY_CHALLENGE_TABLE_NAME is unset. */
  challenge?: ChallengeDeps;
  /** Absent when PUSH_DEVICES_TABLE_NAME is unset. */
  listDevices?: () => Promise<PushDevice[]>;
  loadApnsConfig(): Promise<ApnsConfig | null>;
  createPushSender(config: ApnsConfig): { send(device: PushDevice, message: PushMessage): Promise<PushResult> };
  sendEmail(to: string, subject: string, html: string): Promise<void>;
  /** True when the run is close to its timeout. */
  shouldStop?: () => boolean;
}

export interface SendCounts { sent: number; failed: number; skipped: number }
export interface TickSummary {
  users: number;
  due: { digestEmail: number; digestPush: number; challengePush: number };
  digestEmail: SendCounts;
  digestPush: SendCounts;
  challengePush: SendCounts;
  devicesRemoved: number;
  apns: 'on' | 'off' | 'unused';
  challenge: 'ok' | 'failed' | 'off';
  stopped: boolean;
}

const counts = (): SendCounts => ({ sent: 0, failed: 0, skipped: 0 });
const errName = (error: unknown) => (error as Error)?.name ?? 'Error';

/** Opted-in users, every page (the filter is the same as before: toggle off means nothing is sent). */
async function scanOptedIn(): Promise<DigestUser[]> {
  const users: DigestUser[] = [];
  let start: Record<string, unknown> | undefined;
  do {
    const page = await ddb.send(new ScanCommand({
      TableName: EMAIL_PREFS_TABLE,
      FilterExpression: 'dailyDigest = :yes',
      ExpressionAttributeValues: { ':yes': true },
      ExclusiveStartKey: start,
    }));
    users.push(...((page.Items || []) as DigestUser[]));
    start = page.LastEvaluatedKey;
  } while (start);
  return users;
}

/** Deduplicate by email — keep the most recently updated record per address. */
export function dedupeByEmail(allUsers: DigestUser[]): DigestUser[] {
  const usersByEmail = new Map<string, DigestUser>();
  for (const u of allUsers) {
    if (!u.email) continue;
    const existing = usersByEmail.get(u.email);
    if (!existing || (u as any).updatedAt > (existing as any).updatedAt) {
      usersByEmail.set(u.email, u);
    }
  }
  return Array.from(usersByEmail.values());
}

async function loadDigestData(now: Date): Promise<DigestData> {
  // Get yesterday's entries (email fires in the morning, so we report on the previous day)
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const today = now.toISOString().split('T')[0];
  const entriesResult = await ddb.send(new ScanCommand({ TableName: LEADERBOARD_TABLE, Limit: 500 }));
  const allEntries = (entriesResult.Items || []) as LeaderboardEntry[];
  // Include both yesterday and today to catch games across timezone boundaries
  const recentEntries = allEntries.filter(e => e.date === yesterday || e.date === today);
  // One entry per user — their highest score of the day across all games
  const bestByUser = new Map<string, LeaderboardEntry>();
  for (const entry of recentEntries) {
    const existing = bestByUser.get(entry.userId);
    if (!existing || entry.score > existing.score) {
      bestByUser.set(entry.userId, entry);
    }
  }
  const topToday = Array.from(bestByUser.values())
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 5);

  // Get all aggregates (for personal stats)
  const aggResult = await ddb.send(new ScanCommand({ TableName: AGGREGATES_TABLE, Limit: 1000 }));
  const allAggregates = (aggResult.Items || []) as Aggregate[];

  // Full ranked list (one per user, sorted by score desc)
  const rankedToday = Array.from(bestByUser.values())
    .sort((a, b) => (b.score || 0) - (a.score || 0));
  return { recentEntries, bestByUser, topToday, rankedToday, allAggregates };
}

/** The personal nudges of one user's digest (unchanged content). */
export function buildPersonalInfo(user: EmailPrefs, data: DigestData): PersonalInfo {
  const { recentEntries, bestByUser, rankedToday, allAggregates } = data;
  // Personal stats
  const userAggs = allAggregates.filter(a => a.userId === user.userId);
  const gamesPlayed = userAggs.map(a => a.gameType);
  const gamesNotPlayed = ALL_GAMES.filter(g => !gamesPlayed.includes(g));
  const userTodayEntries = recentEntries.filter(e => e.userId === user.userId);
  const todayGamesCount = userTodayEntries.length;

  // User's rank today
  let rankInfo = '';
  if (bestByUser.size > 0) {
    const userBestToday = userTodayEntries.sort((a, b) => b.score - a.score)[0];
    if (userBestToday) {
      const rank = Array.from(bestByUser.values()).filter(e => e.score > userBestToday.score).length + 1;
      const leader = rankedToday[0];
      if (rank === 1) {
        rankInfo = "🥇 You're #1 today! Can you hold the top spot?";
      } else if (leader) {
        const gap = leader.score - userBestToday.score;
        rankInfo = `📊 You're #${rank} today — just ${gap.toLocaleString()} points behind ${leader.username}!`;
      }
    }
  }

  // Someone beat their high score?
  let beatInfo = '';
  for (const agg of userAggs) {
    const othersInGame = allAggregates.filter(a => a.gameType === agg.gameType && a.userId !== user.userId && a.bestScore > agg.bestScore);
    if (othersInGame.length > 0) {
      const top = othersInGame.sort((a, b) => b.bestScore - a.bestScore)[0];
      beatInfo = `⚡ ${top.username} has a higher score than you in ${GAME_NAMES[agg.gameType] || agg.gameType} — can you beat ${top.bestScore.toLocaleString()}?`;
      break;
    }
  }

  // Games not tried
  let tryInfo = '';
  if (gamesNotPlayed.length > 0) {
    const suggestions = gamesNotPlayed.slice(0, 3).map(g => GAME_NAMES[g] || g);
    tryInfo = `🆕 You haven't tried: ${suggestions.join(', ')}`;
  }

  // Activity status
  let activityInfo = '';
  if (todayGamesCount === 0) {
    activityInfo = "😴 You haven't played recently — jump in and climb the ranks!";
  } else {
    activityInfo = `🎮 You played ${todayGamesCount} game${todayGamesCount > 1 ? 's' : ''} recently — nice work!`;
  }
  return { rankInfo, beatInfo, tryInfo, activityInfo };
}

interface Plan {
  user: DigestUser;
  devices: PushDevice[];
  language: ChallengeLanguage;
  due: DueSends;
}

/**
 * One scheduler run (S5). Never throws for one user's or one device's failure; throws only when the
 * opted-in users cannot be read, so an EventBridge retry is safe (claims prevent duplicates).
 */
export async function runTick(deps: TickDeps, now: Date): Promise<TickSummary> {
  const summary: TickSummary = {
    users: 0,
    due: { digestEmail: 0, digestPush: 0, challengePush: 0 },
    digestEmail: counts(),
    digestPush: counts(),
    challengePush: counts(),
    devicesRemoved: 0,
    apns: 'unused',
    challenge: deps.challenge ? 'ok' : 'off',
    stopped: false,
  };
  const today = challengeDayOf(now);
  const yesterday = addDays(today, -1);

  // 1. Pre-draw today and tomorrow (Eastern days), so the day exists before anyone needs it.
  let todayChallenge: StoredChallenge | null = null;
  if (deps.challenge) {
    try {
      todayChallenge = await deps.challenge.ensureChallenge(today);
      await deps.challenge.ensureChallenge(addDays(today, 1));
    } catch (error) {
      summary.challenge = 'failed';
      logger.error('Daily challenge pre-draw failed', error as Error, { day: today });
    }
  }

  // 2. Opted-in users, one per email address.
  const users = dedupeByEmail((await deps.scanOptedInUsers()).filter((u) => u.dailyDigest === true));
  summary.users = users.length;
  if (users.length === 0) return logSummary(summary);

  // 3. Devices, grouped by user (also a time zone source).
  const devicesByUser = new Map<string, PushDevice[]>();
  if (deps.listDevices) {
    try {
      for (const d of await deps.listDevices()) {
        const list = devicesByUser.get(d.userId) ?? [];
        list.push(d);
        devicesByUser.set(d.userId, list);
      }
    } catch (error) {
      logger.warn('Push devices could not be read; push skipped this run', { error: errName(error) });
    }
  }

  // 4. What is due for whom.
  const plans: Plan[] = users.map((user) => {
    const devices = devicesByUser.get(user.userId) ?? [];
    const timeZone = resolveTimeZone(user.timeZone, devices);
    return { user, devices, language: resolveLanguage(user.language, devices), due: dueSends({ timeZone, claims: user }, now) };
  });
  const digestPlans = plans.filter((p) => p.due.digestEmail || (p.due.digestPush && p.devices.length > 0));
  const challengePlans = todayChallenge ? plans.filter((p) => p.due.challengePush && p.devices.length > 0) : [];
  summary.due.digestEmail = plans.filter((p) => p.due.digestEmail).length;
  summary.due.digestPush = digestPlans.filter((p) => p.due.digestPush && p.devices.length > 0).length;
  summary.due.challengePush = challengePlans.length;
  if (digestPlans.length === 0 && challengePlans.length === 0) return logSummary(summary);

  // 5. APNs, only when a push is due. Without it pushes are skipped and claims are not taken.
  let sender: ReturnType<TickDeps['createPushSender']> | null = null;
  if (summary.due.digestPush + summary.due.challengePush > 0) {
    const config = await deps.loadApnsConfig();
    summary.apns = config ? 'on' : 'off';
    sender = config ? deps.createPushSender(config) : null;
  }

  // 6. Shared digest data, once per run.
  let data: DigestData | null = null;
  let results: DayResults | null = null;
  if (digestPlans.length > 0) {
    if (summary.due.digestEmail > 0) {
      try {
        data = await deps.loadDigestData(now);
      } catch (error) {
        logger.error('Digest data could not be loaded; emails wait for the next run', error as Error);
      }
    }
    if (deps.challenge) {
      try {
        const r = await deps.challenge.getDayResults(yesterday);
        results = { day: yesterday, challenge: r.challenge, top: r.top };
      } catch (error) {
        logger.warn('Yesterday\'s challenge results could not be loaded', { day: yesterday, error: errName(error) });
      }
    }
  }

  const pushJobs: Array<() => Promise<void>> = [];
  const queuePush = (plan: Plan, kind: 'DigestPush' | 'ChallengePush', message: PushMessage, tally: SendCounts) => {
    pushJobs.push(async () => {
      if (!sender) return;
      if (deps.shouldStop?.()) {
        summary.stopped = true;
        return;
      }
      await sendPush(deps, sender, plan, kind, message, tally, summary);
    });
  };

  // 7. Digest email (sequential) and digest push (queued).
  for (const plan of digestPlans) {
    if (deps.shouldStop?.()) {
      summary.stopped = true;
      break;
    }
    const { user } = plan;
    let me: ChallengeMyEntry | null = null;
    if (results?.challenge && deps.challenge) {
      try {
        me = await deps.challenge.getMyEntry(yesterday, user.userId);
      } catch (error) {
        logger.warn('Own challenge result could not be loaded', { userId: user.userId, error: errName(error) });
      }
    }
    if (plan.due.digestEmail) {
      if (data) {
        await sendDigestEmail(deps, plan, data, challengeSectionHtml(results, me, plan.language), now, summary.digestEmail);
      } else {
        summary.digestEmail.failed++;
      }
    }
    if (plan.due.digestPush && plan.devices.length > 0) {
      if (!sender) {
        summary.digestPush.skipped++;
      } else {
        const text = pushText('digest', plan.language, {
          gameId: results?.challenge?.gameId,
          winner: results?.top[0]?.username || undefined,
          rank: me?.rank,
        });
        const route = results?.challenge ? `/challenge/results?day=${yesterday}` : '/';
        queuePush(plan, 'DigestPush', { ...text, route }, summary.digestPush);
      }
    }
  }

  // 8. Challenge push, to users who have not played today's challenge (FR-DC-22).
  if (todayChallenge && deps.challenge) {
    for (const plan of challengePlans) {
      if (!sender) {
        summary.challengePush.skipped++;
        continue;
      }
      if (deps.shouldStop?.()) {
        summary.stopped = true;
        break;
      }
      try {
        if (await deps.challenge.hasPlayed(today, plan.user.userId)) {
          summary.challengePush.skipped++;
          continue;
        }
      } catch (error) {
        logger.warn('Challenge play check failed', { userId: plan.user.userId, error: errName(error) });
        summary.challengePush.failed++;
        continue;
      }
      const text = pushText('challenge', plan.language, { gameId: todayChallenge.gameId });
      queuePush(plan, 'ChallengePush', { ...text, route: '/' }, summary.challengePush);
    }
  }

  // 9. Pushes, PUSH_CONCURRENCY users at a time.
  await mapWithConcurrency(pushJobs, PUSH_CONCURRENCY, (job) => job());
  return logSummary(summary);
}

async function sendDigestEmail(
  deps: TickDeps,
  plan: Plan,
  data: DigestData,
  challengeSection: string,
  now: Date,
  tally: SendCounts
): Promise<void> {
  const { user, due } = plan;
  let claimed = false;
  try {
    claimed = await deps.claims.claimSend(user.userId, 'DigestEmail', due.localDate);
    if (!claimed) {
      tally.skipped++;
      return;
    }
    const html = buildEmailHTML(user.username, data.topToday, buildPersonalInfo(user, data), user.userId, data.rankedToday, challengeSection);
    const subject = `🎮 DashDen Daily — ${now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: due.timeZone })}`;
    await deps.sendEmail(user.email, subject, html);
    tally.sent++;
  } catch (error) {
    tally.failed++;
    logger.warn('Digest email failed', { userId: user.userId, error: errName(error) });
    if (claimed) await release(deps, user.userId, 'DigestEmail', due.localDate);
  }
}

/** One user's push: claim, every device in turn, release when nothing was delivered. */
async function sendPush(
  deps: TickDeps,
  sender: ReturnType<TickDeps['createPushSender']>,
  plan: Plan,
  kind: 'DigestPush' | 'ChallengePush',
  message: PushMessage,
  tally: SendCounts,
  summary: TickSummary
): Promise<void> {
  const { user, devices, due } = plan;
  let claimed = false;
  try {
    claimed = await deps.claims.claimSend(user.userId, kind, due.localDate);
  } catch (error) {
    tally.failed++;
    logger.warn('Push claim failed', { userId: user.userId, kind, error: errName(error) });
    return;
  }
  if (!claimed) {
    tally.skipped++;
    return;
  }
  let delivered = 0;
  for (const device of devices) {
    let result: PushResult;
    try {
      result = await sender.send(device, message);
    } catch (error) {
      logger.warn('Push send threw', { userId: user.userId, kind, error: errName(error) });
      result = 'failed';
    }
    if (result === 'sent') delivered++;
    if (result === 'removed') summary.devicesRemoved++;
  }
  if (delivered > 0) {
    tally.sent++;
    return;
  }
  tally.failed++;
  await release(deps, user.userId, kind, due.localDate);
}

async function release(deps: TickDeps, userId: string, kind: SendKind, localDate: string): Promise<void> {
  try {
    await deps.claims.releaseSend(userId, kind, localDate);
  } catch (error) {
    logger.warn('Claim release failed', { userId, kind, error: errName(error) });
  }
}

/** One summary line per run (SECURITY-14): counts only. */
function logSummary(summary: TickSummary): TickSummary {
  logger.info('Daily tick', { ...summary });
  return summary;
}

function defaultDeps(shouldStop: () => boolean): TickDeps {
  const prefs = new EmailPrefsService(ddb as any, EMAIL_PREFS_TABLE);
  const challenge = createChallengeService(process.env);
  const devicesTable = process.env.PUSH_DEVICES_TABLE_NAME;
  const devices = devicesTable ? new PushDeviceRepository(undefined, devicesTable) : undefined;
  const sns = new SNSClient({});
  return {
    scanOptedInUsers: scanOptedIn,
    loadDigestData,
    claims: prefs,
    challenge,
    listDevices: devices ? () => devices.scanAll() : undefined,
    loadApnsConfig: devices ? loadApnsConfig : async () => null,
    createPushSender: (config) => new PushSender(sns, config, devices as PushDeviceRepository),
    sendEmail: sendViaResend,
    shouldStop,
  };
}

export async function handler(_event?: unknown, context?: { getRemainingTimeInMillis?: () => number }) {
  console.log('Daily email digest started');
  const started = Date.now();
  const budget = context?.getRemainingTimeInMillis ? context.getRemainingTimeInMillis() - STOP_MARGIN_MS : Infinity;
  try {
    const summary = await runTick(defaultDeps(() => Date.now() - started > budget), new Date());
    if (summary.users === 0) return { statusCode: 200, body: 'No users to email' };
    const { sent, failed } = summary.digestEmail;
    console.log(`Emails sent: ${sent}, failed: ${failed}`);
    return { statusCode: 200, body: `Sent ${sent} emails, ${failed} failed` };
  } catch (error) {
    console.error('Daily email digest failed:', error);
    throw error;
  }
}

export interface PersonalInfo { rankInfo: string; beatInfo: string; tryInfo: string; activityInfo: string }

export function buildEmailHTML(username: string, topScores: LeaderboardEntry[], personal: PersonalInfo, userId?: string, rankedToday?: LeaderboardEntry[], challengeSection = ''): string {
  // Build personalized leaderboard: top 3 + user's position if outside top 3
  let displayRows: Array<{ entry: LeaderboardEntry; rank: number; isUser: boolean }> = [];

  if (rankedToday && rankedToday.length > 0) {
    const userRank = userId ? rankedToday.findIndex(e => e.userId === userId) : -1;
    const top3 = rankedToday.slice(0, 3);

    // Always add top 3
    top3.forEach((entry, i) => {
      displayRows.push({ entry, rank: i + 1, isUser: entry.userId === userId });
    });

    // If user exists and is outside top 3, add their row
    if (userRank >= 3) {
      const userEntry = rankedToday[userRank];
      displayRows.push({ entry: userEntry, rank: userRank + 1, isUser: true });
    }
  } else {
    // Fallback to topScores if no ranked data
    topScores.slice(0, 3).forEach((entry, i) => {
      displayRows.push({ entry, rank: i + 1, isUser: false });
    });
  }

  const rankLabel = (rank: number) => rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;

  const leaderboardRows = displayRows.length > 0
    ? displayRows.map(({ entry, rank, isUser }) => `
        <tr style="${isUser ? 'background: #eff6ff;' : ''}">
          <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${rankLabel(rank)}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #eee; font-weight: bold;">${entry.username || 'Player'}${isUser ? ' 👈' : ''}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${GAME_NAMES[entry.gameType] || entry.gameType}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #eee; font-weight: bold; color: #6366f1;">${(entry.score || 0).toLocaleString()}</td>
        </tr>`).join('')
    : '<tr><td colspan="4" style="padding: 16px; text-align: center; color: #999;">No games played yet today — be the first!</td></tr>';

  // Build personal nudges section
  const nudges = [personal.activityInfo, personal.rankInfo, personal.beatInfo, personal.tryInfo]
    .filter(Boolean)
    .map(n => `<div style="padding: 8px 12px; background: #f9fafb; border-radius: 8px; margin-bottom: 6px; font-size: 14px; color: #374151;">${n}</div>`)
    .join('');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #6366f1, #ec4899); border-radius: 16px 16px 0 0; padding: 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">🎮 DashDen Daily</h1>
      <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0;">Your daily gaming digest</p>
    </div>
    <div style="background: white; padding: 32px; border-radius: 0 0 16px 16px;">
      <h2 style="margin: 0 0 16px; color: #1f2937;">Hey ${username}! 👋</h2>

      <!-- Personal Nudges -->
      ${nudges ? `<div style="margin-bottom: 20px;">${nudges}</div>` : ''}

      <!-- Leaderboard -->
      <h3 style="margin: 20px 0 12px; color: #1f2937;">🏆 Today's Top Players</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <thead>
          <tr style="background: #f9fafb;">
            <th style="padding: 8px 12px; text-align: left;">Rank</th>
            <th style="padding: 8px 12px; text-align: left;">Player</th>
            <th style="padding: 8px 12px; text-align: left;">Game</th>
            <th style="padding: 8px 12px; text-align: left;">Score</th>
          </tr>
        </thead>
        <tbody>${leaderboardRows}</tbody>
      </table>
${challengeSection}

      <!-- CTA -->
      <div style="text-align: center; margin: 32px 0 16px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
          <tr>
            <td style="border-radius: 12px; background: linear-gradient(135deg, #6366f1, #ec4899);">
              <a href="${APP_URL}/hub" target="_blank" style="display: block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 16px; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
                Play Now →
              </a>
            </td>
          </tr>
        </table>
      </div>

      <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">
        You're receiving this because you opted in to daily digests on DashDen.<br>
        <a href="${APP_URL}/profile" style="color: #6366f1;">Manage email preferences</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}
