export interface LanguageWord {
    id: string;
    word: string;
    pronunciation: string;
    correctImageUrl: string;
    distractorImages: string[];
    category: string;
}
export interface LanguageGameResult {
    gameId: string;
    languageCode: string;
    score: number;
    correctAnswers: number;
    totalQuestions: number;
    difficulty: string;
    category: string;
    timeSpent: number;
    xpGained: number;
}
export interface LanguageProgress {
    languageCode: string;
    xp: number;
    level: number;
    wordsLearned: number;
    accuracy: number;
    lastPlayed: string;
}
export declare class LanguageHandler {
    private languageService;
    constructor();
    /**
     * Get words for language learning game
     */
    getLanguageWords(_: any, args: {
        languageCode: string;
        category: string;
        difficulty: string;
        count: number;
    }, context: {
        userId: string;
    }): Promise<LanguageWord[]>;
    /**
     * Save language game result
     */
    saveLanguageGameResult(_: any, args: {
        input: {
            languageCode: string;
            score: number;
            correctAnswers: number;
            totalQuestions: number;
            difficulty: string;
            category: string;
            timeSpent: number;
            xpGained: number;
        };
    }, context: {
        userId: string;
        username: string;
    }): Promise<LanguageGameResult>;
    /**
     * Get user's language learning progress
     */
    getUserLanguageProgress(_: any, __: any, context: {
        userId: string;
    }): Promise<LanguageProgress[]>;
    /**
     * Get user's progress for a specific language
     */
    getLanguageProgressByCode(_: any, args: {
        languageCode: string;
    }, context: {
        userId: string;
    }): Promise<LanguageProgress | null>;
}
//# sourceMappingURL=language.handler.d.ts.map