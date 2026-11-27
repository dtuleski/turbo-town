// Daily Challenge - shared core funnel.
//
// This is the ONLY module in apps/web that names packages/shared/src/challenge. Everything else in
// the web imports challenge types and helpers through this file (same pattern as questShared.ts and
// circuitEngine.ts), so a later switch to a package-name import changes a few lines here only.
//
// It imports per file, not the challenge index. The same DEPLOYMENT RISK note as questShared.ts
// applies: these relative imports reach outside apps/web.
export type {
  ChallengeContent,
  ChallengeContentKind,
  ChallengeDay,
  ChallengeLanguage,
  ChallengeSettings,
  ChallengeTotals,
  CodeABotContent,
  HangmanContent,
  HangmanWordContent,
  MathChallengeContent,
  MathMazeContent,
  MazeContent,
  RotationEntry,
  SudokuContent,
  WordPuzzleContent,
  WordPuzzleVariant,
} from '../../../../packages/shared/src/challenge/types'
export { CHALLENGE_LANGUAGES } from '../../../../packages/shared/src/challenge/types'
export { isChallengeDay } from '../../../../packages/shared/src/challenge/day'
export { expectedTotals, generateContent } from '../../../../packages/shared/src/challenge/generators/index'
export { CHALLENGE_ROTATION } from '../../../../packages/shared/src/challenge/rotation'
