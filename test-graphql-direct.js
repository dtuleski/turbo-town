#!/usr/bin/env node

const https = require('https');

const query = `
  query GetLanguageWords($languageCode: String!, $category: String!, $difficulty: String!, $count: Int!) {
    getLanguageWords(languageCode: $languageCode, category: $category, difficulty: $difficulty, count: $count) {
      id
      word
      pronunciation
      correctImageUrl
      distractorImages
      category
    }
  }
`;

const variables = {
  languageCode: "es",
  category: "animals", 
  difficulty: "beginner",
  count: 5
};

const data = JSON.stringify({
  query,
  variables
});

const options = {
  hostname: 'ooihrv63q8.execute-api.us-east-1.amazonaws.com',
  port: 443,
  path: '/game/graphql',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    'Authorization': 'Bearer test-token'
  }
};

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers)}`);
  
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  
  res.on('end', () => {
    console.log('Response body:');
    try {
      const parsed = JSON.parse(body);
      console.log(JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log(body);
    }
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(data);
req.end();