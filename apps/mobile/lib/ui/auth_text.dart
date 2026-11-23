import '../auth/auth_controller.dart';
import '../auth/validation.dart';
import '../l10n/gen/app_localizations.dart';

/// Localized message for a [ValidationError].
String validationText(AppLocalizations l, ValidationError error) {
  switch (error) {
    case ValidationError.required:
      return l.mobileAuth_required;
    case ValidationError.invalidEmail:
      return l.mobileAuth_invalidEmail;
    case ValidationError.usernameMin:
      return l.mobileAuth_usernameMin;
    case ValidationError.usernameMax:
      return l.mobileAuth_usernameMax;
    case ValidationError.usernameChars:
      return l.mobileAuth_usernameChars;
    case ValidationError.passwordMin:
      return l.mobileAuth_passwordMin;
    case ValidationError.passwordUpper:
      return l.mobileAuth_passwordUpper;
    case ValidationError.passwordLower:
      return l.mobileAuth_passwordLower;
    case ValidationError.passwordNumber:
      return l.mobileAuth_passwordNumber;
    case ValidationError.passwordsMismatch:
      return l.mobileAuth_passwordsMismatch;
    case ValidationError.codeMin:
      return l.mobileAuth_codeMin;
  }
}

/// Adapts a validator to the `String? Function(String?)` a form field wants.
String? Function(String?) fieldValidator(
  AppLocalizations l,
  ValidationError? Function(String?) validate,
) =>
    (value) {
      final error = validate(value);
      return error == null ? null : validationText(l, error);
    };

/// Localized message for the current auth error, or null when there is none.
/// Raw Cognito text is never shown, so every language sees its own wording.
String? authErrorText(AppLocalizations l, AuthState auth) {
  if (auth.error == null) return null;
  switch (auth.errorCode) {
    case 'NotAuthorizedException':
    case 'UserNotFoundException':
      return l.auth_invalidCredentials;
    case 'USER_UNCONFIRMED':
    case 'UserNotConfirmedException':
      return l.mobileAuth_errUnconfirmed;
    case 'NEW_PASSWORD_REQUIRED':
      return l.mobileAuth_errNewPasswordRequired;
    case 'CodeMismatchException':
      return l.mobileAuth_errCodeMismatch;
    case 'ExpiredCodeException':
      return l.mobileAuth_errCodeExpired;
    case 'LimitExceededException':
    case 'TooManyRequestsException':
    case 'TooManyFailedAttemptsException':
      return l.mobileAuth_errTooMany;
    case 'InvalidPasswordException':
      return l.mobileAuth_errInvalidPassword;
    case 'UsernameExistsException':
      return l.mobileAuth_errUserExists;
    case 'NetworkError':
      return l.mobileAuth_errNetwork;
    case 'OAUTH_ERROR':
    case 'TOKEN_EXCHANGE_FAILED':
      return l.mobileAuth_errGoogle;
    default:
      return l.mobileAuth_errGeneric;
  }
}
