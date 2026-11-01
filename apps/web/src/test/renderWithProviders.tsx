import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import i18next from 'i18next'
import en from '@/locales/en.json'

/** A real i18next instance with the English resources, for SSR markup tests (node env). */
export const testI18n = i18next.createInstance()
void testI18n.init({
  lng: 'en',
  resources: { en: { translation: en } },
  interpolation: { escapeValue: false },
  initAsync: false,
})

export function renderMarkup(element: ReactElement, initialEntries: string[] = ['/']): string {
  return renderToStaticMarkup(
    <I18nextProvider i18n={testI18n}>
      <MemoryRouter initialEntries={initialEntries}>{element}</MemoryRouter>
    </I18nextProvider>
  )
}

/** Decodes the few entities renderToStaticMarkup emits, for readable text assertions. */
export const decode = (html: string): string =>
  html.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
