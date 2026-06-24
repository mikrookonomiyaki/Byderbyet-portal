import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { getCategoryByKey, getCategory, MIN_ENTRIES, REGULARIZATION, ELITE_COUNT, GOOD_FRAC } from '../utils/playerKeywords'
import { canonicalize } from '../eventNames'
import MortarboardIcon from '../components/MortarboardIcon'
import styles from './CategoryView.module.css'

export default function CategoryView() {
  const { key } = useParams()
  const category = getCategoryByKey(key)

  const [rows, setRows] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!category) return

    async function load() {
      const [eventsRes, participantsRes] = await Promise.all([
        supabase.from('events').select('*').neq('is_published', false).limit(10000),
        supabase.from('participants').select('*').limit(10000),
      ])
      if (eventsRes.error || participantsRes.error) {
        setError((eventsRes.error ?? participantsRes.error).message)
        setLoading(false)
        return
      }

      // Filter events belonging to this category
      const matchingEvents = eventsRes.data.filter(e => {
        if (key === 'duell') return e.is_duel === true
        if (e.is_duel) return false
        // Exclude the actual Hansa sanction event by name, not by flag —
        // the flag can be incorrectly set on legitimate events (e.g. Fosstafetten)
        if (canonicalize(e.name).toLowerCase().includes('sanksjon')) return false
        const cat = getCategory(e.name)
        return cat?.key === key
      })

      if (matchingEvents.length === 0) {
        setRows([])
        setLoading(false)
        return
      }

      const eventIds = matchingEvents.map(e => e.id)
      const { data: results, error: rErr } = await supabase
        .from('results').select('*').in('event_id', eventIds).limit(10000)
      if (rErr) { setError(rErr.message); setLoading(false); return }

      const participantById = {}
      participantsRes.data.forEach(p => { participantById[p.id] = p })

      const eventById = {}
      matchingEvents.forEach(e => { eventById[e.id] = { ...e, name: canonicalize(e.name) } })

      // Participant count per event (for relative "above average" threshold)
      const countByEvent = {}
      for (const r of results) {
        countByEvent[r.event_id] = (countByEvent[r.event_id] ?? 0) + 1
      }

      // Aggregate placements and event names per player name (across years)
      const byName = {}
      for (const r of results) {
        const p = participantById[r.participant_id]
        const event = eventById[r.event_id]
        if (!p || !event) continue
        const name = p.name
        if (!byName[name]) byName[name] = { placements: [], entries: [], eventNames: new Set() }
        byName[name].placements.push(r.placement)
        byName[name].entries.push({ placement: r.placement, eventId: r.event_id })
        byName[name].eventNames.add(event.name)
      }

      const rowList = Object.entries(byName).map(([name, { placements, entries, eventNames }]) => {
        const avg = placements.reduce((s, p) => s + p, 0) / placements.length
        const meetsMinimum = key === 'duell' || entries.length >= MIN_ENTRIES
        let adjective = null, isElite = false, regAvg

        if (key === 'duell') {
          const winRate = placements.filter(p => p === 1).length / placements.length
          isElite = winRate >= 0.6
          adjective = winRate >= 0.6 ? category.elite : winRate >= 0.4 ? category.good : null
          regAvg = 1 - winRate
        } else {
          const n = entries.length
          const fieldSizes = entries.map(e => countByEvent[e.eventId] ?? 12)
          const avgField = fieldSizes.reduce((s, f) => s + f, 0) / fieldSizes.length
          const priorMean = (avgField + 1) / 2
          regAvg = (n * avg + REGULARIZATION * priorMean) / (n + REGULARIZATION)
        }

        return {
          name,
          adjective,
          isElite,
          meetsMinimum,
          regAvg,
          count: placements.length,
          eventNames: [...eventNames].sort(),
        }
      })

      // Rank-based badge assignment for non-duel categories
      if (key !== 'duell') {
        const qualified = rowList.filter(r => r.meetsMinimum).sort((a, b) => a.regAvg - b.regAvg)
        const n = qualified.length
        const eliteCount = Math.min(n, ELITE_COUNT)
        const goodCount  = Math.min(n - eliteCount, Math.round(n * GOOD_FRAC))
        qualified.forEach((row, idx) => {
          if (idx < eliteCount)                    { row.isElite = true;  row.adjective = category.elite }
          else if (idx < eliteCount + goodCount)   { row.isElite = false; row.adjective = category.good  }
        })
      }

      // Qualified players sort before non-qualified to prevent badge holders from
      // being buried below players with too few entries to earn a badge.
      rowList.sort((a, b) => {
        if (a.meetsMinimum !== b.meetsMinimum) return a.meetsMinimum ? -1 : 1
        return a.regAvg - b.regAvg
      })
      setRows(rowList)
      setLoading(false)
    }

    load().catch(err => { setError(err.message); setLoading(false) })
  }, [key, category])

  if (!category) return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to="/" className={styles.back}>← Tilbake</Link>
        <h1 className={styles.title}>Ukjent kategori</h1>
      </header>
    </div>
  )

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to="/" className={styles.back}>← Tilbake</Link>
        <h1 className={styles.title}>{category.label}</h1>
        <p className={styles.subtitle}>
          {key === 'duell' ? 'Rangert etter seierrate i dueller' : 'Rangert etter gjennomsnittlig plassering'}
        </p>
      </header>

      <main className={styles.main}>
        {loading && <p className={styles.status}>Laster...</p>}
        {error && <p className={styles.error}>{error}</p>}
        {rows && rows.length === 0 && <p className={styles.status}>Ingen resultater registrert ennå.</p>}
        {rows && rows.length > 0 && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Deltaker</th>
                  <th>Nivå</th>
                  <th>Øvelser</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.name} className={row.isElite ? styles.elite : ''}>
                    <td>{i + 1}</td>
                    <td>
                      <Link to={`/participant/${encodeURIComponent(row.name)}`} className={styles.nameLink}>
                        {row.name}
                      </Link>
                    </td>
                    <td>
                      {row.adjective ? (
                        <span className={styles.adjWrap}>
                          {row.isElite && <MortarboardIcon className={styles.mortarboard} />}
                          <span className={row.isElite ? styles.badgeElite : styles.badge}>
                            {row.adjective}
                          </span>
                        </span>
                      ) : <span className={styles.none}>—</span>}
                    </td>
                    <td className={styles.eventsList}>
                      {row.eventNames.join(' · ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
