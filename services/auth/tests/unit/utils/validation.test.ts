import {
  validateEmail,
  validatePassword,
  validateDisplayName,
  validateVerificationCode,
  validateRegistrationInput,
  sanitizeEmail,
  sanitizeDisplayName,
} from '../../../src/utils/validation';

describe('Validation Utils', () => {
  describe('validateEmail', () => {
    it('should validate correct email', () => {
      const result = validateEmail('test@example.com');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid email format', () => {
      const result = validateEmail('invalid-email');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject email that is too short', () => {
      const result = validateEmail('a@b');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least 5 characters');
    });

    it('should reject email that is too long', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      const result = validateEmail(longEmail);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must not exceed 255 characters');
    });
  });

  describe('validatePassword', () => {
    it('should validate correct password', () => {
      const result = validatePassword('Password123');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject password that is too short', () => {
      const result = validatePassword('Pass1');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least 8 characters');
    });

    it('should reject password without uppercase', () => {
      const result = validatePassword('password123');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('uppercase letter');
    });

    it('should reject password without lowercase', () => {
      const result = validatePassword('PASSWORD123');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('lowercase letter');
    });

    it('should reject password without digit', () => {
      const result = validatePassword('Password');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('digit');
    });
  });

  describe('validateDisplayName', () => {
    it('should validate correct display name', () => {
      const result = validateDisplayName('John Doe');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept names with hyphens and apostrophes', () => {
      const result = validateDisplayName("Mary-Jane O'Connor");
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject name that is too short', () => {
      const result = validateDisplayName('A');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least 2 characters');
    });

    it('should reject name that is too long', () => {
      const longName = 'A'.repeat(51);
      const result = validateDisplayName(longName);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must not exceed 50 characters');
    });

    it('should reject name with invalid characters', () => {
      const result = validateDisplayName('John123');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('can only contain letters');
    });
  });

  describe('validateVerificationCode', () => {
    it('should validate correct verification code', () => {
      const result = validateVerificationCode('123456');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject code that is not 6 digits', () => {
      const result = validateVerificationCode('12345');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exactly 6 characters');
    });

    it('should reject code with non-digits', () => {
      const result = validateVerificationCode('12345a');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('only digits');
    });
  });

  describe('validateRegistrationInput', () => {
    it('should validate correct registration input', () => {
      const result = validateRegistrationInput('test@example.com', 'Password123', 'John Doe');
      expect(result.valid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('should return all validation errors', () => {
      const result = validateRegistrationInput('invalid', 'weak', 'A');
      expect(result.valid).toBe(false);
      expect(result.errors.email).toBeDefined();
      expect(result.errors.password).toBeDefined();
      expect(result.errors.displayName).toBeDefined();
    });
  });

  describe('sanitizeEmail', () => {
    it('should convert email to lowercase and trim', () => {
      expect(sanitizeEmail('  TEST@EXAMPLE.COM  ')).toBe('test@example.com');
    });
  });

  describe('sanitizeDisplayName', () => {
    it('should trim and normalize spaces', () => {
      expect(sanitizeDisplayName('  John   Doe  ')).toBe('John Doe');
    });
  });
});
