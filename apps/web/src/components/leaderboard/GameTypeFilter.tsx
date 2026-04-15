import { GameType } from '@/api/leaderboard'

interface GameTypeFilterProps {
  selected: GameType
  onChange: (gameType: GameType) => void
}

const gameTypes = [
  { value: GameType.OVERALL, label: 'Overall', icon: '🏆' },
  { value: GameType.MEMORY_MATCH, label: 'Memory Match', icon: '🃏' },
  { value: GameType.MATH_CHALLENGE, label: 'Math Challenge', icon: '🧮' },
  { value: GameType.WORD_PUZZLE, label: 'Word Puzzle', icon: '🔤' },
  { value: GameType.LANGUAGE_LEARNING, label: 'Language Learning', icon: '🌍' },
  { value: GameType.SUDOKU, label: 'Sudoku', icon: '9️⃣' },
  { value: GameType.JIGSAW_PUZZLE, label: 'Jigsaw Puzzle', icon: '🧩' },
  { value: GameType.BUBBLE_POP, label: 'Bubble Pop', icon: '🫧' },
  { value: GameType.SEQUENCE_MEMORY, label: 'Sequence Memory', icon: '🧠' },
  { value: GameType.CODE_A_BOT, label: 'Code-a-Bot', icon: '🤖' },
  { value: GameType.GEO_QUIZ, label: 'Geo Quiz', icon: '🌍' },
  { value: GameType.HISTORY_QUIZ, label: 'History Quiz', icon: '📜' },
  { value: GameType.CIVICS_QUIZ, label: 'Civics Quiz', icon: '🇺🇸' },
  { value: GameType.COLOR_BY_NUMBER, label: 'Color by Number', icon: '🎨' },
  { value: GameType.HANGMAN, label: 'Hangman', icon: '🪢' },
  { value: GameType.TIC_TAC_TOE, label: 'Tic Tac Toe', icon: '❌' },
  { value: GameType.MATH_MAZE, label: 'Math Maze', icon: '🧮' },
]

const GameTypeFilter = ({ selected, onChange }: GameTypeFilterProps) => {
  return (
    <div className="mb-6">
      <label htmlFor="game-type" className="block text-sm font-medium text-text-secondary mb-2">
        Game Type
      </label>
      <select
        id="game-type"
        value={selected}
        onChange={(e) => onChange(e.target.value as GameType)}
        className="w-full md:w-64 px-4 py-2 rounded-lg bg-card border border-border text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
      >
        {gameTypes.map((type) => (
          <option key={type.value} value={type.value}>
            {type.icon} {type.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export default GameTypeFilter
