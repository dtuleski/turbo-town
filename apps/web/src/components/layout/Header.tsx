import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { ROUTES, APP_NAME } from '@/config/constants'
import Button from '../common/Button'

const Header = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate(ROUTES.LOGIN)
  }

  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to={ROUTES.HOME} className="text-2xl font-bold text-primary-blue">
            {APP_NAME} 🎮
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link to={ROUTES.GAME_SETUP} className="text-text-primary hover:text-primary-blue">
              Play
            </Link>
            <Link to={ROUTES.DASHBOARD} className="text-text-primary hover:text-primary-blue">
              Dashboard
            </Link>
            <Link to={ROUTES.ACHIEVEMENTS} className="text-text-primary hover:text-primary-blue">
              Achievements
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            {user && (
              <>
                <Link to={ROUTES.PROFILE} className="text-text-primary hover:text-primary-blue">
                  {user.username}
                </Link>
                <Button variant="secondary" size="sm" onClick={handleLogout}>
                  Logout
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
