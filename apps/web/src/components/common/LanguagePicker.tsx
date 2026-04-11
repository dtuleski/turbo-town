import { useTranslation } from 'react-i18next'
import { useState, useRef, useEffect } from 'react'

const LANGUAGES = [
  { code: 'en', flag: '🇺🇸', label: 'EN' },
  { code: 'es', flag: '🇪🇸', label: 'ES' },
  { code: 'pt', flag: '🇧🇷', label: 'PT' },
]

export default function LanguagePicker() {
  const { i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const current = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0]

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors text-sm"
        aria-label="Change language"
      >
        <span className="text-base">{current.flag}</span>
        <span className="text-xs font-medium text-gray-500">{current.label}</span>
        <svg className={`w-3 h-3 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50 overflow-hidden">
          {LANGUAGES.map((lang) => {
            const isActive = i18n.language === lang.code
            return (
              <button
                key={lang.code}
                onClick={() => { i18n.changeLanguage(lang.code); setOpen(false) }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-purple-50 text-purple-700 font-semibold'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="text-base">{lang.flag}</span>
                <span>{lang.label}</span>
                {isActive && <span className="ml-auto text-purple-500 text-xs">✓</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
