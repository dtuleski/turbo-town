import * as cdk from 'aws-cdk-lib';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayv2Authorizers from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as apigatewayv2Integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export interface ApiStackProps extends cdk.StackProps {
  environment: string;
  authLambda: lambda.Function;
  gameLambda: lambda.Function;
  leaderboardLambda: lambda.Function; // NEW
  userPool: cognito.UserPool;
  userPoolClient: cognito.UserPoolClient;
}

/**
 * API Gateway Stack
 * HTTP API with Cognito JWT authorizer and Lambda integrations
 */
export class ApiStack extends cdk.Stack {
  public readonly httpApi: apigatewayv2.HttpApi;
  public readonly apiUrl: string;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    // Create Cognito JWT Authorizer
    const authorizer = new apigatewayv2Authorizers.HttpUserPoolAuthorizer(
      'CognitoAuthorizer',
      props.userPool,
      {
        userPoolClients: [props.userPoolClient],
        identitySource: ['$request.header.Authorization'],
      }
    );

    // Create HTTP API
    this.httpApi = new apigatewayv2.HttpApi(this, 'HttpApi', {
      apiName: `MemoryGame-API-${props.environment}`,
      description: 'Memory Game GraphQL API',
      corsPreflight: {
        allowOrigins: [
          ...(props.environment === 'prod'
            ? ['https://dashden.app', 'https://www.dashden.app']
            : [`https://dev.dashden.app`]),
          'http://localhost:3000', // For local development
          'http://localhost:5173', // Vite dev server
        ],
        allowMethods: [
          apigatewayv2.CorsHttpMethod.GET,
          apigatewayv2.CorsHttpMethod.POST,
          apigatewayv2.CorsHttpMethod.OPTIONS,
        ],
        allowHeaders: [
          'Content-Type',
          'Authorization',
          'X-Amz-Date',
          'X-Api-Key',
          'X-Amz-Security-Token',
        ],
        allowCredentials: true,
        maxAge: cdk.Duration.hours(1),
      },
      createDefaultStage: true,
      defaultDomainMapping: undefined,
    });

    // Create Lambda integrations
    const authIntegration = new apigatewayv2Integrations.HttpLambdaIntegration(
      'AuthIntegration',
      props.authLambda,
      {
        payloadFormatVersion: apigatewayv2.PayloadFormatVersion.VERSION_2_0,
      }
    );

    const gameIntegration = new apigatewayv2Integrations.HttpLambdaIntegration(
      'GameIntegration',
      props.gameLambda,
      {
        payloadFormatVersion: apigatewayv2.PayloadFormatVersion.VERSION_2_0,
      }
    );

    const leaderboardIntegration = new apigatewayv2Integrations.HttpLambdaIntegration(
      'LeaderboardIntegration',
      props.leaderboardLambda,
      {
        payloadFormatVersion: apigatewayv2.PayloadFormatVersion.VERSION_2_0,
      }
    );

    // Add routes
    // Auth Service routes (public - no authorizer for login/register)
    this.httpApi.addRoutes({
      path: '/auth/graphql',
      methods: [apigatewayv2.HttpMethod.POST],
      integration: authIntegration,
    });

    // Game Service routes (protected - requires Cognito JWT)
    this.httpApi.addRoutes({
      path: '/game/graphql',
      methods: [apigatewayv2.HttpMethod.POST],
      integration: gameIntegration,
      authorizer: authorizer,
    });

    // Leaderboard Service routes (protected - requires Cognito JWT)
    this.httpApi.addRoutes({
      path: '/leaderboard/graphql',
      methods: [apigatewayv2.HttpMethod.POST],
      integration: leaderboardIntegration,
      authorizer: authorizer,
    });

    // Create CloudWatch Log Group for API Gateway access logs
    const logGroup = new logs.LogGroup(this, 'ApiAccessLogs', {
      logGroupName: `/aws/apigateway/memory-game-${props.environment}`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Configure default stage with logging and throttling
    const defaultStage = this.httpApi.defaultStage?.node.defaultChild as apigatewayv2.CfnStage;
    if (defaultStage) {
      defaultStage.accessLogSettings = {
        destinationArn: logGroup.logGroupArn,
        format: JSON.stringify({
          requestId: '$context.requestId',
          ip: '$context.identity.sourceIp',
          requestTime: '$context.requestTime',
          httpMethod: '$context.httpMethod',
          routeKey: '$context.routeKey',
          status: '$context.status',
          protocol: '$context.protocol',
          responseLength: '$context.responseLength',
          errorMessage: '$context.error.message',
          errorType: '$context.error.messageString',
          integrationError: '$context.integrationErrorMessage',
        }),
      };

      // Throttling settings
      defaultStage.defaultRouteSettings = {
        throttlingBurstLimit: 500,
        throttlingRateLimit: 200,
      };
    }

    // Store API URL
    this.apiUrl = this.httpApi.apiEndpoint;

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.apiUrl,
      description: 'HTTP API Gateway URL',
      exportName: `MemoryGame-ApiUrl-${props.environment}`,
    });

    new cdk.CfnOutput(this, 'ApiId', {
      value: this.httpApi.apiId,
      description: 'HTTP API Gateway ID',
      exportName: `MemoryGame-ApiId-${props.environment}`,
    });

    new cdk.CfnOutput(this, 'AuthEndpoint', {
      value: `${this.apiUrl}/auth/graphql`,
      description: 'Auth Service GraphQL Endpoint',
      exportName: `MemoryGame-AuthEndpoint-${props.environment}`,
    });

    new cdk.CfnOutput(this, 'GameEndpoint', {
      value: `${this.apiUrl}/game/graphql`,
      description: 'Game Service GraphQL Endpoint',
      exportName: `MemoryGame-GameEndpoint-${props.environment}`,
    });

    new cdk.CfnOutput(this, 'LeaderboardEndpoint', {
      value: `${this.apiUrl}/leaderboard/graphql`,
      description: 'Leaderboard Service GraphQL Endpoint',
      exportName: `MemoryGame-LeaderboardEndpoint-${props.environment}`,
    });

    // Tags
    cdk.Tags.of(this).add('Environment', props.environment);
    cdk.Tags.of(this).add('Stack', 'API');
  }
}
