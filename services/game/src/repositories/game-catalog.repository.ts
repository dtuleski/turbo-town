import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.GAME_CATALOG_TABLE_NAME || '';

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

export class GameCatalogRepository {
  async listAvailableGames(): Promise<GameCatalogItem[]> {
    const command = new QueryCommand({
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
    return (result.Items || []) as GameCatalogItem[];
  }

  async getAllGames(): Promise<GameCatalogItem[]> {
    // Query for ACTIVE games
    const activeCommand = new QueryCommand({
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
    const comingSoonCommand = new QueryCommand({
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
    ] as GameCatalogItem[];
    
    return items.sort((a, b) => a.displayOrder - b.displayOrder);
  }
}
