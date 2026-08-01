/**
 * Activation Email Lambda
 * Sends personalized activation emails to inactive users (zero games played)
 * encouraging them to play their first game on DashDen.
 * Triggered daily at 8am EST via EventBridge cron rule.
 */

import https from 'https';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' }));
const cognito = new CognitoIdentityProviderClient({ region: 'us-east-1' });
const secretsManager = new SecretsManagerClient({ region: 'us-east-1' });

const EMAIL_PREFS_TABLE = process.env.EMAIL_PREFS_TABLE_NAME || 'memory-game-email-prefs-prod';
const GAMES_TABLE = process.env.GAMES_TABLE_NAME || 'memory-game-games-prod';
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || 'us-east-1_FoWLQ5lmI';
const RESEND_API_KEY_SECRET = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = 'DashDen <admin@dashden.app>';
const APP_URL = 'https://dashden.app';

interface ActivationEmailResult {
  statusCode: number;
  body: string;
  summary: {
    totalCognitoUsers: number;
    inactiveUsers: number;
    optedOutUsers: number;
    eligibleUsers: number;
    emailsSent: number;
    emailsFailed: number;
  };
}

interface CognitoUser {
  userId: string;        // sub attribute
  email: string;         // email attribute
  username: string;      // preferred_username or name
  emailVerified: boolean;
}

/**
 * Determine whether a user is inactive based on their game count.
 * A user is inactive if and only if they have zero games played.
 */
export function isUserInactive(gameCount: number): boolean {
  return gameCount === 0;
}

/**
 * Determine whether a user is eligible to receive an activation email.
 * Eligible means: email is verified, user is inactive (zero games), and not opted out.
 */
export function isUserEligible(user: CognitoUser, gameCount: number, optedOut: boolean): boolean {
  return user.emailVerified && gameCount === 0 && !optedOut;
}

/**
 * Build the activation email HTML with personalized greeting.
 * Self-contained HTML with inline styles, DashDen branding, and responsive design.
 */
export function buildActivationEmailHTML(username: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #6366f1, #ec4899); border-radius: 16px 16px 0 0; padding: 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">🎮 DashDen</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 16px;">Your adventure awaits!</p>
    </div>
    <div style="background: white; padding: 32px; border-radius: 0 0 16px 16px;">
      <h2 style="margin: 0 0 16px; color: #1f2937; font-size: 22px;">Hey ${username}! 🚀</h2>
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
        You signed up for DashDen but haven't played yet — and we've got some awesome games waiting for you!
      </p>
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
        Try launching rockets in <strong>Space Entry</strong>, program robots in <strong>Code-a-Bot</strong>, solve problems in <strong>Math Challenge</strong>, or test your memory with <strong>Pattern Recall</strong>. Each game is a new adventure!
      </p>
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Jump in and play your first game today — it only takes a minute to get started. 🌟
      </p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${APP_URL}" target="_blank" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #6366f1, #7c3aed); color: #ffffff; text-decoration: none; font-weight: bold; font-size: 18px; border-radius: 12px; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
          Play Now 🎮
        </a>
      </div>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
      <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0 0 8px;">
        You're receiving this because you signed up for DashDen but haven't played yet.
      </p>
      <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0 0 8px;">
        <a href="{{UNSUBSCRIBE_URL}}" style="color: #6366f1;">Unsubscribe from activation emails</a>
      </p>
      <p style="color: #9ca3af; font-size: 11px; text-align: center; margin: 0;">
        DashDen &bull; dashden.app
      </p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Get a randomized activation email subject line.
 * Includes "DashDen" and a game-related emoji. Rotates to avoid email fatigue.
 * Accepts an optional username for personalization.
 */
export function getActivationEmailSubject(username?: string): string {
  const subjects = [
    '🚀 Your DashDen adventure is waiting!',
    `🎮 Ready to play${username ? `, ${username}` : ''}? DashDen has games for you!`,
    '⭐ Games are waiting for you on DashDen!',
    '🕹️ Come explore DashDen — your first game awaits!',
    `🌟 ${username ? `Hey ${username}, ` : ''}DashDen misses you!`,
  ];
  return subjects[Math.floor(Math.random() * subjects.length)];
}

/**
 * Retrieve the Resend API key from environment or Secrets Manager.
 */
async function getResendApiKey(): Promise<string> {
  if (RESEND_API_KEY_SECRET) {
    return RESEND_API_KEY_SECRET;
  }
  const secret = await secretsManager.send(
    new GetSecretValueCommand({ SecretId: 'dashden/resend-api-key' })
  );
  return secret.SecretString || '';
}

/**
 * Send an email via the Resend API.
 * Follows the same pattern as daily-email.ts.
 */
async function sendViaResend(to: string, subject: string, html: string, apiKey: string): Promise<void> {
  const body = JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html });
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.resend.com',
      path: '/emails',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) resolve();
        else reject(new Error(`Resend error ${res.statusCode}: ${data}`));
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/**
 * Query all verified users from the Cognito user pool with pagination.
 */
async function getAllCognitoUsers(): Promise<CognitoUser[]> {
  const users: CognitoUser[] = [];
  let paginationToken: string | undefined;

  do {
    const command = new ListUsersCommand({
      UserPoolId: COGNITO_USER_POOL_ID,
      Limit: 60,
      ...(paginationToken ? { PaginationToken: paginationToken } : {}),
    });

    const response = await cognito.send(command);

    if (response.Users) {
      for (const user of response.Users) {
        const attributes = user.Attributes || [];
        const getAttr = (name: string) => attributes.find(a => a.Name === name)?.Value || '';

        const sub = getAttr('sub');
        const email = getAttr('email');
        const preferredUsername = getAttr('preferred_username');
        const name = getAttr('name');
        const emailVerified = getAttr('email_verified') === 'true';

        if (sub && email) {
          users.push({
            userId: sub,
            email,
            username: preferredUsername || name || email.split('@')[0],
            emailVerified,
          });
        }
      }
    }

    paginationToken = response.PaginationToken;
  } while (paginationToken);

  return users;
}

/**
 * Get game count for a user from the games table.
 * Returns the count of game records (0 means inactive).
 */
async function getUserGameCount(userId: string): Promise<number> {
  const result = await ddb.send(new QueryCommand({
    TableName: GAMES_TABLE,
    KeyConditionExpression: 'userId = :uid',
    ExpressionAttributeValues: { ':uid': userId },
    Limit: 1,
    Select: 'COUNT',
  }));
  return result.Count || 0;
}

/**
 * Check if a user has opted out of activation emails.
 */
async function hasOptedOut(userId: string): Promise<boolean> {
  try {
    const result = await ddb.send(new GetCommand({
      TableName: EMAIL_PREFS_TABLE,
      Key: { userId },
    }));
    return result.Item?.activationEmailOptOut === true;
  } catch (err) {
    // Fail open — if we can't read preferences, assume not opted out
    console.warn(`[ActivationEmail] Failed to read email prefs for userId=${userId}:`, err);
    return false;
  }
}

export async function handler(): Promise<ActivationEmailResult> {
  const startTime = Date.now();
  console.log('[ActivationEmail] Run started');

  const summary = {
    totalCognitoUsers: 0,
    inactiveUsers: 0,
    optedOutUsers: 0,
    eligibleUsers: 0,
    emailsSent: 0,
    emailsFailed: 0,
  };

  try {
    const apiKey = await getResendApiKey();

    // 1. Get all verified Cognito users (paginated)
    const cognitoUsers = await getAllCognitoUsers();
    summary.totalCognitoUsers = cognitoUsers.length;

    // 2. Filter to inactive users (zero games played)
    const inactiveUsers: CognitoUser[] = [];
    for (const user of cognitoUsers) {
      try {
        const gameCount = await getUserGameCount(user.userId);
        if (isUserInactive(gameCount)) {
          inactiveUsers.push(user);
        }
      } catch (err) {
        console.warn(`[ActivationEmail] Failed to query games for userId=${user.userId}:`, err);
        // Skip this user on error
      }
    }
    summary.inactiveUsers = inactiveUsers.length;

    // 3. Check opt-out preferences
    const eligibleUsers: CognitoUser[] = [];
    for (const user of inactiveUsers) {
      const optedOut = await hasOptedOut(user.userId);
      if (isUserEligible(user, 0, optedOut)) {
        eligibleUsers.push(user);
      }
    }
    summary.optedOutUsers = summary.inactiveUsers - eligibleUsers.length;
    summary.eligibleUsers = eligibleUsers.length;

    // 4. Send activation emails to eligible users
    for (const user of eligibleUsers) {
      try {
        const html = buildActivationEmailHTML(user.username);
        const unsubscribeUrl = `${APP_URL}/unsubscribe?userId=${user.userId}&type=activation`;
        const personalizedHtml = html.replace('{{UNSUBSCRIBE_URL}}', unsubscribeUrl);
        const subject = getActivationEmailSubject(user.username);
        await sendViaResend(user.email, subject, personalizedHtml, apiKey);
        summary.emailsSent++;
      } catch (err: any) {
        const maskedEmail = user.email.replace(/(.{2}).*(@.*)/, '$1***$2');
        console.error(`[ActivationEmail] Failed to send to userId=${user.userId}:`, {
          error: err.message,
          userId: user.userId,
          email: maskedEmail,
        });
        summary.emailsFailed++;
      }
    }

    // 5. Log summary and return
    const durationMs = Date.now() - startTime;
    console.log('[ActivationEmail] Run complete:', { ...summary, durationMs });

    return {
      statusCode: 200,
      body: `Sent ${summary.emailsSent} activation emails, ${summary.emailsFailed} failed`,
      summary,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.error('[ActivationEmail] Run failed:', { error, durationMs });
    throw error;
  }
}
