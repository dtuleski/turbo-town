import 'package:graphql_flutter/graphql_flutter.dart';

import 'game_models.dart';

/// Converts a GraphQL or network failure into a [GameApiException].
void throwIfGraphQLError(QueryResult result) {
  if (!result.hasException) return;
  final ex = result.exception!;
  if (ex.graphqlErrors.isNotEmpty) {
    final err = ex.graphqlErrors.first;
    throw GameApiException(
      err.message,
      code: err.extensions?['code'] as String?,
    );
  }
  if (ex.linkException != null) {
    throw GameApiException(
      'Network error. Check your connection and try again.',
      code: 'NETWORK_ERROR',
    );
  }
  throw GameApiException('Request failed.');
}
