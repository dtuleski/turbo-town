import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:graphql_flutter/graphql_flutter.dart';

import '../auth/auth_controller.dart';
import 'game_api.dart';
import 'graphql_client.dart';

/// GraphQL client for the game service, wired to the Cognito token provider.
final gameGraphQLClientProvider = Provider<GraphQLClient>((ref) {
  final cognito = ref.watch(cognitoServiceProvider);
  return buildGameClient(cognito);
});

/// Game service API.
final gameApiProvider = Provider<GameApi>((ref) {
  return GameApi(ref.watch(gameGraphQLClientProvider));
});
