import { env } from '@/config/env'

export const EnvDebug = () => {
  return (
    <div style={{ 
      position: 'fixed', 
      bottom: 10, 
      right: 10, 
      background: 'rgba(0,0,0,0.8)', 
      color: 'white', 
      padding: '10px', 
      fontSize: '12px',
      maxWidth: '400px',
      zIndex: 9999,
      borderRadius: '4px'
    }}>
      <h4>Environment Variables</h4>
      <pre style={{ fontSize: '10px', overflow: 'auto' }}>
        {JSON.stringify({
          apiUrl: env.apiUrl,
          cognito: env.cognito,
          isDevelopment: env.isDevelopment,
        }, null, 2)}
      </pre>
    </div>
  )
}
