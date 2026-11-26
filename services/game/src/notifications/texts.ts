import type { ChallengeLanguage } from '@memory-game/shared';
/**
 * Push texts (N4) and the localized texts of the digest's challenge section, in en, es and pt
 * (FR-DC-6). Game names follow the web catalog (apps/web/src/locales/<lang>.json `games.<id>.title`).
 */
const GAME_NAMES: Record<ChallengeLanguage, Record<string, string>> = {
  en: {
    'memory-match': 'Memory Match',
    'math-challenge': 'Math Challenge',
    'word-puzzle': 'Word Puzzle',
    sudoku: 'Sudoku',
    'sequence-memory': 'Sequence Memory',
    'code-a-bot': 'Code-a-Bot',
    'geo-quiz': 'Geography Quiz',
    'history-quiz': 'History Quiz',
    'civics-quiz': 'Civics Quiz',
    hangman: 'Hangman',
    'scratch-coding': 'Space Coder',
    'math-maze': 'Math Maze',
    'pattern-recall': 'Pattern Recall',
    'space-entry': 'Space Entry',
    'bond-and-burn': 'Bond & Burn',
    'mini-golf': 'Mini Golf',
  },
  es: {
    'memory-match': 'Memoria',
    'math-challenge': 'Desafío Matemático',
    'word-puzzle': 'Sopa de Letras',
    sudoku: 'Sudoku',
    'sequence-memory': 'Memoria de Secuencias',
    'code-a-bot': 'Programa el Robot',
    'geo-quiz': 'Quiz de Geografía',
    'history-quiz': 'Quiz de Historia',
    'civics-quiz': 'Quiz de Civismo',
    hangman: 'Ahorcado',
    'scratch-coding': 'Space Coder',
    'math-maze': 'Laberinto Matemático',
    'pattern-recall': 'Memoria de Patrones',
    'space-entry': 'Entrada Espacial',
    'bond-and-burn': 'Bond & Burn',
    'mini-golf': 'Mini Golf',
  },
  pt: {
    'memory-match': 'Jogo da Memória',
    'math-challenge': 'Desafio de Matemática',
    'word-puzzle': 'Caça-Palavras',
    sudoku: 'Sudoku',
    'sequence-memory': 'Memória Sequencial',
    'code-a-bot': 'Programe o Robô',
    'geo-quiz': 'Quiz de Geografia',
    'history-quiz': 'Quiz de História',
    'civics-quiz': 'Quiz de Civismo',
    hangman: 'Forca',
    'scratch-coding': 'Space Coder',
    'math-maze': 'Labirinto Matemático',
    'pattern-recall': 'Memória de Padrões',
    'space-entry': 'Entrada Espacial',
    'bond-and-burn': 'Bond & Burn',
    'mini-golf': 'Mini Golf',
  },
};
export function gameName(gameId: string, language: ChallengeLanguage): string {
  return GAME_NAMES[language]?.[gameId] ?? GAME_NAMES.en[gameId] ?? gameId;
}
interface DigestTexts {
  title: string;
  withRank: (game: string, winner: string, rank: number) => string;
  withWinner: (game: string, winner: string) => string;
  noResults: string;
}
interface ChallengeTexts {
  title: (game: string) => string;
  body: string;
}
const DIGEST: Record<ChallengeLanguage, DigestTexts> = {
  en: {
    title: 'Your DashDen morning summary',
    withRank: (g, w, r) => `Yesterday's ${g} challenge: ${w} won. You finished #${r}.`,
    withWinner: (g, w) => `Yesterday's ${g} challenge: ${w} won. Try today's challenge!`,
    noResults: "See yesterday's top players and today's challenge.",
  },
  es: {
    title: 'Tu resumen matutino de DashDen',
    withRank: (g, w, r) => `Desafío de ayer (${g}): ganó ${w}. Terminaste #${r}.`,
    withWinner: (g, w) => `Desafío de ayer (${g}): ganó ${w}. ¡Prueba el desafío de hoy!`,
    noResults: 'Mira los mejores jugadores de ayer y el desafío de hoy.',
  },
  pt: {
    title: 'Seu resumo matinal do DashDen',
    withRank: (g, w, r) => `Desafio de ontem (${g}): ${w} venceu. Você ficou em #${r}.`,
    withWinner: (g, w) => `Desafio de ontem (${g}): ${w} venceu. Jogue o desafio de hoje!`,
    noResults: 'Veja os melhores jogadores de ontem e o desafio de hoje.',
  },
};
const CHALLENGE: Record<ChallengeLanguage, ChallengeTexts> = {
  en: {
    title: (g) => `Today's challenge: ${g}`,
    body: 'Everyone plays the same puzzle. Can you top the leaderboard?',
  },
  es: {
    title: (g) => `Desafío de hoy: ${g}`,
    body: 'Todos juegan el mismo reto. ¿Llegarás a lo más alto de la tabla?',
  },
  pt: {
    title: (g) => `Desafio de hoje: ${g}`,
    body: 'Todos jogam o mesmo desafio. Você consegue chegar ao topo do ranking?',
  },
};
export interface DigestPushData {
  /** Yesterday's challenge game id; absent when there was none. */
  gameId?: string;
  /** Yesterday's winner's username; absent when nobody played. */
  winner?: string;
  /** The user's own rank yesterday; absent when they did not play. */
  rank?: number;
}
export interface ChallengePushData {
  gameId: string;
}
export function pushText(kind: 'digest', language: ChallengeLanguage, data: DigestPushData): { title: string; body: string };
export function pushText(kind: 'challenge', language: ChallengeLanguage, data: ChallengePushData): { title: string; body: string };
export function pushText(
  kind: 'digest' | 'challenge',
  language: ChallengeLanguage,
  data: DigestPushData | ChallengePushData
): { title: string; body: string } {
  const lang: ChallengeLanguage = DIGEST[language] ? language : 'en';
  if (kind === 'challenge') {
    const t = CHALLENGE[lang];
    return { title: t.title(gameName((data as ChallengePushData).gameId, lang)), body: t.body };
  }
  const d = data as DigestPushData;
  const t = DIGEST[lang];
  if (!d.gameId || !d.winner) return { title: t.title, body: t.noResults };
  const game = gameName(d.gameId, lang);
  return {
    title: t.title,
    body: d.rank ? t.withRank(game, d.winner, d.rank) : t.withWinner(game, d.winner),
  };
}
/** Texts of the digest email's "Yesterday's challenge" section. */
export interface SectionTexts {
  heading: (game: string) => string;
  winner: (name: string) => string;
  mine: (score: string, rank: number) => string;
  invite: string;
  nobody: string;
  results: string;
  rank: string;
  player: string;
  score: string;
}
export const SECTION_TEXTS: Record<ChallengeLanguage, SectionTexts> = {
  en: {
    heading: (g) => `🎯 Yesterday's challenge: ${g}`,
    winner: (n) => `🥇 Winner: ${n}`,
    mine: (s, r) => `Your best: ${s} points, #${r}.`,
    invite: "You didn't play yesterday's challenge. Today's challenge is waiting for you!",
    nobody: 'Nobody played yesterday. Be the first on today\'s leaderboard!',
    results: 'See full results',
    rank: 'Rank',
    player: 'Player',
    score: 'Score',
  },
  es: {
    heading: (g) => `🎯 Desafío de ayer: ${g}`,
    winner: (n) => `🥇 Ganador: ${n}`,
    mine: (s, r) => `Tu mejor puntuación: ${s} puntos, #${r}.`,
    invite: 'No jugaste el desafío de ayer. ¡El desafío de hoy te espera!',
    nobody: 'Nadie jugó ayer. ¡Sé el primero en la tabla de hoy!',
    results: 'Ver todos los resultados',
    rank: 'Puesto',
    player: 'Jugador',
    score: 'Puntos',
  },
  pt: {
    heading: (g) => `🎯 Desafio de ontem: ${g}`,
    winner: (n) => `🥇 Vencedor: ${n}`,
    mine: (s, r) => `Sua melhor pontuação: ${s} pontos, #${r}.`,
    invite: 'Você não jogou o desafio de ontem. O desafio de hoje está esperando por você!',
    nobody: 'Ninguém jogou ontem. Seja o primeiro no ranking de hoje!',
    results: 'Ver todos os resultados',
    rank: 'Posição',
    player: 'Jogador',
    score: 'Pontos',
  },
};
