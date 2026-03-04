import { z } from 'zod';

// Email validation schema
export const emailSchema = z
  .string()
  .email('Invalid email format')
  .min(5, 'Email must be at least 5 characters')
  .max(255, 'Email must not exceed 255 characters')
  .toLowerCase()
  .trim();

// Password validation schema
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one digit');

// Display name validation schema
export const displayNameSchema = z
  .string()
  .min(2, 'Display name must be at least 2 characters')
  .max(50, 'Display name must not exceed 50 characters')
  .regex(/^[a-zA-Z\s'-]+$/, 'Display name can only contain letters, spaces, hyphens, and apostrophes')
  .trim();

// Verification code validation schema
export const verificationCodeSchema = z
  .string()
  .length(6, 'Verification code must be exactly 6 characters')
  .regex(/^[0-9]+$/, 'Verification code must contain only digits');

// Token validation schema
export const tokenSchema = z.string().min(1, 'Token is required');

// Avatar URL validation schema
export const avatarUrlSchema = z
  .string()
  .url('Invalid avatar URL')
  .max(500, 'Avatar URL must not exceed 500 characters')
  .optional();

// Validation functions
export function validateEmail(email: string): { valid: boolean; error?: string } {
  const result = emailSchema.safeParse(email);
  return {
    valid: result.success,
    error: result.success ? undefined : result.error.errors[0]?.message,
  };
}

export function validatePassword(password: string): { valid: boolean; error?: string } {
  const result = passwordSchema.safeParse(password);
  return {
    valid: result.success,
    error: result.success ? undefined : result.error.errors[0]?.message,
  };
}

export function validateDisplayName(displayName: string): { valid: boolean; error?: string } {
  const result = displayNameSchema.safeParse(displayName);
  return {
    valid: result.success,
    error: result.success ? undefined : result.error.errors[0]?.message,
  };
}

export function validateVerificationCode(code: string): { valid: boolean; error?: string } {
  const result = verificationCodeSchema.safeParse(code);
  return {
    valid: result.success,
    error: result.success ? undefined : result.error.errors[0]?.message,
  };
}

// Input sanitization
export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export function sanitizeDisplayName(displayName: string): string {
  return displayName.trim().replace(/\s+/g, ' ');
}

// Combined validation for registration
export function validateRegistrationInput(
  email: string,
  password: string,
  displayName: string,
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  const emailResult = validateEmail(email);
  if (!emailResult.valid && emailResult.error) {
    errors.email = emailResult.error;
  }

  const passwordResult = validatePassword(password);
  if (!passwordResult.valid && passwordResult.error) {
    errors.password = passwordResult.error;
  }

  const displayNameResult = validateDisplayName(displayName);
  if (!displayNameResult.valid && displayNameResult.error) {
    errors.displayName = displayNameResult.error;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
