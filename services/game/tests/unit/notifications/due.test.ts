import { DEFAULT_TIME_ZONE, dueSends, resolveLanguage, resolveTimeZone } from '../../../src/notifications/due';
const at = (iso: string) => new Date(iso);
describe('dueSends', () => {
  it('digest is due from 08:00 to 08:59 local (New York, winter UTC-5)', () => {
    expect(dueSends({ timeZone: 'America/New_York', claims: {} }, at('2026-11-27T12:59:00Z')).digestEmail).toBe(false);
    for (const t of ['13:00', '13:15', '13:59']) {
      const d = dueSends({ timeZone: 'America/New_York', claims: {} }, at(`2026-11-27T${t}:00Z`));
      expect(d).toMatchObject({ digestEmail: true, digestPush: true, challengePush: false, localDate: '2026-11-27' });
    }
    expect(dueSends({ timeZone: 'America/New_York', claims: {} }, at('2026-11-27T14:00:00Z')).digestEmail).toBe(false);
  });
  it('challenge push is due from 12:00 to 12:59 local only', () => {
    const z = { timeZone: 'America/Los_Angeles', claims: {} };
    expect(dueSends(z, at('2026-11-27T19:59:00Z')).challengePush).toBe(false); // 11:59 PST
    expect(dueSends(z, at('2026-11-27T20:00:00Z'))).toMatchObject({ challengePush: true, digestEmail: false });
    expect(dueSends(z, at('2026-11-27T20:59:00Z')).challengePush).toBe(true);
    expect(dueSends(z, at('2026-11-27T21:00:00Z')).challengePush).toBe(false);
  });
  it('a half-hour zone (Asia/Kolkata, UTC+5:30): 08:00 local is 02:30Z', () => {
    const z = { timeZone: 'Asia/Kolkata', claims: {} };
    expect(dueSends(z, at('2026-11-27T02:29:00Z')).digestEmail).toBe(false);
    expect(dueSends(z, at('2026-11-27T02:30:00Z'))).toMatchObject({ digestEmail: true, localDate: '2026-11-27' });
    expect(dueSends(z, at('2026-11-27T03:29:00Z')).digestEmail).toBe(true);
    expect(dueSends(z, at('2026-11-27T03:30:00Z')).digestEmail).toBe(false);
    expect(dueSends(z, at('2026-11-27T06:30:00Z')).challengePush).toBe(true);
  });
  it('DST change days in New York: 8am is 12:00Z after spring forward and 13:00Z after fall back', () => {
    const z = { timeZone: 'America/New_York', claims: {} };
    // 2026-03-08 spring forward (EDT, UTC-4)
    expect(dueSends(z, at('2026-03-08T12:00:00Z')).digestEmail).toBe(true);
    expect(dueSends(z, at('2026-03-08T13:00:00Z')).digestEmail).toBe(false);
    // the day before is still EST (UTC-5)
    expect(dueSends(z, at('2026-03-07T12:00:00Z')).digestEmail).toBe(false);
    expect(dueSends(z, at('2026-03-07T13:00:00Z')).digestEmail).toBe(true);
    // 2026-11-01 fall back (EST, UTC-5)
    expect(dueSends(z, at('2026-11-01T12:00:00Z')).digestEmail).toBe(false);
    expect(dueSends(z, at('2026-11-01T13:00:00Z')).digestEmail).toBe(true);
    expect(dueSends(z, at('2026-11-01T17:00:00Z')).challengePush).toBe(true);
  });
  it('a claim for today blocks only its own kind; a claim from yesterday does not block', () => {
    const now = at('2026-11-27T13:10:00Z');
    const d = dueSends({ timeZone: 'America/New_York', claims: { lastDigestEmailOn: '2026-11-27', lastDigestPushOn: '2026-11-26' } }, now);
    expect(d).toMatchObject({ digestEmail: false, digestPush: true });
    const noon = dueSends({ timeZone: 'America/New_York', claims: { lastChallengePushOn: '2026-11-27' } }, at('2026-11-27T17:10:00Z'));
    expect(noon.challengePush).toBe(false);
  });
  it('an unknown or invalid zone means America/New_York', () => {
    expect(DEFAULT_TIME_ZONE).toBe('America/New_York');
    expect(dueSends({ claims: {} }, at('2026-11-27T13:00:00Z'))).toMatchObject({ digestEmail: true, timeZone: 'America/New_York' });
    expect(dueSends({ timeZone: 'Bad/Zone', claims: {} }, at('2026-11-27T13:00:00Z')).timeZone).toBe('America/New_York');
  });
});
describe('resolveTimeZone and resolveLanguage', () => {
  const devices = [
    { timeZone: 'Europe/Lisbon', language: 'pt', updatedAt: '2026-11-01T00:00:00Z' },
    { timeZone: 'America/Chicago', language: 'es', updatedAt: '2026-11-20T00:00:00Z' },
  ];
  it('saved value first, then the most recent device, then the default', () => {
    expect(resolveTimeZone('Asia/Tokyo', devices)).toBe('Asia/Tokyo');
    expect(resolveTimeZone(undefined, devices)).toBe('America/Chicago');
    expect(resolveTimeZone('Nope/Nope', [])).toBe('America/New_York');
    expect(resolveLanguage('pt', devices)).toBe('pt');
    expect(resolveLanguage(undefined, devices)).toBe('es');
    expect(resolveLanguage('fr', [])).toBe('en');
  });
});
