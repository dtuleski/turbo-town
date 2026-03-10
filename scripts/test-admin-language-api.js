const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = 'memory-game-language-words-dev';

async function testLanguageData() {
  console.log('🔍 Testing Language Data Structure for Admin API...\n');
  
  try {
    const command = new ScanCommand({
      TableName: TABLE_NAME,
      Limit: 5 // Just get a few items to test
    });

    const result = await docClient.send(command);
    const items = result.Items || [];

    console.log(`📊 Found ${items.length} items in database`);
    console.log(`📊 Total scanned: ${result.ScannedCount}`);
    console.log(`📊 Total count: ${result.Count}\n`);

    if (items.length > 0) {
      console.log('📝 Sample Item Structure:');
      const sampleItem = items[0];
      
      console.log(`   Word ID: ${sampleItem.wordId}`);
      console.log(`   Category: ${sampleItem.category}`);
      console.log(`   Difficulty: ${sampleItem.difficulty}`);
      console.log(`   Language Code: ${sampleItem.languageCode}`);
      console.log(`   Image URL: ${sampleItem.imageUrl}`);
      console.log(`   Distractor Images: ${sampleItem.distractorImages?.length || 0} images`);
      console.log(`   Created At: ${sampleItem.createdAt}`);
      console.log(`   Updated At: ${sampleItem.updatedAt}`);
      
      if (sampleItem.translations) {
        console.log(`   Translations:`);
        Object.entries(sampleItem.translations).forEach(([lang, translation]) => {
          console.log(`     ${lang.toUpperCase()}: ${translation.word} (${translation.pronunciation})`);
        });
      }
      
      console.log('\n📋 Full Item Structure:');
      console.log(JSON.stringify(sampleItem, null, 2));
    }

    console.log('\n✅ Database structure looks good for admin API!');
    console.log('\n🔗 Admin maintenance page should be available at:');
    console.log('   https://dev.dashden.app/admin/language-maintenance');
    
  } catch (error) {
    console.error('❌ Error testing language data:', error);
  }
}

testLanguageData().catch(console.error);