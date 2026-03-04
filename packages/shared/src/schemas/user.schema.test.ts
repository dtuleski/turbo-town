/**
 * Unit tests for User schema validation
 */

import { userSchema, userCreateSchema, emailSchema, passwordSchema } from './user.schema';
import { UserRole, SubscriptionTier } from '../types/enums';

describe('emailSchema', () => {
  it('should validate valid email', () => {
    const result = emailSchema.safeParse('test@example.com');
    expect(result.success).toBe(true);
  });

  it('should reject invalid email', () => {
    const result = emailSchema.safeParse('invalid-email');
    expect(result.success).toBe(false);
  });

  it('should reject email exceeding max length', () => {
    const longEmail = 'a'.repeat(250) + '@example.com';
    const result = emailSchema.safeParse(longEmail);
    expect(result.success).toBe(false);
  });
});

describe('passwordSchema', () => {
  it('should validate strong password', () => {
    const result = passwordSchema.safeParse('StrongPass123');
    expect(result.success).toBe(true);
  });

  it('should reject password without uppercase', () => {
    const result = passwordSchema.safeParse('weakpass123');
    expect(result.success).toBe(false);
  });

  it('should reject password without lowercase', () => {
    const result = passwordSchema.safeParse('WEAKPASS123');
    expect(result.success).toBe(false);
  });

  it('should reject password without number', () => {
    const result = passwordSchema.safeParse('WeakPassword');
    expect(result.success).toBe(false);
  });

  it('should reject password too short', () => {
    const result = passwordSchema.safeParse('Pass1');
    expect(result.success).toBe(false);
  });
});

describe('userSchema', () => {
  const validUser = {
    email: 'test@example.com',
    name: 'Test User',
    role: UserRole.User,
    tier: SubscriptionTier.Free,
  };

  it('should validate valid user', () => {
    const result = userSchema.safeParse(validUser);
    expect(result.success).toBe(true);
  });

  it('should reject user with invalid email', () => {
    const result = userSchema.safeParse({
      ...validUser,
      email: 'invalid-email',
    });
    expect(result.success).toBe(false);
  });

  it('should reject user with empty name', () => {
    const result = userSchema.safeParse({
      ...validUser,
      name: '',
    });
    expect(result.success).toBe(false);
  });

  it('should reject user with invalid role', () => {
    const result = userSchema.safeParse({
      ...validUser,
      role: 'INVALID_ROLE',
    });
    expect(result.success).toBe(false);
  });

  it('should accept optional profile picture URL', () => {
    const result = userSchema.safeParse({
      ...validUser,
      profilePictureUrl: 'https://example.com/avatar.jpg',
    });
    expect(result.success).toBe(true);
  });
});

describe('userCreateSchema', () => {
  const validCreate = {
    email: 'test@example.com',
    name: 'Test User',
    password: 'StrongPass123',
  };

  it('should validate valid user creation', () => {
    const result = userCreateSchema.safeParse(validCreate);
    expect(result.success).toBe(true);
  });

  it('should reject creation with weak password', () => {
    const result = userCreateSchema.safeParse({
      ...validCreate,
      password: 'weak',
    });
    expect(result.success).toBe(false);
  });
});
