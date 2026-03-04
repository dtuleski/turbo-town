import { useState, useEffect } from 'react'
import { canStartGame, getUserStatistics } from '@/api/game'

export const ApiDebug = () => {
  const [status, setStatus] = useState({
    gameApi: 'checking...',
    hasStats: false,
    error: null as string | null,
  })

  useEffect(() => {
    const checkApis = async () => {
      try {
        // Test game API
        await canStartGame()
        const stats = await getUserStatistics()
        
        setStatus({
          gameApi: 'connected ✅',
          hasStats: stats.totalGames > 0,
          error: null,
        })
      } catch (error: any) {
        setStatus({
          gameApi: 'error ❌',
          hasStats: false,
          error: error.message || 'Unknown error',
        })
      }
    }
    checkApis()
  }, [])

  return (
    <div style={{ 
      position: 'fixed', 
      bottom: 10, 
      left: 10, 
      background: 'rgba(0,0,0,0.8)', 
      color: 'white', 
      padding: '10px', 
      fontSize: '12px',
      maxWidth: '300px',
      zIndex: 9999,
      borderRadius: '4px'
    }}>
      <h4 style={{ margin: '0 0 8px 0' }}>API Status</h4>
      <div>Game API: {status.gameApi}</div>
      <div>Has Stats: {status.hasStats ? 'Yes' : 'No'}</div>
      {status.error && (
        <div style={{ color: '#ff6b6b', marginTop: '8px', fontSize: '10px' }}>
          Error: {status.error}
        </div>
      )}
    </div>
  )
}
