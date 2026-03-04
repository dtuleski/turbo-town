// Jest global setup for auth service tests

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.COGNITO_USER_POOL_ID = 'test-user-pool-id';
process.env.COGNITO_CLIENT_ID = 'test-client-id';
process.env.DYNAMODB_USERS_TABLE = 'test-users-table';
process.env.DYNAMODB_USER_SETTINGS_TABLE = 'test-user-settings-table';
process.env.AWS_REGION = 'us-east-1';

// Mock AWS SDK
jest.mock('@aws-sdk/client-cognito-identity-provider');
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');
jest.mock('@aws-sdk/client-cloudwatch');

// Suppress console logs in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
