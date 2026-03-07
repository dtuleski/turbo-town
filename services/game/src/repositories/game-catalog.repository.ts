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
    const command = new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'StatusIndex',
      KeyConditionExpression: '#status IN (:active, :comingSoon)',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':active': 'ACTIVE',
        ':comingSoon': 'COMING_SOON',
      },
    });

    const result = await docClient.send(command);
    const items = (result.Items || []) as GameCatalogItem[];
    
    // Sort by displayOrder
    return items.sort((a, b) => a.displayOrder - b.displayOrder);
  }
}
