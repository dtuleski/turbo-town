import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export const LEGAL_CONTACT_EMAIL = 'admin@dashden.app'
export const LEGAL_PUBLISHER = 'Diego Tuleski'
export const LEGAL_EFFECTIVE_DATE = 'November 26, 2026'

/** Public, sign-in-free page shell for the privacy policy and terms (linked from the app stores). */
export default function LegalLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-3xl mx-auto px-4 py-10">
        <Link to="/" className="text-blue-600 font-semibold">
          DashDen
        </Link>
        <h1 className="text-3xl font-black mt-4">{title}</h1>
        <p className="text-sm text-gray-600 mt-1">Effective {LEGAL_EFFECTIVE_DATE}</p>
        <div className="legal-body mt-6 space-y-4 text-gray-800 leading-relaxed [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-8 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1">
          {children}
        </div>
        <footer className="mt-12 text-sm text-gray-600 space-x-4">
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/terms">Terms of Service</Link>
          <Link to="/support">Support</Link>
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>
        </footer>
      </main>
    </div>
  )
}
