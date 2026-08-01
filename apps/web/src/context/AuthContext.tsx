import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { signIn, signUp, signOut, getCurrentUser, fetchAuthSession, confirmSignUp, fetchUserAttributes, signInWithRedirect } from 'aws-amplify/auth'
import type { User, AuthContextType, LoginInput, RegisterInput, UpdateProfileInput } from '@/types/auth'
import { storage } from '@/utils/storage'
import { STORAGE_KEYS } from '@/config/constants'
import { canStartGame } from '@/api/game'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check current auth session on mount
    const checkAuthSession = async () => {
      try {
        const currentUser = await getCurrentUser()
        const session = await fetchAuthSession()
        let attributes: Record<string, string | undefined> = {}
        try {
          attributes = await fetchUserAttributes() as Record<string, string | undefined>
        } catch (attrErr) {
          console.log('Could not fetch user attributes, using fallback:', attrErr)
          // For OAuth users, extract from ID token payload
          const payload = session.tokens?.idToken?.payload as Record<string, any> | undefined
          if (payload) {
            attributes = {
              email: payload.email as string,
              preferred_username: payload['cognito:username'] as string,
              name: payload.name as string,
              given_name: payload.given_name as string,
            }
          }
        }
        
        if (currentUser && session.tokens) {
          // For OAuth/federated users, also check ID token payload for name
          const payload = session.tokens?.idToken?.payload as Record<string, any> | undefined
          const displayName = attributes.name
            || payload?.name as string
            || attributes.given_name
            || payload?.given_name as string
            || (attributes.preferred_username?.startsWith('Google_') ? undefined : attributes.preferred_username)
            || attributes.email?.split('@')[0]
            || 'User'

          // Create user object from Cognito user
          const user: User = {
            id: currentUser.userId,
            email: attributes.email || payload?.email as string || currentUser.signInDetails?.loginId || '',
            username: displayName,
            tier: 'FREE', // Default tier, should be fetched from backend
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
          
          setUser(user)
          
          // Store token for API calls
          const idToken = session.tokens.idToken?.toString()
          if (idToken) {
            storage.set(STORAGE_KEYS.AUTH_TOKEN, idToken)
            storage.set(STORAGE_KEYS.USER, user)
          }

          // Fetch actual tier from backend
          try {
            const result = await canStartGame()
            if (result?.rateLimit?.tier && result.rateLimit.tier !== 'FREE') {
              const updatedUser = { ...user, tier: result.rateLimit.tier }
              setUser(updatedUser)
              storage.set(STORAGE_KEYS.USER, updatedUser)
            }
          } catch (tierErr) {
            console.log('Could not fetch tier:', tierErr)
          }
        }
      } catch (error) {
        console.log('No authenticated user:', error)
        // Clear any stale data
        storage.remove(STORAGE_KEYS.USER)
        storage.remove(STORAGE_KEYS.AUTH_TOKEN)
      } finally {
        setIsLoading(false)
      }
    }
    
    checkAuthSession()
  }, [])

  const login = async (input: LoginInput) => {
    try {
      const normalizedEmail = input.email.toLowerCase().trim()
      const { isSignedIn, nextStep } = await signIn({
        username: normalizedEmail,
        password: input.password,
      })
      
      if (isSignedIn) {
        // Get user details and session
        const currentUser = await getCurrentUser()
        const session = await fetchAuthSession()
        const attributes = await fetchUserAttributes()
        
        const user: User = {
          id: currentUser.userId,
          email: attributes.email || normalizedEmail,
          username: attributes.preferred_username || attributes.name || attributes.email?.split('@')[0] || 'User',
          tier: 'FREE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        
        setUser(user)
        
        // Store token for API calls
        const idToken = session.tokens?.idToken?.toString()
        if (idToken) {
          storage.set(STORAGE_KEYS.AUTH_TOKEN, idToken)
          storage.set(STORAGE_KEYS.USER, user)
        }
      } else if (nextStep.signInStep === 'CONFIRM_SIGN_UP') {
        throw new Error('Please confirm your email before signing in')
      }
    } catch (error: any) {
      console.error('Login error:', error)
      throw new Error(error.message || 'Failed to login')
    }
  }

  const register = async (input: RegisterInput) => {
    try {
      const normalizedEmail = input.email.toLowerCase().trim()
      
      // Check username availability before signing up
      const gameEndpoint = import.meta.env.VITE_GAME_ENDPOINT || 'https://l8ra6nktb6.execute-api.us-east-1.amazonaws.com/game/graphql'
      const publicEndpoint = gameEndpoint.replace('/game/graphql', '/game/public')
      try {
        const checkResponse = await fetch(publicEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `query CheckUsernameAvailable($username: String!) { checkUsernameAvailable(username: $username) { available } }`,
            variables: { username: input.username },
            operationName: 'CheckUsernameAvailable',
          }),
        })
        const checkResult = await checkResponse.json()
        if (checkResult.data?.checkUsernameAvailable?.available === false) {
          throw new Error('Username is already taken. Please choose a different one.')
        }
      } catch (checkError: any) {
        // If the error is our own "username taken" error, re-throw it
        if (checkError.message?.includes('already taken')) {
          throw checkError
        }
        // Otherwise log and continue (don't block registration if check fails)
        console.warn('Username availability check failed, proceeding with registration:', checkError)
      }
      
      // Split username into given name and family name for Cognito
      // If username doesn't have a space, use it as given name and set family name to username
      const nameParts = input.username.trim().split(' ')
      const givenName = nameParts[0] || input.username
      const familyName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : input.username
      
      const { isSignUpComplete, userId, nextStep } = await signUp({
        username: normalizedEmail,
        password: input.password,
        options: {
          userAttributes: {
            email: normalizedEmail,
            preferred_username: input.username,
            name: input.username, // Full name
            given_name: givenName,
            family_name: familyName,
          },
        },
      })
      
      if (!isSignUpComplete && nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
        // User needs to confirm email
        throw new Error('CONFIRM_EMAIL_REQUIRED')
      }
      
      if (isSignUpComplete && userId) {
        // Auto-login after successful registration
        await login({ email: normalizedEmail, password: input.password })
      }
    } catch (error: any) {
      console.error('Registration error:', error)
      if (error.message === 'CONFIRM_EMAIL_REQUIRED') {
        throw error
      }
      throw new Error(error.message || 'Failed to register')
    }
  }
  
  const confirmEmail = async (email: string, code: string) => {
    try {
      await confirmSignUp({
        username: email.toLowerCase().trim(),
        confirmationCode: code,
      })
    } catch (error: any) {
      console.error('Email confirmation error:', error)
      throw new Error(error.message || 'Failed to confirm email')
    }
  }

  const logout = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setUser(null)
      storage.remove(STORAGE_KEYS.USER)
      storage.remove(STORAGE_KEYS.AUTH_TOKEN)
      storage.remove(STORAGE_KEYS.REFRESH_TOKEN)
    }
  }

  const updateProfile = async (input: UpdateProfileInput) => {
    // TODO: Implement actual update profile API call
    console.log('Update profile:', input)
    
    if (user) {
      const updatedUser = { ...user, ...input }
      setUser(updatedUser)
      storage.set(STORAGE_KEYS.USER, updatedUser)
    }
  }

  const loginWithGoogle = async () => {
    try {
      await signInWithRedirect({ provider: 'Google' })
    } catch (error) {
      console.error('Google sign-in error:', error)
    }
  }

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    loginWithGoogle,
    register,
    logout,
    updateProfile,
    confirmEmail,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
