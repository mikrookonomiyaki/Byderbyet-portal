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
    async function load() {
      const [eventsRes, tourRes, resultsRes, partsRes] = await Promise.all([
        supabase.from('events').select('id, name, tournament_id').neq('is_published', false).limit(10000),
        supabase.from('tournaments').select('id, year'),
        supabase.from('results').select('event_id, participant_id').eq('placement', 1).limit(10000),
        supabase.from('participants').select('id, name').limit(10000),
      ])
      if (eventsRes.error || !eventsRes.data) { setLoading(false); return }

      const tourById = {}
      ;(tourRes.data ?? []).forEach(t => { tourById[t.id] = t.year })

      const partById = {}
      ;(partsRes.data ?? []).forEach(p => { partById[p.id] = p.name })

      const winnerByEvent = {}
      ;(resultsRes.data ?? []).forEach(r => { winnerByEvent[r.event_id] = r.participant_id })

      const counts = {}, displayName = {}, latestYear = {}, latestWinner = {}
      eventsRes.data.forEach(e => {
        const canonical = canonicalize(e.name)
        const key = canonical.toLowerCase()
        if (!displayName[key]) displayName[key] = canonical
        counts[key] = (counts[key] ?? 0) + 1
        const year = tourById[e.tournament_id]
        const winnerId = winnerByEvent[e.id]
        if (year && winnerId && (latestYear[key] == null || year > latestYear[key])) {
          latestYear[key] = year
          latestWinner[key] = partById[winnerId] ?? null
        }
      })

      const sorted = Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .map(([key, count]) => ({
          name: displayName[key],
          count,
          lastWinner: latestWinner[key] ?? null,
          lastYear: latestYear[key] ?? null,
        }))
      setEvents(sorted)
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to="/" className={styles.back}>← Tilbake</Link>
        <h1 className={styles.title}>Øvelsesoversikt</h1>
        <p className={styles.subtitle}>Alle historiske øvelser, sortert etter antall år de har vært med</p>
      </header>
      <main className={styles.main}>
        {loading && <p className={styles.status}>Laster...</p>}
        <div className={styles.grid}>
          {events.map(({ name, count, lastWinner, lastYear }) => (
            <Link
              key={name}
              to={`/event/${encodeURIComponent(name)}`}
              className={styles.card}
            >
              <span className={styles.icon}>{getEventIcon(name)}</span>
              <span className={styles.name}>{name}</span>
              <span className={styles.count}>{count} {count === 1 ? 'år' : 'år'}</span>
              {lastWinner && (
                <span className={styles.lastWinner}>{lastWinner} ({lastYear})</span>
              )}
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
