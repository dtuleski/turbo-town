import {
  FRACTION_OPTION,
  INTEGER_OPTION,
  addExact,
  formatExact,
  isCanonicalOption,
  parseOption,
  reduce,
  sameValue,
} from './exact';

describe('canonical options', () => {
  it.each(['0', '7', '-7', '56', '999', '-999', '3/4', '-1/2', '10/3', '7/12', '11/6', '2/6'])('accepts %s', (s) => {
    expect(isCanonicalOption(s)).toBe(true);
  });

  it.each(['-0', '05', '1000', '-1000', '0.5', '1/0', '0/3', '13/20', '-11/6', '3/04', '', ' 3', '+3', '1/2/3'])(
    'refuses %s',
    (s) => {
      expect(isCanonicalOption(s)).toBe(false);
      expect(parseOption(s)).toBeNull();
    }
  );

  it('keeps the two patterns as designed', () => {
    expect(INTEGER_OPTION.test('-10')).toBe(true);
    expect(FRACTION_OPTION.test('99/99')).toBe(true);
    expect(isCanonicalOption('99/99')).toBe(false); // 5 characters
  });
});

describe('exact values', () => {
  it('reads options reduced', () => {
    expect(parseOption('2/4')).toEqual({ num: 1, den: 2 });
    expect(parseOption('-6/3')).toEqual({ num: -2, den: 1 });
    expect(parseOption('12')).toEqual({ num: 12, den: 1 });
  });

  it('compares by value, not by text', () => {
    expect(sameValue(parseOption('2/4')!, parseOption('1/2')!)).toBe(true);
    expect(sameValue(parseOption('4/2')!, parseOption('2')!)).toBe(true);
    expect(sameValue(parseOption('1/2')!, parseOption('-1/2')!)).toBe(false);
  });

  it('formats lowest terms and whole values as integers', () => {
    expect(formatExact({ num: 2, den: 4 })).toBe('1/2');
    expect(formatExact({ num: 4, den: 2 })).toBe('2');
    expect(formatExact({ num: -7, den: 1 })).toBe('-7');
    expect(formatExact({ num: 3, den: -4 })).toBe('-3/4');
    expect(formatExact({ num: 0, den: 5 })).toBe('0');
  });

  it('adds fractions exactly', () => {
    expect(addExact({ num: 1, den: 2 }, { num: 1, den: 4 })).toEqual({ num: 3, den: 4 });
    expect(addExact({ num: 1, den: 2 }, { num: 1, den: 2 })).toEqual({ num: 1, den: 1 });
  });

  it('refuses a zero denominator', () => {
    expect(() => reduce(1, 0)).toThrow(RangeError);
  });
});
