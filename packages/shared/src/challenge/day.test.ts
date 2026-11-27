import {
  addDays,
  challengeDayBounds,
  challengeDayOf,
  isChallengeDay,
  isValidTimeZone,
  localParts,
} from './day';

const at = (iso: string) => new Date(iso);

describe('challengeDayOf (US Eastern, FR-DC-12)', () => {
  it('switches day at 05:00Z in winter (EST)', () => {
    expect(challengeDayOf(at('2026-01-15T04:59:59Z'))).toBe('2026-01-14');
    expect(challengeDayOf(at('2026-01-15T05:00:00Z'))).toBe('2026-01-15');
  });

  it('switches day at 04:00Z in summer (EDT)', () => {
    expect(challengeDayOf(at('2026-07-15T03:59:59Z'))).toBe('2026-07-14');
    expect(challengeDayOf(at('2026-07-15T04:00:00Z'))).toBe('2026-07-15');
  });

  it('handles the DST change days', () => {
    // 2026-03-08: clocks go forward at 02:00 EST (07:00Z)
    expect(challengeDayOf(at('2026-03-08T04:59:59Z'))).toBe('2026-03-07');
    expect(challengeDayOf(at('2026-03-08T05:00:00Z'))).toBe('2026-03-08');
    expect(challengeDayOf(at('2026-03-09T03:59:59Z'))).toBe('2026-03-08');
    expect(challengeDayOf(at('2026-03-09T04:00:00Z'))).toBe('2026-03-09');
    // 2026-11-01: clocks go back at 02:00 EDT (06:00Z)
    expect(challengeDayOf(at('2026-11-01T03:59:59Z'))).toBe('2026-10-31');
    expect(challengeDayOf(at('2026-11-01T04:00:00Z'))).toBe('2026-11-01');
    expect(challengeDayOf(at('2026-11-02T04:59:59Z'))).toBe('2026-11-01');
    expect(challengeDayOf(at('2026-11-02T05:00:00Z'))).toBe('2026-11-02');
  });
});

describe('challengeDayBounds', () => {
  it('is 24 hours on an ordinary day', () => {
    const b = challengeDayBounds('2026-01-15');
    expect(b.start.toISOString()).toBe('2026-01-15T05:00:00.000Z');
    expect(b.end.toISOString()).toBe('2026-01-16T05:00:00.000Z');
  });

  it('is 23 hours on 2026-03-08 and 25 hours on 2026-11-01', () => {
    const spring = challengeDayBounds('2026-03-08');
    expect(spring.start.toISOString()).toBe('2026-03-08T05:00:00.000Z');
    expect(spring.end.toISOString()).toBe('2026-03-09T04:00:00.000Z');
    const fall = challengeDayBounds('2026-11-01');
    expect(fall.start.toISOString()).toBe('2026-11-01T04:00:00.000Z');
    expect(fall.end.toISOString()).toBe('2026-11-02T05:00:00.000Z');
  });

  it('agrees with challengeDayOf at both edges for a whole year', () => {
    let day = '2026-01-01';
    for (let i = 0; i < 366; i++) {
      const { start, end } = challengeDayBounds(day);
      expect(challengeDayOf(start)).toBe(day);
      expect(challengeDayOf(new Date(end.getTime() - 1))).toBe(day);
      day = addDays(day, 1);
    }
  });

  it('rejects an invalid day', () => {
    expect(() => challengeDayBounds('2026-02-30')).toThrow(RangeError);
  });
});

describe('addDays and isChallengeDay', () => {
  it('crosses month, year and leap day', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-11-01', 1)).toBe('2026-11-02');
  });

  it.each(['2026-11-26', '2028-02-29'])('accepts %s', (v) => {
    expect(isChallengeDay(v)).toBe(true);
  });

  it.each([['2026-02-30'], ['2027-02-29'], ['2026-13-01'], ['2026-1-01'], ['2026-11-26T00:00'], [''], [20261126], [null], [undefined], [{}]])(
    'rejects %p',
    (v) => {
      expect(isChallengeDay(v)).toBe(false);
    }
  );
});

describe('localParts', () => {
  it('Asia/Kolkata is UTC+5:30', () => {
    expect(localParts(at('2026-01-15T12:00:00Z'), 'Asia/Kolkata')).toEqual({ date: '2026-01-15', hour: 17, minute: 30 });
    expect(localParts(at('2026-01-15T18:45:00Z'), 'Asia/Kolkata')).toEqual({ date: '2026-01-16', hour: 0, minute: 15 });
  });

  it('America/Los_Angeles follows US DST', () => {
    expect(localParts(at('2026-01-15T07:30:00Z'), 'America/Los_Angeles')).toEqual({ date: '2026-01-14', hour: 23, minute: 30 });
    expect(localParts(at('2026-07-15T15:00:00Z'), 'America/Los_Angeles')).toEqual({ date: '2026-07-15', hour: 8, minute: 0 });
  });

  it('reports midnight as hour 0', () => {
    expect(localParts(at('2026-01-15T05:00:00Z'), 'America/New_York')).toEqual({ date: '2026-01-15', hour: 0, minute: 0 });
  });
});

describe('isValidTimeZone', () => {
  it.each(['America/New_York', 'Asia/Kolkata', 'Europe/Lisbon', 'UTC'])('accepts %s', (z) => {
    expect(isValidTimeZone(z)).toBe(true);
  });

  it.each([['Mars/Olympus'], [''], ['A'.repeat(65)], [42], [null], [undefined]])('rejects %p', (z) => {
    expect(isValidTimeZone(z)).toBe(false);
  });
});
