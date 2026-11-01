import { Outlet } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import QuestBanner from '../quest/QuestBanner'

const AppLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-bg-light">
      <Header />
      <QuestBanner />
      <main className="flex-1 container mx-auto px-4 py-8">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

export default AppLayout
