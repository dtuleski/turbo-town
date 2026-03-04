/**
 * Unit tests for Theme schema validation
 */

import { themeSchema, themeCreateSchema, themePairSchema } from './theme.schema';
import { ThemeCategory, ThemeStatus } from '../types/enums';

describe('themePairSchema', () => {
  const validPair = {
    card1ImageUrl: 'https://example.com/card1.jpg',
    card2ImageUrl: 'https://example.com/card2.jpg',
    card1AltText: 'Card 1 description',
    card2AltText: 'Card 2 description',
  };

  it('should validate valid theme pair', () => {
    const result = themePairSchema.safeParse(validPair);
    expect(result.success).toBe(true);
  });

  it('should reject invalid image URL', () => {
    const result = themePairSchema.safeParse({
      ...validPair,
      card1ImageUrl: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty alt text', () => {
    const result = themePairSchema.safeParse({
      ...validPair,
      card1AltText: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('themeSchema', () => {
  const validTheme = {
    name: 'Formula 1 Drivers',
    description: 'Match F1 drivers from the same team',
    category: ThemeCategory.F1Drivers,
    status: ThemeStatus.Published,
    imageUrls: ['https://example.com/theme.jpg'],
    pairs: Array(12).fill({
      card1ImageUrl: 'https://example.com/card1.jpg',
      card2ImageUrl: 'https://example.com/card2.jpg',
      card1AltText: 'Card 1',
      card2AltText: 'Card 2',
    }),
    difficulty: 3,
    createdBy: '123e4567-e89b-12d3-a456-426614174000',
  };

  it('should validate valid theme', () => {
    const result = themeSchema.safeParse(validTheme);
    expect(result.success).toBe(true);
  });

  it('should reject theme with too few pairs', () => {
    const result = themeSchema.safeParse({
      ...validTheme,
      pairs: Array(10).fill(validTheme.pairs[0]),
    });
    expect(result.success).toBe(false);
  });

  it('should reject theme with too many pairs', () => {
    const result = themeSchema.safeParse({
      ...validTheme,
      pairs: Array(50).fill(validTheme.pairs[0]),
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid difficulty', () => {
    const result = themeSchema.safeParse({
      ...validTheme,
      difficulty: 10,
    });
    expect(result.success).toBe(false);
  });
});

describe('themeCreateSchema', () => {
  const validCreate = {
    name: 'Formula 1 Drivers',
    description: 'Match F1 drivers from the same team',
    category: ThemeCategory.F1Drivers,
    pairs: Array(12).fill({
      card1ImageUrl: 'https://example.com/card1.jpg',
      card2ImageUrl: 'https://example.com/card2.jpg',
      card1AltText: 'Card 1',
      card2AltText: 'Card 2',
    }),
    difficulty: 3,
  };

  it('should validate valid theme creation', () => {
    const result = themeCreateSchema.safeParse(validCreate);
    expect(result.success).toBe(true);
  });

  it('should reject empty name', () => {
    const result = themeCreateSchema.safeParse({
      ...validCreate,
      name: '',
    });
    expect(result.success).toBe(false);
  });
});
