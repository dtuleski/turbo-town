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
import RateLimitPage from './pages/subscription/RateLimitPage'
import AdminDashboard from './pages/admin/AdminDashboard'
import DashboardPage from './pages/dashboard/DashboardPage'
import StatisticsPage from './pages/dashboard/StatisticsPage'
import HistoryPage from './pages/dashboard/HistoryPage'
import AchievementsPage from './pages/dashboard/AchievementsPage'
import ProfilePage from './pages/profile/ProfilePage'
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
          <Route path={ROUTES.RATE_LIMIT} element={<RateLimitPage />} />
          <Route path={ROUTES.SUBSCRIPTION} element={<RateLimitPage />} />
          <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
          <Route path={ROUTES.STATISTICS} element={<StatisticsPage />} />
          <Route path={ROUTES.HISTORY} element={<HistoryPage />} />
          <Route path={ROUTES.ACHIEVEMENTS} element={<AchievementsPage />} />
          <Route path={ROUTES.PROFILE} element={<ProfilePage />} />
          <Route path={ROUTES.ADMIN} element={<AdminDashboard />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
