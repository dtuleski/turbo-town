import { GraphQLContext, GraphQLResponse } from '../types';
/**
 * GraphQL Handler
 * Routes GraphQL operations to appropriate service methods
 */
export declare class GameHandler {
    private gameService;
    private adminService;
    private stripeService;
    private languageHandler;
    private languageRepository;
    private gameCatalogRepository;
    private subscriptionRepository;
    constructor();
    /**
     * Handle GraphQL request
     */
    handleRequest(context: GraphQLContext): Promise<GraphQLResponse>;
    /**
     * Route operation to appropriate resolver
     */
    private routeOperation;
    /**
     * Mutation: startGame
     */
    private startGame;
    /**
     * Mutation: completeGame
     */
    private completeGame;
    /**
     * Query: getGame
     */
    private getGame;
    /**
     * Query: getGameHistory
     */
    private getGameHistory;
    /**
     * Query: getUserStatistics
     */
    private getUserStatistics;
    /**
     * Query: canStartGame
     */
    private canStartGame;
    /**
     * Query: listAvailableGames
     */
    private listAvailableGames;
    /**
     * Query: getAdminAnalytics (Admin only)
     */
    private getAdminAnalytics;
    /**
     * Query: listAllUsers (Admin only)
     */
    private listAllUsers;
    /**
     * Mutation: createCheckoutSession (Stripe)
     */
    private createCheckoutSession;
    /**
     * Mutation: createPortalSession (Stripe)
     */
    private createPortalSession;
    /**
     * Query: getAllLanguageWords (Admin only)
     */
    private getAllLanguageWords;
    /**
     * Query: getLanguageWordById (Admin only)
     */
    private getLanguageWordById;
    /**
     * Mutation: updateLanguageWord (Admin only)
     */
    private updateLanguageWord;
    /**
     * Extract operation name from GraphQL query
     */
    private extractOperationName;
}
//# sourceMappingURL=game.handler.d.ts.map