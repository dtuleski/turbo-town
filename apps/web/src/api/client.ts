import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client'
import { setContext } from '@apollo/client/link/context'
import { onError } from '@apollo/client/link/error'
import { fetchAuthSession } from 'aws-amplify/auth'
import { env } from '@/config/env'
import { STORAGE_KEYS } from '@/config/constants'

// Create auth link factory
const createAuthLink = () => setContext(async (_, { headers }) => {
  try {
    // Try to get token from Amplify session first
    const session = await fetchAuthSession()
    const token = session.tokens?.idToken?.toString()
    
    console.log('[Auth Link] Session:', session)
    console.log('[Auth Link] Token from Amplify:', token ? `${token.substring(0, 50)}... (length: ${token.length})` : 'none')
    
    if (token) {
      const authHeader = `Bearer ${token}`
      console.log('[Auth Link] Setting Authorization header:', authHeader.substring(0, 70) + '...')
      return {
        headers: {
          ...headers,
          authorization: authHeader,
        },
      }
    }
  } catch (error) {
    console.error('[Auth Link] Error fetching session:', error)
  }
  
  // Fallback to localStorage
  const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)
  console.log('[Auth Link] Token from localStorage:', token ? `${token.substring(0, 50)}... (length: ${token.length})` : 'none')
  
  if (!token) {
    console.warn('[Auth Link] NO TOKEN FOUND - Request will fail with 401')
  }
  
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  }
})

// Create error link factory
const createErrorLink = () => onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      console.error(`[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`)
      
      // Handle authentication errors
      if (message.includes('Unauthorized') || message.includes('Token expired')) {
        localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN)
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
        localStorage.removeItem(STORAGE_KEYS.USER)
        window.location.href = '/login'
      }
    })
  }

  if (networkError) {
    console.error(`[Network error]: ${networkError}`)
  }
})

// Auth Service Client
const authHttpLink = createHttpLink({
  uri: env.apiUrl, // Auth endpoint
})

export const authClient = new ApolloClient({
  link: from([createErrorLink(), createAuthLink(), authHttpLink]),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
    },
  },
})

// Game Service Client
const gameHttpLink = createHttpLink({
  uri: import.meta.env.VITE_GAME_ENDPOINT || env.apiUrl.replace('/auth/', '/game/'),
})

export const gameClient = new ApolloClient({
  link: from([createErrorLink(), createAuthLink(), gameHttpLink]),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
    },
  },
})

// Default export for backward compatibility
export const apolloClient = authClient
