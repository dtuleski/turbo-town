import { Theme, ThemeRepository as IThemeRepository } from '../types';
/**
 * Theme Repository (Read-Only)
 * Themes are owned by CMS Service
 */
export declare class ThemeRepository implements IThemeRepository {
    /**
     * Get theme by ID (with caching)
     */
    getById(themeId: string): Promise<Theme | null>;
    /**
     * Validate theme exists and is published
     */
    validateTheme(themeId: string): Promise<boolean>;
}
//# sourceMappingURL=theme.repository.d.ts.map