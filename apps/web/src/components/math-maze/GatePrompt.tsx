import React, { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { MathEquation } from '@/utils/mazeGenerator'

export interface GatePromptProps {
  equation: MathEquation
  onSubmit: (answer: number) => void
  onClose: () => void
  feedback?: { correct: boolean; correctAnswer?: number }
}

export const GatePrompt: React.FC<GatePromptProps> = ({
  equation,
  onSubmit,
  onClose,
  feedback,
}) => {
  const { t } = useTranslation()
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus input on mount and when feedback clears
  useEffect(() => {
    if (!feedback) {
      inputRef.current?.focus()
    }
  }, [feedback])

  const hasFeedback = feedback !== undefined

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = value.trim()
    if (trimmed === '' || hasFeedback) return
    const num = Number(trimmed)
    if (Number.isNaN(num)) return
    onSubmit(num)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('mathMaze.gatePrompt')}
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm p-6"
      >
        {/* Header */}
        <p className="text-sm font-medium text-gray-500 mb-2">
          {t('mathMaze.gatePrompt')}
        </p>

        {/* Equation display */}
        <p className="text-2xl font-bold text-center text-gray-900 mb-5">
          {equation.display}
        </p>

        {/* Feedback banner */}
        {hasFeedback && (
          <div
            role="status"
            aria-live="polite"
            className={`mb-4 rounded-lg px-4 py-3 text-center font-semibold ${
              feedback.correct
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {feedback.correct
              ? t('mathMaze.correct')
              : t('mathMaze.incorrect', { answer: feedback.correctAnswer })}
          </div>
        )}

        {/* Input form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            ref={inputRef}
            type="number"
            inputMode="numeric"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={hasFeedback}
            aria-label={t('mathMaze.submitAnswer')}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-lg text-center
              focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
              disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="?"
          />

          <button
            type="submit"
            disabled={value.trim() === '' || hasFeedback}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-white font-semibold
              hover:bg-indigo-700 transition-colors
              focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('mathMaze.submitAnswer')}
          </button>
        </form>
      </div>
    </div>
  )
}

export default GatePrompt
