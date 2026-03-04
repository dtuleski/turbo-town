import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { resetPasswordSchema } from '@/utils/validation'
import { ROUTES } from '@/config/constants'
import type { ResetPasswordInput } from '@/types/auth'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'

const ResetPasswordPage = () => {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
  })

  const onSubmit = async (data: ResetPasswordInput) => {
    try {
      setIsLoading(true)
      setError('')
      // TODO: Implement reset password API call
      console.log('Reset password:', data)
      navigate(ROUTES.LOGIN)
    } catch (err) {
      setError('Failed to reset password. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-center mb-2">Reset Password</h2>
      <p className="text-text-secondary text-center mb-6">
        Enter the code from your email and your new password
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

        <Input
          label="Reset Code"
          type="text"
          placeholder="123456"
          error={errors.code?.message}
          {...register('code')}
        />

        <Input
          label="New Password"
          type="password"
          placeholder="••••••••"
          error={errors.newPassword?.message}
          {...register('newPassword')}
        />

        <Input
          label="Confirm Password"
          type="password"
          placeholder="••••••••"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <Button type="submit" className="w-full" isLoading={isLoading}>
          Reset Password
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

export default ResetPasswordPage
