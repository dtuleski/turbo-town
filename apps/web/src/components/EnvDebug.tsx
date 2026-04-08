import { env } from '@/config/env'

const EnvDebug = () => {
  return (
    <div className="fixed bottom-4 left-4 bg-gray-900 text-white p-3 rounded-lg text-xs font-mono z-50">
      <div>Mode: {import.meta.env.MODE}</div>
      <div>API: {env.apiUrl}</div>
      <div>Pool: {env.cognito.userPoolId}</div>
      <div>Client: {env.cognito.clientId}</div>
    </div>
  )
}

export default EnvDebug
