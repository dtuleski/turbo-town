export interface EnvironmentConfig {
  environment: 'dev' | 'staging' | 'prod';
  
  // AWS Account
  account: string;
  region: string;
  
  // API Gateway
  apiThrottleBurst: number;
  apiThrottleRate: number;
  
  // Lambda
  lambdaMemorySizes: {
    auth: number;
    game: number;
    leaderboard: number;
    payment: number;
    cms: number;
    admin: number;
  };
  
  // CloudWatch
  logRetentionDays: number;
  alarmEmailRecipients: string[];
  
  // Domain (optional)
  customDomain?: {
    webApp: string;
    assets: string;
    certificateArn: string;
  };
  
  // Feature flags
  enableXRayTracing: boolean;
  enableDetailedMetrics: boolean;
}

export const devConfig: EnvironmentConfig = {
  environment: 'dev',
  account: process.env.CDK_DEFAULT_ACCOUNT || '',
  region: 'us-east-1',
  apiThrottleBurst: 1000,
  apiThrottleRate: 500,
  lambdaMemorySizes: {
    auth: 512,
    game: 512,
    leaderboard: 256,
    payment: 512,
    cms: 512,
    admin: 512,
  },
  logRetentionDays: 7,
  alarmEmailRecipients: ['diego.tuleski@gmail.com'],
  customDomain: {
    webApp: 'dev.dashden.app',
    assets: 'assets-dev.dashden.app',
    certificateArn: '', // Will be populated when SSL certificate is created
  },
  enableXRayTracing: false,
  enableDetailedMetrics: false,
};

export const stagingConfig: EnvironmentConfig = {
  environment: 'staging',
  account: process.env.CDK_DEFAULT_ACCOUNT || '',
  region: 'us-east-1',
  apiThrottleBurst: 5000,
  apiThrottleRate: 2500,
  lambdaMemorySizes: {
    auth: 512,
    game: 512,
    leaderboard: 256,
    payment: 512,
    cms: 512,
    admin: 512,
  },
  logRetentionDays: 14,
  alarmEmailRecipients: ['staging-team@example.com'],
  enableXRayTracing: true,
  enableDetailedMetrics: false,
};

export const prodConfig: EnvironmentConfig = {
  environment: 'prod',
  account: process.env.CDK_DEFAULT_ACCOUNT || '',
  region: 'us-east-1',
  apiThrottleBurst: 10000,
  apiThrottleRate: 5000,
  lambdaMemorySizes: {
    auth: 512,
    game: 512,
    leaderboard: 256,
    payment: 512,
    cms: 512,
    admin: 512,
  },
  logRetentionDays: 30,
  alarmEmailRecipients: ['diego.tuleski@gmail.com'],
  customDomain: {
    webApp: 'dashden.app',
    assets: 'assets.dashden.app',
    certificateArn: '', // Will be populated when SSL certificate is created
  },
  enableXRayTracing: true,
  enableDetailedMetrics: true,
};
