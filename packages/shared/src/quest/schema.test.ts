import { questContextSchema } from './schema';

const valid = { worldId: 'brain-peaks', nodeId: 'bp-01-memory', legIndex: 0 };

describe('questContextSchema (NFR-QM-5, SECURITY-05)', () => {
  it('accepts a valid context', () => {
    expect(questContextSchema.safeParse(valid)).toEqual({ success: true, data: valid });
  });

  it('accepts legIndex 0, 1 and 2 only', () => {
    for (const legIndex of [0, 1, 2]) {
      expect(questContextSchema.safeParse({ ...valid, legIndex }).success).toBe(true);
    }
    for (const legIndex of [-1, 3, 1.5, Number.NaN, Infinity, '1', null, undefined]) {
      expect(questContextSchema.safeParse({ ...valid, legIndex }).success).toBe(false);
    }
  });

  it('rejects ids that break ^[a-z0-9-]{1,40}$', () => {
    const bad = ['', 'A', 'a b', 'a_b', 'a/b', '../x', 'a'.repeat(41), 'é', 'a\n', "a'b"];
    for (const id of bad) {
      expect(questContextSchema.safeParse({ ...valid, worldId: id }).success).toBe(false);
      expect(questContextSchema.safeParse({ ...valid, nodeId: id }).success).toBe(false);
    }
  });

  it('accepts a 40 character id and rejects 41', () => {
    expect(questContextSchema.safeParse({ ...valid, nodeId: 'a'.repeat(40) }).success).toBe(true);
    expect(questContextSchema.safeParse({ ...valid, nodeId: 'a'.repeat(41) }).success).toBe(false);
  });

  it('rejects missing fields and wrong types', () => {
    expect(questContextSchema.safeParse({ nodeId: 'x', legIndex: 0 }).success).toBe(false);
    expect(questContextSchema.safeParse({ worldId: 'x', legIndex: 0 }).success).toBe(false);
    expect(questContextSchema.safeParse({ worldId: 'x', nodeId: 'y' }).success).toBe(false);
    expect(questContextSchema.safeParse({ ...valid, worldId: 5 }).success).toBe(false);
  });

  it('never throws on any input type', () => {
    for (const input of [undefined, null, 5, 'x', [], [valid], () => 1, Symbol('s')]) {
      expect(() => questContextSchema.safeParse(input)).not.toThrow();
      expect(questContextSchema.safeParse(input).success).toBe(false);
    }
  });

  it('strips unknown keys, including __proto__ and constructor', () => {
    const input = JSON.parse(
      '{"worldId":"brain-peaks","nodeId":"bp-01-memory","legIndex":1,"userId":"u","__proto__":{"admin":true},"constructor":{"x":1}}'
    );
    const result = questContextSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(Object.keys(result.data).sort()).toEqual(['legIndex', 'nodeId', 'worldId']);
      expect((result.data as unknown as { admin?: boolean }).admin).toBeUndefined();
      expect(({} as { admin?: boolean }).admin).toBeUndefined();
    }
  });
});
