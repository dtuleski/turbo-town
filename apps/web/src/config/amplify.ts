import { Amplify } from 'aws-amplify'
import { env } from './env'

const cognitoDomain = import.meta.env.VITE_COGNITO_DOMAIN || 'memory-game-dev'

export const configureAmplify = () => {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: env.cognito.userPoolId,
        userPoolClientId: env.cognito.clientId,
        loginWith: {
          email: true,
          oauth: {
            domain: `${cognitoDomain}.auth.us-east-1.amazoncognito.com`,
            scopes: ['openid', 'email', 'profile', 'aws.cognito.signin.user.admin'],
            redirectSignIn: [window.location.origin],
            redirectSignOut: [window.location.origin],
            responseType: 'code',
            providers: ['Google'],
          },
        },
        signUpVerificationMethod: 'code',
        userAttributes: {
          email: {
            required: true,
          },
        },
        passwordFormat: {
          minLength: 8,
          requireLowercase: true,
          requireUppercase: true,
          requireNumbers: true,
          requireSpecialCharacters: false,
        },
      },
    },
  })
}
