import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { forgotPasswordSchema } from '@/utils/validation'
import { ROUTES } from '@/config/constants'
import type { ForgotPasswordInput } from '@/types/auth'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'

const ForgotPasswordPage = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordInput) => {
    try {
      setIsLoading(true)
      setError('')
      // TODO: Implement forgot password API call
      console.log('Forgot password:', data)
      setSuccess(true)
    } catch (err) {
      setError('Failed to send reset email. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="text-6xl mb-4">📧</div>
        <h2 className="text-2xl font-bold mb-4">Check Your Email</h2>
        <p className="text-text-secondary mb-6">
          We've sent you a password reset link. Please check your email and follow the instructions.
        </p>
        <Link to={ROUTES.LOGIN} className="text-primary-blue hover:underline">
          Back to Login
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-center mb-2">Forgot Password?</h2>
      <p className="text-text-secondary text-center mb-6">
        Enter your email and we'll send you a reset link
      </p>

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

        <Button type="submit" className="w-full" isLoading={isLoading}>
          Send Reset Link
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-text-secondary">
        <Link to={ROUTES.LOGIN} className="text-primary-blue hover:underline">
          Back to Login
        </Link>
      </div>
    </div>
  )
}

export default ForgotPasswordPage
