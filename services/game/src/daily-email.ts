/**
 * Daily Email Digest Lambda
 * Sends personalized email digests to opted-in users via SES.
 */

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const ses = new SESClient({ region: 'us-east-1' });
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' }));

const EMAIL_PREFS_TABLE = process.env.EMAIL_PREFS_TABLE_NAME || 'memory-game-email-prefs-prod';
const LEADERBOARD_TABLE = process.env.LEADERBOARD_TABLE_NAME || 'memory-game-leaderboard-entries-prod';
const AGGREGATES_TABLE = process.env.AGGREGATES_TABLE_NAME || 'memory-game-user-aggregates-prod';
const FROM_EMAIL = 'no-reply@dashden.app';
const APP_URL = 'https://dashden.app';

const ALL_GAMES = [
  'MEMORY_MATCH', 'MATH_CHALLENGE', 'WORD_PUZZLE', 'LANGUAGE_LEARNING',
  'SUDOKU', 'JIGSAW_PUZZLE', 'BUBBLE_POP', 'SEQUENCE_MEMORY', 'CODE_A_BOT',
  'GEO_QUIZ', 'HISTORY_QUIZ', 'CIVICS_QUIZ', 'HANGMAN', 'TIC_TAC_TOE',
];

const GAME_NAMES: Record<string, string> = {
  MEMORY_MATCH: '🃏 Memory Match', MATH_CHALLENGE: '🧮 Math Challenge',
  WORD_PUZZLE: '🔤 Word Puzzle', LANGUAGE_LEARNING: '🌍 Language Learning',
  SUDOKU: '9️⃣ Sudoku', JIGSAW_PUZZLE: '🧩 Jigsaw Puzzle',
  BUBBLE_POP: '🫧 Bubble Pop', SEQUENCE_MEMORY: '🧠 Sequence Memory',
  CODE_A_BOT: '🤖 Code-a-Bot', GEO_QUIZ: '🌍 Geo Quiz',
  HISTORY_QUIZ: '📜 History Quiz', CIVICS_QUIZ: '🇺🇸 Civics Quiz',
  HANGMAN: '🪢 Hangman', TIC_TAC_TOE: '❌ Tic Tac Toe',
};

interface EmailPrefs { userId: string; email: string; username: string; dailyDigest: boolean }
interface LeaderboardEntry { userId: string; username: string; score: number; gameType: string; date: string }
interface Aggregate { userId: string; gameType: string; username: string; bestScore: number; gamesPlayed: number }

export async function handler() {
  console.log('Daily email digest started');
  try {
    // 1. Get opted-in users
    const prefsResult = await ddb.send(new ScanCommand({
      TableName: EMAIL_PREFS_TABLE,
      FilterExpression: 'dailyDigest = :yes',
      ExpressionAttributeValues: { ':yes': true },
    }));
    const users = (prefsResult.Items || []) as EmailPrefs[];
    if (users.length === 0) return { statusCode: 200, body: 'No users to email' };

    // 2. Get today's entries
    const today = new Date().toISOString().split('T')[0];
    const entriesResult = await ddb.send(new ScanCommand({ TableName: LEADERBOARD_TABLE, Limit: 500 }));
    const allEntries = (entriesResult.Items || []) as LeaderboardEntry[];
    const todayEntries = allEntries.filter(e => e.date === today);
    const topToday = todayEntries.sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 5);

    // 3. Get all aggregates (for personal stats)
    const aggResult = await ddb.send(new ScanCommand({ TableName: AGGREGATES_TABLE, Limit: 1000 }));
    const allAggregates = (aggResult.Items || []) as Aggregate[];

    // 4. Send personalized emails
    let sent = 0, failed = 0;
    for (const user of users) {
      if (!user.email) continue;
      try {
        // Personal stats
        const userAggs = allAggregates.filter(a => a.userId === user.userId);
        const gamesPlayed = userAggs.map(a => a.gameType);
        const gamesNotPlayed = ALL_GAMES.filter(g => !gamesPlayed.includes(g));
        const userTodayEntries = todayEntries.filter(e => e.userId === user.userId);
        const todayGamesCount = userTodayEntries.length;

        // User's rank today
        let rankInfo = '';
        if (todayEntries.length > 0) {
          const userBestToday = userTodayEntries.sort((a, b) => b.score - a.score)[0];
          if (userBestToday) {
            const rank = todayEntries.filter(e => e.score > userBestToday.score).length + 1;
            const leader = topToday[0];
            if (rank === 1) {
              rankInfo = "🥇 You're #1 today! Can you hold the top spot?";
            } else if (leader) {
              const gap = leader.score - userBestToday.score;
              rankInfo = `📊 You're #${rank} today — just ${gap.toLocaleString()} points behind ${leader.username}!`;
            }
          }
        }

        // Someone beat their high score?
        let beatInfo = '';
        for (const agg of userAggs) {
          const othersInGame = allAggregates.filter(a => a.gameType === agg.gameType && a.userId !== user.userId && a.bestScore > agg.bestScore);
          if (othersInGame.length > 0) {
            const top = othersInGame.sort((a, b) => b.bestScore - a.bestScore)[0];
            beatInfo = `⚡ ${top.username} has a higher score than you in ${GAME_NAMES[agg.gameType] || agg.gameType} — can you beat ${top.bestScore.toLocaleString()}?`;
            break;
          }
        }

        // Games not tried
        let tryInfo = '';
        if (gamesNotPlayed.length > 0) {
          const suggestions = gamesNotPlayed.slice(0, 3).map(g => GAME_NAMES[g] || g);
          tryInfo = `🆕 You haven't tried: ${suggestions.join(', ')}`;
        }

        // Activity status
        let activityInfo = '';
        if (todayGamesCount === 0) {
          activityInfo = "😴 You haven't played today — jump in and climb the ranks!";
        } else {
          activityInfo = `🎮 You played ${todayGamesCount} game${todayGamesCount > 1 ? 's' : ''} today — nice work!`;
        }

        const html = buildEmailHTML(user.username, topToday, { rankInfo, beatInfo, tryInfo, activityInfo });
        await ses.send(new SendEmailCommand({
          Source: FROM_EMAIL,
          Destination: { ToAddresses: [user.email] },
          Message: {
            Subject: { Data: `🎮 DashDen Daily — ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}` },
            Body: {
              Html: { Data: html },
              Text: { Data: `Hi ${user.username}! Check out today's results at ${APP_URL}` },
            },
          },
        }));
        sent++;
      } catch (err) {
        console.error(`Failed to send to ${user.email}:`, err);
        failed++;
      }
    }
    console.log(`Emails sent: ${sent}, failed: ${failed}`);
    return { statusCode: 200, body: `Sent ${sent} emails, ${failed} failed` };
  } catch (error) {
    console.error('Daily email digest failed:', error);
    throw error;
  }
}

interface PersonalInfo { rankInfo: string; beatInfo: string; tryInfo: string; activityInfo: string }

function buildEmailHTML(username: string, topScores: LeaderboardEntry[], personal: PersonalInfo): string {
  const leaderboardRows = topScores.length > 0
    ? topScores.map((entry, i) => `
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #eee; font-weight: bold;">${entry.username || 'Player'}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${GAME_NAMES[entry.gameType] || entry.gameType}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #eee; font-weight: bold; color: #6366f1;">${(entry.score || 0).toLocaleString()}</td>
        </tr>`).join('')
    : '<tr><td colspan="4" style="padding: 16px; text-align: center; color: #999;">No games played yet today — be the first!</td></tr>';

  // Build personal nudges section
  const nudges = [personal.activityInfo, personal.rankInfo, personal.beatInfo, personal.tryInfo]
    .filter(Boolean)
    .map(n => `<div style="padding: 8px 12px; background: #f9fafb; border-radius: 8px; margin-bottom: 6px; font-size: 14px; color: #374151;">${n}</div>`)
    .join('');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #6366f1, #ec4899); border-radius: 16px 16px 0 0; padding: 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">🎮 DashDen Daily</h1>
      <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0;">Your daily gaming digest</p>
    </div>
    <div style="background: white; padding: 32px; border-radius: 0 0 16px 16px;">
      <h2 style="margin: 0 0 16px; color: #1f2937;">Hey ${username}! 👋</h2>

      <!-- Personal Nudges -->
      ${nudges ? `<div style="margin-bottom: 20px;">${nudges}</div>` : ''}

      <!-- Leaderboard -->
      <h3 style="margin: 20px 0 12px; color: #1f2937;">🏆 Today's Top Players</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <thead>
          <tr style="background: #f9fafb;">
            <th style="padding: 8px 12px; text-align: left;">Rank</th>
            <th style="padding: 8px 12px; text-align: left;">Player</th>
            <th style="padding: 8px 12px; text-align: left;">Game</th>
            <th style="padding: 8px 12px; text-align: left;">Score</th>
          </tr>
        </thead>
        <tbody>${leaderboardRows}</tbody>
      </table>

      <!-- CTA -->
      <div style="text-align: center; margin: 32px 0 16px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
          <tr>
            <td style="border-radius: 12px; background: linear-gradient(135deg, #6366f1, #ec4899);">
              <a href="${APP_URL}/hub" target="_blank" style="display: block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 16px; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
                Play Now →
              </a>
            </td>
          </tr>
        </table>
      </div>

      <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">
        You're receiving this because you opted in to daily digests on DashDen.<br>
        <a href="${APP_URL}/profile" style="color: #6366f1;">Manage email preferences</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}
