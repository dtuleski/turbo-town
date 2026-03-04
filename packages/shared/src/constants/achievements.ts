/**
 * Achievement definitions and requirements
 */

import { AchievementType } from '../types/enums';

export const ACHIEVEMENTS = {
  [AchievementType.FirstWin]: {
    name: 'First Victory',
    description: 'Complete your first game',
    requirement: 'Complete 1 game',
  },
  [AchievementType.SpeedDemon]: {
    name: 'Speed Demon',
    description: 'Complete a game in under 1 minute',
    requirement: 'Completion time < 60 seconds',
  },
  [AchievementType.PerfectMemory]: {
    name: 'Perfect Memory',
    description: 'Complete a game with no mistakes',
    requirement: 'Attempts = Pairs (no wrong matches)',
  },
  [AchievementType.ThemeMaster]: {
    name: 'Theme Master',
    description: 'Complete all available themes',
    requirement: 'Complete at least one game in each theme',
  },
  [AchievementType.DifficultyChampion]: {
    name: 'Difficulty Champion',
    description: 'Complete a 48-pair game',
    requirement: 'Complete game with difficulty = 48',
  },
  [AchievementType.TenGames]: {
    name: '10 Games Milestone',
    description: 'Play 10 games',
    requirement: 'Total games played >= 10',
  },
  [AchievementType.FiftyGames]: {
    name: '50 Games Milestone',
    description: 'Play 50 games',
    requirement: 'Total games played >= 50',
  },
  [AchievementType.HundredGames]: {
    name: '100 Games Milestone',
    description: 'Play 100 games',
    requirement: 'Total games played >= 100',
  },
} as const;
