import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ROUTES } from './config/constants'

// Layouts
import AppLayout from './components/layout/AppLayout'
import AuthLayout from './components/auth/AuthLayout'

// Pages
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import GameHubPage from './pages/hub/GameHubPage'
import GameSetupPage from './pages/game/GameSetupPage'
import GamePage from './pages/game/GamePage'
import MathSetupPage from './pages/math/MathSetupPage'
import MathGamePage from './pages/math/MathGamePage'
import WordPuzzleSetupPage from './pages/word-puzzle/WordPuzzleSetupPage'
import WordPuzzleGamePage from './pages/word-puzzle/WordPuzzleGamePage'
import LanguageSelectionPage from './pages/language/LanguageSelectionPage'
import LanguageGameSetup from './pages/language/LanguageGameSetup'
import LanguageGamePage from './pages/language/LanguageGamePage'
import LanguageGameResults from './pages/language/LanguageGameResults'
import SudokuSetupPage from './pages/sudoku/SudokuSetupPage'
import SudokuGamePage from './pages/sudoku/SudokuGamePage'
import PuzzleSetupPage from './pages/puzzle/PuzzleSetupPage'
import PuzzleGamePage from './pages/puzzle/PuzzleGamePage'
import BubblePopSetupPage from './pages/bubble-pop/BubblePopSetupPage'
import BubblePopGamePage from './pages/bubble-pop/BubblePopGamePage'
import SequenceMemorySetupPage from './pages/sequence-memory/SequenceMemorySetupPage'
import SequenceMemoryGamePage from './pages/sequence-memory/SequenceMemoryGamePage'
import CodeABotSetupPage from './pages/code-a-bot/CodeABotSetupPage'
import CodeABotGamePage from './pages/code-a-bot/CodeABotGamePage'
import GeoQuizSetupPage from './pages/geo-quiz/GeoQuizSetupPage'
import GeoQuizGamePage from './pages/geo-quiz/GeoQuizGamePage'
import HistoryQuizSetupPage from './pages/history-quiz/HistoryQuizSetupPage'
import HistoryQuizGamePage from './pages/history-quiz/HistoryQuizGamePage'
import CivicsQuizSetupPage from './pages/civics-quiz/CivicsQuizSetupPage'
import CivicsQuizGamePage from './pages/civics-quiz/CivicsQuizGamePage'
import ColorByNumberSetupPage from './pages/color-by-number/ColorByNumberSetupPage'
import ColorByNumberGamePage from './pages/color-by-number/ColorByNumberGamePage'
import HangmanSetupPage from './pages/hangman/HangmanSetupPage'
import HangmanGamePage from './pages/hangman/HangmanGamePage'
import TicTacToeSetupPage from './pages/tic-tac-toe/TicTacToeSetupPage'
import TicTacToeGamePage from './pages/tic-tac-toe/TicTacToeGamePage'
import RateLimitPage from './pages/subscription/RateLimitPage'
import SubscriptionSuccessPage from './pages/subscription/SubscriptionSuccessPage'
import AdminDashboard from './pages/admin/AdminDashboard'
import LanguageMaintenancePage from './pages/admin/LanguageMaintenancePage'
import SubscriptionsPage from './pages/admin/SubscriptionsPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import StatisticsPage from './pages/dashboard/StatisticsPage'
import HistoryPage from './pages/dashboard/HistoryPage'
import AchievementsPage from './pages/dashboard/AchievementsPage'
import LeaderboardPage from './pages/leaderboard/LeaderboardPage'
import ProfilePage from './pages/profile/ProfilePage'
import ContactPage from './pages/contact/ContactPage'
import NotFoundPage from './pages/NotFoundPage'

// Components
import ProtectedRoute from './components/common/ProtectedRoute'

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public routes with auth layout */}
        <Route element={<AuthLayout />}>
          <Route path={ROUTES.LOGIN} element={<LoginPage />} />
          <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
          <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPasswordPage />} />
          <Route path={ROUTES.RESET_PASSWORD} element={<ResetPasswordPage />} />
        </Route>

        {/* Protected routes with app layout */}
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path={ROUTES.HOME} element={<Navigate to={ROUTES.HUB} replace />} />
          <Route path={ROUTES.HUB} element={<GameHubPage />} />
          <Route path={ROUTES.GAME_SETUP} element={<GameSetupPage />} />
          <Route path={ROUTES.GAME} element={<GamePage />} />
          <Route path={ROUTES.MATH_SETUP} element={<MathSetupPage />} />
          <Route path={ROUTES.MATH_GAME} element={<MathGamePage />} />
          <Route path={ROUTES.WORD_PUZZLE_SETUP} element={<WordPuzzleSetupPage />} />
          <Route path={ROUTES.WORD_PUZZLE_GAME} element={<WordPuzzleGamePage />} />
          <Route path={ROUTES.LANGUAGE} element={<LanguageSelectionPage />} />
          <Route path="/language/setup/:languageCode" element={<LanguageGameSetup />} />
          <Route path="/language/game/:languageCode" element={<LanguageGamePage />} />
          <Route path="/language/results/:languageCode" element={<LanguageGameResults />} />
          <Route path={ROUTES.SUDOKU_SETUP} element={<SudokuSetupPage />} />
          <Route path={ROUTES.SUDOKU_GAME} element={<SudokuGamePage />} />
          <Route path={ROUTES.PUZZLE_SETUP} element={<PuzzleSetupPage />} />
          <Route path={ROUTES.PUZZLE_GAME} element={<PuzzleGamePage />} />
          <Route path={ROUTES.BUBBLE_POP_SETUP} element={<BubblePopSetupPage />} />
          <Route path={ROUTES.BUBBLE_POP_GAME} element={<BubblePopGamePage />} />
          <Route path={ROUTES.SEQUENCE_MEMORY_SETUP} element={<SequenceMemorySetupPage />} />
          <Route path={ROUTES.SEQUENCE_MEMORY_GAME} element={<SequenceMemoryGamePage />} />
          <Route path={ROUTES.CODE_A_BOT_SETUP} element={<CodeABotSetupPage />} />
          <Route path={ROUTES.CODE_A_BOT_GAME} element={<CodeABotGamePage />} />
          <Route path={ROUTES.GEO_QUIZ_SETUP} element={<GeoQuizSetupPage />} />
          <Route path={ROUTES.GEO_QUIZ_GAME} element={<GeoQuizGamePage />} />
          <Route path={ROUTES.HISTORY_QUIZ_SETUP} element={<HistoryQuizSetupPage />} />
          <Route path={ROUTES.HISTORY_QUIZ_GAME} element={<HistoryQuizGamePage />} />
          <Route path={ROUTES.CIVICS_QUIZ_SETUP} element={<CivicsQuizSetupPage />} />
          <Route path={ROUTES.CIVICS_QUIZ_GAME} element={<CivicsQuizGamePage />} />
          <Route path={ROUTES.COLOR_BY_NUMBER_SETUP} element={<ColorByNumberSetupPage />} />
          <Route path={ROUTES.COLOR_BY_NUMBER_GAME} element={<ColorByNumberGamePage />} />
          <Route path={ROUTES.HANGMAN_SETUP} element={<HangmanSetupPage />} />
          <Route path={ROUTES.HANGMAN_GAME} element={<HangmanGamePage />} />
          <Route path={ROUTES.TIC_TAC_TOE_SETUP} element={<TicTacToeSetupPage />} />
          <Route path={ROUTES.TIC_TAC_TOE_GAME} element={<TicTacToeGamePage />} />
          <Route path={ROUTES.RATE_LIMIT} element={<RateLimitPage />} />
          <Route path={ROUTES.SUBSCRIPTION} element={<RateLimitPage />} />
          <Route path="/subscription/success" element={<SubscriptionSuccessPage />} />
          <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
          <Route path={ROUTES.STATISTICS} element={<StatisticsPage />} />
          <Route path={ROUTES.HISTORY} element={<HistoryPage />} />
          <Route path={ROUTES.ACHIEVEMENTS} element={<AchievementsPage />} />
          <Route path={ROUTES.LEADERBOARD} element={<LeaderboardPage />} />
          <Route path={ROUTES.PROFILE} element={<ProfilePage />} />
          <Route path={ROUTES.CONTACT} element={<ContactPage />} />
          <Route path={ROUTES.ADMIN} element={<AdminDashboard />} />
          <Route path="/admin/language-maintenance" element={<LanguageMaintenancePage />} />
          <Route path="/admin/subscriptions" element={<SubscriptionsPage />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
