import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { signIn, signUp, signOut, getCurrentUser, fetchAuthSession, confirmSignUp, fetchUserAttributes } from 'aws-amplify/auth'
import type { User, AuthContextType, LoginInput, RegisterInput, UpdateProfileInput } from '@/types/auth'
import { storage } from '@/utils/storage'
import { STORAGE_KEYS } from '@/config/constants'

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
        const attributes = await fetchUserAttributes()
        
        if (currentUser && session.tokens) {
          // Create user object from Cognito user
          const user: User = {
            id: currentUser.userId,
            email: attributes.email || currentUser.signInDetails?.loginId || '',
            username: attributes.preferred_username || attributes.name || attributes.email || 'User',
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
      const { isSignedIn, nextStep } = await signIn({
        username: input.email,
        password: input.password,
      })
      
      if (isSignedIn) {
        // Get user details and session
        const currentUser = await getCurrentUser()
        const session = await fetchAuthSession()
        const attributes = await fetchUserAttributes()
        
        const user: User = {
          id: currentUser.userId,
          email: attributes.email || input.email,
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
      // Split username into given name and family name for Cognito
      // If username doesn't have a space, use it as given name and set family name to username
      const nameParts = input.username.trim().split(' ')
      const givenName = nameParts[0] || input.username
      const familyName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : input.username
      
      const { isSignUpComplete, userId, nextStep } = await signUp({
        username: input.email,
        password: input.password,
        options: {
          userAttributes: {
            email: input.email,
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
        await login({ email: input.email, password: input.password })
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
        username: email,
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

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    updateProfile,
    confirmEmail,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
