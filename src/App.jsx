import { Routes, Route } from 'react-router-dom'
import PublicView from './pages/PublicView.jsx'
import AdminLogin from './pages/AdminLogin.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import EventHistory from './pages/EventHistory.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicView />} />
      <Route path="/event/:name" element={<EventHistory />} />
      <Route path="/admin" element={<AdminLogin />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
    </Routes>
  )
}
