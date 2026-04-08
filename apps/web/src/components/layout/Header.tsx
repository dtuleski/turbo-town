import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { ROUTES, APP_NAME } from '@/config/constants'
import Button from '../common/Button'
import { useState } from 'react'

const Header = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link to={ROUTES.DASHBOARD} className="text-text-primary hover:text-primary-blue">
              Dashboard
            </Link>
            <Link to={ROUTES.LEADERBOARD} className="text-text-primary hover:text-primary-blue">
              🏆 Leaderboard
            </Link>
            <Link to={ROUTES.ACHIEVEMENTS} className="text-text-primary hover:text-primary-blue">
              Achievements
            </Link>
            <Link to={ROUTES.SUBSCRIPTION} className="text-text-primary hover:text-primary-blue">
              💎 Change Plan
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            {user && (
              <>
                {/* Desktop: Username and Logout side by side */}
                <div className="hidden lg:flex items-center gap-4">
                  <Link to={ROUTES.PROFILE} className="text-text-primary hover:text-primary-blue">
                    {user.username}
                  </Link>
                  <Button variant="secondary" size="sm" onClick={handleLogout}>
                    Logout
                  </Button>
                </div>
                
                {/* Tablet (iPad): Username below Logout button */}
                <div className="hidden md:flex lg:hidden flex-col items-end gap-1">
                  <Button variant="secondary" size="sm" onClick={handleLogout}>
                    Logout
                  </Button>
                  <Link to={ROUTES.PROFILE} className="text-sm text-text-primary hover:text-primary-blue">
                    {user.username}
                  </Link>
                </div>
                
                {/* Mobile Menu Button */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden text-text-primary hover:text-primary-blue"
                  aria-label="Toggle menu"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {mobileMenuOpen ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    )}
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && user && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <nav className="flex flex-col gap-4">
              <Link 
                to={ROUTES.DASHBOARD} 
                className="text-text-primary hover:text-primary-blue"
                onClick={() => setMobileMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link 
                to={ROUTES.LEADERBOARD} 
                className="text-text-primary hover:text-primary-blue"
                onClick={() => setMobileMenuOpen(false)}
              >
                🏆 Leaderboard
              </Link>
              <Link 
                to={ROUTES.ACHIEVEMENTS} 
                className="text-text-primary hover:text-primary-blue"
                onClick={() => setMobileMenuOpen(false)}
              >
                Achievements
              </Link>
              <Link 
                to={ROUTES.SUBSCRIPTION} 
                className="text-text-primary hover:text-primary-blue"
                onClick={() => setMobileMenuOpen(false)}
              >
                💎 Change Plan
              </Link>
              <Link 
                to={ROUTES.PROFILE} 
                className="text-text-primary hover:text-primary-blue"
                onClick={() => setMobileMenuOpen(false)}
              >
                {user.username}
              </Link>
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => {
                  setMobileMenuOpen(false)
                  handleLogout()
                }}
              >
                Logout
              </Button>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}

export default Header
