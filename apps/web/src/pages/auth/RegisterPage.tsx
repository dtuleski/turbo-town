import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '@/context/AuthContext'
import { registerSchema } from '@/utils/validation'
import { ROUTES } from '@/config/constants'
import type { RegisterInput } from '@/types/auth'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'

const RegisterPage = () => {
  const { register: registerUser, confirmEmail } = useAuth()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [needsConfirmation, setNeedsConfirmation] = useState(false)
  const [email, setEmail] = useState('')
  const [confirmationCode, setConfirmationCode] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterInput) => {
    try {
      setIsLoading(true)
      setError('')
      setEmail(data.email)
      await registerUser(data)
      navigate(ROUTES.GAME_SETUP)
    } catch (err: any) {
      if (err.message === 'CONFIRM_EMAIL_REQUIRED') {
        setNeedsConfirmation(true)
        setError('Please check your email for a confirmation code.')
      } else {
        setError(err.message || 'Registration failed. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const onConfirmEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsLoading(true)
      setError('')
      await confirmEmail(email, confirmationCode)
      // After confirmation, try to login
      navigate(ROUTES.LOGIN)
    } catch (err: any) {
      setError(err.message || 'Confirmation failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (needsConfirmation) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-center mb-6">Confirm Your Email</h2>

        {error && (
          <div className="bg-status-info/10 border border-status-info text-status-info px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <p className="text-text-secondary mb-4 text-center">
          We've sent a confirmation code to {email}. Please enter it below.
        </p>

        <form onSubmit={onConfirmEmail} className="space-y-4">
          <Input
            label="Confirmation Code"
            type="text"
            placeholder="123456"
            value={confirmationCode}
            onChange={(e) => setConfirmationCode(e.target.value)}
          />

          <Button type="submit" className="w-full" isLoading={isLoading}>
            Confirm Email
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-text-secondary">
          <button
            onClick={() => setNeedsConfirmation(false)}
            className="text-primary-blue hover:underline font-medium"
          >
            Back to registration
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-center mb-6">Create Account</h2>

      {error && (
        <div className="bg-status-error/10 border border-status-error text-status-error px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Email"
          type="email"
          placeholder="your@email.com"
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          label="Username"
          type="text"
          placeholder="coolplayer123"
          error={errors.username?.message}
          {...register('username')}
        />

        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register('password')}
        />

        <Input
          label="Confirm Password"
          type="password"
          placeholder="••••••••"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <Button type="submit" className="w-full" isLoading={isLoading}>
          Create Account
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-text-secondary">
        Already have an account?{' '}
        <Link to={ROUTES.LOGIN} className="text-primary-blue hover:underline font-medium">
          Login
        </Link>
      </div>
    </div>
  )
}

export default RegisterPage
