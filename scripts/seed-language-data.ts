#!/usr/bin/env ts-node

/**
 * Seed Language Learning Data
 * 
 * This script populates the language words table with initial vocabulary data
 * for the language learning game.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.LANGUAGE_WORDS_TABLE_NAME || 'memory-game-language-words-dev';

interface LanguageWordData {
  wordId: string;
  category: string;
  difficulty: string;
  languageCode: string;
  translations: {
    [languageCode: string]: {
      word: string;
      pronunciation: string;
    };
  };
  imageUrl: string;
  distractorImages: string[];
  createdAt: string;
}

// Sample vocabulary data
const VOCABULARY_DATA: Omit<LanguageWordData, 'wordId' | 'createdAt'>[] = [
  // Animals - Beginner
  {
    category: 'animals',
    difficulty: 'beginner',
    languageCode: 'multi',
    translations: {
      en: { word: 'dog', pronunciation: '/dɔːɡ/' },
      es: { word: 'perro', pronunciation: '/ˈpe.ro/' },
      fr: { word: 'chien', pronunciation: '/ʃjɛ̃/' },
      it: { word: 'cane', pronunciation: '/ˈka.ne/' },
      de: { word: 'hund', pronunciation: '/hʊnt/' },
      pt: { word: 'cão', pronunciation: '/ˈkɐ̃w̃/' },
      el: { word: 'σκύλος', pronunciation: '/ˈsci.los/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=300&h=300&fit=crop&crop=face',
    distractorImages: [
      'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=300&h=300&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=300&h=300&fit=crop&crop=face'
    ]
  },
  {
    category: 'animals',
    difficulty: 'beginner',
    languageCode: 'multi',
    translations: {
      en: { word: 'cat', pronunciation: '/kæt/' },
      es: { word: 'gato', pronunciation: '/ˈɡa.to/' },
      fr: { word: 'chat', pronunciation: '/ʃa/' },
      it: { word: 'gatto', pronunciation: '/ˈɡat.to/' },
      de: { word: 'katze', pronunciation: '/ˈkat.sə/' },
      pt: { word: 'gato', pronunciation: '/ˈɡa.tu/' },
      el: { word: 'γάτα', pronunciation: '/ˈɣa.ta/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=300&h=300&fit=crop&crop=face',
    distractorImages: [
      'https://images.unsplash.com/photo-1552053831-71594a27632d?w=300&h=300&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1444212477490-ca407925329e?w=300&h=300&fit=crop&crop=face'
    ]
  },
  {
    category: 'animals',
    difficulty: 'beginner',
    languageCode: 'multi',
    translations: {
      en: { word: 'bird', pronunciation: '/bɜːrd/' },
      es: { word: 'pájaro', pronunciation: '/ˈpa.xa.ro/' },
      fr: { word: 'oiseau', pronunciation: '/wa.zo/' },
      it: { word: 'uccello', pronunciation: '/ut.ˈtʃel.lo/' },
      de: { word: 'vogel', pronunciation: '/ˈfoː.ɡəl/' },
      pt: { word: 'pássaro', pronunciation: '/ˈpa.sa.ru/' },
      el: { word: 'πουλί', pronunciation: '/pu.ˈli/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1444212477490-ca407925329e?w=300&h=300&fit=crop&crop=face',
    distractorImages: [
      'https://images.unsplash.com/photo-1552053831-71594a27632d?w=300&h=300&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=300&h=300&fit=crop&crop=face'
    ]
  },
  {
    category: 'animals',
    difficulty: 'beginner',
    languageCode: 'multi',
    translations: {
      en: { word: 'fish', pronunciation: '/fɪʃ/' },
      es: { word: 'pez', pronunciation: '/peθ/' },
      fr: { word: 'poisson', pronunciation: '/pwa.sɔ̃/' },
      it: { word: 'pesce', pronunciation: '/ˈpe.ʃe/' },
      de: { word: 'fisch', pronunciation: '/fɪʃ/' },
      pt: { word: 'peixe', pronunciation: '/ˈpej.ʃi/' },
      el: { word: 'ψάρι', pronunciation: '/ˈpsa.ri/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=300&h=300&fit=crop&crop=center',
    distractorImages: [
      'https://images.unsplash.com/photo-1444212477490-ca407925329e?w=300&h=300&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=300&h=300&fit=crop&crop=face'
    ]
  },
  {
    category: 'animals',
    difficulty: 'beginner',
    languageCode: 'multi',
    translations: {
      en: { word: 'rabbit', pronunciation: '/ˈræb.ɪt/' },
      es: { word: 'conejo', pronunciation: '/ko.ˈne.xo/' },
      fr: { word: 'lapin', pronunciation: '/la.pɛ̃/' },
      it: { word: 'coniglio', pronunciation: '/ko.ˈniʎ.ʎo/' },
      de: { word: 'kaninchen', pronunciation: '/ka.ˈniːn.çən/' },
      pt: { word: 'coelho', pronunciation: '/ko.ˈe.ʎu/' },
      el: { word: 'κουνέλι', pronunciation: '/ku.ˈne.li/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=300&h=300&fit=crop&crop=face',
    distractorImages: [
      'https://images.unsplash.com/photo-1552053831-71594a27632d?w=300&h=300&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=300&h=300&fit=crop&crop=center'
    ]
  },

  // Food - Beginner
  {
    category: 'food',
    difficulty: 'beginner',
    languageCode: 'multi',
    translations: {
      en: { word: 'apple', pronunciation: '/ˈæp.əl/' },
      es: { word: 'manzana', pronunciation: '/man.ˈsa.na/' },
      fr: { word: 'pomme', pronunciation: '/pɔm/' },
      it: { word: 'mela', pronunciation: '/ˈme.la/' },
      de: { word: 'apfel', pronunciation: '/ˈap.fəl/' },
      pt: { word: 'maçã', pronunciation: '/ma.ˈsɐ̃/' },
      el: { word: 'μήλο', pronunciation: '/ˈmi.lo/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=300&h=300&fit=crop&crop=center',
    distractorImages: [
      'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=300&h=300&fit=crop&crop=center',
      'https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=300&h=300&fit=crop&crop=center'
    ]
  },
  {
    category: 'food',
    difficulty: 'beginner',
    languageCode: 'multi',
    translations: {
      en: { word: 'banana', pronunciation: '/bəˈnæn.ə/' },
      es: { word: 'plátano', pronunciation: '/ˈpla.ta.no/' },
      fr: { word: 'banane', pronunciation: '/ba.nan/' },
      it: { word: 'banana', pronunciation: '/ba.ˈna.na/' },
      de: { word: 'banane', pronunciation: '/ba.ˈnaː.nə/' },
      pt: { word: 'banana', pronunciation: '/ba.ˈna.na/' },
      el: { word: 'μπανάνα', pronunciation: '/ba.ˈna.na/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=300&h=300&fit=crop&crop=center',
    distractorImages: [
      'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=300&h=300&fit=crop&crop=center',
      'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=300&h=300&fit=crop&crop=center'
    ]
  },

  // Colors - Beginner
  {
    category: 'colors',
    difficulty: 'beginner',
    languageCode: 'multi',
    translations: {
      en: { word: 'red', pronunciation: '/red/' },
      es: { word: 'rojo', pronunciation: '/ˈro.xo/' },
      fr: { word: 'rouge', pronunciation: '/ʁuʒ/' },
      it: { word: 'rosso', pronunciation: '/ˈros.so/' },
      de: { word: 'rot', pronunciation: '/roːt/' },
      pt: { word: 'vermelho', pronunciation: '/veʁ.ˈme.ʎu/' },
      el: { word: 'κόκκινο', pronunciation: '/ˈko.ci.no/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=300&h=300&fit=crop&crop=center',
    distractorImages: [
      'https://images.unsplash.com/photo-1535025639604-9a804c092faa?w=300&h=300&fit=crop&crop=center',
      'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=300&h=300&fit=crop&crop=center'
    ]
  },
  {
    category: 'colors',
    difficulty: 'beginner',
    languageCode: 'multi',
    translations: {
      en: { word: 'blue', pronunciation: '/bluː/' },
      es: { word: 'azul', pronunciation: '/a.ˈθul/' },
      fr: { word: 'bleu', pronunciation: '/blø/' },
      it: { word: 'blu', pronunciation: '/blu/' },
      de: { word: 'blau', pronunciation: '/blaʊ/' },
      pt: { word: 'azul', pronunciation: '/a.ˈzuw/' },
      el: { word: 'μπλε', pronunciation: '/ble/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1535025639604-9a804c092faa?w=300&h=300&fit=crop&crop=center',
    distractorImages: [
      'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=300&h=300&fit=crop&crop=center',
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=300&fit=crop&crop=center'
    ]
  }
];

async function seedLanguageData() {
  console.log('🌱 Starting to seed language data...');
  console.log(`📊 Table: ${TABLE_NAME}`);
  console.log(`📝 Records to insert: ${VOCABULARY_DATA.length}`);

  let successCount = 0;
  let errorCount = 0;

  for (const item of VOCABULARY_DATA) {
    try {
      const wordId = `${item.category}_${item.translations.en.word.toLowerCase()}_${Date.now()}`;
      
      const record: LanguageWordData = {
        ...item,
        wordId,
        createdAt: new Date().toISOString()
      };

      const command = new PutCommand({
        TableName: TABLE_NAME,
        Item: record
      });

      await docClient.send(command);
      successCount++;
      
      console.log(`✅ Inserted: ${item.translations.en.word} (${item.category})`);
    } catch (error) {
      errorCount++;
      console.error(`❌ Failed to insert ${item.translations.en.word}:`, error);
    }
  }

  console.log('\n📊 Seeding Summary:');
  console.log(`✅ Successfully inserted: ${successCount} records`);
  console.log(`❌ Failed to insert: ${errorCount} records`);
  console.log(`📊 Total processed: ${successCount + errorCount} records`);

  if (errorCount === 0) {
    console.log('\n🎉 All language data seeded successfully!');
  } else {
    console.log('\n⚠️  Some records failed to insert. Check the errors above.');
  }
}

// Run the seeding script
if (require.main === module) {
  seedLanguageData()
    .then(() => {
      console.log('✨ Seeding completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}

export { seedLanguageData };