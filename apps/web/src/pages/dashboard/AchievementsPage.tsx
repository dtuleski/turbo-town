import { useState, useEffect, useMemo } from 'react'
import { getUserScoreHistory, LeaderboardEntry } from '@/api/leaderboard'

// ── Game metadata ──────────────────────────────────────────────────────────────

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

const ALL_GAME_TYPES = Object.keys(GAME_INFO)

// ── Achievement definitions ────────────────────────────────────────────────────

interface AchievementDef {
  id: string
  icon: string
  name: string
  description: string
  category: 'getting-started' | 'dedication' | 'mastery' | 'game-specific'
  check: (history: LeaderboardEntry[]) => { unlocked: boolean; date?: string; progress?: string }
}

const ACHIEVEMENTS: AchievementDef[] = [
  // ── Getting Started ──
  {
    id: 'first-game', icon: '🎮', name: 'First Game',
    description: 'Play your first game',
    category: 'getting-started',
    check: (h) => {
      if (h.length === 0) return { unlocked: false, progress: '0/1' }
      const oldest = [...h].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())[0]
      return { unlocked: true, date: oldest.timestamp }
    },
  },
  {
    id: 'sharp-shooter', icon: '🎯', name: 'Sharp Shooter',
    description: 'Get 90%+ accuracy on any game',
    category: 'getting-started',
    check: (h) => {
      const match = h.find(e => e.accuracy >= 0.9)
      return match ? { unlocked: true, date: match.timestamp } : { unlocked: false, progress: `Best: ${Math.round(Math.max(0, ...h.map(e => e.accuracy)) * 100)}%` }
    },
  },
  {
    id: 'speed-demon', icon: '⚡', name: 'Speed Demon',
    description: 'Complete any game under 30 seconds',
    category: 'getting-started',
    check: (h) => {
      const match = h.find(e => e.completionTime < 30)
      return match ? { unlocked: true, date: match.timestamp } : { unlocked: false, progress: `Fastest: ${h.length > 0 ? Math.round(Math.min(...h.map(e => e.completionTime))) + 's' : '—'}` }
    },
  },
  {
    id: 'explorer', icon: '🌈', name: 'Explorer',
    description: 'Try 3 different games',
    category: 'getting-started',
    check: (h) => {
      const types = new Set(h.map(e => e.gameType))
      const first3 = types.size >= 3
      if (!first3) return { unlocked: false, progress: `${types.size}/3` }
      // Find when the 3rd unique game was played
      const seen = new Set<string>()
      const sorted = [...h].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      for (const e of sorted) {
        seen.add(e.gameType)
        if (seen.size >= 3) return { unlocked: true, date: e.timestamp }
      }
      return { unlocked: false, progress: `${types.size}/3` }
    },
  },
  {
    id: 'high-roller', icon: '🏆', name: 'High Roller',
    description: 'Score over 5,000 in any game',
    category: 'getting-started',
    check: (h) => {
      const match = h.find(e => e.score >= 5000)
      return match ? { unlocked: true, date: match.timestamp } : { unlocked: false, progress: `Best: ${h.length > 0 ? Math.max(...h.map(e => e.score)).toLocaleString() : '0'}` }
    },
  },

  // ── Dedication ──
  {
    id: 'on-fire', icon: '🔥', name: 'On Fire',
    description: 'Play 10 games',
    category: 'dedication',
    check: (h) => {
      if (h.length < 10) return { unlocked: false, progress: `${h.length}/10` }
      const sorted = [...h].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      return { unlocked: true, date: sorted[9]?.timestamp }
    },
  },
  {
    id: 'committed', icon: '💪', name: 'Committed',
    description: 'Play 25 games',
    category: 'dedication',
    check: (h) => {
      if (h.length < 25) return { unlocked: false, progress: `${h.length}/25` }
      const sorted = [...h].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      return { unlocked: true, date: sorted[24]?.timestamp }
    },
  },
  {
    id: 'veteran', icon: '🎓', name: 'Veteran',
    description: 'Play 50 games',
    category: 'dedication',
    check: (h) => {
      if (h.length < 50) return { unlocked: false, progress: `${h.length}/50` }
      const sorted = [...h].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      return { unlocked: true, date: sorted[49]?.timestamp }
    },
  },
  {
    id: 'legend', icon: '👑', name: 'Legend',
    description: 'Play 100 games',
    category: 'dedication',
    check: (h) => {
      if (h.length < 100) return { unlocked: false, progress: `${h.length}/100` }
      const sorted = [...h].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      return { unlocked: true, date: sorted[99]?.timestamp }
    },
  },

  // ── Mastery ──
  {
    id: 'brain-power', icon: '🧠', name: 'Brain Power',
    description: 'Score 5,000+ on 3 different games',
    category: 'mastery',
    check: (h) => {
      const gamesOver5k = new Set(h.filter(e => e.score >= 5000).map(e => e.gameType))
      return gamesOver5k.size >= 3
        ? { unlocked: true, date: (() => {
            const seen = new Set<string>()
            const sorted = [...h].filter(e => e.score >= 5000).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
            for (const e of sorted) { seen.add(e.gameType); if (seen.size >= 3) return e.timestamp }
            return undefined
          })() }
        : { unlocked: false, progress: `${gamesOver5k.size}/3 games` }
    },
  },
  {
    id: 'perfectionist', icon: '💯', name: 'Perfectionist',
    description: 'Get 100% accuracy on any game',
    category: 'mastery',
    check: (h) => {
      const match = h.find(e => e.accuracy >= 1.0)
      return match ? { unlocked: true, date: match.timestamp } : { unlocked: false }
    },
  },
  {
    id: 'world-traveler', icon: '🌍', name: 'World Traveler',
    description: 'Play all 9 games',
    category: 'mastery',
    check: (h) => {
      const types = new Set(h.map(e => e.gameType))
      const total = ALL_GAME_TYPES.length
      if (types.size < total) return { unlocked: false, progress: `${types.size}/${total}` }
      const seen = new Set<string>()
      const sorted = [...h].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      for (const e of sorted) { seen.add(e.gameType); if (seen.size >= total) return { unlocked: true, date: e.timestamp } }
      return { unlocked: false, progress: `${types.size}/${total}` }
    },
  },
  {
    id: 'elite', icon: '⭐', name: 'Elite',
    description: 'Score over 7,000 in any game',
    category: 'mastery',
    check: (h) => {
      const match = h.find(e => e.score >= 7000)
      return match ? { unlocked: true, date: match.timestamp } : { unlocked: false, progress: `Best: ${h.length > 0 ? Math.max(...h.map(e => e.score)).toLocaleString() : '0'}` }
    },
  },
  {
    id: 'hard-mode', icon: '🔒', name: 'Difficulty Unlocked',
    description: 'Complete a game on Hard difficulty',
    category: 'mastery',
    check: (h) => {
      const match = h.find(e => e.difficulty.toLowerCase() === 'hard')
      return match ? { unlocked: true, date: match.timestamp } : { unlocked: false }
    },
  },

  // ── Game-Specific ──
  ...ALL_GAME_TYPES.map((type): AchievementDef => {
    const info = GAME_INFO[type]
    return {
      id: `master-${type.toLowerCase()}`,
      icon: info.icon,
      name: `${info.name} Master`,
      description: `Score 5,000+ in ${info.name}`,
      category: 'game-specific',
      check: (h) => {
        const match = h.find(e => e.gameType === type && e.score >= 5000)
        if (match) return { unlocked: true, date: match.timestamp }
        const best = h.filter(e => e.gameType === type).reduce((max, e) => Math.max(max, e.score), 0)
        return { unlocked: false, progress: best > 0 ? `Best: ${best.toLocaleString()}` : undefined }
      },
    }
  }),
]


const CATEGORY_INFO: Record<string, { label: string; icon: string }> = {
  'getting-started': { label: 'Getting Started', icon: '🚀' },
  'dedication':      { label: 'Dedication',      icon: '💪' },
  'mastery':         { label: 'Mastery',          icon: '👑' },
  'game-specific':   { label: 'Game Mastery',     icon: '🎮' },
}

// ── Component ──────────────────────────────────────────────────────────────────

const AchievementsPage = () => {
  const [history, setHistory] = useState<LeaderboardEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true)
        const data = await getUserScoreHistory(undefined, 100)
        setHistory(data)
      } catch (err) {
        console.error('Failed to load achievements data:', err)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const results = useMemo(() =>
    ACHIEVEMENTS.map(a => ({ ...a, result: a.check(history) })),
    [history]
  )

  const unlocked = results.filter(r => r.result.unlocked).length
  const total = results.length
  const pct = total > 0 ? Math.round((unlocked / total) * 100) : 0

  const filtered = selectedCategory === 'all'
    ? results
    : results.filter(r => r.category === selectedCategory)

  // Group by category for display
  const categories = ['getting-started', 'dedication', 'mastery', 'game-specific'] as const
  const grouped = selectedCategory === 'all'
    ? categories.map(cat => ({
        cat,
        ...CATEGORY_INFO[cat],
        items: results.filter(r => r.category === cat),
      }))
    : [{ cat: selectedCategory, ...CATEGORY_INFO[selectedCategory], items: filtered }]

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Achievements</h1>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-4xl font-bold">Achievements</h1>
        <span className="text-text-secondary text-sm">{unlocked}/{total} unlocked</span>
      </div>

      {/* Progress bar */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Overall Progress</span>
          <span className="text-sm font-bold text-primary">{pct}%</span>
        </div>
        <div className="w-full bg-card-hover rounded-full h-3">
          <div
            className="h-3 rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              background: 'linear-gradient(to right, #6366f1, #a855f7, #ec4899)',
            }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-text-secondary">
          <span>🏅 {unlocked} earned</span>
          <span>{total - unlocked} remaining</span>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
            selectedCategory === 'all' ? 'bg-primary text-white' : 'bg-card border border-border text-text-secondary hover:text-text-primary'
          }`}
        >
          All
        </button>
        {categories.map(cat => {
          const info = CATEGORY_INFO[cat]
          const catUnlocked = results.filter(r => r.category === cat && r.result.unlocked).length
          const catTotal = results.filter(r => r.category === cat).length
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                selectedCategory === cat ? 'bg-primary text-white' : 'bg-card border border-border text-text-secondary hover:text-text-primary'
              }`}
            >
              {info.icon} {info.label} ({catUnlocked}/{catTotal})
            </button>
          )
        })}
      </div>

      {/* Achievement groups */}
      {grouped.map(group => (
        <div key={group.cat} className="mb-8">
          <h2 className="text-lg font-bold mb-3">{group.icon} {group.label}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {group.items.map(achievement => (
              <div
                key={achievement.id}
                className={`card py-4 px-4 transition-all ${
                  achievement.result.unlocked
                    ? 'ring-1 ring-primary/30'
                    : 'opacity-50 grayscale'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{achievement.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm truncate">{achievement.name}</span>
                      {achievement.result.unlocked && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded-full font-bold shrink-0">
                          ✓
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-secondary mt-0.5">{achievement.description}</p>
                    {achievement.result.unlocked && achievement.result.date && (
                      <p className="text-[10px] text-primary mt-1">
                        Earned {new Date(achievement.result.date).toLocaleDateString()}
                      </p>
                    )}
                    {!achievement.result.unlocked && achievement.result.progress && (
                      <p className="text-[10px] text-text-secondary/70 mt-1">{achievement.result.progress}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default AchievementsPage