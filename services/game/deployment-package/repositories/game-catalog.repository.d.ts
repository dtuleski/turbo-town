export interface GameCatalogItem {
    gameId: string;
    title: string;
    description: string;
    icon: string;
    route: string;
    status: 'ACTIVE' | 'COMING_SOON' | 'MAINTENANCE';
    displayOrder: number;
    ageRange: string;
    category: string;
}
export declare class GameCatalogRepository {
    listAvailableGames(): Promise<GameCatalogItem[]>;
    getAllGames(): Promise<GameCatalogItem[]>;
}
//# sourceMappingURL=game-catalog.repository.d.ts.map