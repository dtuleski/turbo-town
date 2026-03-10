"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThemeRepository = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const error_mapper_1 = require("../utils/error-mapper");
const cache_1 = require("../utils/cache");
const shared_1 = require("@memory-game/shared");
const error_mapper_2 = require("../utils/error-mapper");
const dynamoDBClient = new client_dynamodb_1.DynamoDBClient({});
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(dynamoDBClient);
const TABLE_NAME = process.env.THEMES_TABLE_NAME;
/**
 * Theme Repository (Read-Only)
 * Themes are owned by CMS Service
 */
class ThemeRepository {
    /**
     * Get theme by ID (with caching)
     */
    async getById(themeId) {
        // Check cache first
        const cached = cache_1.themeCache.get(themeId);
        if (cached) {
            return cached;
        }
        try {
            const result = await docClient.send(new lib_dynamodb_1.GetCommand({
                TableName: TABLE_NAME,
                Key: { themeId: themeId },
            }));
            if (!result.Item) {
                return null;
            }
            const theme = result.Item;
            // Cache for 5 minutes
            cache_1.themeCache.set(themeId, theme);
            return theme;
        }
        catch (error) {
            throw (0, error_mapper_1.mapDynamoDBError)(error);
        }
    }
    /**
     * Validate theme exists and is published
     */
    async validateTheme(themeId) {
        const theme = await this.getById(themeId);
        if (!theme) {
            throw new shared_1.NotFoundError(error_mapper_2.ErrorMessages.THEME_NOT_FOUND);
        }
        if (!theme.isPublished) {
            throw new shared_1.NotFoundError(error_mapper_2.ErrorMessages.THEME_NOT_PUBLISHED);
        }
        return true;
    }
}
exports.ThemeRepository = ThemeRepository;
//# sourceMappingURL=theme.repository.js.map