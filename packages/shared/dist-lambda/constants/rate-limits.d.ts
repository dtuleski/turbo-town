/**
 * Rate limit configurations by subscription tier
 */
export declare const RATE_LIMITS: {
    readonly FREE: {
        readonly gamesPerPeriod: 3;
        readonly periodHours: 24;
        readonly maxPairs: 12;
    };
    readonly LIGHT: {
        readonly gamesPerPeriod: 10;
        readonly periodHours: 24;
        readonly maxPairs: 24;
    };
    readonly STANDARD: {
        readonly gamesPerPeriod: 30;
        readonly periodHours: 24;
        readonly maxPairs: 36;
    };
    readonly PREMIUM: {
        readonly gamesPerPeriod: 100;
        readonly periodHours: 24;
        readonly maxPairs: 48;
    };
};
//# sourceMappingURL=rate-limits.d.ts.map