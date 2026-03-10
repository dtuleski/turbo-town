import { Game } from '@memory-game/shared';
import { GameRepository } from '../repositories/game.repository';
import { ThemeRepository } from '../repositories/theme.repository';
import { SubscriptionRepository } from '../repositories/subscription.repository';
import { ScoreCalculatorService } from './score-calculator.service';
import { RateLimiterService } from './rate-limiter.service';
import { AchievementTrackerService } from './achievement-tracker.service';
import { EventPublisherService } from './event-publisher.service';
import { StartGameInput, CompleteGameInput, GameHistoryInput, StartGameResponse, CompleteGameResponse, GameHistoryResponse, CanStartGameResponse } from '../types';
/**
 * Game Service
 * Core business logic for game lifecycle management
 */
export declare class GameService {
    private gameRepository;
    private themeRepository;
    private subscriptionRepository;
    private scoreCalculator;
    private rateLimiter;
    private achievementTracker;
    private eventPublisher;
    constructor(gameRepository: GameRepository, themeRepository: ThemeRepository, subscriptionRepository: SubscriptionRepository, scoreCalculator: ScoreCalculatorService, rateLimiter: RateLimiterService, achievementTracker: AchievementTrackerService, eventPublisher: EventPublisherService);
    /**
     * Start a new game
     */
    startGame(userId: string, input: StartGameInput): Promise<StartGameResponse>;
    /**
     * Complete a game
     */
    completeGame(userId: string, input: CompleteGameInput): Promise<CompleteGameResponse>;
    /**
     * Get game by ID
     */
    getGame(userId: string, gameId: string): Promise<Game>;
    /**
     * Get game history (paid users only)
     */
    getGameHistory(userId: string, input: GameHistoryInput): Promise<GameHistoryResponse>;
    /**
     * Get user statistics
     */
    getUserStatistics(userId: string): Promise<any>;
    /**
     * Check if user can start a game
     */
    canStartGame(userId: string): Promise<CanStartGameResponse>;
}
//# sourceMappingURL=game.service.d.ts.map