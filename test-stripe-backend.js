#!/usr/bin/env node

const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const lambda = new LambdaClient({ region: 'us-east-1' });

async function testCreateCheckoutSession() {
  console.log('🧪 Testing createCheckoutSession mutation...\n');

  const payload = {
    body: JSON.stringify({
      query: `
        mutation {
          createCheckoutSession(input: {
            priceId: "price_1T8TJYD1222JoXRH79EkciO2"
            tier: "BASIC"
          }) {
            sessionId
            url
          }
        }
      `,
    }),
    httpMethod: 'POST',
    requestContext: {
      requestId: 'test-stripe-checkout',
      authorizer: {
        jwt: {
          claims: {
            sub: 'c4c804d8-6071-70c6-d9e3-a2286ef3f13a',
            preferred_username: 'dtuleski',
            email: 'diegotuleski@gmail.com',
          },
        },
      },
    },
  };

  try {
    const command = new InvokeCommand({
      FunctionName: 'MemoryGame-GameService-dev',
      Payload: JSON.stringify(payload),
    });

    const response = await lambda.send(command);
    const result = JSON.parse(Buffer.from(response.Payload).toString());
    const body = JSON.parse(result.body);

    if (body.errors) {
      console.log('❌ Test FAILED');
      console.log('Errors:', JSON.stringify(body.errors, null, 2));
      return false;
    }

    if (body.data?.createCheckoutSession) {
      console.log('✅ Test PASSED');
      console.log('Session ID:', body.data.createCheckoutSession.sessionId);
      console.log('Checkout URL:', body.data.createCheckoutSession.url);
      console.log('\n📝 You can test the checkout by visiting the URL above');
      return true;
    }

    console.log('❌ Unexpected response:', JSON.stringify(body, null, 2));
    return false;
  } catch (error) {
    console.log('❌ Test FAILED with error:', error.message);
    return false;
  }
}

async function testCreatePortalSession() {
  console.log('\n🧪 Testing createPortalSession mutation...\n');

  const payload = {
    body: JSON.stringify({
      query: `
        mutation {
          createPortalSession {
            url
          }
        }
      `,
    }),
    httpMethod: 'POST',
    requestContext: {
      requestId: 'test-stripe-portal',
      authorizer: {
        jwt: {
          claims: {
            sub: 'c4c804d8-6071-70c6-d9e3-a2286ef3f13a',
            preferred_username: 'dtuleski',
            email: 'diegotuleski@gmail.com',
          },
        },
      },
    },
  };

  try {
    const command = new InvokeCommand({
      FunctionName: 'MemoryGame-GameService-dev',
      Payload: JSON.stringify(payload),
    });

    const response = await lambda.send(command);
    const result = JSON.parse(Buffer.from(response.Payload).toString());
    const body = JSON.parse(result.body);

    if (body.errors) {
      // Expected to fail if no subscription exists yet
      if (body.errors[0]?.message?.includes('No active subscription')) {
        console.log('⚠️  Expected error (no subscription yet):', body.errors[0].message);
        console.log('✅ Mutation is working correctly');
        return true;
      }
      console.log('❌ Test FAILED');
      console.log('Errors:', JSON.stringify(body.errors, null, 2));
      return false;
    }

    if (body.data?.createPortalSession) {
      console.log('✅ Test PASSED');
      console.log('Portal URL:', body.data.createPortalSession.url);
      return true;
    }

    console.log('❌ Unexpected response:', JSON.stringify(body, null, 2));
    return false;
  } catch (error) {
    console.log('❌ Test FAILED with error:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Testing Stripe Backend Integration\n');
  console.log('=' .repeat(60));

  const test1 = await testCreateCheckoutSession();
  const test2 = await testCreatePortalSession();

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Test Summary:');
  console.log(`  createCheckoutSession: ${test1 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  createPortalSession:   ${test2 ? '✅ PASS' : '❌ FAIL'}`);
  
  if (test1 && test2) {
    console.log('\n🎉 All tests passed! Backend is ready for Stripe integration.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the errors above.');
  }
}

main().catch(console.error);
