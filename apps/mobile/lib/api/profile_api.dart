import 'package:graphql_flutter/graphql_flutter.dart';

import 'api_errors.dart';
import 'stats_models.dart';

/// Email preferences and contact form on the game service. The admin email
/// mutations are deliberately not here.
class ProfileApi {
  ProfileApi(this._client);
  final GraphQLClient _client;

  static const String _getPrefs = r'''
    query GetEmailPrefs { getEmailPrefs { userId dailyDigest } }
  ''';

  static const String _setPrefs = r'''
    mutation SetEmailPrefs($input: SetEmailPrefsInput!) {
      setEmailPrefs(input: $input) { userId dailyDigest }
    }
  ''';

  static const String _contact = r'''
    mutation SubmitContactForm($input: ContactFormInput!) {
      submitContactForm(input: $input) { success }
    }
  ''';

  static const String _deleteAccount = r'''
    mutation DeleteMyAccount { deleteMyAccount { deleted appleSubscriptionActive } }
  ''';

  /// Deletes the signed-in user's account, data and login, and cancels web
  /// (Stripe) billing. Returns whether an App Store subscription is still
  /// active: only the user can cancel that, in iPhone Settings.
  Future<bool> deleteMyAccount() async {
    final result = await _client.mutate(MutationOptions(document: gql(_deleteAccount)));
    throwIfGraphQLError(result);
    final data = result.data?['deleteMyAccount'] as Map<String, dynamic>?;
    if (data?['deleted'] != true) throw StateError('Account was not deleted.');
    return data?['appleSubscriptionActive'] == true;
  }

  Future<EmailPrefs> getEmailPrefs() async {
    final result = await _client.query(QueryOptions(
      document: gql(_getPrefs),
      fetchPolicy: FetchPolicy.noCache,
    ));
    throwIfGraphQLError(result);
    return EmailPrefs.fromJson(
      result.data!['getEmailPrefs'] as Map<String, dynamic>,
    );
  }

  Future<EmailPrefs> setEmailPrefs(bool dailyDigest) async {
    final result = await _client.mutate(MutationOptions(
      document: gql(_setPrefs),
      variables: {
        'input': {'dailyDigest': dailyDigest},
      },
    ));
    throwIfGraphQLError(result);
    return EmailPrefs.fromJson(
      result.data!['setEmailPrefs'] as Map<String, dynamic>,
    );
  }

  /// Throws when the service reports failure.
  Future<void> submitContactForm({
    required ContactType type,
    required String subject,
    required String message,
  }) async {
    final result = await _client.mutate(MutationOptions(
      document: gql(_contact),
      variables: {
        'input': {'type': type.name, 'subject': subject, 'message': message},
      },
    ));
    throwIfGraphQLError(result);
    final ok = (result.data?['submitContactForm']
        as Map<String, dynamic>?)?['success'];
    if (ok != true) throw StateError('Contact form was not accepted.');
  }
}
