const { LambdaClient, UpdateFunctionCodeCommand } = require('@aws-sdk/client-lambda');
const fs = require('fs');
const path = require('path');

const client = new LambdaClient({ region: 'us-east-1' });

async function deployLambda() {
  const zipPath = path.join(__dirname, 'function.zip');
  const zipBuffer = fs.readFileSync(zipPath);

  console.log(`📦 Deploying ${zipBuffer.length} bytes to Lambda...`);

  const command = new UpdateFunctionCodeCommand({
    FunctionName: 'MemoryGame-GameService-dev',
    ZipFile: zipBuffer,
  });

  try {
    const response = await client.send(command);
    console.log('✅ Deployment successful!');
    console.log(`Status: ${response.LastUpdateStatus}`);
    console.log(`Code Size: ${response.CodeSize} bytes`);
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

deployLambda();
