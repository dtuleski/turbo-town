import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { logger } from '../utils/logger';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.REVIEWS_TABLE_NAME || 'memory-game-reviews-dev';

export interface ReviewInput {
  gameType: string;
  rating: number; // 1-5
}

export interface ReviewStats {
  gameType: string;
  averageRating: number;
  totalReviews: number;
}

export class ReviewService {
  /**
   * Submit a game review (one per user per game type, upserts)
   */
  async submitReview(userId: string, input: ReviewInput): Promise<{ success: boolean }> {
    if (input.rating < 1 || input.rating > 5 || !Number.isInteger(input.rating)) {
      throw new Error('Rating must be an integer between 1 and 5');
    }

    const now = new Date().toISOString();
    await client.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `USER#${userId}`,
        SK: `REVIEW#${input.gameType}`,
        gameType: input.gameType,
        rating: input.rating,
        userId,
        updatedAt: now,
      },
    }));

    logger.info('Review submitted', { userId, gameType: input.gameType, rating: input.rating });
    return { success: true };
  }

  /**
   * Get a user's review for a specific game type
   */
  async getUserReview(userId: string, gameType: string): Promise<number | null> {
    const result = await client.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${userId}`, SK: `REVIEW#${gameType}` },
    }));
    return result.Item?.rating ?? null;
  }

  /**
   * Get review stats for all game types (admin)
   */
  async getReviewStats(): Promise<{ perGame: ReviewStats[]; overall: ReviewStats }> {
    const gameTypes = [
      'MEMORY_MATCH', 'MATH_CHALLENGE', 'WORD_PUZZLE', 'LANGUAGE_LEARNING',
      'SUDOKU', 'JIGSAW_PUZZLE', 'BUBBLE_POP', 'SEQUENCE_MEMORY', 'CODE_A_BOT',
      'GEO_QUIZ', 'HISTORY_QUIZ', 'CIVICS_QUIZ', 'COLOR_BY_NUMBER', 'HANGMAN', 'TIC_TAC_TOE',
      'MATH_MAZE',
    ];

    const perGame: ReviewStats[] = [];
    let totalRating = 0;
    let totalCount = 0;

    for (const gameType of gameTypes) {
      const result = await client.send(new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'gameType-index',
        KeyConditionExpression: 'gameType = :gt',
        ExpressionAttributeValues: { ':gt': gameType },
      }));

      const items = result.Items || [];
      if (items.length > 0) {
        const sum = items.reduce((s, item) => s + (item.rating as number), 0);
        const avg = sum / items.length;
        perGame.push({ gameType, averageRating: Math.round(avg * 10) / 10, totalReviews: items.length });
        totalRating += sum;
        totalCount += items.length;
      } else {
        perGame.push({ gameType, averageRating: 0, totalReviews: 0 });
      }
    }

    const overall: ReviewStats = {
      gameType: 'OVERALL',
      averageRating: totalCount > 0 ? Math.round((totalRating / totalCount) * 10) / 10 : 0,
      totalReviews: totalCount,
    };

    return { perGame, overall };
  }
}