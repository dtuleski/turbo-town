const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({ region: 'us-east-1' });

const lambda = new AWS.Lambda();

const testAdminAPI = async () => {
  const payload = {
    httpMethod: 'POST',
    path: '/game/graphql',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token' // This will fail auth but should still show our logs
    },
    body: JSON.stringify({
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
    }),
    requestContext: {
      requestId: 'test-admin-call',
      authorizer: {
        jwt: {
          claims: {
            sub: 'c4c804d8-6071-70c6-d9e3-a2286ef3f13a', // Your user ID
            preferred_username: 'dtuleski',
            email: 'diego.tuleski@gmail.com'
          }
        }
      }
    }
  };

  try {
    const result = await lambda.invoke({
      FunctionName: 'MemoryGame-GameService-dev',
      Payload: JSON.stringify(payload)
    }).promise();

    console.log('Lambda response:', JSON.parse(result.Payload));
  } catch (error) {
    console.error('Error:', error);
  }
};

testAdminAPI();