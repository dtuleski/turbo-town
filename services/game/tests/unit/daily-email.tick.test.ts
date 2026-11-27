jest.unmock('@aws-sdk/lib-dynamodb');
jest.unmock('@aws-sdk/client-dynamodb');
import { DynamoDBDocumentClient, GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { CLAIM_ATTRIBUTES } from '../../src/services/email-prefs.service';
import type { SendKind } from '../../src/services/email-prefs.service';
import type { PushDevice } from '../../src/repositories/push-device.repository';
import type { PushMessage, PushResult } from '../../src/notifications/push-sender';
import { buildEmailHTML, handler, runTick } from '../../src/daily-email';
import type { DigestData, DigestUser, TickDeps } from '../../src/daily-email';
const APP = 'arn:aws:sns:us-east-1:342278407349:app/APNS/dashden-ios-prod';
// 2026-11-27 is in US Eastern standard time (UTC-5): 8am ET = 13:00Z, noon ET = 17:00Z.
const AT_8_ET = new Date('2026-11-27T13:00:00Z');
const AT_NOON_ET = new Date('2026-11-27T17:00:00Z');
const challengeOf = (day: string, gameId = 'sudoku') => ({
  day, gameId, themeId: gameId.toUpperCase(), difficulty: 2, settings: {}, content: { kind: gameId } as any, createdAt: 'c',
});
const user = (userId: string, over: Partial<DigestUser> = {}): DigestUser => ({
  userId, email: `${userId}@example.com`, username: userId, dailyDigest: true, updatedAt: '2026-11-01T00:00:00Z', ...over,
});
const device = (userId: string, n = 1, over: Partial<PushDevice> = {}): PushDevice => ({
  deviceId: `${userId}-d${n}`, userId, platform: 'IOS', token: 'ab'.repeat(32), environment: 'production',
  createdAt: 'c', updatedAt: '2026-11-01T00:00:00Z', ...over,
});
const digestData = (): DigestData => {
  const entries = [
    { userId: 'alice', username: 'alice', score: 900, gameType: 'SUDOKU', date: '2026-11-26' },
    { userId: 'zed', username: 'zed', score: 1200, gameType: 'HANGMAN', date: '2026-11-26' },
  ];
  const bestByUser = new Map(entries.map((e) => [e.userId, e]));
  const ranked = [...entries].sort((a, b) => b.score - a.score);
  return {
    recentEntries: entries,
    bestByUser,
    topToday: ranked.slice(0, 5),
    rankedToday: ranked,
    allAggregates: [
      { userId: 'alice', gameType: 'SUDOKU', username: 'alice', bestScore: 900, gamesPlayed: 3 },
      { userId: 'zed', gameType: 'SUDOKU', username: 'zed', bestScore: 1500, gamesPlayed: 5 },
    ],
  };
};
/** In-memory world: prefs items with real claim semantics, devices, challenge, email and push logs. */
function world(opts: {
  users: DigestUser[];
  devices?: PushDevice[];
  apns?: boolean;
  played?: string[];
  challenge?: 'on' | 'off' | 'failing';
  failEmailFor?: string[];
  pushResult?: (device: PushDevice) => PushResult | Promise<PushResult>;
}) {
  const prefs = new Map(opts.users.map((u) => [u.userId, { ...u }]));
  const emails: { to: string; subject: string; html: string }[] = [];
  const pushes: { device: PushDevice; message: PushMessage }[] = [];
  const ensured: string[] = [];
  const claimCalls: string[] = [];
  const results = {
    challenge: challengeOf('2026-11-26', 'sudoku'),
    top: [
      { day: '2026-11-26', userId: 'zed', username: 'zed', bestScore: 1500, achievedAt: 't', rankKey: 'a' },
      { day: '2026-11-26', userId: 'alice', username: 'alice', bestScore: 900, achievedAt: 't', rankKey: 'b' },
    ],
    me: null,
  };
  const challenge = {
    ensureChallenge: jest.fn(async (day: string) => {
      if (opts.challenge === 'failing') throw new Error('table down');
      ensured.push(day);
      return challengeOf(day, 'hangman');
    }),
    getDayResults: jest.fn(async () => results),
    getMyEntry: jest.fn(async (_day: string, userId: string) => (userId === 'alice' ? { bestScore: 900, rank: 2, achievedAt: 't' } : null)),
    hasPlayed: jest.fn(async (_day: string, userId: string) => (opts.played ?? []).includes(userId)),
  };
  const deps: TickDeps = {
    scanOptedInUsers: jest.fn(async () => [...prefs.values()].map((u) => ({ ...u }))),
    loadDigestData: jest.fn(async () => digestData()),
    claims: {
      claimSend: jest.fn(async (userId: string, kind: SendKind, date: string) => {
        claimCalls.push(`${kind}:${userId}`);
        const item = prefs.get(userId) as any;
        if (!item || item[CLAIM_ATTRIBUTES[kind]] === date) return false;
        item[CLAIM_ATTRIBUTES[kind]] = date;
        return true;
      }),
      releaseSend: jest.fn(async (userId: string, kind: SendKind, date: string) => {
        const item = prefs.get(userId) as any;
        if (item?.[CLAIM_ATTRIBUTES[kind]] === date) delete item[CLAIM_ATTRIBUTES[kind]];
      }),
    },
    challenge: opts.challenge === 'off' ? undefined : challenge,
    listDevices: jest.fn(async () => opts.devices ?? []),
    loadApnsConfig: jest.fn(async () => (opts.apns === false ? null : { platformApplicationArn: APP })),
    createPushSender: jest.fn(() => ({
      send: jest.fn(async (d: PushDevice, message: PushMessage) => {
        const r = opts.pushResult ? await opts.pushResult(d) : 'sent';
        if (r === 'sent') pushes.push({ device: d, message });
        return r;
      }),
    })),
    sendEmail: jest.fn(async (to: string, subject: string, html: string) => {
      if ((opts.failEmailFor ?? []).includes(to)) throw new Error('Resend error 500');
      emails.push({ to, subject, html });
    }),
  };
  return { deps, prefs, emails, pushes, ensured, challenge, claimCalls };
}
describe('runTick: digest at 8am local', () => {
  it('sends nothing at 7:59 and the digest email and push at 8:00 (unknown zone = America/New_York)', async () => {
    const w = world({ users: [user('alice')], devices: [device('alice')] });
    const early = await runTick(w.deps, new Date('2026-11-27T12:59:00Z'));
    expect(early.due).toEqual({ digestEmail: 0, digestPush: 0, challengePush: 0 });
    expect(w.emails).toHaveLength(0);
    expect(w.deps.loadDigestData).not.toHaveBeenCalled();
    const s = await runTick(w.deps, AT_8_ET);
    expect(w.emails.map((e) => e.to)).toEqual(['alice@example.com']);
    expect(w.pushes).toHaveLength(1);
    expect(w.pushes[0].message).toEqual({
      title: 'Your DashDen morning summary',
      body: "Yesterday's Sudoku challenge: zed won. You finished #2.",
      route: '/challenge/results?day=2026-11-26',
    });
    expect(s.digestEmail.sent).toBe(1);
    expect(s.digestPush.sent).toBe(1);
    expect(s.challengePush).toEqual({ sent: 0, failed: 0, skipped: 0 });
  });
  it('sends each at most once per local date across two runs in the window', async () => {
    const w = world({ users: [user('alice')], devices: [device('alice')] });
    await runTick(w.deps, AT_8_ET);
    const second = await runTick(w.deps, new Date('2026-11-27T13:15:00Z'));
    expect(w.emails).toHaveLength(1);
    expect(w.pushes).toHaveLength(1);
    expect(second.due.digestEmail).toBe(0);
    // Overlapping runs that both planned the send: the claim lets only one through.
    const w2 = world({ users: [user('bob')] });
    await Promise.all([runTick(w2.deps, AT_8_ET), runTick(w2.deps, AT_8_ET)]);
    expect(w2.emails).toHaveLength(1);
  });
  it('uses the saved zone, and the half-hour zone Asia/Kolkata gets it at 02:30Z', async () => {
    const w = world({ users: [user('chi', { timeZone: 'America/Chicago' }), user('ind', { timeZone: 'Asia/Kolkata' })] });
    await runTick(w.deps, AT_8_ET);
    expect(w.emails).toHaveLength(0);
    await runTick(w.deps, new Date('2026-11-27T14:00:00Z'));
    expect(w.emails.map((e) => e.to)).toEqual(['chi@example.com']);
    await runTick(w.deps, new Date('2026-11-28T02:30:00Z'));
    expect(w.emails.map((e) => e.to)).toEqual(['chi@example.com', 'ind@example.com']);
  });
  it('a device zone is used when no zone is saved', async () => {
    const w = world({ users: [user('la')], devices: [device('la', 1, { timeZone: 'America/Los_Angeles' })] });
    await runTick(w.deps, AT_8_ET);
    expect(w.emails).toHaveLength(0);
    await runTick(w.deps, new Date('2026-11-27T16:00:00Z'));
    expect(w.emails).toHaveLength(1);
  });
  it('sends nothing to users with the toggle off', async () => {
    const w = world({ users: [user('off', { dailyDigest: false })], devices: [device('off')] });
    const s = await runTick(w.deps, AT_8_ET);
    expect(s.users).toBe(0);
    await runTick(w.deps, AT_NOON_ET);
    expect(w.emails).toHaveLength(0);
    expect(w.pushes).toHaveLength(0);
  });
  it('a failed email releases its claim so the next run retries', async () => {
    const w = world({ users: [user('alice'), user('bob')], failEmailFor: ['alice@example.com'] });
    const s = await runTick(w.deps, AT_8_ET);
    expect(s.digestEmail).toEqual({ sent: 1, failed: 1, skipped: 0 });
    expect((w.prefs.get('alice') as any).lastDigestEmailOn).toBeUndefined();
    expect((w.prefs.get('bob') as any).lastDigestEmailOn).toBe('2026-11-27');
  });
  it('without the APNs secret: no push attempt and no push claim, email still sends', async () => {
    const w = world({ users: [user('alice')], devices: [device('alice')], apns: false });
    const s = await runTick(w.deps, AT_8_ET);
    expect(w.emails).toHaveLength(1);
    expect(w.deps.createPushSender).not.toHaveBeenCalled();
    expect(w.claimCalls).toEqual(['DigestEmail:alice']);
    expect(s.apns).toBe('off');
    expect(s.digestPush.skipped).toBe(1);
    const noon = await runTick(w.deps, AT_NOON_ET);
    expect(noon.challengePush.skipped).toBe(1);
    expect(w.claimCalls).toEqual(['DigestEmail:alice']);
  });
  it('the APNs secret is not read when no push is due', async () => {
    const w = world({ users: [user('alice')] });
    await runTick(w.deps, AT_8_ET);
    expect(w.deps.loadApnsConfig).not.toHaveBeenCalled();
  });
  it('without the challenge table the email has no challenge section and the push uses the plain text', async () => {
    const w = world({ users: [user('alice')], devices: [device('alice')], challenge: 'off' });
    await runTick(w.deps, AT_8_ET);
    expect(w.emails[0].html).not.toContain("Yesterday's challenge");
    expect(w.pushes[0].message).toEqual({
      title: 'Your DashDen morning summary',
      body: "See yesterday's top players and today's challenge.",
      route: '/',
    });
  });
  it('a failing pre-draw is logged and the email still goes out', async () => {
    const w = world({ users: [user('alice')], challenge: 'failing' });
    const s = await runTick(w.deps, AT_8_ET);
    expect(s.challenge).toBe('failed');
    expect(w.emails).toHaveLength(1);
  });
});
describe('runTick: existing digest content', () => {
  it('keeps every existing section and adds yesterday\'s challenge', async () => {
    const w = world({ users: [user('alice')] });
    await runTick(w.deps, AT_8_ET);
    const { html, subject } = w.emails[0];
    expect(subject).toBe('🎮 DashDen Daily — Friday, Nov 27');
    for (const part of [
      '🎮 DashDen Daily',
      'Your daily gaming digest',
      'Hey alice! 👋',
      '🎮 You played 1 game recently — nice work!',
      "📊 You're #2 today — just 300 points behind zed!",
      '⚡ zed has a higher score than you in 9️⃣ Sudoku — can you beat 1,500?',
      "🆕 You haven't tried:",
      "🏆 Today's Top Players",
      'alice 👈',
      'Play Now →',
      'https://dashden.app/hub',
      'Manage email preferences',
    ]) {
      expect(html).toContain(part);
    }
    expect(html).toContain("🎯 Yesterday's challenge: Sudoku");
    expect(html).toContain('Winner: zed');
    expect(html).toContain('Your best: 900 points, #2.');
    expect(html).toContain('https://dashden.app/challenge/results?day=2026-11-26');
  });
  it('buildEmailHTML without a challenge section is the previous output', () => {
    const data = digestData();
    const personal = { rankInfo: 'r', beatInfo: 'b', tryInfo: 't', activityInfo: 'a' };
    const html = buildEmailHTML('alice', data.topToday, personal, 'alice', data.rankedToday);
    expect(html).not.toContain('challenge');
    expect(html).toContain("Today's Top Players");
    expect(buildEmailHTML('alice', data.topToday, personal, 'alice', data.rankedToday, '')).toBe(html);
  });
  it('the challenge section is in the user\'s language', async () => {
    const w = world({ users: [user('alice', { language: 'es' })] });
    await runTick(w.deps, AT_8_ET);
    expect(w.emails[0].html).toContain('Desafío de ayer: Sudoku');
  });
});
describe('runTick: challenge push at noon local', () => {
  it('pushes today\'s game to users with a device who have not played, at 12:00 to 12:59 local only', async () => {
    const w = world({
      users: [user('alice'), user('bob'), user('nodevice')],
      devices: [device('alice'), device('bob')],
      played: ['bob'],
    });
    await runTick(w.deps, new Date('2026-11-27T16:59:00Z'));
    expect(w.pushes).toHaveLength(0);
    const s = await runTick(w.deps, AT_NOON_ET);
    expect(w.pushes.map((p) => p.device.userId)).toEqual(['alice']);
    expect(w.pushes[0].message).toEqual({
      title: "Today's challenge: Hangman",
      body: 'Everyone plays the same puzzle. Can you top the leaderboard?',
      route: '/',
    });
    expect(s.challengePush).toEqual({ sent: 1, failed: 0, skipped: 1 });
    expect(w.challenge.hasPlayed).toHaveBeenCalledWith('2026-11-27', 'bob');
    expect(w.emails).toHaveLength(0);
    await runTick(w.deps, new Date('2026-11-27T17:45:00Z'));
    expect(w.pushes).toHaveLength(1);
    await runTick(w.deps, new Date('2026-11-27T18:00:00Z'));
    expect(w.pushes).toHaveLength(1);
  });
  it('pre-draws today and tomorrow every run', async () => {
    const w = world({ users: [user('alice')] });
    await runTick(w.deps, AT_NOON_ET);
    expect(w.ensured).toEqual(['2026-11-27', '2026-11-28']);
  });
  it('one failing device does not stop the next device or the next user', async () => {
    const w = world({
      users: [user('alice'), user('bob')],
      devices: [device('alice', 1), device('alice', 2), device('bob', 1)],
      pushResult: (d) => {
        if (d.deviceId === 'alice-d1') throw new Error('socket hang up');
        return 'sent';
      },
    });
    const s = await runTick(w.deps, AT_NOON_ET);
    expect(w.pushes.map((p) => p.device.deviceId).sort()).toEqual(['alice-d2', 'bob-d1']);
    expect(s.challengePush.sent).toBe(2);
  });
  it('a removed device is counted; a user with nothing delivered gets the claim back', async () => {
    const w = world({ users: [user('alice')], devices: [device('alice')], pushResult: () => 'removed' });
    const s = await runTick(w.deps, AT_NOON_ET);
    expect(s.devicesRemoved).toBe(1);
    expect(s.challengePush.failed).toBe(1);
    expect((w.prefs.get('alice') as any).lastChallengePushOn).toBeUndefined();
  });
  it('stops starting sends when the run is close to its timeout', async () => {
    const w = world({ users: [user('alice'), user('bob')] });
    let calls = 0;
    w.deps.shouldStop = () => ++calls > 1;
    const s = await runTick(w.deps, AT_8_ET);
    expect(s.stopped).toBe(true);
    expect(w.emails).toHaveLength(1);
  });
});
describe('handler', () => {
  const ddbMock = mockClient(DynamoDBDocumentClient);
  beforeEach(() => {
    ddbMock.reset();
    jest.useFakeTimers({ now: new Date('2026-11-27T03:00:00Z'), doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'queueMicrotask'] });
  });
  afterEach(() => jest.useRealTimers());
  it('scans email prefs with the unchanged dailyDigest filter, every page, and sends nothing outside the windows', async () => {
    ddbMock
      .on(ScanCommand)
      .resolvesOnce({ Items: [user('alice')], LastEvaluatedKey: { userId: 'alice' } })
      .resolvesOnce({ Items: [user('bob')] });
    ddbMock.on(GetCommand).resolves({});
    const res = await handler();
    expect(res.statusCode).toBe(200);
    const scans = ddbMock.commandCalls(ScanCommand).map((c) => c.args[0].input);
    expect(scans).toHaveLength(2);
    for (const scan of scans) {
      expect(scan).toMatchObject({ FilterExpression: 'dailyDigest = :yes', ExpressionAttributeValues: { ':yes': true } });
    }
    expect(scans[1].ExclusiveStartKey).toEqual({ userId: 'alice' });
  });
  it('throws when the prefs scan fails (the run cannot start)', async () => {
    ddbMock.on(ScanCommand).rejects(new Error('scan failed'));
    await expect(handler()).rejects.toThrow('scan failed');
  });
});
