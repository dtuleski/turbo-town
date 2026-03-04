export const env = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:4000/graphql',
  apiWsUrl: import.meta.env.VITE_API_WS_URL || 'ws://localhost:4000/graphql',
  cognito: {
    userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || '',
    clientId: import.meta.env.VITE_COGNITO_CLIENT_ID || '',
    region: import.meta.env.VITE_COGNITO_REGION || 'us-east-1',
  },
  features: {
    enableSocialLogin: import.meta.env.VITE_ENABLE_SOCIAL_LOGIN === 'true',
    enableSoundEffects: import.meta.env.VITE_ENABLE_SOUND_EFFECTS === 'true',
  },
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
}
