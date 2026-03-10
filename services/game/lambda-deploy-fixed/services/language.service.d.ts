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
export declare class LanguageService {
    private languageRepository;
    constructor();
    /**
     * Get words for a language learning game
     */
    getWords(languageCode: string, category: string, difficulty: string, count: number): Promise<LanguageWord[]>;
    /**
     * Save a language game result
     */
    saveGameResult(userId: string, gameData: {
        languageCode: string;
        score: number;
        correctAnswers: number;
        totalQuestions: number;
        difficulty: string;
        category: string;
        timeSpent: number;
        xpGained: number;
    }): Promise<LanguageGameResult>;
    /**
     * Update user's language learning progress
     */
    updateUserProgress(userId: string, languageCode: string, xpGained: number, wordsLearned: number): Promise<void>;
    /**
     * Get user's progress for all languages
     */
    getUserProgress(userId: string): Promise<LanguageProgress[]>;
    /**
     * Get user's progress for a specific language
     */
    getUserProgressByLanguage(userId: string, languageCode: string): Promise<LanguageProgress | null>;
    /**
     * Get fallback words when no specific words are found
     */
    private getFallbackWords;
}
//# sourceMappingURL=language.service.d.ts.map