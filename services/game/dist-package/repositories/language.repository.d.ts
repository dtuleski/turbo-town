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
export interface LanguageWordAdmin {
    wordId: string;
    category: string;
    difficulty: string;
    languageCode: string;
    imageUrl: string;
    distractorImages: string[];
    translations: Record<string, {
        word: string;
        pronunciation: string;
    }>;
    createdAt: string;
    updatedAt: string;
}
export declare class LanguageRepository {
    private readonly wordsTableName;
    private readonly progressTableName;
    private readonly resultsTableName;
    constructor();
    /**
     * Get words by category and difficulty
     */
    getWordsByCategory(languageCode: string, category: string, difficulty: string, count: number): Promise<LanguageWord[]>;
    /**
     * Save language game result
     */
    saveGameResult(userId: string, result: LanguageGameResult): Promise<void>;
    /**
     * Get user's progress for a specific language
     */
    getUserProgress(userId: string, languageCode: string): Promise<LanguageProgress | null>;
    /**
     * Get all user's language progress
     */
    getAllUserProgress(userId: string): Promise<LanguageProgress[]>;
    /**
     * Update user's language progress
     */
    updateUserProgress(userId: string, progress: LanguageProgress): Promise<void>;
    /**
     * Get all language words for admin management
     */
    getAllLanguageWords(): Promise<LanguageWordAdmin[]>;
    /**
     * Get a specific language word by ID for admin management
     */
    getLanguageWordById(wordId: string): Promise<LanguageWordAdmin | null>;
    /**
     * Update a language word (admin only)
     */
    updateLanguageWord(wordId: string, updates: {
        imageUrl?: string;
        distractorImages?: string[];
        translations?: Record<string, {
            word: string;
            pronunciation: string;
        }>;
    }): Promise<LanguageWordAdmin>;
    /**
     * Fallback words when database is not available
     */
    private getFallbackWords;
}
//# sourceMappingURL=language.repository.d.ts.map