import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const ses = new SESClient({ region: 'us-east-1' });
const FROM_EMAIL = 'no-reply@dashden.app';
const SUPPORT_EMAIL = 'diegotuleski@gmail.com';

interface ContactFormInput {
  type: 'bug' | 'feature' | 'question' | 'other';
  subject: string;
  message: string;
}

export class ContactService {
  async submitContactForm(userId: string, username: string, userEmail: string, input: ContactFormInput) {
    const { type, subject, message } = input;

    if (!subject?.trim() || !message?.trim()) {
      throw new Error('Subject and message are required');
    }
    if (subject.length > 200) throw new Error('Subject too long');
    if (message.length > 5000) throw new Error('Message too long');

    const typeLabel = { bug: '🐛 Bug Report', feature: '💡 Feature Request', question: '❓ Question', other: '📩 Other' }[type] || '📩 Contact';

    const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, sans-serif; background: #f3f4f6; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto;">
    <div style="background: linear-gradient(135deg, #6366f1, #ec4899); border-radius: 12px 12px 0 0; padding: 24px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 22px;">📬 DashDen Contact Form</h1>
    </div>
    <div style="background: white; padding: 24px; border-radius: 0 0 12px 12px;">
      <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
        <tr><td style="padding: 6px 0; color: #6b7280; width: 100px;">Type</td><td style="padding: 6px 0; font-weight: bold;">${typeLabel}</td></tr>
        <tr><td style="padding: 6px 0; color: #6b7280;">From</td><td style="padding: 6px 0; font-weight: bold;">${username} (${userEmail || 'no email'})</td></tr>
        <tr><td style="padding: 6px 0; color: #6b7280;">User ID</td><td style="padding: 6px 0; font-size: 12px; color: #9ca3af;">${userId}</td></tr>
      </table>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;">
      <h3 style="margin: 0 0 8px; color: #1f2937;">${subject}</h3>
      <p style="color: #374151; white-space: pre-wrap; line-height: 1.6;">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
      ${userEmail ? `<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;"><p style="font-size: 12px; color: #9ca3af;">Reply to: <a href="mailto:${userEmail}">${userEmail}</a></p>` : ''}
    </div>
  </div>
</body></html>`;

    await ses.send(new SendEmailCommand({
      Source: FROM_EMAIL,
      Destination: { ToAddresses: [SUPPORT_EMAIL] },
      ReplyToAddresses: userEmail ? [userEmail] : undefined,
      Message: {
        Subject: { Data: `[DashDen] ${typeLabel}: ${subject}` },
        Body: {
          Html: { Data: html },
          Text: { Data: `${typeLabel}\nFrom: ${username} (${userEmail})\n\nSubject: ${subject}\n\n${message}` },
        },
      },
    }));

    return { success: true };
  }
}
