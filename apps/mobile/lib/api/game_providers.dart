import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:graphql_flutter/graphql_flutter.dart';

import '../auth/auth_controller.dart';
import 'challenge_api.dart';
import 'challenge_models.dart';
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

/// Daily Challenge reads (same game service client).
final challengeApiProvider = Provider<ChallengeApi>((ref) {
  return ChallengeApi(ref.watch(gameGraphQLClientProvider));
});

/// Today's challenge; null when the feature is off or the call failed.
/// Loaded again whenever nothing watches it any more.
final dailyChallengeProvider = FutureProvider.autoDispose<DailyChallengeView?>((ref) {
  return ref.watch(challengeApiProvider).getDailyChallenge();
});
