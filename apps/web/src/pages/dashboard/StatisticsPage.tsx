import { useState, useEffect } from 'react'
import { getUserStatistics } from '@/api/game'
import { getUserScoreHistory, LeaderboardEntry } from '@/api/leaderboard'

// ── Game type metadata ─────────────────────────────────────────────────────────

const GAME_INFO: Record<string, { icon: string; name: string; color: string }> = {
  MEMORY_MATCH:     { icon: '🃏', name: 'Memory Match',     color: '#6366f1' },
  MATH_CHALLENGE:   { icon: '🧮', name: 'Math Challenge',   color: '#f59e0b' },
  WORD_PUZZLE:      { icon: '🔤', name: 'Word Puzzle',      color: '#10b981' },
  LANGUAGE_LEARNING:{ icon: '🌍', name: 'Language',         color: '#8b5cf6' },
  SUDOKU:           { icon: '9️⃣', name: 'Sudoku',           color: '#ef4444' },
  JIGSAW_PUZZLE:    { icon: '🧩', name: 'Jigsaw Puzzle',    color: '#ec4899' },
  BUBBLE_POP:       { icon: '🫧', name: 'Bubble Pop',       color: '#06b6d4' },
  SEQUENCE_MEMORY:  { icon: '🧠', name: 'Sequence Memory',  color: '#a855f7' },
  CODE_A_BOT:       { icon: '🤖', name: 'Code-a-Bot',       color: '#14b8a6' },
  GEO_QUIZ:         { icon: '🌍', name: 'Geo Quiz',         color: '#059669' },
  HISTORY_QUIZ:     { icon: '📜', name: 'History Quiz',     color: '#d97706' },
  CIVICS_QUIZ:      { icon: '🇺🇸', name: 'Civics Quiz',      color: '#4f46e5' },
  COLOR_BY_NUMBER:  { icon: '🎨', name: 'Color by Number',  color: '#ec4899' },
  HANGMAN:          { icon: '🪢', name: 'Hangman',          color: '#475569' },
  TIC_TAC_TOE:      { icon: '❌', name: 'Tic Tac Toe',      color: '#7c3aed' },
  MATH_MAZE:        { icon: '🧮', name: 'Math Maze',        color: '#f97316' },
  PATTERN_RECALL:   { icon: '🧩', name: 'Pattern Recall',   color: '#0ea5e9' },
  SPACE_ENTRY:      { icon: '🚀', name: 'Space Entry',      color: '#22d3ee' },
  SCRATCH_CODING:   { icon: '👨‍🚀', name: 'Space Coder',      color: '#818cf8' },
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getWeekLabel(date: Date): string {
  const start = new Date(date)
  start.setDate(start.getDate() - start.getDay())
  return `${start.getMonth() + 1}/${start.getDate()}`
}

function getWeekKey(date: Date): string {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay())
  return d.toISOString().split('T')[0]
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}m ${s}s`
}

// ── Component ──────────────────────────────────────────────────────────────────

const StatisticsPage = () => {
  const [stats, setStats] = useState<any>(null)
  const [history, setHistory] = useState<LeaderboardEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedGame, setSelectedGame] = useState<string>('ALL')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetch = async () => {
      try {
        setIsLoading(true)
        setError(null)
        // Fetch independently so one failure doesn't block the other
        const [statsResult, historyResult] = await Promise.allSettled([
          getUserStatistics(),
          getUserScoreHistory(undefined, 100),
        ])
        if (statsResult.status === 'fulfilled') setStats(statsResult.value)
        if (historyResult.status === 'fulfilled') setHistory(historyResult.value)
        if (statsResult.status === 'rejected' && historyResult.status === 'rejected') {
          setError('Failed to load statistics. Please try again.')
        }
      } catch (err) {
        console.error('Failed to load statistics:', err)
        setError('Failed to load statistics. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }
    fetch()
  }, [])

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Statistics</h1>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </div>
    )
  }


  if (!stats && history.length === 0) {
    return (
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Statistics</h1>
        <div className="card text-center py-20">
          <div className="text-6xl mb-4">{error ? '⚠️' : '📊'}</div>
          <h2 className="text-2xl font-bold mb-4">{error ? 'Something went wrong' : 'No Data Yet'}</h2>
          <p className="text-text-secondary">{error || 'Play some games to see your statistics here!'}</p>
        </div>
      </div>
    )
  }

  // ── Derived data ───────────────────────────────────────────────────────────

  const filtered = selectedGame === 'ALL' ? history : history.filter(h => h.gameType === selectedGame)

  // Activity per week (last 8 weeks)
  const now = new Date()
  const eightWeeksAgo = new Date(now)
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56)

  const weekBuckets: { key: string; label: string; count: number }[] = []
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i * 7)
    const key = getWeekKey(d)
    weekBuckets.push({ key, label: getWeekLabel(d), count: 0 })
  }
  filtered.forEach(entry => {
    const key = getWeekKey(new Date(entry.timestamp))
    const bucket = weekBuckets.find(b => b.key === key)
    if (bucket) bucket.count++
  })
  const maxWeekCount = Math.max(1, ...weekBuckets.map(b => b.count))

  // Score progression (chronological)
  const chronological = [...filtered].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  const scoreProgression = chronological.slice(-20) // last 20 games

  // Compute per-game-type max scores for normalization
  const gameTypeMaxScores = new Map<string, number>()
  chronological.forEach(e => {
    const current = gameTypeMaxScores.get(e.gameType) || 0
    if (e.score > current) gameTypeMaxScores.set(e.gameType, e.score)
  })

  // Normalized score: each game's score as % of that game type's best score (0-100)
  const normalizedProgression = scoreProgression.map(e => {
    const typeBest = gameTypeMaxScores.get(e.gameType) || 1
    return Math.round((e.score / typeBest) * 100)
  })

  // Running average (rolling window of 5) for trend line
  const rollingAvg = normalizedProgression.map((_, i) => {
    const windowStart = Math.max(0, i - 4)
    const window = normalizedProgression.slice(windowStart, i + 1)
    return Math.round(window.reduce((s, v) => s + v, 0) / window.length)
  })

  // Game breakdown
  const gameCountMap = new Map<string, number>()
  history.forEach(e => {
    gameCountMap.set(e.gameType, (gameCountMap.get(e.gameType) || 0) + 1)
  })
  const gameBreakdown = Array.from(gameCountMap.entries())
    .map(([type, count]) => ({ type, count, info: GAME_INFO[type] || { icon: '🎮', name: type, color: '#888' } }))
    .sort((a, b) => b.count - a.count)
  const totalGamesInBreakdown = gameBreakdown.reduce((s, g) => s + g.count, 0)

  // Personal bests per game
  const personalBests = new Map<string, LeaderboardEntry>()
  history.forEach(e => {
    const existing = personalBests.get(e.gameType)
    if (!existing || e.score > existing.score) personalBests.set(e.gameType, e)
  })
  const bestsList = Array.from(personalBests.values()).sort((a, b) => b.score - a.score)

  // Accuracy trend (last 20 games)
  const accuracyData = scoreProgression.map(e => Math.round(e.accuracy * 100))
  const avgAccuracy = accuracyData.length > 0 ? accuracyData.reduce((s, a) => s + a, 0) / accuracyData.length : 0

  // Speed trend (last 20 games)
  const speedData = scoreProgression.map(e => e.completionTime)
  const avgSpeed = speedData.length > 0 ? speedData.reduce((s, t) => s + t, 0) / speedData.length : 0

  // Total play time
  const totalPlayTime = history.reduce((s, e) => s + e.completionTime, 0)

  // Game types played
  const uniqueGames = new Set(history.map(e => e.gameType))


  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold">Statistics</h1>
        {/* Game filter */}
        <select
          value={selectedGame}
          onChange={e => setSelectedGame(e.target.value)}
          className="px-4 py-2 rounded-lg bg-card border border-border text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="ALL">All Games</option>
          {gameBreakdown.map(g => (
            <option key={g.type} value={g.type}>{g.info.icon} {g.info.name}</option>
          ))}
        </select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="card text-center">
          <div className="text-3xl mb-1">🎮</div>
          <div className="text-2xl font-black">{stats?.totalGames || filtered.length}</div>
          <div className="text-text-secondary text-sm">Games Played</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl mb-1">⭐</div>
          <div className="text-2xl font-black">{(history.length > 0 ? Math.max(...history.map(h => h.score)) : (stats?.bestScore || 0)).toLocaleString()}</div>
          <div className="text-text-secondary text-sm">Best Score</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl mb-1">📈</div>
          <div className="text-2xl font-black">{Math.round(history.length > 0 ? history.reduce((s, h) => s + h.score, 0) / history.length : (stats?.averageScore || 0)).toLocaleString()}</div>
          <div className="text-text-secondary text-sm">Avg Score</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl mb-1">🎯</div>
          <div className="text-2xl font-black">{avgAccuracy.toFixed(0)}%</div>
          <div className="text-text-secondary text-sm">Avg Accuracy</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl mb-1">⏱️</div>
          <div className="text-2xl font-black">{formatTime(totalPlayTime)}</div>
          <div className="text-text-secondary text-sm">Total Play Time</div>
        </div>
      </div>

      {/* Activity chart + Game breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Activity per week */}
        <div className="card md:col-span-2">
          <h2 className="text-lg font-bold mb-4">📅 Games Per Week</h2>
          <div className="flex items-end gap-2 h-44">
            {weekBuckets.map((bucket, i) => {
              const pct = maxWeekCount > 0 ? (bucket.count / maxWeekCount) * 100 : 0
              return (
                <div key={i} className="flex-1 flex flex-col items-center h-full">
                  <span className="text-xs font-bold text-text-primary mb-1 shrink-0">{bucket.count || ''}</span>
                  <div className="flex-1 w-full flex items-end">
                    <div
                      className="w-full rounded-t-lg transition-all"
                      style={{
                        height: bucket.count > 0 ? `${Math.max(pct, 8)}%` : '0%',
                        background: 'linear-gradient(to top, #6366f1, #818cf8)',
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-text-secondary mt-1 shrink-0">{bucket.label}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Game breakdown donut */}
        <div className="card">
          <h2 className="text-lg font-bold mb-4">🎮 Games Played</h2>
          <div className="space-y-2">
            {gameBreakdown.slice(0, 6).map(g => {
              const pct = totalGamesInBreakdown > 0 ? (g.count / totalGamesInBreakdown) * 100 : 0
              return (
                <div key={g.type}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>{g.info.icon} {g.info.name}</span>
                    <span className="font-bold">{g.count}</span>
                  </div>
                  <div className="w-full bg-card-hover rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: g.info.color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-3 pt-3 border-t border-border text-sm text-text-secondary text-center">
            {uniqueGames.size} game{uniqueGames.size !== 1 ? 's' : ''} played
          </div>
        </div>
      </div>


      {/* Score progression */}
      <div className="card mb-8">
        <h2 className="text-lg font-bold mb-4">📈 Score Progression</h2>
        <p className="text-text-secondary text-xs mb-3">Each bar shows your score as a % of your personal best for that game type. The line shows your rolling average trend.</p>
        {scoreProgression.length < 2 ? (
          <p className="text-text-secondary text-center py-8">Play more games to see your progression!</p>
        ) : (
          <>
            <div className="flex items-end gap-1 h-48 relative">
              {/* SVG trend line overlay */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" preserveAspectRatio="none" viewBox={`0 0 ${scoreProgression.length * 100} 100`}>
                <polyline
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={rollingAvg.map((v, i) => `${i * 100 + 50},${100 - v}`).join(' ')}
                />
              </svg>
              {scoreProgression.map((entry, i) => {
                const normalizedH = normalizedProgression[i]
                const gameInfo = GAME_INFO[entry.gameType] || { icon: '🎮', name: entry.gameType, color: '#888' }
                return (
                  <div key={i} className="flex-1 relative group" style={{ height: '100%' }}>
                    {/* Actual score bar */}
                    <div
                      className="absolute bottom-0 w-full rounded-t transition-all hover:opacity-80"
                      style={{
                        height: `${Math.max(normalizedH, 3)}%`,
                        backgroundColor: gameInfo.color,
                        opacity: 0.8,
                      }}
                    />
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
                      {gameInfo.icon} {entry.score.toLocaleString()} pts
                      <br />
                      {normalizedH}% of your best
                      <br />
                      {new Date(entry.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex justify-between text-xs text-text-secondary mt-2">
              <span>{new Date(scoreProgression[0].timestamp).toLocaleDateString()}</span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-4 h-0.5 bg-yellow-500 rounded" /> Rolling average
              </span>
              <span>{new Date(scoreProgression[scoreProgression.length - 1].timestamp).toLocaleDateString()}</span>
            </div>
          </>
        )}
      </div>

      {/* Accuracy & Speed trends + Personal bests */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Accuracy trend */}
        <div className="card">
          <h2 className="text-lg font-bold mb-4">🎯 Accuracy Trend</h2>
          {accuracyData.length < 2 ? (
            <p className="text-text-secondary text-center py-8">Need more games for accuracy trend</p>
          ) : (
            <>
              <div className="h-32 relative">
                <svg className="w-full h-full" preserveAspectRatio="none" viewBox={`0 0 ${(accuracyData.length - 1) * 100} 100`}>
                  {/* Grid lines */}
                  {[25, 50, 75, 100].map(y => (
                    <line key={y} x1="0" y1={100 - y} x2={(accuracyData.length - 1) * 100} y2={100 - y} stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />
                  ))}
                  {/* Area fill */}
                  <polygon
                    fill="url(#accGrad)"
                    points={`0,100 ${accuracyData.map((v, i) => `${i * 100},${100 - v}`).join(' ')} ${(accuracyData.length - 1) * 100},100`}
                  />
                  {/* Line */}
                  <polyline
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={accuracyData.map((v, i) => `${i * 100},${100 - v}`).join(' ')}
                  />
                  {/* Dots */}
                  {accuracyData.map((v, i) => (
                    <circle key={i} cx={i * 100} cy={100 - v} r="4" fill="#22c55e" stroke="white" strokeWidth="2" />
                  ))}
                  <defs>
                    <linearGradient id="accGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>
                </svg>
                {/* Y-axis labels */}
                <span className="absolute top-0 left-0 text-[9px] text-text-secondary">100%</span>
                <span className="absolute bottom-0 left-0 text-[9px] text-text-secondary">0%</span>
              </div>
              <div className="flex justify-between items-center mt-2 text-sm">
                <span className="text-text-secondary">Avg: {avgAccuracy.toFixed(0)}%</span>
                {accuracyData.length >= 4 && (
                  <span className={`font-bold ${
                    accuracyData.slice(-3).reduce((s, a) => s + a, 0) / 3 >
                    accuracyData.slice(0, 3).reduce((s, a) => s + a, 0) / 3
                      ? 'text-green-500' : 'text-red-400'
                  }`}>
                    {accuracyData.slice(-3).reduce((s, a) => s + a, 0) / 3 >
                     accuracyData.slice(0, 3).reduce((s, a) => s + a, 0) / 3
                      ? '↑ Improving' : '↓ Declining'}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Speed trend */}
        <div className="card">
          <h2 className="text-lg font-bold mb-4">⚡ Speed Trend</h2>
          {speedData.length < 2 ? (
            <p className="text-text-secondary text-center py-8">Need more games for speed trend</p>
          ) : (
            <>
              <div className="h-32 relative">
                {(() => {
                  const maxT = Math.max(1, ...speedData)
                  const normalized = speedData.map(t => Math.round((t / maxT) * 100))
                  return (
                    <svg className="w-full h-full" preserveAspectRatio="none" viewBox={`0 0 ${(speedData.length - 1) * 100} 100`}>
                      {/* Grid lines */}
                      {[25, 50, 75, 100].map(y => (
                        <line key={y} x1="0" y1={100 - y} x2={(speedData.length - 1) * 100} y2={100 - y} stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />
                      ))}
                      {/* Area fill */}
                      <polygon
                        fill="url(#speedGrad)"
                        points={`0,100 ${normalized.map((v, i) => `${i * 100},${100 - v}`).join(' ')} ${(speedData.length - 1) * 100},100`}
                      />
                      {/* Line */}
                      <polyline
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={normalized.map((v, i) => `${i * 100},${100 - v}`).join(' ')}
                      />
                      {/* Dots */}
                      {normalized.map((v, i) => (
                        <circle key={i} cx={i * 100} cy={100 - v} r="4" fill="#3b82f6" stroke="white" strokeWidth="2" />
                      ))}
                      <defs>
                        <linearGradient id="speedGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
                        </linearGradient>
                      </defs>
                    </svg>
                  )
                })()}
                {/* Y-axis labels */}
                <span className="absolute top-0 left-0 text-[9px] text-text-secondary">{formatTime(Math.max(...speedData))}</span>
                <span className="absolute bottom-0 left-0 text-[9px] text-text-secondary">0s</span>
              </div>
              <div className="flex justify-between items-center mt-2 text-sm">
                <span className="text-text-secondary">Avg: {formatTime(avgSpeed)}</span>
                {speedData.length >= 4 && (
                  <span className={`font-bold ${
                    speedData.slice(-3).reduce((s, t) => s + t, 0) / 3 <
                    speedData.slice(0, 3).reduce((s, t) => s + t, 0) / 3
                      ? 'text-green-500' : 'text-orange-400'
                  }`}>
                    {speedData.slice(-3).reduce((s, t) => s + t, 0) / 3 <
                     speedData.slice(0, 3).reduce((s, t) => s + t, 0) / 3
                      ? '↑ Getting faster' : '→ Steady pace'}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>


      {/* Personal bests */}
      <div className="card mb-8">
        <h2 className="text-lg font-bold mb-4">🏆 Personal Bests</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {bestsList.map(entry => {
            const info = GAME_INFO[entry.gameType] || { icon: '🎮', name: entry.gameType, color: '#888' }
            return (
              <div
                key={entry.gameType}
                className="flex items-center gap-3 p-3 bg-card-hover rounded-xl"
              >
                <span className="text-3xl">{info.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate">{info.name}</div>
                  <div className="text-xs text-text-secondary">
                    {entry.difficulty} · {formatTime(entry.completionTime)} · {Math.round(entry.accuracy * 100)}% acc
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black" style={{ color: info.color }}>
                    {entry.score.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-text-secondary">
                    {new Date(entry.timestamp).toLocaleDateString()}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}

export default StatisticsPage
