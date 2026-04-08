/**
 * Bulk seed script for language learning words
 * Uses Unsplash images (free, no API key needed for direct URLs)
 * 
 * Usage: npx ts-node scripts/seed-language-words.ts
 * Or:    npx tsx scripts/seed-language-words.ts
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = 'memory-game-language-words-dev';

interface WordEntry {
  englishWord: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  imageUrl: string;
  distractorImages: string[];
  translations: Record<string, { word: string; pronunciation: string }>;
}

// ============================================================
// WORD DATABASE - Organized by category and difficulty
// ============================================================

const WORDS: WordEntry[] = [
  // ==================== ANIMALS ====================
  // Beginner
  {
    englishWord: 'dog',
    category: 'animals',
    difficulty: 'beginner',
    imageUrl: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=400&h=400&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=400&h=400&fit=crop',
    ],
    translations: {
      en: { word: 'Dog', pronunciation: 'dɒɡ' },
      es: { word: 'Perro', pronunciation: 'pe.ro' },
      fr: { word: 'Chien', pronunciation: 'ʃjɛ̃' },
      de: { word: 'Hund', pronunciation: 'hʊnt' },
      it: { word: 'Cane', pronunciation: 'ka.ne' },
      pt: { word: 'Cachorro', pronunciation: 'ka.ʃo.ʁu' },
    },
  },
  {
    englishWord: 'cat',
    category: 'animals',
    difficulty: 'beginner',
    imageUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&h=400&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1552053831-71594a27632d?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1606567595334-d39972c85dbe?w=400&h=400&fit=crop',
    ],
    translations: {
      en: { word: 'Cat', pronunciation: 'kæt' },
      es: { word: 'Gato', pronunciation: 'ɡa.to' },
      fr: { word: 'Chat', pronunciation: 'ʃa' },
      de: { word: 'Katze', pronunciation: 'ka.tsə' },
      it: { word: 'Gatto', pronunciation: 'ɡat.to' },
      pt: { word: 'Gato', pronunciation: 'ɡa.tu' },
    },
  },
