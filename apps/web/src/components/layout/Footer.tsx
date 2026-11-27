import { Link } from 'react-router-dom'
import { APP_NAME, ROUTES } from '@/config/constants'

const Footer = () => {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="text-center text-text-secondary text-sm">
          <p>&copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.</p>
          <p className="mt-2 space-x-4">
            <Link to={ROUTES.PRIVACY}>Privacy Policy</Link>
            <Link to={ROUTES.TERMS}>Terms of Service</Link>
            <Link to={ROUTES.SUPPORT}>Support</Link>
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
