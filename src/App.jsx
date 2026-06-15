import { Routes, Route, useLocation } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import PublicView from './pages/PublicView.jsx'
import AdminLogin from './pages/AdminLogin.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import EventHistory from './pages/EventHistory.jsx'
import EventsOverview from './pages/EventsOverview.jsx'
import ParticipantProfile from './pages/ParticipantProfile.jsx'
import './transitions.css'

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
      <Routes location={location}>
        <Route path="/" element={<PublicView />} />
        <Route path="/events" element={<EventsOverview />} />
        <Route path="/event/:name" element={<EventHistory />} />
        <Route path="/participant/:name" element={<ParticipantProfile />} />
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
      </Routes>
    </div>
  )
}

export default function App() {
  return <AnimatedRoutes />
}
