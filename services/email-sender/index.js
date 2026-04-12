/**
 * Cognito Custom Email Sender Lambda
 * Intercepts Cognito email triggers and sends via Resend
 */

const https = require('https');

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'DashDen <no-reply@dashden.app>';
const APP_NAME = 'DashDen';

/**
 * Send email via Resend API
 */
async function sendEmail({ to, subject, html }) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html,
    });

    const options = {
      hostname: 'api.resend.com',
      path: '/emails',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`Resend API error ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/**
 * Build email HTML based on trigger type
 */
function buildEmail(triggerSource, codeOrLink, userAttributes) {
  const email = userAttributes?.email || '';
  const name = userAttributes?.name || userAttributes?.given_name || 'there';

  // Verification code email
  if (triggerSource === 'CustomEmailSender_SignUp' || 
      triggerSource === 'CustomEmailSender_ResendCode') {
    return {
      subject: `Your ${APP_NAME} verification code`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #4F46E5; font-size: 28px; margin: 0;">${APP_NAME}</h1>
            <p style="color: #6B7280; margin-top: 5px;">Your gaming hub</p>
          </div>
          <div style="background: #F9FAFB; border-radius: 12px; padding: 30px; text-align: center;">
            <h2 style="color: #111827; margin-top: 0;">Verify your email</h2>
            <p style="color: #374151;">Hi ${name}, use this code to verify your ${APP_NAME} account:</p>
            <div style="background: #4F46E5; color: white; font-size: 36px; font-weight: bold; letter-spacing: 8px; padding: 20px 40px; border-radius: 8px; display: inline-block; margin: 20px 0;">
              ${codeOrLink}
            </div>
            <p style="color: #6B7280; font-size: 14px;">This code expires in 24 hours. If you didn't create a ${APP_NAME} account, you can safely ignore this email.</p>
          </div>
          <p style="color: #9CA3AF; font-size: 12px; text-align: center; margin-top: 20px;">
            © ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
          </p>
        </div>
      `,
    };
  }

  // Forgot password / reset code
  if (triggerSource === 'CustomEmailSender_ForgotPassword') {
    return {
      subject: `Reset your ${APP_NAME} password`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #4F46E5; font-size: 28px; margin: 0;">${APP_NAME}</h1>
          </div>
          <div style="background: #F9FAFB; border-radius: 12px; padding: 30px; text-align: center;">
            <h2 style="color: #111827; margin-top: 0;">Reset your password</h2>
            <p style="color: #374151;">Hi ${name}, use this code to reset your ${APP_NAME} password:</p>
            <div style="background: #4F46E5; color: white; font-size: 36px; font-weight: bold; letter-spacing: 8px; padding: 20px 40px; border-radius: 8px; display: inline-block; margin: 20px 0;">
              ${codeOrLink}
            </div>
            <p style="color: #6B7280; font-size: 14px;">This code expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
          </div>
          <p style="color: #9CA3AF; font-size: 12px; text-align: center; margin-top: 20px;">
            © ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
          </p>
        </div>
      `,
    };
  }

  // MFA / other codes
  return {
    subject: `Your ${APP_NAME} security code`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #4F46E5; font-size: 28px; margin: 0;">${APP_NAME}</h1>
        </div>
        <div style="background: #F9FAFB; border-radius: 12px; padding: 30px; text-align: center;">
          <h2 style="color: #111827; margin-top: 0;">Your security code</h2>
          <div style="background: #4F46E5; color: white; font-size: 36px; font-weight: bold; letter-spacing: 8px; padding: 20px 40px; border-radius: 8px; display: inline-block; margin: 20px 0;">
            ${codeOrLink}
          </div>
        </div>
      </div>
    `,
  };
}

/**
 * Decrypt the code from Cognito (uses KMS encryption)
 */
async function decryptCode(encryptedCode) {
  // Cognito CustomEmailSender passes the code encrypted with KMS
  // We need to decrypt it using AWS KMS
  const { KMSClient, DecryptCommand } = require('@aws-sdk/client-kms');
  const kms = new KMSClient({ region: process.env.AWS_REGION || 'us-east-1' });
  
  const result = await kms.send(new DecryptCommand({
    CiphertextBlob: Buffer.from(encryptedCode, 'base64'),
    EncryptionContext: {
      'cognito-user-pool-id': process.env.COGNITO_USER_POOL_ID || '',
    },
  }));
  
  return Buffer.from(result.Plaintext).toString('utf-8');
}

exports.handler = async (event) => {
  console.log('CustomEmailSender triggered:', JSON.stringify({
    triggerSource: event.triggerSource,
    userPoolId: event.userPoolId,
    userName: event.userName,
  }));

  try {
    const { triggerSource, request } = event;
    const userAttributes = request?.userAttributes || {};
    const email = userAttributes.email;

    if (!email) {
      console.error('No email address found in user attributes');
      return event;
    }

    // Decrypt the code (Cognito encrypts it with KMS for CustomEmailSender)
    let code = request.code;
    if (code) {
      try {
        code = await decryptCode(code);
      } catch (err) {
        console.error('Failed to decrypt code, using as-is:', err.message);
        // If decryption fails, use the code as-is (may happen in test scenarios)
      }
    }

    const { subject, html } = buildEmail(triggerSource, code, userAttributes);

    await sendEmail({ to: email, subject, html });

    console.log(`Email sent successfully to ${email} for ${triggerSource}`);
  } catch (error) {
    console.error('Failed to send email:', error);
    // Don't throw — Cognito will retry and we don't want to block sign-up
  }

  return event;
};
