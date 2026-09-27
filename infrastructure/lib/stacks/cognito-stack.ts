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
      userPoolName: `DashDen-UserPool-${props.environment}`,
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
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

    // ═══════════════════════════════════════════════════════════════════════
    // ⚠️  DRIFT WARNING — READ BEFORE `cdk deploy` (prod pool us-east-1_FoWLQ5lmI)
    // ───────────────────────────────────────────────────────────────────────
    // The LIVE prod Cognito resources managed by this stack were hand-edited
    // via console/CLI and diverged from this source. This file has been
    // reconciled to match live (real dashden.app callback URLs incl. the
    // mobile `dashdenmobile://` redirect, and a Google IdP block below), BUT:
    //
    //   • The Google IdP block is left COMMENTED OUT — enabling it requires a
    //     Secrets Manager secret that does not exist yet (see its note).
    //   • Some Cognito UserPool properties are REPLACEMENT-FORCING. A careless
    //     deploy can create a NEW empty pool and orphan the current one,
    //     locking out ALL production users.
    //
    // Before deploying: run `cdk diff`, confirm the change is IN-PLACE (no
    // "requires replacement"), ideally rehearse on a non-prod pool.
    // ═══════════════════════════════════════════════════════════════════════

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
        // NOTE: These URLs reconcile the CDK with the LIVE prod app client
        // (which was hand-edited via console/CLI). See the DRIFT WARNING at the
        // top of the oAuth config comment. Do NOT deploy without a verified,
        // non-replacing `cdk diff`.
        callbackUrls: [
          'http://localhost:3000',
          'http://localhost:3000/callback',
          'http://localhost:5173',
          'http://localhost:5173/callback',
          'https://dashden.app',
          'https://dashden.app/',
          'https://dashden.app/callback',
          'https://dev.dashden.app',
          'https://dev.dashden.app/callback',
          'https://www.dashden.app',
          'https://www.dashden.app/',
          'https://www.dashden.app/callback',
          'dashdenmobile://callback', // mobile (Flutter) OAuth redirect
        ],
        logoutUrls: [
          'http://localhost:3000',
          'http://localhost:5173',
          'https://dashden.app',
          'https://dev.dashden.app',
          'https://www.dashden.app',
          'dashdenmobile://signout', // mobile (Flutter) OAuth sign-out
        ],
      },
      preventUserExistenceErrors: true,
      generateSecret: false, // No secret for public clients (web/mobile)
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
      refreshTokenValidity: cdk.Duration.days(30),
    });

    // ── Google OAuth provider (reconciled with LIVE prod) ───────────────────
    //
    // ⚠️ This is present in prod (configured manually via console/CLI), NOT
    // previously in this stack. It is added here to reduce drift, but:
    //
    //   1. The Google client secret is NOT in Secrets Manager yet. Before any
    //      deploy, create it, e.g.:
    //        aws secretsmanager create-secret --name dashden/google-oauth-client-secret \
    //          --secret-string '<google-oauth-client-secret>' --profile dashden-new
    //   2. Live Google client_id:
    //        491352743210-onqjcrtpm8mvp82t3t919qgmecv22a59.apps.googleusercontent.com
    //   3. Live scopes: "openid email profile"; mapping: email/given_name/family_name/name.
    //
    // Only enable this block after a `cdk diff` confirms an in-place (NON-
    // replacing) update. See the DRIFT WARNING comment above.
    /*
    const googleProvider = new cognito.UserPoolIdentityProviderGoogle(this, 'GoogleProvider', {
      userPool: this.userPool,
      clientId: '491352743210-onqjcrtpm8mvp82t3t919qgmecv22a59.apps.googleusercontent.com',
      clientSecretValue: cdk.SecretValue.secretsManager('dashden/google-oauth-client-secret'),
      scopes: ['openid', 'email', 'profile'],
      attributeMapping: {
        email: cognito.ProviderAttribute.GOOGLE_EMAIL,
        givenName: cognito.ProviderAttribute.GOOGLE_GIVEN_NAME,
        familyName: cognito.ProviderAttribute.GOOGLE_FAMILY_NAME,
        custom: { name: cognito.ProviderAttribute.other('name') },
      },
    });
    this.userPoolClient.node.addDependency(googleProvider);
    */

    // Add User Pool Domain
    const domain = this.userPool.addDomain('Domain', {
      cognitoDomain: {
        domainPrefix: `dashden-${props.environment}`,
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
