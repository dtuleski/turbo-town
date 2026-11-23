/// Form validation rules for the auth screens, ported from the web app's zod
/// schemas in apps/web/src/utils/validation.ts. Each validator returns the
/// first failing rule (same order as the web schema) or null when valid. The
/// UI maps a [ValidationError] to a localized message.
library;

enum ValidationError {
  required,
  invalidEmail,
  usernameMin,
  usernameMax,
  usernameChars,
  passwordMin,
  passwordUpper,
  passwordLower,
  passwordNumber,
  passwordsMismatch,
  codeMin,
}

final RegExp _emailPattern = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');
final RegExp _usernamePattern = RegExp(r'^[a-zA-Z0-9_]+$');

/// A non-blank value (first/last name).
ValidationError? validateRequired(String? value) =>
    (value == null || value.trim().isEmpty) ? ValidationError.required : null;

/// A valid email address (surrounding spaces are ignored).
ValidationError? validateEmail(String? value) =>
    _emailPattern.hasMatch((value ?? '').trim())
        ? null
        : ValidationError.invalidEmail;

/// Username: 3-20 characters, letters, digits and underscores.
ValidationError? validateUsername(String? value) {
  final v = value ?? '';
  if (v.length < 3) return ValidationError.usernameMin;
  if (v.length > 20) return ValidationError.usernameMax;
  if (!_usernamePattern.hasMatch(v)) return ValidationError.usernameChars;
  return null;
}

/// Sign-in password: only the length rule applies (web loginSchema).
ValidationError? validateLoginPassword(String? value) =>
    (value ?? '').length < 8 ? ValidationError.passwordMin : null;

/// New password (register and reset): 8+ characters with an uppercase letter,
/// a lowercase letter and a digit.
ValidationError? validateNewPassword(String? value) {
  final v = value ?? '';
  if (v.length < 8) return ValidationError.passwordMin;
  if (!RegExp(r'[A-Z]').hasMatch(v)) return ValidationError.passwordUpper;
  if (!RegExp(r'[a-z]').hasMatch(v)) return ValidationError.passwordLower;
  if (!RegExp(r'[0-9]').hasMatch(v)) return ValidationError.passwordNumber;
  return null;
}

/// The confirmation field must equal [password].
ValidationError? validateConfirmPassword(String? password, String? confirm) =>
    password == confirm ? null : ValidationError.passwordsMismatch;

/// Emailed reset code: at least 6 characters (web resetPasswordSchema).
ValidationError? validateResetCode(String? value) =>
    (value ?? '').trim().length < 6 ? ValidationError.codeMin : null;

/// Sign-up confirmation code: must not be blank.
ValidationError? validateConfirmationCode(String? value) =>
    validateRequired(value);
