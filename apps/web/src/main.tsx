import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ApolloProvider } from '@apollo/client'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import './i18n'
import App from './App'
import { queryClient } from './api/queryClient'
import { apolloClient } from './api/client'
import { configureAmplify } from './config/amplify'
import './styles/index.css'

// Configure AWS Amplify
configureAmplify()

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false }
  static getDerivedStateFromError() {
    // Only a flag is kept in state: no message and no stack, so neither can reach the DOM.
    return { hasError: true }
  }
  componentDidCatch(error: Error) {
    // Minimal diagnostic breadcrumb. The component stack and the full stack trace are
    // deliberately not logged, and nothing from the error is rendered to the user.
    console.error('Unhandled UI error:', error.name)
  }
  render() {
    if (this.state.hasError) {
      return React.createElement('div', { style: { padding: 40, fontFamily: 'system-ui, sans-serif' } },
        React.createElement('h2', null, 'Something went wrong'),
        React.createElement('p', null, 'Sorry, this page could not be displayed. Please try again.'),
        React.createElement('button', { onClick: () => window.location.reload(), style: { marginRight: 12 } }, 'Reload page'),
        React.createElement('button', { onClick: () => { window.location.href = '/hub' } }, 'Go to Hub')
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ApolloProvider client={apolloClient}>
          <QueryClientProvider client={queryClient}>
            <App />
            <Analytics />
            <SpeedInsights />
          </QueryClientProvider>
        </ApolloProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
)
