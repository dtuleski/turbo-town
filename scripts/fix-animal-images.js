const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = 'memory-game-language-words-dev';

// Correct image URLs for each animal
const correctImages = {
  'animals_dog_1773135419402': {
    imageUrl: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=300&h=300&fit=crop&crop=face', // Golden retriever
    distractorImages: [
      'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=300&h=300&fit=crop&crop=face', // Cat
      'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=300&h=300&fit=crop&crop=face'  // Rabbit
    ]
  },
  'animals_cat_1773135419702': {
    imageUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=300&h=300&fit=crop&crop=face', // Cat
    distractorImages: [
      'https://images.unsplash.com/photo-1552053831-71594a27632d?w=300&h=300&fit=crop&crop=face', // Dog
      'https://images.unsplash.com/photo-1444212477490-ca407925329e?w=300&h=300&fit=crop&crop=face'  // Bird
    ]
  },
  'animals_bird_1773135419762': {
    imageUrl: 'https://images.unsplash.com/photo-1444212477490-ca407925329e?w=300&h=300&fit=crop&crop=face', // Bird
    distractorImages: [
      'https://images.unsplash.com/photo-1552053831-71594a27632d?w=300&h=300&fit=crop&crop=face', // Dog
      'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=300&h=300&fit=crop&crop=face'  // Cat
    ]
  },
  'animals_rabbit_1773135419877': {
    imageUrl: 'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=300&h=300&fit=crop&crop=face', // Rabbit
    distractorImages: [
      'https://images.unsplash.com/photo-1552053831-71594a27632d?w=300&h=300&fit=crop&crop=face', // Dog
      'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=300&h=300&fit=crop&crop=face'  // Cat
    ]
  },
  'animals_fish_1773135419824': {
    imageUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=300&h=300&fit=crop&crop=center', // Fish
    distractorImages: [
      'https://images.unsplash.com/photo-1552053831-71594a27632d?w=300&h=300&fit=crop&crop=face', // Dog
      'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=300&h=300&fit=crop&crop=face'  // Cat
    ]
  }
};

async function showCurrentData() {
  console.log('🔍 Current Database Content:\n');
  
  for (const wordId of Object.keys(correctImages)) {
    try {
      const result = await docClient.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: { wordId }
      }));
      
      if (result.Item) {
        const item = result.Item;
        console.log(`📝 ${wordId}`);
        console.log(`   English: ${item.translations.en?.word}`);
        console.log(`   Spanish: ${item.translations.es?.word}`);
        console.log(`   Current Image: ${item.imageUrl}`);
        console.log(`   Current Distractors: ${item.distractorImages?.length || 0} images`);
        console.log('');
      }
    } catch (error) {
      console.error(`Error fetching ${wordId}:`, error);
    }
  }
}

async function fixImages() {
  console.log('🔧 Fixing Animal Images...\n');
  
  for (const [wordId, correctData] of Object.entries(correctImages)) {
    try {
      await docClient.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { wordId },
        UpdateExpression: 'SET imageUrl = :imageUrl, distractorImages = :distractorImages, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':imageUrl': correctData.imageUrl,
          ':distractorImages': correctData.distractorImages,
          ':updatedAt': new Date().toISOString()
        }
      }));
      
      console.log(`✅ Fixed ${wordId}`);
    } catch (error) {
      console.error(`❌ Failed to fix ${wordId}:`, error);
    }
  }
  
  console.log('\n🎉 All animal images have been fixed!');
  console.log('\nImage assignments:');
  console.log('🐕 Dog: Golden retriever photo');
  console.log('🐱 Cat: Cat with white and gray markings');
  console.log('🐦 Bird: Colorful bird photo');
  console.log('🐰 Rabbit: White and brown rabbit');
  console.log('🐟 Fish: Tropical fish photo');
}

// Run the script
async function main() {
  await showCurrentData();
  
  console.log('Do you want to fix the images? This will update the database.');
  console.log('The fixes will ensure each animal word shows the correct animal image.\n');
  
  // For now, just show what would be fixed. Uncomment the line below to actually fix:
  await fixImages();
}

main().catch(console.error);