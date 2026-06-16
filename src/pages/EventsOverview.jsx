import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { canonicalize } from '../eventNames'
import { getEventIcon } from '../utils/eventIcons'
import styles from './EventsOverview.module.css'

export default function EventsOverview() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('events').select('id, name').then(({ data, error }) => {
      if (error || !data) { setLoading(false); return }
      const counts = {}
      const displayName = {}
      data.forEach(e => {
        const canonical = canonicalize(e.name)
        const key = canonical.toLowerCase()
        if (!displayName[key]) displayName[key] = canonical
        counts[key] = (counts[key] ?? 0) + 1
      })
      const sorted = Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .map(([key, count]) => ({ name: displayName[key], count }))
      setEvents(sorted)
      setLoading(false)
    })
  }, [])

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to="/" className={styles.back}>← Tilbake</Link>
        <h1 className={styles.title}>Øvelser</h1>
        <p className={styles.subtitle}>Alle historiske øvelser, sortert etter antall år de har vært med</p>
      </header>
      <main className={styles.main}>
        {loading && <p className={styles.status}>Laster...</p>}
        <div className={styles.grid}>
          {events.map(({ name, count }) => (
            <Link
              key={name}
              to={`/event/${encodeURIComponent(name)}`}
              className={styles.card}
            >
              <span className={styles.icon}>{getEventIcon(name)}</span>
              <span className={styles.name}>{name}</span>
              <span className={styles.count}>{count} {count === 1 ? 'år' : 'år'}</span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
