#!/usr/bin/env node

/**
 * Insert Language Data from JSON
 * 
 * Usage: node scripts/insert-language-data.mjs data/language-words-upload.json
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node scripts/insert-language-data.mjs <path-to-json>');
  process.exit(1);
}

const resolvedPath = resolve(filePath);
if (!existsSync(resolvedPath)) {
  console.error(`❌ File not found: ${resolvedPath}`);
  process.exit(1);
}

const data = JSON.parse(readFileSync(resolvedPath, 'utf-8'));
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
    console.error(`❌ Failed: ${item.translations.en.word}`, error.message);
  }
}

console.log(`\n📊 Done: ${successCount} inserted, ${errorCount} failed`);
