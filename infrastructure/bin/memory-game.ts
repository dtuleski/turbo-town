import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DatabaseStack } from '../lib/stacks/database-stack';
import { CognitoStack } from '../lib/stacks/cognito-stack';
import { EventBridgeStack } from '../lib/stacks/eventbridge-stack';
import { LambdaStack } from '../lib/stacks/lambda-stack';
import { LeaderboardLambdaStack } from '../lib/stacks/leaderboard-lambda-stack';
import { ApiStack } from '../lib/stacks/api-stack';
import { MonitoringStack } from '../lib/stacks/monitoring-stack';
import { devConfig, stagingConfig, prodConfig, EnvironmentConfig } from '../lib/config/environment-config';

const app = new cdk.App();

// Get environment from context or default to 'dev'
const environment = app.node.tryGetContext('environment') || 'dev';

// Select configuration based on environment
let config: EnvironmentConfig;
switch (environment) {
  case 'prod':
    config = prodConfig;
    break;
  case 'staging':
    config = stagingConfig;
    break;
  default:
    config = devConfig;
}

// Stack props
const stackProps: cdk.StackProps = {
  env: {
    account: config.account,
    region: config.region,
  },
  tags: {
    Project: 'MemoryGame',
    Environment: environment,
    ManagedBy: 'CDK',
  },
};

// 1. Database Stack (no dependencies)
const databaseStack = new DatabaseStack(app, `MemoryGame-Database-${environment}`, {
  ...stackProps,
  config,
});

// 2. Cognito Stack (no dependencies)
const cognitoStack = new CognitoStack(app, `MemoryGame-Cognito-${environment}`, {
  ...stackProps,
  environment,
});

// 3. EventBridge Stack (no dependencies)
const eventBridgeStack = new EventBridgeStack(app, `MemoryGame-EventBridge-${environment}`, {
  ...stackProps,
  environment,
});

// 4. Lambda Stack (depends on Database, Cognito, EventBridge)
const lambdaStack = new LambdaStack(app, `MemoryGame-Lambda-${environment}`, {
  ...stackProps,
  environment,
  usersTable: databaseStack.usersTable,
  gamesTable: databaseStack.gamesTable,
  gameCatalogTable: databaseStack.gameCatalogTable,
  leaderboardsTable: databaseStack.leaderboardsTable,
  subscriptionsTable: databaseStack.subscriptionsTable,
  themesTable: databaseStack.themesTable,
  achievementsTable: databaseStack.achievementsTable,
  rateLimitsTable: databaseStack.rateLimitsTable,
  userSettingsTable: databaseStack.userSettingsTable,
  languageWordsTable: databaseStack.languageWordsTable,
  languageProgressTable: databaseStack.languageProgressTable,
  languageResultsTable: databaseStack.languageResultsTable,
  userPool: cognitoStack.userPool,
  userPoolClient: cognitoStack.userPoolClient,
  eventBus: eventBridgeStack.gameEventsEventBus, // Use game-events-dev bus for game service
});
lambdaStack.addDependency(databaseStack);
lambdaStack.addDependency(cognitoStack);
lambdaStack.addDependency(eventBridgeStack);

// 4.5. Leaderboard Lambda Stack (depends on Database, Cognito, EventBridge)
const leaderboardLambdaStack = new LeaderboardLambdaStack(app, `MemoryGame-LeaderboardLambda-${environment}`, {
  ...stackProps,
  environment,
  leaderboardEntriesTable: databaseStack.leaderboardEntriesTable,
  userAggregatesTable: databaseStack.userAggregatesTable,
  rateLimitBucketsTable: databaseStack.rateLimitBucketsTable,
  userPool: cognitoStack.userPool,
  gameEventsEventBusArn: eventBridgeStack.gameEventsEventBus.eventBusArn,
  leaderboardDLQArn: eventBridgeStack.leaderboardDLQ.queueArn,
});
leaderboardLambdaStack.addDependency(databaseStack);
leaderboardLambdaStack.addDependency(cognitoStack);
leaderboardLambdaStack.addDependency(eventBridgeStack);

// 5. API Stack (depends on Lambda, Cognito, Leaderboard Lambda)
const apiStack = new ApiStack(app, `MemoryGame-API-${environment}`, {
  ...stackProps,
  environment,
  authLambda: lambdaStack.authFunction,
  gameLambda: lambdaStack.gameFunction,
  leaderboardLambda: leaderboardLambdaStack.leaderboardFunction,
  userPool: cognitoStack.userPool,
  userPoolClient: cognitoStack.userPoolClient,
});
apiStack.addDependency(lambdaStack);
apiStack.addDependency(cognitoStack);
apiStack.addDependency(leaderboardLambdaStack);

// 6. Monitoring Stack (depends on Lambda, Database, API)
const monitoringStack = new MonitoringStack(app, `MemoryGame-Monitoring-${environment}`, {
  ...stackProps,
  environment,
  authFunction: lambdaStack.authFunction,
  gameFunction: lambdaStack.gameFunction,
  usersTable: databaseStack.usersTable,
  gamesTable: databaseStack.gamesTable,
  leaderboardsTable: databaseStack.leaderboardsTable,
  subscriptionsTable: databaseStack.subscriptionsTable,
  themesTable: databaseStack.themesTable,
  achievementsTable: databaseStack.achievementsTable,
  rateLimitsTable: databaseStack.rateLimitsTable,
  userSettingsTable: databaseStack.userSettingsTable,
  httpApi: apiStack.httpApi,
  alertEmail: process.env.ALERT_EMAIL,
});
monitoringStack.addDependency(lambdaStack);
monitoringStack.addDependency(databaseStack);
monitoringStack.addDependency(apiStack);

// Synthesize the app
app.synth();
