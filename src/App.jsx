import { Routes, Route, useLocation } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import PublicView from './pages/PublicView.jsx'
import AdminLogin from './pages/AdminLogin.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import EventHistory from './pages/EventHistory.jsx'
import EventsOverview from './pages/EventsOverview.jsx'
import ParticipantProfile from './pages/ParticipantProfile.jsx'
import CategoryView from './pages/CategoryView.jsx'
import './transitions.css'

// Take manual control so the browser doesn't interfere with our restoration
if (typeof window !== 'undefined') {
  window.history.scrollRestoration = 'manual'
}

const savedScrollPositions = {}

function ScrollRestorer() {
  const location = useLocation()

  useEffect(() => {
    const key = location.key
    return () => {
      savedScrollPositions[key] = window.scrollY
    }
  }, [location.key])

  useEffect(() => {
    const pos = savedScrollPositions[location.key]
    if (pos != null) {
      window.scrollTo(0, pos)
      // Second attempt after async content (data fetches) has rendered
      const t = setTimeout(() => window.scrollTo(0, pos), 200)
      return () => clearTimeout(t)
    } else {
      window.scrollTo(0, 0)
    }
  }, [location.key])

  return null
}

function AnimatedRoutes() {
  const location = useLocation()
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.classList.remove('page-enter')
    void el.offsetWidth
    el.classList.add('page-enter')
  }, [location.pathname])

  return (
    <div ref={ref}>
      <ScrollRestorer />
      <Routes location={location}>
        <Route path="/" element={<PublicView />} />
        <Route path="/events" element={<EventsOverview />} />
        <Route path="/event/:name" element={<EventHistory />} />
        <Route path="/participant/:name" element={<ParticipantProfile />} />
        <Route path="/category/:key" element={<CategoryView />} />
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
      </Routes>
    </div>
  )
}

export default function App() {
  return <AnimatedRoutes />
}
