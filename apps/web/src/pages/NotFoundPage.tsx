import { Link } from 'react-router-dom'
import { ROUTES } from '@/config/constants'
import Button from '@/components/common/Button'

const NotFoundPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-light">
      <div className="text-center">
        <div className="text-9xl mb-4">404</div>
        <h1 className="text-4xl font-bold mb-4">Page Not Found</h1>
        <p className="text-text-secondary mb-8">
          Oops! The page you're looking for doesn't exist.
        </p>
        <Link to={ROUTES.HOME}>
          <Button>Go Home</Button>
        </Link>
      </div>
    </div>
  )
}

export default NotFoundPage
