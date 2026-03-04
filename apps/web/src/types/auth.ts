export interface User {
  id: string
  email: string
  username: string
  tier: 'FREE' | 'LIGHT' | 'STANDARD' | 'PREMIUM'
  createdAt: string
  updatedAt: string
}

export interface LoginInput {
  email: string
  password: string
}

export interface RegisterInput {
  email: string
  username: string
  password: string
  confirmPassword: string
}

export interface ForgotPasswordInput {
  email: string
}

export interface ResetPasswordInput {
  email: string
  code: string
  newPassword: string
  confirmPassword: string
}

export interface UpdateProfileInput {
  username?: string
  email?: string
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: User
}

export interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (input: LoginInput) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (input: UpdateProfileInput) => Promise<void>
  confirmEmail: (email: string, code: string) => Promise<void>
}
