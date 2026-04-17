/**
 * Daily Email Digest Lambda
 * Sends personalized email digests to opted-in users via Resend.
 */

import https from 'https';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' }));

const EMAIL_PREFS_TABLE = process.env.EMAIL_PREFS_TABLE_NAME || 'memory-game-email-prefs-prod';
const LEADERBOARD_TABLE = process.env.LEADERBOARD_TABLE_NAME || 'memory-game-leaderboard-entries-prod';
const AGGREGATES_TABLE = process.env.AGGREGATES_TABLE_NAME || 'memory-game-user-aggregates-prod';
const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const FROM_EMAIL = 'DashDen <no-reply@dashden.app>';
const APP_URL = 'https://dashden.app';

async function sendViaResend(to: string, subject: string, html: string): Promise<void> {
  const body = JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html });
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.resend.com',
      path: '/emails',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
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

const ALL_GAMES = [
  'MEMORY_MATCH', 'MATH_CHALLENGE', 'WORD_PUZZLE', 'LANGUAGE_LEARNING',
  'SUDOKU', 'JIGSAW_PUZZLE', 'BUBBLE_POP', 'SEQUENCE_MEMORY', 'CODE_A_BOT',
  'GEO_QUIZ', 'HISTORY_QUIZ', 'CIVICS_QUIZ', 'HANGMAN', 'TIC_TAC_TOE',
  'MATH_MAZE',
];

const GAME_NAMES: Record<string, string> = {
  MEMORY_MATCH: '🃏 Memory Match', MATH_CHALLENGE: '🧮 Math Challenge',
  WORD_PUZZLE: '🔤 Word Puzzle', LANGUAGE_LEARNING: '🌍 Language Learning',
  SUDOKU: '9️⃣ Sudoku', JIGSAW_PUZZLE: '🧩 Jigsaw Puzzle',
  BUBBLE_POP: '🫧 Bubble Pop', SEQUENCE_MEMORY: '🧠 Sequence Memory',
  CODE_A_BOT: '🤖 Code-a-Bot', GEO_QUIZ: '🌍 Geo Quiz',
  HISTORY_QUIZ: '📜 History Quiz', CIVICS_QUIZ: '🇺🇸 Civics Quiz',
  HANGMAN: '🪢 Hangman', TIC_TAC_TOE: '❌ Tic Tac Toe',
  MATH_MAZE: '🧮 Math Maze',
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
    const allUsers = (prefsResult.Items || []) as EmailPrefs[];
    // Deduplicate by email — keep the most recently updated record per address
    const usersByEmail = new Map<string, EmailPrefs>();
    for (const u of allUsers) {
      if (!u.email) continue;
      const existing = usersByEmail.get(u.email);
      if (!existing || (u as any).updatedAt > (existing as any).updatedAt) {
        usersByEmail.set(u.email, u);
      }
    }
    const users = Array.from(usersByEmail.values());
    if (users.length === 0) return { statusCode: 200, body: 'No users to email' };

    // 2. Get yesterday's entries (email fires in the morning, so we report on the previous day)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    const entriesResult = await ddb.send(new ScanCommand({ TableName: LEADERBOARD_TABLE, Limit: 500 }));
    const allEntries = (entriesResult.Items || []) as LeaderboardEntry[];
    // Include both yesterday and today to catch games across timezone boundaries
    const recentEntries = allEntries.filter(e => e.date === yesterday || e.date === today);
    // One entry per user — their highest score of the day across all games
    const bestByUser = new Map<string, LeaderboardEntry>();
    for (const entry of recentEntries) {
      const existing = bestByUser.get(entry.userId);
      if (!existing || entry.score > existing.score) {
        bestByUser.set(entry.userId, entry);
      }
    }
    const topToday = Array.from(bestByUser.values())
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 5);

    // 3. Get all aggregates (for personal stats)
    const aggResult = await ddb.send(new ScanCommand({ TableName: AGGREGATES_TABLE, Limit: 1000 }));
    const allAggregates = (aggResult.Items || []) as Aggregate[];

    // Full ranked list (one per user, sorted by score desc)
    const rankedToday = Array.from(bestByUser.values())
      .sort((a, b) => (b.score || 0) - (a.score || 0));

    // 4. Send personalized emails
    let sent = 0, failed = 0;
    for (const user of users) {
      if (!user.email) continue;
      try {
        // Personal stats
        const userAggs = allAggregates.filter(a => a.userId === user.userId);
        const gamesPlayed = userAggs.map(a => a.gameType);
        const gamesNotPlayed = ALL_GAMES.filter(g => !gamesPlayed.includes(g));
        const userTodayEntries = recentEntries.filter(e => e.userId === user.userId);
        const todayGamesCount = userTodayEntries.length;

        // User's rank today
        let rankInfo = '';
        if (bestByUser.size > 0) {
          const userBestToday = userTodayEntries.sort((a, b) => b.score - a.score)[0];
          if (userBestToday) {
            const rank = Array.from(bestByUser.values()).filter(e => e.score > userBestToday.score).length + 1;
            const leader = rankedToday[0];
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
          activityInfo = "😴 You haven't played recently — jump in and climb the ranks!";
        } else {
          activityInfo = `🎮 You played ${todayGamesCount} game${todayGamesCount > 1 ? 's' : ''} recently — nice work!`;
        }

        const html = buildEmailHTML(user.username, topToday, { rankInfo, beatInfo, tryInfo, activityInfo }, user.userId, rankedToday);
        const subject = `🎮 DashDen Daily — ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`;
        await sendViaResend(user.email, subject, html);
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

function buildEmailHTML(username: string, topScores: LeaderboardEntry[], personal: PersonalInfo, userId?: string, rankedToday?: LeaderboardEntry[]): string {
  // Build personalized leaderboard: top 3 + user's position if outside top 3
  let displayRows: Array<{ entry: LeaderboardEntry; rank: number; isUser: boolean }> = [];

  if (rankedToday && rankedToday.length > 0) {
    const userRank = userId ? rankedToday.findIndex(e => e.userId === userId) : -1;
    const top3 = rankedToday.slice(0, 3);

    // Always add top 3
    top3.forEach((entry, i) => {
      displayRows.push({ entry, rank: i + 1, isUser: entry.userId === userId });
    });

    // If user exists and is outside top 3, add their row
    if (userRank >= 3) {
      const userEntry = rankedToday[userRank];
      displayRows.push({ entry: userEntry, rank: userRank + 1, isUser: true });
    }
  } else {
    // Fallback to topScores if no ranked data
    topScores.slice(0, 3).forEach((entry, i) => {
      displayRows.push({ entry, rank: i + 1, isUser: false });
    });
  }

  const rankLabel = (rank: number) => rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;

  const leaderboardRows = displayRows.length > 0
    ? displayRows.map(({ entry, rank, isUser }) => `
        <tr style="${isUser ? 'background: #eff6ff;' : ''}">
          <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${rankLabel(rank)}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #eee; font-weight: bold;">${entry.username || 'Player'}${isUser ? ' 👈' : ''}</td>
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
