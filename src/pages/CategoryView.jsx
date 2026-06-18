import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { getCategoryByKey, getCategory } from '../utils/playerKeywords'
import MortarboardIcon from '../components/MortarboardIcon'
import styles from './CategoryView.module.css'

const ELITE = 2.5
const GOOD  = 5.5

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
        supabase.from('events').select('*').eq('is_published', true).limit(10000),
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
        const cat = getCategory(e.name)
        return cat?.key === key && !e.is_duel
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

      // Aggregate placements per player name (across years)
      const byName = {}
      for (const r of results) {
        const p = participantById[r.participant_id]
        if (!p) continue
        const name = p.name
        if (!byName[name]) byName[name] = []
        byName[name].push(r.placement)
      }

      const rowList = Object.entries(byName).map(([name, placements]) => {
        const avg = placements.reduce((s, p) => s + p, 0) / placements.length
        let adjective, isElite, sortKey

        if (key === 'duell') {
          const winRate = placements.filter(p => p === 1).length / placements.length
          isElite = winRate >= 0.6
          adjective = winRate >= 0.6 ? category.elite : winRate >= 0.4 ? category.good : null
          sortKey = 1 - winRate
        } else {
          isElite = avg <= ELITE
          adjective = avg <= ELITE ? category.elite : avg <= GOOD ? category.good : null
          sortKey = avg
        }

        return { name, adjective, isElite, sortKey, count: placements.length }
      })

      rowList.sort((a, b) => a.sortKey - b.sortKey)
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
                  <th>{key === 'duell' ? 'Øvelser' : 'Øvelser'}</th>
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
                    <td className={styles.count}>{row.count}</td>
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
