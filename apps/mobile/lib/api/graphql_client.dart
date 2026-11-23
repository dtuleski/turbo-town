import 'package:graphql_flutter/graphql_flutter.dart';

import '../auth/cognito_service.dart';
import '../config/env.dart';

/// Builds the GraphQL client for the game service.
///
/// Mirrors the web app's Apollo setup: an auth link injects
/// `Authorization: Bearer <idToken>` on every request, refreshing the token
/// when needed. The game service endpoint is validated by the API Gateway
/// JWT authorizer.
GraphQLClient buildGameClient(CognitoService cognito) {
  final httpLink = HttpLink(Env.gameEndpoint);

  final authLink = AuthLink(
    getToken: () async {
      final token = await cognito.getValidIdToken();
      return token != null ? 'Bearer $token' : null;
    },
  );

  return GraphQLClient(
    link: authLink.concat(httpLink),
    cache: GraphQLCache(),
    defaultPolicies: DefaultPolicies(
      // The web app uses no-cache for mutations and network-only for these
      // reads; keep game calls always fresh (real-time tier/rate-limit). noCache
      // also skips cache normalization, which throws when the server omits
      // the auto-added __typename field.
      query: Policies(fetch: FetchPolicy.noCache),
      mutate: Policies(fetch: FetchPolicy.noCache),
    ),
  );
}

/// Builds the GraphQL client for the leaderboard service. Same Bearer idToken
/// as the game client; the endpoint is [Env.leaderboardEndpoint].
GraphQLClient buildLeaderboardClient(CognitoService cognito) {
  final authLink = AuthLink(
    getToken: () async {
      final token = await cognito.getValidIdToken();
      return token != null ? 'Bearer $token' : null;
    },
  );
  return GraphQLClient(
    link: authLink.concat(HttpLink(Env.leaderboardEndpoint)),
    cache: GraphQLCache(),
    defaultPolicies: DefaultPolicies(
      query: Policies(fetch: FetchPolicy.noCache),
      mutate: Policies(fetch: FetchPolicy.noCache),
    ),
  );
}
