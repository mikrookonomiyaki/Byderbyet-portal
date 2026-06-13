import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { canonicalize } from '../eventNames'
import styles from './ParticipantProfile.module.css'

export default function ParticipantProfile() {
  const { name } = useParams()
  const participantName = decodeURIComponent(name)

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      const [tourRes, participantsRes, eventsRes, scalesRes] = await Promise.all([
        supabase.from('tournaments').select('*').order('year', { ascending: false }),
        supabase.from('participants').select('*').ilike('name', participantName),
        supabase.from('events').select('*'),
        supabase.from('doeng_scale').select('*'),
      ])

      for (const r of [tourRes, participantsRes, eventsRes, scalesRes]) {
        if (r.error) { setError(r.error.message); setLoading(false); return }
      }

      const matchingParticipants = participantsRes.data
      if (matchingParticipants.length === 0) {
        setError('Fant ingen deltaker med dette navnet.')
        setLoading(false)
        return
      }

      const participantIds = matchingParticipants.map(p => p.id)
      const { data: resultsData, error: rErr } = await supabase
        .from('results').select('*').in('participant_id', participantIds)
      if (rErr) { setError(rErr.message); setLoading(false); return }

      const eventById = {}
      eventsRes.data.forEach(e => { eventById[e.id] = { ...e, name: canonicalize(e.name) } })

      const scaleByTournament = {}
      scalesRes.data.forEach(s => {
        if (!scaleByTournament[s.tournament_id]) scaleByTournament[s.tournament_id] = {}
        scaleByTournament[s.tournament_id][s.position] = s.points
      })

      const participantByTournament = {}
      matchingParticipants.forEach(p => { participantByTournament[p.tournament_id] = p })

      // Build year -> [ { event, placement, doeng } ] map
      const byYear = {}
      resultsData.forEach(r => {
        const event = eventById[r.event_id]
        if (!event) return
        const scale = scaleByTournament[event.tournament_id] ?? {}
        const doeng = event.is_hansa ? r.placement : (scale[r.placement] ?? r.placement)
        const tournament = tourRes.data.find(t => t.id === event.tournament_id)
        if (!tournament) return
        if (!byYear[tournament.year]) byYear[tournament.year] = []
        byYear[tournament.year].push({ event, placement: r.placement, doeng })
      })

      const years = tourRes.data
        .filter(t => participantByTournament[t.id])
        .map(t => t.year)

      // Summary stats
      const allResults = Object.values(byYear).flat()
      const totalDoeng = allResults.reduce((s, r) => s + r.doeng, 0)
      const avgPlacement = allResults.length
        ? (allResults.reduce((s, r) => s + r.placement, 0) / allResults.length).toFixed(1)
        : null
      const wins = allResults.filter(r => r.placement === 1).length

      setData({ name: participantName, years, byYear, totalDoeng, avgPlacement, wins })
      setLoading(false)
    }

    load().catch(err => { setError(err.message); setLoading(false) })
  }, [participantName])

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to="/" className={styles.back}>← Tilbake</Link>
        <h1 className={styles.title}>{participantName}</h1>
      </header>

      <main className={styles.main}>
        {loading && <p className={styles.status}>Laster...</p>}
        {error && <p className={styles.error}>{error}</p>}
        {data && <ProfileView data={data} />}
      </main>
    </div>
  )
}

function ProfileView({ data }) {
  const { years, byYear, totalDoeng, avgPlacement, wins } = data

  return (
    <div>
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statVal}>{totalDoeng}</span>
          <span className={styles.statLabel}>Total doeng</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statVal}>{avgPlacement ?? '—'}</span>
          <span className={styles.statLabel}>Snitt plassering</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statVal}>{wins}</span>
          <span className={styles.statLabel}>Seire</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statVal}>{years.length}</span>
          <span className={styles.statLabel}>År deltatt</span>
        </div>
      </div>

      {years.map(year => {
        const results = (byYear[year] ?? []).slice().sort((a, b) => a.placement - b.placement)
        const yearDoeng = results.reduce((s, r) => s + r.doeng, 0)
        return (
          <div key={year} className={styles.yearBlock}>
            <h2 className={styles.yearTitle}>{year} <span className={styles.yearDoeng}>{yearDoeng} doeng</span></h2>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Øvelse</th>
                    <th>Dag</th>
                    <th>Plass</th>
                    <th>Doeng</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map(r => (
                    <tr key={r.event.id} className={r.placement === 1 ? styles.win : ''}>
                      <td>
                        <Link to={`/event/${encodeURIComponent(r.event.name)}`} className={styles.eventLink}>
                          {r.event.name}
                        </Link>
                      </td>
                      <td>{r.event.day}</td>
                      <td>{r.placement}</td>
                      <td>{r.doeng}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </div>
  )
}
