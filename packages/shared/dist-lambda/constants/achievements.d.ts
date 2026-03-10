/**
 * Achievement definitions and requirements
 */
export declare const ACHIEVEMENTS: {
    readonly FIRST_WIN: {
        readonly name: "First Victory";
        readonly description: "Complete your first game";
        readonly requirement: "Complete 1 game";
    };
    readonly SPEED_DEMON: {
        readonly name: "Speed Demon";
        readonly description: "Complete a game in under 1 minute";
        readonly requirement: "Completion time < 60 seconds";
    };
    readonly PERFECT_MEMORY: {
        readonly name: "Perfect Memory";
        readonly description: "Complete a game with no mistakes";
        readonly requirement: "Attempts = Pairs (no wrong matches)";
    };
    readonly THEME_MASTER: {
        readonly name: "Theme Master";
        readonly description: "Complete all available themes";
        readonly requirement: "Complete at least one game in each theme";
    };
    readonly DIFFICULTY_CHAMPION: {
        readonly name: "Difficulty Champion";
        readonly description: "Complete a 48-pair game";
        readonly requirement: "Complete game with difficulty = 48";
    };
    readonly TEN_GAMES: {
        readonly name: "10 Games Milestone";
        readonly description: "Play 10 games";
        readonly requirement: "Total games played >= 10";
    };
    readonly FIFTY_GAMES: {
        readonly name: "50 Games Milestone";
        readonly description: "Play 50 games";
        readonly requirement: "Total games played >= 50";
    };
    readonly HUNDRED_GAMES: {
        readonly name: "100 Games Milestone";
        readonly description: "Play 100 games";
        readonly requirement: "Total games played >= 100";
    };
};
//# sourceMappingURL=achievements.d.ts.map