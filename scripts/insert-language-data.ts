#!/usr/bin/env ts-node

/**
 * Insert Language Data from JSON
 * 
 * Reads a JSON file and inserts word entries into the language words DynamoDB table.
 * 
 * Usage: npx ts-node scripts/insert-language-data.ts <path-to-json-file>
 * Example: npx ts-node scripts/insert-language-data.ts data/new-words.json
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import * as fs from 'fs';
import * as path from 'path';

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

async function insertLanguageData(filePath: string) {
  const resolvedPath = path.resolve(filePath);
  
  if (!fs.existsSync(resolvedPath)) {
    console.error(`❌ File not found: ${resolvedPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(resolvedPath, 'utf-8');
  const data = JSON.parse(raw);

  const tableName = data.tableName || process.env.LANGUAGE_WORDS_TABLE_NAME || 'memory-game-language-words-dev';
  const words = data.words;

  if (!Array.isArray(words) || words.length === 0) {
    console.error('❌ No words found in JSON file');
    process.exit(1);
  }

  console.log(`🌱 Inserting ${words.length} words into ${tableName}...`);

  let successCount = 0;
  let errorCount = 0;

  for (const item of words) {
    try {
      const wordId = `${item.category}_${item.translations.en.word.toLowerCase()}_${Date.now()}`;

      await docClient.send(new PutCommand({
        TableName: tableName,
        Item: {
          ...item,
          wordId,
          createdAt: new Date().toISOString(),
        },
      }));

      successCount++;
      console.log(`✅ ${item.translations.en.word} (${item.category}/${item.difficulty})`);
    } catch (error) {
      errorCount++;
      console.error(`❌ Failed: ${item.translations.en.word}`, error);
    }
  }

  console.log(`\n📊 Done: ${successCount} inserted, ${errorCount} failed`);
}

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: npx ts-node scripts/insert-language-data.ts <path-to-json>');
  process.exit(1);
}

insertLanguageData(filePath).catch((err) => {
  console.error('💥 Failed:', err);
  process.exit(1);
});
