import type { ChallengeLanguage } from '@memory-game/shared';
import type { StoredChallenge, StoredScore } from '../repositories/challenge.repository';
import type { ChallengeMyEntry } from '../types/challenge';
import { SECTION_TEXTS, gameName } from './texts';
/**
 * "Yesterday's challenge" section of the digest email (N3, FR-DC-24): the game, the winner and the
 * top 3, and the user's own score and rank, or an invitation to today's challenge. Usernames are
 * user-chosen text and are HTML-escaped.
 */
export interface DayResults {
  day: string;
  challenge: StoredChallenge | null;
  top: StoredScore[];
}
const APP_URL = 'https://dashden.app';
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
export function resultsUrl(day: string): string {
  return `${APP_URL}/challenge/results?day=${encodeURIComponent(day)}`;
}
/** Empty when there was no challenge that day (the section is left out). */
export function challengeSectionHtml(
  results: DayResults | null,
  me: ChallengeMyEntry | null,
  language: ChallengeLanguage
): string {
  if (!results?.challenge) return '';
  const t = SECTION_TEXTS[language] ?? SECTION_TEXTS.en;
  const game = escapeHtml(gameName(results.challenge.gameId, language));
  const medal = (rank: number) => (rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`);
  const rows = results.top
    .slice(0, 3)
    .map(
      (s, i) => `
          <tr>
            <td style="padding: 6px 12px; border-bottom: 1px solid #eee;">${medal(i + 1)}</td>
            <td style="padding: 6px 12px; border-bottom: 1px solid #eee; font-weight: bold;">${escapeHtml(s.username || 'Player')}</td>
            <td style="padding: 6px 12px; border-bottom: 1px solid #eee; font-weight: bold; color: #6366f1;">${s.bestScore.toLocaleString('en-US')}</td>
          </tr>`
    )
    .join('');
  const winner = results.top[0];
  const lines: string[] = [];
  if (winner) lines.push(t.winner(escapeHtml(winner.username || 'Player')));
  if (me) lines.push(t.mine(me.bestScore.toLocaleString('en-US'), me.rank));
  else lines.push(winner ? t.invite : t.nobody);
  const notes = lines
    .map((l) => `<div style="padding: 8px 12px; background: #f5f3ff; border-radius: 8px; margin-bottom: 6px; font-size: 14px; color: #374151;">${l}</div>`)
    .join('');
  const table = rows
    ? `
      <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 8px;">
        <thead>
          <tr style="background: #f9fafb;">
            <th style="padding: 6px 12px; text-align: left;">${t.rank}</th>
            <th style="padding: 6px 12px; text-align: left;">${t.player}</th>
            <th style="padding: 6px 12px; text-align: left;">${t.score}</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`
    : '';
  return `
      <!-- Yesterday's challenge -->
      <h3 style="margin: 24px 0 12px; color: #1f2937;">${t.heading(game)}</h3>
      ${notes}${table}
      <p style="margin: 8px 0 0; font-size: 13px;"><a href="${resultsUrl(results.day)}" style="color: #6366f1;">${t.results} →</a></p>`;
}
