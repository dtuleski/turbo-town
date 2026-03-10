"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameCatalogRepository = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client = new client_dynamodb_1.DynamoDBClient({});
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.GAME_CATALOG_TABLE_NAME || '';
class GameCatalogRepository {
    async listAvailableGames() {
        const command = new lib_dynamodb_1.QueryCommand({
            TableName: TABLE_NAME,
            IndexName: 'StatusIndex',
            KeyConditionExpression: '#status = :status',
            ExpressionAttributeNames: {
                '#status': 'status',
            },
            ExpressionAttributeValues: {
                ':status': 'ACTIVE',
            },
        });
        const result = await docClient.send(command);
        return (result.Items || []);
    }
    async getAllGames() {
        // Query for ACTIVE games
        const activeCommand = new lib_dynamodb_1.QueryCommand({
            TableName: TABLE_NAME,
            IndexName: 'StatusIndex',
            KeyConditionExpression: '#status = :active',
            ExpressionAttributeNames: {
                '#status': 'status',
            },
            ExpressionAttributeValues: {
                ':active': 'ACTIVE',
            },
        });
        // Query for COMING_SOON games
        const comingSoonCommand = new lib_dynamodb_1.QueryCommand({
            TableName: TABLE_NAME,
            IndexName: 'StatusIndex',
            KeyConditionExpression: '#status = :comingSoon',
            ExpressionAttributeNames: {
                '#status': 'status',
            },
            ExpressionAttributeValues: {
                ':comingSoon': 'COMING_SOON',
            },
        });
        // Execute both queries
        const [activeResult, comingSoonResult] = await Promise.all([
            docClient.send(activeCommand),
            docClient.send(comingSoonCommand),
        ]);
        // Combine and sort results
        const items = [
            ...(activeResult.Items || []),
            ...(comingSoonResult.Items || []),
        ];
        return items.sort((a, b) => a.displayOrder - b.displayOrder);
    }
}
exports.GameCatalogRepository = GameCatalogRepository;
//# sourceMappingURL=game-catalog.repository.js.map