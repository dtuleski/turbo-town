import { useState, useEffect, useMemo } from 'react'
import { getUserScoreHistory, LeaderboardEntry } from '@/api/leaderboard'

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
}

const DIFFICULTIES = ['ALL', 'easy', 'medium', 'hard'] as const

type SortField = 'date' | 'score' | 'accuracy' | 'time'
type SortDir = 'asc' | 'desc'

function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}m ${s}s`
}

function formatDate(ts: string): string {
  const d = new Date(ts)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDateTime(ts: string): string {
  const d = new Date(ts)
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

const HistoryPage = () => {
  const [history, setHistory] = useState<LeaderboardEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [gameFilter, setGameFilter] = useState<string>('ALL')
  const [diffFilter, setDiffFilter] = useState<string>('ALL')
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true)
        const data = await getUserScoreHistory(undefined, 100)
        setHistory(data)
      } catch (err) {
        console.error('Failed to load history:', err)
        setError('Failed to load game history. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])


  // Compute personal bests per game type
  const personalBests = useMemo(() => {
    const bests = new Map<string, number>()
    history.forEach(e => {
      const cur = bests.get(e.gameType) || 0
      if (e.score > cur) bests.set(e.gameType, e.score)
    })
    return bests
  }, [history])

  // Available game types from actual data
  const availableGames = useMemo(() => {
    const types = new Set(history.map(e => e.gameType))
    return Array.from(types).sort()
  }, [history])

  // Filter + sort
  const filtered = useMemo(() => {
    let result = [...history]
    if (gameFilter !== 'ALL') result = result.filter(e => e.gameType === gameFilter)
    if (diffFilter !== 'ALL') result = result.filter(e => e.difficulty.toLowerCase() === diffFilter)

    result.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'date':    cmp = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(); break
        case 'score':   cmp = a.score - b.score; break
        case 'accuracy':cmp = a.accuracy - b.accuracy; break
        case 'time':    cmp = a.completionTime - b.completionTime; break
      }
      return sortDir === 'desc' ? -cmp : cmp
    })
    return result
  }, [history, gameFilter, diffFilter, sortField, sortDir])

  // Reset page when filters change
  useEffect(() => { setPage(1) }, [gameFilter, diffFilter, sortField, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  const sortIcon = (field: SortField) => {
    if (sortField !== field) return '↕'
    return sortDir === 'desc' ? '↓' : '↑'
  }

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Game History</h1>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </div>
    )
  }

  if (error || history.length === 0) {
    return (
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Game History</h1>
        <div className="card text-center py-20">
          <div className="text-6xl mb-4">{error ? '⚠️' : '📜'}</div>
          <h2 className="text-2xl font-bold mb-4">{error ? 'Something went wrong' : 'No Games Yet'}</h2>
          <p className="text-text-secondary">{error || 'Play some games and your history will appear here!'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-4xl font-bold">Game History</h1>
        <span className="text-text-secondary text-sm">
          {filtered.length <= PAGE_SIZE
            ? `${filtered.length} game${filtered.length !== 1 ? 's' : ''}`
            : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length}`
          }
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={gameFilter}
          onChange={e => setGameFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-card border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="ALL">All Games</option>
          {availableGames.map(type => {
            const info = GAME_INFO[type]
            return <option key={type} value={type}>{info?.icon} {info?.name || type}</option>
          })}
        </select>

        <select
          value={diffFilter}
          onChange={e => setDiffFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-card border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {DIFFICULTIES.map(d => (
            <option key={d} value={d}>{d === 'ALL' ? 'All Difficulties' : d.charAt(0).toUpperCase() + d.slice(1)}</option>
          ))}
        </select>

        {/* Sort buttons */}
        <div className="flex gap-1 ml-auto">
          {([['date', 'Date'], ['score', 'Score'], ['accuracy', 'Accuracy'], ['time', 'Time']] as [SortField, string][]).map(([field, label]) => (
            <button
              key={field}
              onClick={() => handleSort(field)}
              className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                sortField === field
                  ? 'bg-primary text-white'
                  : 'bg-card border border-border text-text-secondary hover:text-text-primary'
              }`}
            >
              {label} {sortIcon(field)}
            </button>
          ))}
        </div>
      </div>

      {/* Game list */}
      <div className="space-y-2">
        {paged.map((entry, i) => {
          const info = GAME_INFO[entry.gameType] || { icon: '🎮', name: entry.gameType, color: '#888' }
          const isPB = personalBests.get(entry.gameType) === entry.score
          const accPct = Math.round(entry.accuracy * 100)

          return (
            <div
              key={`${entry.timestamp}-${i}`}
              className="card flex items-center gap-4 py-3 px-4 hover:bg-card-hover transition-colors"
              style={{ borderLeft: `4px solid ${info.color}` }}
            >
              {/* Game icon + name */}
              <div className="flex items-center gap-3 w-40 shrink-0">
                <span className="text-2xl">{info.icon}</span>
                <div className="min-w-0">
                  <div className="font-bold text-sm truncate">{info.name}</div>
                  <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    entry.difficulty.toLowerCase() === 'hard'
                      ? 'bg-red-500/20 text-red-400'
                      : entry.difficulty.toLowerCase() === 'medium'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-green-500/20 text-green-400'
                  }`}>
                    {entry.difficulty}
                  </span>
                </div>
              </div>

              {/* Score */}
              <div className="flex items-center gap-2 w-28 shrink-0">
                <span className="text-lg font-black" style={{ color: info.color }}>
                  {entry.score.toLocaleString()}
                </span>
                {isPB && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full font-bold whitespace-nowrap">
                    🏆 PB
                  </span>
                )}
              </div>

              {/* Accuracy */}
              <div className="w-20 shrink-0 hidden sm:block">
                <div className="text-sm font-medium">{accPct}%</div>
                <div className="w-full bg-card-hover rounded-full h-1.5 mt-1">
                  <div
                    className="h-1.5 rounded-full"
                    style={{
                      width: `${accPct}%`,
                      backgroundColor: accPct >= 80 ? '#10b981' : accPct >= 50 ? '#f59e0b' : '#ef4444',
                    }}
                  />
                </div>
              </div>

              {/* Time */}
              <div className="w-16 shrink-0 text-sm text-text-secondary hidden md:block">
                ⏱ {formatTime(entry.completionTime)}
              </div>

              {/* Date */}
              <div className="ml-auto text-right shrink-0">
                <div className="text-sm text-text-secondary">{formatDate(entry.timestamp)}</div>
                <div className="text-[10px] text-text-secondary/60">{formatDateTime(entry.timestamp).split(', ').pop()}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Pagination */}
      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-2 rounded-lg text-sm bg-card border border-border disabled:opacity-30 disabled:cursor-not-allowed hover:bg-card-hover transition-colors"
          >
            ← Prev
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
            .reduce<(number | 'dots')[]>((acc, p, idx, arr) => {
              if (idx > 0 && p - (arr[idx - 1]) > 1) acc.push('dots')
              acc.push(p)
              return acc
            }, [])
            .map((item, idx) =>
              item === 'dots' ? (
                <span key={`dots-${idx}`} className="px-1 text-text-secondary">…</span>
              ) : (
                <button
                  key={item}
                  onClick={() => setPage(item)}
                  className={`w-9 h-9 rounded-lg text-sm transition-colors ${
                    page === item
                      ? 'bg-primary text-white'
                      : 'bg-card border border-border hover:bg-card-hover'
                  }`}
                >
                  {item}
                </button>
              )
            )}
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-2 rounded-lg text-sm bg-card border border-border disabled:opacity-30 disabled:cursor-not-allowed hover:bg-card-hover transition-colors"
          >
            Next →
          </button>
        </div>
      )}

      {filtered.length === 0 && history.length > 0 && (
        <div className="card text-center py-12 mt-4">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-text-secondary">No games match your filters. Try adjusting them.</p>
        </div>
      )}
    </div>
  )
}

export default HistoryPage