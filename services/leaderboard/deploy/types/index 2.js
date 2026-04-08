"use strict";
/**
 * Type definitions for the Leaderboard Service
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Timeframe = exports.Difficulty = exports.GameType = void 0;
var GameType;
(function (GameType) {
    GameType["MEMORY_MATCH"] = "MEMORY_MATCH";
    GameType["MATH_CHALLENGE"] = "MATH_CHALLENGE";
    GameType["WORD_PUZZLE"] = "WORD_PUZZLE";
    GameType["LANGUAGE_LEARNING"] = "LANGUAGE_LEARNING";
    GameType["OVERALL"] = "OVERALL";
})(GameType || (exports.GameType = GameType = {}));
var Difficulty;
(function (Difficulty) {
    Difficulty["EASY"] = "EASY";
    Difficulty["MEDIUM"] = "MEDIUM";
    Difficulty["HARD"] = "HARD";
    Difficulty["BEGINNER"] = "BEGINNER";
    Difficulty["INTERMEDIATE"] = "INTERMEDIATE";
    Difficulty["ADVANCED"] = "ADVANCED";
})(Difficulty || (exports.Difficulty = Difficulty = {}));
var Timeframe;
(function (Timeframe) {
    Timeframe["DAILY"] = "DAILY";
    Timeframe["WEEKLY"] = "WEEKLY";
    Timeframe["MONTHLY"] = "MONTHLY";
    Timeframe["ALL_TIME"] = "ALL_TIME";
})(Timeframe || (exports.Timeframe = Timeframe = {}));
//# sourceMappingURL=index.js.map