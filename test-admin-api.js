// Quick test script to check what the admin API is returning
const https = require('https');

const data = JSON.stringify({
  query: `
    query GetAdminAnalytics {
      getAdminAnalytics {
        overview {
          totalUsers
          dau
          mau
          totalGamesPlayed
          totalGamesToday
          totalGamesThisWeek
          totalGamesThisMonth
          avgGamesPerUser
          conversionRate
        }
      }
    }
  `
});

const options = {
  hostname: 'ooihrv63q8.execute-api.us-east-1.amazonaws.com',
  port: 443,
  path: '/game/graphql',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN_HERE', // Replace with actual token
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  console.log(`statusCode: ${res.statusCode}`);
  console.log(`headers:`, res.headers);

  let responseData = '';
  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    try {
      const parsed = JSON.parse(responseData);
      console.log('Response:', JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log('Raw response:', responseData);
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(data);
req.end();