/**
 * Jest global setup
 * Runs before all tests
 */

// Mock environment variables
process.env.GAMES_TABLE_NAME = 'Games-test';
process.env.RATE_LIMITS_TABLE_NAME = 'RateLimits-test';
process.env.ACHIEVEMENTS_TABLE_NAME = 'Achievements-test';
process.env.THEMES_TABLE_NAME = 'Themes-test';
process.env.SUBSCRIPTIONS_TABLE_NAME = 'Subscriptions-test';
process.env.EVENT_BUS_NAME = 'MemoryGame-test';
process.env.AWS_REGION = 'us-east-1';
process.env.LOG_LEVEL = 'ERROR'; // Reduce noise in tests
process.env.NODE_ENV = 'test';

// Mock AWS SDK
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');
jest.mock('@aws-sdk/client-eventbridge');
jest.mock('@aws-sdk/client-cloudwatch');

export {};
