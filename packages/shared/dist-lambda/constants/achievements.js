"use strict";
/**
 * Achievement definitions and requirements
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACHIEVEMENTS = void 0;
const enums_1 = require("../types/enums");
exports.ACHIEVEMENTS = {
    [enums_1.AchievementType.FirstWin]: {
        name: 'First Victory',
        description: 'Complete your first game',
        requirement: 'Complete 1 game',
    },
    [enums_1.AchievementType.SpeedDemon]: {
        name: 'Speed Demon',
        description: 'Complete a game in under 1 minute',
        requirement: 'Completion time < 60 seconds',
    },
    [enums_1.AchievementType.PerfectMemory]: {
        name: 'Perfect Memory',
        description: 'Complete a game with no mistakes',
        requirement: 'Attempts = Pairs (no wrong matches)',
    },
    [enums_1.AchievementType.ThemeMaster]: {
        name: 'Theme Master',
        description: 'Complete all available themes',
        requirement: 'Complete at least one game in each theme',
    },
    [enums_1.AchievementType.DifficultyChampion]: {
        name: 'Difficulty Champion',
        description: 'Complete a 48-pair game',
        requirement: 'Complete game with difficulty = 48',
    },
    [enums_1.AchievementType.TenGames]: {
        name: '10 Games Milestone',
        description: 'Play 10 games',
        requirement: 'Total games played >= 10',
    },
    [enums_1.AchievementType.FiftyGames]: {
        name: '50 Games Milestone',
        description: 'Play 50 games',
        requirement: 'Total games played >= 50',
    },
    [enums_1.AchievementType.HundredGames]: {
        name: '100 Games Milestone',
        description: 'Play 100 games',
        requirement: 'Total games played >= 100',
    },
};
//# sourceMappingURL=achievements.js.map