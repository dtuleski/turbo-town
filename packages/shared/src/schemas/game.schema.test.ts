/**
 * Unit tests for Game schema validation
 */

import { gameSchema, gameCreateSchema, gameCompleteSchema } from './game.schema';
import { GameStatus } from '../types/enums';

describe('gameSchema', () => {
  const validGame = {
    userId: '123e4567-e89b-12d3-a456-426614174000',
    themeId: '123e4567-e89b-12d3-a456-426614174001',
    difficulty: 24,
    status: GameStatus.InProgress,
    attempts: 0,
  };

  it('should validate valid game', () => {
    const result = gameSchema.safeParse(validGame);
    expect(result.success).toBe(true);
  });

  it('should accept valid difficulty levels', () => {
    const validDifficulties = [12, 18, 24, 30, 36, 42, 48];
    
    validDifficulties.forEach((difficulty) => {
      const result = gameSchema.safeParse({ ...validGame, difficulty });
      expect(result.success).toBe(true);
    });
  });

  it('should reject invalid difficulty', () => {
    const result = gameSchema.safeParse({ ...validGame, difficulty: 15 });
    expect(result.success).toBe(false);
  });

  it('should reject negative attempts', () => {
    const result = gameSchema.safeParse({ ...validGame, attempts: -1 });
    expect(result.success).toBe(false);
  });

  it('should accept optional completion time', () => {
    const result = gameSchema.safeParse({
      ...validGame,
      completionTime: 120,
    });
    expect(result.success).toBe(true);
  });

  it('should reject negative completion time', () => {
    const result = gameSchema.safeParse({
      ...validGame,
      completionTime: -10,
    });
    expect(result.success).toBe(false);
  });
});

describe('gameCreateSchema', () => {
  const validCreate = {
    userId: '123e4567-e89b-12d3-a456-426614174000',
    themeId: '123e4567-e89b-12d3-a456-426614174001',
    difficulty: 24,
  };

  it('should validate valid game creation', () => {
    const result = gameCreateSchema.safeParse(validCreate);
    expect(result.success).toBe(true);
  });

  it('should reject invalid UUID', () => {
    const result = gameCreateSchema.safeParse({
      ...validCreate,
      userId: 'invalid-uuid',
    });
    expect(result.success).toBe(false);
  });
});

describe('gameCompleteSchema', () => {
  it('should validate valid game completion', () => {
    const result = gameCompleteSchema.safeParse({
      completionTime: 120,
      attempts: 30,
    });
    expect(result.success).toBe(true);
  });

  it('should reject zero completion time', () => {
    const result = gameCompleteSchema.safeParse({
      completionTime: 0,
      attempts: 30,
    });
    expect(result.success).toBe(false);
  });

  it('should reject zero attempts', () => {
    const result = gameCompleteSchema.safeParse({
      completionTime: 120,
      attempts: 0,
    });
    expect(result.success).toBe(false);
  });
});
