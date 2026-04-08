import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

export interface CognitoStackProps extends cdk.StackProps {
  environment: string;
}

/**
 * Cognito Stack
 * Provides user authentication and authorization
 */
export class CognitoStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, props: CognitoStackProps) {
    super(scope, id, props);

    // Create User Pool
    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: `MemoryGame-UserPool-${props.environment}`,
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
        username: false,
      },
      autoVerify: {
        email: true,
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      mfa: cognito.Mfa.OPTIONAL,
      mfaSecondFactor: {
        sms: true,
        otp: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
        givenName: {
          required: true,
          mutable: true,
        },
        familyName: {
          required: true,
          mutable: true,
        },
      },
      customAttributes: {
        tier: new cognito.StringAttribute({ mutable: true }),
      },
      userVerification: {
        emailSubject: 'Verify your email for DashDen',
        emailBody: 'Hello! Thanks for signing up for DashDen. Your verification code is {####}. Please enter this code to complete your registration.',
        emailStyle: cognito.VerificationEmailStyle.CODE,
      },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Create User Pool Client
    this.userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool: this.userPool,
      userPoolClientName: `MemoryGame-Client-${props.environment}`,
      authFlows: {
        userPassword: true,
        userSrp: true,
        custom: true,
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
          implicitCodeGrant: false,
        },
        scopes: [
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.PROFILE,
        ],
        callbackUrls: [
          `https://${props.environment === 'prod' ? 'app' : `app-${props.environment}`}.memorygame.com/callback`,
          'http://localhost:3000/callback', // For local development
        ],
        logoutUrls: [
          `https://${props.environment === 'prod' ? 'app' : `app-${props.environment}`}.memorygame.com/logout`,
          'http://localhost:3000/logout',
        ],
      },
      preventUserExistenceErrors: true,
      generateSecret: false, // No secret for public clients (web/mobile)
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
      refreshTokenValidity: cdk.Duration.days(30),
    });

    // Add Google OAuth provider
    // COMMENTED OUT: OAuth not configured yet - need to set up Google/Facebook apps first
    /*
    const googleProvider = new cognito.UserPoolIdentityProviderGoogle(this, 'GoogleProvider', {
      userPool: this.userPool,
      clientId: cdk.Fn.sub('${GoogleClientId}'), // From SSM Parameter or Secrets Manager
      clientSecretValue: cdk.SecretValue.secretsManager('google-oauth-secret'),
      scopes: ['profile', 'email', 'openid'],
      attributeMapping: {
        email: cognito.ProviderAttribute.GOOGLE_EMAIL,
        givenName: cognito.ProviderAttribute.GOOGLE_GIVEN_NAME,
        familyName: cognito.ProviderAttribute.GOOGLE_FAMILY_NAME,
      },
    });

    // Add Facebook OAuth provider
    const facebookProvider = new cognito.UserPoolIdentityProviderFacebook(this, 'FacebookProvider', {
      userPool: this.userPool,
      clientId: cdk.Fn.sub('${FacebookAppId}'),
      clientSecret: cdk.Fn.sub('${FacebookAppSecret}'),
      scopes: ['public_profile', 'email'],
      attributeMapping: {
        email: cognito.ProviderAttribute.FACEBOOK_EMAIL,
        givenName: cognito.ProviderAttribute.FACEBOOK_NAME,
      },
    });

    // User Pool Client depends on providers
    this.userPoolClient.node.addDependency(googleProvider);
    this.userPoolClient.node.addDependency(facebookProvider);
    */

    // Add User Pool Domain
    const domain = this.userPool.addDomain('Domain', {
      cognitoDomain: {
        domainPrefix: `memory-game-${props.environment}`,
      },
    });

    // Outputs
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      description: 'Cognito User Pool ID',
      exportName: `MemoryGame-UserPoolId-${props.environment}`,
    });

    new cdk.CfnOutput(this, 'UserPoolArn', {
      value: this.userPool.userPoolArn,
      description: 'Cognito User Pool ARN',
      exportName: `MemoryGame-UserPoolArn-${props.environment}`,
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
      exportName: `MemoryGame-UserPoolClientId-${props.environment}`,
    });

    new cdk.CfnOutput(this, 'UserPoolDomain', {
      value: domain.domainName,
      description: 'Cognito User Pool Domain',
      exportName: `MemoryGame-UserPoolDomain-${props.environment}`,
    });

    // Tags
    cdk.Tags.of(this).add('Environment', props.environment);
    cdk.Tags.of(this).add('Stack', 'Cognito');
  }
}
