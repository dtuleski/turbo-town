import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environment-config';

export interface DatabaseStackProps extends cdk.StackProps {
  config: EnvironmentConfig;
}

export class DatabaseStack extends cdk.Stack {
  public readonly usersTable: dynamodb.Table;
  public readonly gamesTable: dynamodb.Table;
  public readonly gameCatalogTable: dynamodb.Table;
  public readonly leaderboardsTable: dynamodb.Table;
  public readonly subscriptionsTable: dynamodb.Table;
  public readonly themesTable: dynamodb.Table;
  public readonly achievementsTable: dynamodb.Table;
  public readonly rateLimitsTable: dynamodb.Table;
  public readonly userSettingsTable: dynamodb.Table;
  public readonly languageWordsTable: dynamodb.Table;
  public readonly languageProgressTable: dynamodb.Table;
  public readonly languageResultsTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    const { environment } = props.config;

    // Users Table
    this.usersTable = new dynamodb.Table(this, 'UsersTable', {
      tableName: `memory-game-users-${environment}`,
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    this.usersTable.addGlobalSecondaryIndex({
      indexName: 'EmailIndex',
      partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
    });

    this.usersTable.addGlobalSecondaryIndex({
      indexName: 'CognitoIdIndex',
      partitionKey: { name: 'cognitoId', type: dynamodb.AttributeType.STRING },
    });

    // Games Table
    this.gamesTable = new dynamodb.Table(this, 'GamesTable', {
      tableName: `memory-game-games-${environment}`,
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'gameId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    this.gamesTable.addGlobalSecondaryIndex({
      indexName: 'ThemeIndex',
      partitionKey: { name: 'themeId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'completedAt', type: dynamodb.AttributeType.STRING },
    });

    this.gamesTable.addGlobalSecondaryIndex({
      indexName: 'StatusIndex',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'startedAt', type: dynamodb.AttributeType.STRING },
    });

    // Game Catalog Table (available games in the hub)
    this.gameCatalogTable = new dynamodb.Table(this, 'GameCatalogTable', {
      tableName: `memory-game-catalog-${environment}`,
      partitionKey: { name: 'gameId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    this.gameCatalogTable.addGlobalSecondaryIndex({
      indexName: 'StatusIndex',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'displayOrder', type: dynamodb.AttributeType.NUMBER },
    });

    // Leaderboards Table
    this.leaderboardsTable = new dynamodb.Table(this, 'LeaderboardsTable', {
      tableName: `memory-game-leaderboards-${environment}`,
      partitionKey: { 
        name: 'themeIdDifficultyPeriod', 
        type: dynamodb.AttributeType.STRING 
      },
      sortKey: { 
        name: 'scoreUserId', 
        type: dynamodb.AttributeType.STRING 
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    this.leaderboardsTable.addGlobalSecondaryIndex({
      indexName: 'UserIndex',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'achievedAt', type: dynamodb.AttributeType.STRING },
    });

    // Subscriptions Table
    this.subscriptionsTable = new dynamodb.Table(this, 'SubscriptionsTable', {
      tableName: `memory-game-subscriptions-${environment}`,
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    this.subscriptionsTable.addGlobalSecondaryIndex({
      indexName: 'StripeCustomerIndex',
      partitionKey: { name: 'stripeCustomerId', type: dynamodb.AttributeType.STRING },
    });

    this.subscriptionsTable.addGlobalSecondaryIndex({
      indexName: 'StatusIndex',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'currentPeriodEnd', type: dynamodb.AttributeType.STRING },
    });

    // Themes Table
    this.themesTable = new dynamodb.Table(this, 'ThemesTable', {
      tableName: `memory-game-themes-${environment}`,
      partitionKey: { name: 'themeId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    this.themesTable.addGlobalSecondaryIndex({
      indexName: 'CategoryIndex',
      partitionKey: { name: 'category', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'publishedAt', type: dynamodb.AttributeType.STRING },
    });

    this.themesTable.addGlobalSecondaryIndex({
      indexName: 'StatusIndex',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'publishedAt', type: dynamodb.AttributeType.STRING },
    });

    // Achievements Table
    this.achievementsTable = new dynamodb.Table(this, 'AchievementsTable', {
      tableName: `memory-game-achievements-${environment}`,
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'achievementType', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // RateLimits Table
    this.rateLimitsTable = new dynamodb.Table(this, 'RateLimitsTable', {
      tableName: `memory-game-rate-limits-${environment}`,
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      timeToLiveAttribute: 'resetAt',
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // UserSettings Table
    this.userSettingsTable = new dynamodb.Table(this, 'UserSettingsTable', {
      tableName: `memory-game-user-settings-${environment}`,
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Language Words Table
    this.languageWordsTable = new dynamodb.Table(this, 'LanguageWordsTable', {
      tableName: `memory-game-language-words-${environment}`,
      partitionKey: { name: 'wordId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    this.languageWordsTable.addGlobalSecondaryIndex({
      indexName: 'CategoryIndex',
      partitionKey: { name: 'category', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'difficulty', type: dynamodb.AttributeType.STRING },
    });

    this.languageWordsTable.addGlobalSecondaryIndex({
      indexName: 'LanguageIndex',
      partitionKey: { name: 'languageCode', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'category', type: dynamodb.AttributeType.STRING },
    });

    // Language Progress Table
    this.languageProgressTable = new dynamodb.Table(this, 'LanguageProgressTable', {
      tableName: `memory-game-language-progress-${environment}`,
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'languageCode', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Language Game Results Table
    this.languageResultsTable = new dynamodb.Table(this, 'LanguageResultsTable', {
      tableName: `memory-game-language-results-${environment}`,
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'gameId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    this.languageResultsTable.addGlobalSecondaryIndex({
      indexName: 'LanguageIndex',
      partitionKey: { name: 'languageCode', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'completedAt', type: dynamodb.AttributeType.STRING },
    });

    // Outputs
    new cdk.CfnOutput(this, 'UsersTableName', {
      value: this.usersTable.tableName,
      exportName: `MemoryGame${environment.charAt(0).toUpperCase() + environment.slice(1)}-UsersTableName`,
    });

    new cdk.CfnOutput(this, 'GamesTableName', {
      value: this.gamesTable.tableName,
      exportName: `MemoryGame${environment.charAt(0).toUpperCase() + environment.slice(1)}-GamesTableName`,
    });

    new cdk.CfnOutput(this, 'LanguageWordsTableName', {
      value: this.languageWordsTable.tableName,
      exportName: `MemoryGame${environment.charAt(0).toUpperCase() + environment.slice(1)}-LanguageWordsTableName`,
    });

    new cdk.CfnOutput(this, 'LanguageProgressTableName', {
      value: this.languageProgressTable.tableName,
      exportName: `MemoryGame${environment.charAt(0).toUpperCase() + environment.slice(1)}-LanguageProgressTableName`,
    });

    new cdk.CfnOutput(this, 'LanguageResultsTableName', {
      value: this.languageResultsTable.tableName,
      exportName: `MemoryGame${environment.charAt(0).toUpperCase() + environment.slice(1)}-LanguageResultsTableName`,
    });
  }
}
