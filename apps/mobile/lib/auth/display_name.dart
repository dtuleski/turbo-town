import 'dart:convert';

/// Picks a human-friendly name from ID token claims.
///
/// Federated (Google) users get a Cognito username such as
/// `Google_106845269312397681840`, which must never be shown. Order mirrors
/// the web app: a real preferred_username, then the Google `name` or
/// `given_name`, then the local part of the email.
String? displayNameFromClaims(Map<String, dynamic> claims) {
  String? clean(Object? v) {
    if (v is! String) return null;
    final t = v.trim();
    return t.isEmpty ? null : t;
  }

  bool isFederatedId(String v) => v.startsWith('Google_');

  final preferred = clean(claims['preferred_username']);
  if (preferred != null && !isFederatedId(preferred)) return preferred;

  final name = clean(claims['name']) ?? clean(claims['given_name']);
  if (name != null) return name;

  final cognitoName = clean(claims['cognito:username']);
  if (cognitoName != null && !isFederatedId(cognitoName)) return cognitoName;

  final email = clean(claims['email']);
  if (email != null) {
    final at = email.indexOf('@');
    return at > 0 ? email.substring(0, at) : email;
  }
  return null;
}

/// Same as [displayNameFromClaims], reading the claims from a raw JWT.
/// Returns null when the token is missing or malformed.
String? displayNameFromIdToken(String? jwt) {
  if (jwt == null) return null;
  final parts = jwt.split('.');
  if (parts.length != 3) return null;
  try {
    final payload = utf8.decode(base64Url.decode(base64Url.normalize(parts[1])));
    final claims = json.decode(payload);
    if (claims is! Map<String, dynamic>) return null;
    return displayNameFromClaims(claims);
  } on FormatException {
    return null;
  }
}
