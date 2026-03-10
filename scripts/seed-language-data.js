#!/usr/bin/env node

/**
 * Seed Language Learning Data
 * 
 * This script populates the language words table with initial vocabulary data
 * for the language learning game.
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.LANGUAGE_WORDS_TABLE_NAME || 'memory-game-language-words-dev';

// Sample vocabulary data
const VOCABULARY_DATA = [
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
      
      const record = {
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

module.exports = { seedLanguageData };