const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = 'memory-game-language-words-dev';

async function reviewLanguageData() {
  console.log('🔍 Reviewing Language Data in DynamoDB...\n');
  
  try {
    const result = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME
    }));

    const items = result.Items || [];
    console.log(`Found ${items.length} language words in database\n`);

    // Group by category for better review
    const categories = {};
    
    items.forEach(item => {
      const category = item.category;
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(item);
    });

    // Display each category
    Object.keys(categories).forEach(category => {
      console.log(`📂 Category: ${category.toUpperCase()}`);
      console.log('=' .repeat(50));
      
      categories[category].forEach(item => {
        console.log(`Word ID: ${item.wordId}`);
        console.log(`English: ${item.translations.en?.word || 'N/A'}`);
        console.log(`Spanish: ${item.translations.es?.word || 'N/A'}`);
        console.log(`Pronunciation: ${item.translations.es?.pronunciation || 'N/A'}`);
        console.log(`Image URL: ${item.imageUrl}`);
        console.log(`Distractor Images: ${item.distractorImages?.length || 0} images`);
        
        // Check if image URLs match the word
        const englishWord = item.translations.en?.word?.toLowerCase();
        const imageUrl = item.imageUrl?.toLowerCase();
        
        let imageMatch = 'Unknown';
        if (imageUrl) {
          if (imageUrl.includes('dog') || imageUrl.includes('puppy')) imageMatch = 'Dog';
          else if (imageUrl.includes('cat') || imageUrl.includes('kitten')) imageMatch = 'Cat';
          else if (imageUrl.includes('bird') || imageUrl.includes('eagle') || imageUrl.includes('owl')) imageMatch = 'Bird';
          else if (imageUrl.includes('rabbit') || imageUrl.includes('bunny')) imageMatch = 'Rabbit';
          else if (imageUrl.includes('fish')) imageMatch = 'Fish';
          else imageMatch = 'Generic/Other';
        }
        
        const wordMatch = englishWord === imageMatch.toLowerCase();
        console.log(`Image Content: ${imageMatch} ${wordMatch ? '✅' : '❌'}`);
        console.log('-'.repeat(30));
      });
      console.log('\n');
    });

    // Summary of issues
    console.log('🚨 ISSUES FOUND:');
    console.log('=' .repeat(50));
    
    let issuesFound = 0;
    items.forEach(item => {
      const englishWord = item.translations.en?.word?.toLowerCase();
      const imageUrl = item.imageUrl?.toLowerCase();
      
      let imageMatch = '';
      if (imageUrl) {
        if (imageUrl.includes('dog') || imageUrl.includes('puppy')) imageMatch = 'dog';
        else if (imageUrl.includes('cat') || imageUrl.includes('kitten')) imageMatch = 'cat';
        else if (imageUrl.includes('bird') || imageUrl.includes('eagle') || imageUrl.includes('owl')) imageMatch = 'bird';
        else if (imageUrl.includes('rabbit') || imageUrl.includes('bunny')) imageMatch = 'rabbit';
        else if (imageUrl.includes('fish')) imageMatch = 'fish';
      }
      
      if (englishWord && imageMatch && englishWord !== imageMatch) {
        issuesFound++;
        console.log(`❌ ${item.wordId}: Word "${englishWord}" has "${imageMatch}" image`);
      }
    });
    
    if (issuesFound === 0) {
      console.log('✅ No image/word mismatches found!');
    } else {
      console.log(`\nFound ${issuesFound} image/word mismatches that need fixing.`);
    }

  } catch (error) {
    console.error('Error reviewing language data:', error);
  }
}

// Function to fix specific image URLs
async function fixImageUrls() {
  console.log('\n🔧 Fixing Image URLs...\n');
  
  const fixes = [
    {
      wordId: 'animals_bird_1773135419762',
      correctImageUrl: 'https://images.unsplash.com/photo-1444212477490-ca407925329e?w=300&h=300&fit=crop&crop=face',
      correctDistractorImages: [
        'https://images.unsplash.com/photo-1552053831-71594a27632d?w=300&h=300&fit=crop&crop=face', // dog
        'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=300&h=300&fit=crop&crop=face'  // cat
      ]
    }
    // Add more fixes as needed
  ];

  for (const fix of fixes) {
    try {
      await docClient.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { wordId: fix.wordId },
        UpdateExpression: 'SET imageUrl = :imageUrl, distractorImages = :distractorImages',
        ExpressionAttributeValues: {
          ':imageUrl': fix.correctImageUrl,
          ':distractorImages': fix.correctDistractorImages
        }
      }));
      
      console.log(`✅ Fixed ${fix.wordId}`);
    } catch (error) {
      console.error(`❌ Failed to fix ${fix.wordId}:`, error);
    }
  }
}

// Run the review
reviewLanguageData().then(() => {
  console.log('\n📋 Review complete!');
  console.log('\nTo fix the issues, you can:');
  console.log('1. Update the image URLs in the database manually');
  console.log('2. Use the AWS DynamoDB console');
  console.log('3. Run a fix script (uncomment fixImageUrls() call below)');
  
  // Uncomment the line below to run fixes
  // return fixImageUrls();
});