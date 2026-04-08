import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as events from 'aws-cdk-lib/aws-events';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as path from 'path';

export interface LambdaStackProps extends cdk.StackProps {
  environment: string;
  // Database tables
  usersTable: dynamodb.Table;
  gamesTable: dynamodb.Table;
  gameCatalogTable: dynamodb.Table;
  leaderboardsTable: dynamodb.Table;
  subscriptionsTable: dynamodb.Table;
  themesTable: dynamodb.Table;
  achievementsTable: dynamodb.Table;
  rateLimitsTable: dynamodb.Table;
  userSettingsTable: dynamodb.Table;
  languageWordsTable: dynamodb.Table;
  languageProgressTable: dynamodb.Table;
  languageResultsTable: dynamodb.Table;
  // Cognito
  userPool: cognito.UserPool;
  userPoolClient: cognito.UserPoolClient;
  // EventBridge
  eventBus: events.EventBus;
}

/**
 * Lambda Stack
 * All Lambda functions for microservices
 */
export class LambdaStack extends cdk.Stack {
  public readonly authFunction: lambda.Function;
  public readonly gameFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id, props);

    // Resolve project root (works from both src and dist)
    const projectRoot = path.resolve(__dirname, '..', '..', '..');
    const servicesRoot = path.resolve(projectRoot, '..');

    // Auth Service Lambda with NodejsFunction for automatic bundling
    this.authFunction = new nodejs.NodejsFunction(this, 'AuthFunction', {
      functionName: `MemoryGame-AuthService-${props.environment}`,
      description: 'Authentication service - user registration, login, profile management',
      entry: path.join(servicesRoot, 'services/auth/src/index.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 512,
      timeout: cdk.Duration.seconds(30),
      tracing: lambda.Tracing.ACTIVE,
      environment: {
        NODE_ENV: props.environment,
        COGNITO_USER_POOL_ID: props.userPool.userPoolId,
        COGNITO_CLIENT_ID: props.userPoolClient.userPoolClientId,
        USERS_TABLE_NAME: props.usersTable.tableName,
        USER_SETTINGS_TABLE_NAME: props.userSettingsTable.tableName,
        LOG_LEVEL: props.environment === 'prod' ? 'INFO' : 'DEBUG',
      },
      bundling: {
        minify: props.environment === 'prod',
        sourceMap: true,
        // Bundle everything including @memory-game/shared - don't exclude it
        externalModules: ['@aws-sdk/*'],
        forceDockerBundling: false,
        format: nodejs.OutputFormat.CJS, // Force CommonJS output
        // Ensure the shared package is properly resolved
        tsconfig: path.join(servicesRoot, 'services/auth/tsconfig.json'),
      },
      logRetention: logs.RetentionDays.ONE_MONTH,
    });

    // Grant Auth Lambda permissions
    this.authFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'dynamodb:GetItem',
          'dynamodb:PutItem',
          'dynamodb:UpdateItem',
          'dynamodb:DeleteItem',
          'dynamodb:Query',
          'dynamodb:Scan',
        ],
        resources: [
          props.usersTable.tableArn,
          `${props.usersTable.tableArn}/index/*`,
          props.userSettingsTable.tableArn,
        ],
      })
    );

    this.authFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'cognito-idp:AdminGetUser',
          'cognito-idp:AdminCreateUser',
          'cognito-idp:AdminUpdateUserAttributes',
          'cognito-idp:AdminDeleteUser',
          'cognito-idp:AdminInitiateAuth',
          'cognito-idp:AdminSetUserPassword',
          'cognito-idp:AdminConfirmSignUp',
        ],
        resources: [props.userPool.userPoolArn],
      })
    );

    this.authFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['cloudwatch:PutMetricData'],
        resources: ['*'],
      })
    );

    // Game Service Lambda with NodejsFunction for automatic bundling
    this.gameFunction = new nodejs.NodejsFunction(this, 'GameFunction', {
      functionName: `MemoryGame-GameService-${props.environment}`,
      description: 'Game service - gameplay, achievements, statistics',
      entry: path.join(servicesRoot, 'services/game/src/index.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(30),
      tracing: lambda.Tracing.ACTIVE,
      environment: {
        NODE_ENV: props.environment,
        GAMES_TABLE_NAME: props.gamesTable.tableName,
        GAME_CATALOG_TABLE_NAME: props.gameCatalogTable.tableName,
        RATE_LIMITS_TABLE_NAME: props.rateLimitsTable.tableName,
        ACHIEVEMENTS_TABLE_NAME: props.achievementsTable.tableName,
        THEMES_TABLE_NAME: props.themesTable.tableName,
        SUBSCRIPTIONS_TABLE_NAME: props.subscriptionsTable.tableName,
        LANGUAGE_WORDS_TABLE_NAME: props.languageWordsTable.tableName,
        LANGUAGE_PROGRESS_TABLE_NAME: props.languageProgressTable.tableName,
        LANGUAGE_RESULTS_TABLE_NAME: props.languageResultsTable.tableName,
        COGNITO_USER_POOL_ID: props.userPool.userPoolId,
        EVENT_BUS_NAME: props.eventBus.eventBusName,
        LOG_LEVEL: props.environment === 'prod' ? 'INFO' : 'DEBUG',
        STRIPE_SECRET_KEY_ARN: `arn:aws:secretsmanager:us-east-1:848403890404:secret:${props.environment}/stripe/secret-key`,
        STRIPE_WEBHOOK_SECRET_ARN: `arn:aws:secretsmanager:us-east-1:848403890404:secret:${props.environment}/stripe/webhook-secret`,
        FRONTEND_URL: props.environment === 'prod' ? 'https://dashden.app' : 'https://dev.dashden.app',
      },
      bundling: {
        minify: props.environment === 'prod',
        sourceMap: true,
        // Bundle everything including @memory-game/shared - don't exclude it
        externalModules: ['@aws-sdk/*'],
        forceDockerBundling: false,
        format: nodejs.OutputFormat.CJS, // Force CommonJS output
        // Ensure the shared package is properly resolved
        tsconfig: path.join(servicesRoot, 'services/game/tsconfig.json'),
      },
      logRetention: logs.RetentionDays.ONE_MONTH,
    });

    // Grant Game Lambda permissions
    this.gameFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'dynamodb:GetItem',
          'dynamodb:PutItem',
          'dynamodb:UpdateItem',
          'dynamodb:DeleteItem',
          'dynamodb:Query',
          'dynamodb:Scan',
          'dynamodb:BatchGetItem',
          'dynamodb:BatchWriteItem',
        ],
        resources: [
          props.gamesTable.tableArn,
          `${props.gamesTable.tableArn}/index/*`,
          props.gameCatalogTable.tableArn,
          `${props.gameCatalogTable.tableArn}/index/*`,
          props.rateLimitsTable.tableArn,
          props.achievementsTable.tableArn,
          props.themesTable.tableArn,
          `${props.themesTable.tableArn}/index/*`,
          props.subscriptionsTable.tableArn,
          `${props.subscriptionsTable.tableArn}/index/*`,
          props.languageWordsTable.tableArn,
          `${props.languageWordsTable.tableArn}/index/*`,
          props.languageProgressTable.tableArn,
          props.languageResultsTable.tableArn,
          `${props.languageResultsTable.tableArn}/index/*`,
        ],
      })
    );

    this.gameFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['events:PutEvents'],
        resources: [props.eventBus.eventBusArn],
      })
    );

    this.gameFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['cloudwatch:PutMetricData'],
        resources: ['*'],
      })
    );

    this.gameFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'cognito-idp:ListUsers',
          'cognito-idp:AdminGetUser',
        ],
        resources: [props.userPool.userPoolArn],
      })
    );

    // Grant Game Lambda access to Stripe secrets in Secrets Manager
    this.gameFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['secretsmanager:GetSecretValue'],
        resources: [
          `arn:aws:secretsmanager:us-east-1:848403890404:secret:${props.environment}/stripe/*`,
        ],
      })
    );

    // Outputs
    new cdk.CfnOutput(this, 'AuthFunctionArn', {
      value: this.authFunction.functionArn,
      description: 'Auth Service Lambda ARN',
      exportName: `MemoryGame-AuthFunctionArn-${props.environment}`,
    });

    new cdk.CfnOutput(this, 'AuthFunctionName', {
      value: this.authFunction.functionName,
      description: 'Auth Service Lambda Name',
      exportName: `MemoryGame-AuthFunctionName-${props.environment}`,
    });

    new cdk.CfnOutput(this, 'GameFunctionArn', {
      value: this.gameFunction.functionArn,
      description: 'Game Service Lambda ARN',
      exportName: `MemoryGame-GameFunctionArn-${props.environment}`,
    });

    new cdk.CfnOutput(this, 'GameFunctionName', {
      value: this.gameFunction.functionName,
      description: 'Game Service Lambda Name',
      exportName: `MemoryGame-GameFunctionName-${props.environment}`,
    });

    // Tags
    cdk.Tags.of(this).add('Environment', props.environment);
    cdk.Tags.of(this).add('Stack', 'Lambda');
  }
}
