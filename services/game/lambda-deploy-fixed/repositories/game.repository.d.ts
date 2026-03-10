import { Game, GameStatus } from '@memory-game/shared';
import { GameRepository as IGameRepository, QueryOptions } from '../types';
export declare class GameRepository implements IGameRepository {
    /**
     * Create a new game
     */
    create(game: Omit<Game, 'id' | 'createdAt' | 'updatedAt'>): Promise<Game>;
    /**
     * Get game by ID
     */
    getById(gameId: string, userId?: string): Promise<Game | null>;
    /**
     * Update game
     */
    update(gameId: string, updates: Partial<Game>, userId?: string): Promise<Game>;
    /**
     * Query games by user ID
     */
    queryByUser(userId: string, options?: QueryOptions): Promise<Game[]>;
    /**
     * Query games by status
     */
    queryByStatus(status: GameStatus, options?: QueryOptions): Promise<Game[]>;
    /**
     * Delete game (admin only)
     */
    delete(gameId: string, userId: string): Promise<void>;
}
//# sourceMappingURL=game.repository.d.ts.map