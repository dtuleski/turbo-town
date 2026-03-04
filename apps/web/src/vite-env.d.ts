/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_API_WS_URL: string
  readonly VITE_COGNITO_USER_POOL_ID: string
  readonly VITE_COGNITO_CLIENT_ID: string
  readonly VITE_COGNITO_REGION: string
  readonly VITE_COGNITO_DOMAIN: string
  readonly VITE_AUTH_ENDPOINT: string
  readonly VITE_GAME_ENDPOINT: string
  readonly VITE_ENABLE_SOCIAL_LOGIN: string
  readonly VITE_ENABLE_SOUND_EFFECTS: string
  readonly DEV: boolean
  readonly PROD: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
