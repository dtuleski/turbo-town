import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ApolloProvider } from '@apollo/client'
import App from './App'
import { queryClient } from './api/queryClient'
import { apolloClient } from './api/client'
import { configureAmplify } from './config/amplify'
import './styles/index.css'

// Configure AWS Amplify
configureAmplify()

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  state = { hasError: false, error: '' }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message + '\n' + error.stack }
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('BOUNDARY:', error.message, info.componentStack)
  }
  render() {
    if (this.state.hasError) {
      return React.createElement('div', { style: { padding: 40, fontFamily: 'monospace' } },
        React.createElement('h2', { style: { color: 'red' } }, 'Something went wrong'),
        React.createElement('pre', { style: { whiteSpace: 'pre-wrap', fontSize: 12 } }, this.state.error),
        React.createElement('button', { onClick: () => window.location.href = '/hub' }, 'Go to Hub')
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
          </QueryClientProvider>
        </ApolloProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
)
