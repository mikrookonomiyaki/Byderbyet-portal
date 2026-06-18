import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import styles from './AdminLogin.module.css'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pin, setPin] = useState('')
  const [mode, setMode] = useState('loading') // 'loading' | 'pin' | 'email'
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        if (sessionStorage.getItem('pinVerified') === '1') {
          navigate('/admin/dashboard', { replace: true })
        } else {
          setMode('pin')
        }
      } else {
        setMode('email')
      }
    })
  }, [navigate])

  async function handlePin(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { data, error } = await supabase.rpc('verify_admin_pin', { pin })
    setLoading(false)
    if (error || !data) {
      setError('Feil PIN. Prøv igjen.')
      setPin('')
    } else {
      sessionStorage.setItem('pinVerified', '1')
      navigate('/admin/dashboard', { replace: true })
    }
  }

  async function handleEmail(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      sessionStorage.setItem('pinVerified', '1')
      navigate('/admin/dashboard', { replace: true })
    }
  }

  if (mode === 'loading') return null

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Byderbyet admin</h1>

        {mode === 'pin' ? (
          <form onSubmit={handlePin} className={styles.form}>
            <label className={styles.label}>
              Pinkode
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                className={`${styles.input} ${styles.pinInput}`}
                value={pin}
                onChange={e => setPin(e.target.value)}
                placeholder="••••"
                autoFocus
                maxLength={8}
              />
            </label>
            {error && <p className={styles.error}>{error}</p>}
            <button type="submit" className={styles.button} disabled={loading || pin.length === 0}>
              {loading ? 'Sjekker...' : 'Logg inn'}
            </button>
            <button
              type="button"
              className={styles.switchLink}
              onClick={() => { setMode('email'); setError(null) }}
            >
              Bruk e-post/passord
            </button>
          </form>
        ) : (
          <form onSubmit={handleEmail} className={styles.form}>
            <label className={styles.label}>
              E-post
              <input
                type="email"
                className={styles.input}
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
            </label>
            <label className={styles.label}>
              Passord
              <input
                type="password"
                className={styles.input}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </label>
            {error && <p className={styles.error}>{error}</p>}
            <button type="submit" className={styles.button} disabled={loading}>
              {loading ? 'Logger inn...' : 'Logg inn'}
            </button>
          </form>
        )}

        <a href="/" className={styles.back}>Tilbake til resultater</a>
      </div>
    </div>
  )
}
