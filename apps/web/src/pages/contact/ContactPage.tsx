import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/context/AuthContext'
import { submitContactForm, type ContactFormInput } from '@/api/game'
import { ROUTES } from '@/config/constants'

type ContactType = ContactFormInput['type']

export default function ContactPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [type, setType] = useState<ContactType>('bug')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  const TYPES: { id: ContactType; emoji: string; labelKey: string }[] = [
    { id: 'bug', emoji: '🐛', labelKey: 'setup.contact.bugReport' },
    { id: 'feature', emoji: '💡', labelKey: 'setup.contact.featureRequest' },
    { id: 'question', emoji: '❓', labelKey: 'setup.contact.question' },
    { id: 'other', emoji: '📩', labelKey: 'setup.contact.other' },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim() || !message.trim()) return
    setStatus('sending')
    try {
      await submitContactForm({ type, subject: subject.trim(), message: message.trim() })
      setStatus('sent')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400 flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-black text-gray-800 mb-2">{t('setup.contact.sentTitle')}</h2>
          <p className="text-gray-600 mb-6">{t('setup.contact.sentMsg')}</p>
          <button onClick={() => navigate(ROUTES.HUB)}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl hover:scale-105 transition-all">
            {t('setup.contact.backToGames')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-2 drop-shadow-lg">📬 {t('setup.contact.title')}</h1>
          <p className="text-white/80 text-lg">{t('setup.contact.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 md:p-8 shadow-2xl">
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">{t('setup.contact.whatsAbout')}</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {TYPES.map((tp) => (
                <button key={tp.id} type="button" onClick={() => setType(tp.id)}
                  className={`p-3 rounded-xl border-2 text-center transition-all ${
                    type === tp.id ? 'border-purple-500 bg-purple-50 scale-105' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                  <div className="text-2xl mb-1">{tp.emoji}</div>
                  <div className="text-xs font-bold text-gray-700">{t(tp.labelKey)}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4 bg-gray-50 rounded-xl p-3 text-sm text-gray-500">
            {t('setup.contact.from')} <span className="font-bold text-gray-700">{user?.username || 'Player'}</span>
          </div>

          <div className="mb-4">
            <label htmlFor="subject" className="block text-sm font-bold text-gray-700 mb-1">{t('setup.contact.subject')}</label>
            <input id="subject" type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
              maxLength={200} placeholder={t('setup.contact.subjectPlaceholder')}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:outline-none transition-colors text-gray-800" />
          </div>

          <div className="mb-6">
            <label htmlFor="message" className="block text-sm font-bold text-gray-700 mb-1">{t('setup.contact.message')}</label>
            <textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)}
              maxLength={5000} rows={6} placeholder={t('setup.contact.messagePlaceholder')}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:outline-none transition-colors text-gray-800 resize-none" />
            <div className="text-right text-xs text-gray-400 mt-1">{message.length}/5000</div>
          </div>

          <button type="submit" disabled={!subject.trim() || !message.trim() || status === 'sending'}
            className={`w-full py-3 rounded-xl font-bold text-lg transition-all ${
              subject.trim() && message.trim() && status !== 'sending'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:scale-[1.02] shadow-lg'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}>
            {status === 'sending' ? t('setup.contact.sending') : t('setup.contact.send')}
          </button>

          {status === 'error' && (
            <p className="text-red-500 text-sm text-center mt-3">{t('setup.contact.errorMsg')}</p>
          )}
        </form>
      </div>
    </div>
  )
}
