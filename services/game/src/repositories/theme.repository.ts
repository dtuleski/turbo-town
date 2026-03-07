import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { Theme, ThemeRepository as IThemeRepository } from '../types';
import { mapDynamoDBError } from '../utils/error-mapper';
import { themeCache } from '../utils/cache';
import { NotFoundError } from '@memory-game/shared';
import { ErrorMessages } from '../utils/error-mapper';

const dynamoDBClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

const TABLE_NAME = process.env.THEMES_TABLE_NAME!;

/**
 * Theme Repository (Read-Only)
 * Themes are owned by CMS Service
 */
export class ThemeRepository implements IThemeRepository {
  /**
   * Get theme by ID (with caching)
   */
  async getById(themeId: string): Promise<Theme | null> {
    // Check cache first
    const cached = themeCache.get(themeId);
    if (cached) {
      return cached;
    }

    try {
      const result = await docClient.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: { themeId: themeId },
        })
      );

      if (!result.Item) {
        return null;
      }

      const theme = result.Item as Theme;

      // Cache for 5 minutes
      themeCache.set(themeId, theme);

      return theme;
    } catch (error) {
      throw mapDynamoDBError(error as Error);
    }
  }

  /**
   * Validate theme exists and is published
   */
  async validateTheme(themeId: string): Promise<boolean> {
    const theme = await this.getById(themeId);

    if (!theme) {
      throw new NotFoundError(ErrorMessages.THEME_NOT_FOUND);
    }

    if (!theme.isPublished) {
      throw new NotFoundError(ErrorMessages.THEME_NOT_PUBLISHED);
    }

    return true;
  }
}
