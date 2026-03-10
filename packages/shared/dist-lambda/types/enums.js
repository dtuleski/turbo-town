"use strict";
/**
 * Enum type definitions for the memory game application
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UITheme = exports.InvoiceStatus = exports.AchievementType = exports.ThemeStatus = exports.ThemeCategory = exports.BillingPeriod = exports.SubscriptionStatus = exports.TimePeriod = exports.GameStatus = exports.SubscriptionTier = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["User"] = "USER";
    UserRole["Admin"] = "ADMIN";
    UserRole["ContentManager"] = "CONTENT_MANAGER";
})(UserRole || (exports.UserRole = UserRole = {}));
var SubscriptionTier;
(function (SubscriptionTier) {
    SubscriptionTier["Free"] = "FREE";
    SubscriptionTier["Light"] = "LIGHT";
    SubscriptionTier["Standard"] = "STANDARD";
    SubscriptionTier["Premium"] = "PREMIUM";
})(SubscriptionTier || (exports.SubscriptionTier = SubscriptionTier = {}));
var GameStatus;
(function (GameStatus) {
    GameStatus["InProgress"] = "IN_PROGRESS";
    GameStatus["Completed"] = "COMPLETED";
    GameStatus["Abandoned"] = "ABANDONED";
})(GameStatus || (exports.GameStatus = GameStatus = {}));
var TimePeriod;
(function (TimePeriod) {
    TimePeriod["Daily"] = "DAILY";
    TimePeriod["Weekly"] = "WEEKLY";
    TimePeriod["Monthly"] = "MONTHLY";
    TimePeriod["AllTime"] = "ALL_TIME";
})(TimePeriod || (exports.TimePeriod = TimePeriod = {}));
var SubscriptionStatus;
(function (SubscriptionStatus) {
    SubscriptionStatus["Active"] = "ACTIVE";
    SubscriptionStatus["Cancelled"] = "CANCELLED";
    SubscriptionStatus["Expired"] = "EXPIRED";
    SubscriptionStatus["PastDue"] = "PAST_DUE";
})(SubscriptionStatus || (exports.SubscriptionStatus = SubscriptionStatus = {}));
var BillingPeriod;
(function (BillingPeriod) {
    BillingPeriod["Monthly"] = "MONTHLY";
    BillingPeriod["Annual"] = "ANNUAL";
})(BillingPeriod || (exports.BillingPeriod = BillingPeriod = {}));
var ThemeCategory;
(function (ThemeCategory) {
    ThemeCategory["Shapes"] = "SHAPES";
    ThemeCategory["F1Drivers"] = "F1_DRIVERS";
    ThemeCategory["F1Tracks"] = "F1_TRACKS";
    ThemeCategory["Soccer"] = "SOCCER";
    ThemeCategory["Basketball"] = "BASKETBALL";
    ThemeCategory["Baseball"] = "BASEBALL";
})(ThemeCategory || (exports.ThemeCategory = ThemeCategory = {}));
var ThemeStatus;
(function (ThemeStatus) {
    ThemeStatus["Draft"] = "DRAFT";
    ThemeStatus["Published"] = "PUBLISHED";
    ThemeStatus["Disabled"] = "DISABLED";
})(ThemeStatus || (exports.ThemeStatus = ThemeStatus = {}));
var AchievementType;
(function (AchievementType) {
    AchievementType["FirstWin"] = "FIRST_WIN";
    AchievementType["SpeedDemon"] = "SPEED_DEMON";
    AchievementType["PerfectMemory"] = "PERFECT_MEMORY";
    AchievementType["ThemeMaster"] = "THEME_MASTER";
    AchievementType["DifficultyChampion"] = "DIFFICULTY_CHAMPION";
    AchievementType["TenGames"] = "TEN_GAMES";
    AchievementType["FiftyGames"] = "FIFTY_GAMES";
    AchievementType["HundredGames"] = "HUNDRED_GAMES";
})(AchievementType || (exports.AchievementType = AchievementType = {}));
var InvoiceStatus;
(function (InvoiceStatus) {
    InvoiceStatus["Paid"] = "PAID";
    InvoiceStatus["Pending"] = "PENDING";
    InvoiceStatus["Failed"] = "FAILED";
})(InvoiceStatus || (exports.InvoiceStatus = InvoiceStatus = {}));
var UITheme;
(function (UITheme) {
    UITheme["Light"] = "LIGHT";
    UITheme["Dark"] = "DARK";
})(UITheme || (exports.UITheme = UITheme = {}));
//# sourceMappingURL=enums.js.map