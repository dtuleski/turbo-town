import { useEffect, useState } from 'react'
import { env } from '@/config/env'

const ApiDebug = () => {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        setVisible((v) => !v)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (!visible) return null

  return (
    <div className="fixed bottom-4 right-4 bg-black text-green-400 p-4 rounded-lg text-xs font-mono z-50 max-w-md">
      <h3 className="text-white mb-2">API Debug</h3>
      <div>API URL: {env.apiUrl}</div>
      <div>Region: {env.cognito.region}</div>
      <button onClick={() => setVisible(false)} className="mt-2 text-red-400 hover:text-red-300">
        Close
      </button>
    </div>
  )
}

export default ApiDebug
