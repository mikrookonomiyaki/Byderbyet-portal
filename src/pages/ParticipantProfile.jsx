import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { canonicalize } from '../eventNames'
import TrophyIcon from '../components/TrophyIcon'
import styles from './ParticipantProfile.module.css'

export default function ParticipantProfile() {
  const { name } = useParams()
  const participantName = decodeURIComponent(name)

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      const [tourRes, allParticipantsRes, eventsRes, scalesRes] = await Promise.all([
        supabase.from('tournaments').select('*').order('year', { ascending: false }),
        supabase.from('participants').select('*'),
        supabase.from('events').select('*'),
        supabase.from('doeng_scale').select('*'),
      ])
      for (const r of [tourRes, allParticipantsRes, eventsRes, scalesRes]) {
        if (r.error) { setError(r.error.message); setLoading(false); return }
      }

      const matchingParticipants = allParticipantsRes.data.filter(
        p => p.name.toLowerCase() === participantName.toLowerCase()
      )
      if (matchingParticipants.length === 0) {
        setError('Fant ingen deltaker med dette navnet.')
        setLoading(false)
        return
      }

      // Fetch ALL results (needed to compute Byderby winners)
      const { data: allResults, error: rErr } = await supabase.from('results').select('*')
      if (rErr) { setError(rErr.message); setLoading(false); return }

      const eventById = {}
      eventsRes.data.forEach(e => { eventById[e.id] = { ...e, name: canonicalize(e.name) } })

      const scaleByTournament = {}
      scalesRes.data.forEach(s => {
        if (!scaleByTournament[s.tournament_id]) scaleByTournament[s.tournament_id] = {}
        scaleByTournament[s.tournament_id][s.position] = s.points
      })

      const participantById = {}
      allParticipantsRes.data.forEach(p => { participantById[p.id] = p })

      function calcDoeng(result) {
        const event = eventById[result.event_id]
        if (!event) return 0
        const scale = scaleByTournament[event.tournament_id] ?? {}
        return event.is_hansa ? result.placement : (scale[result.placement] ?? result.placement)
      }

      // Compute total doeng per participant per tournament
      const totalByParticipant = {}
      allResults.forEach(r => {
        const p = participantById[r.participant_id]
        if (!p) return
        const key = `${p.tournament_id}::${p.id}`
        totalByParticipant[key] = (totalByParticipant[key] ?? 0) + calcDoeng(r)
      })

      // Find Byderby-winning years for this participant
      const participantByTournament = {}
      matchingParticipants.forEach(p => { participantByTournament[p.tournament_id] = p })

      const byderbyWins = []
      for (const tournament of tourRes.data) {
        const myP = participantByTournament[tournament.id]
        if (!myP) continue
        const myTotal = totalByParticipant[`${tournament.id}::${myP.id}`] ?? 0
        // Find minimum total among all participants in this tournament
        const allInTour = allParticipantsRes.data.filter(p => p.tournament_id === tournament.id)
        const minTotal = Math.min(
          ...allInTour.map(p => totalByParticipant[`${tournament.id}::${p.id}`] ?? 0)
        )
        if (myTotal === minTotal && allInTour.length > 0) {
          byderbyWins.push(tournament.year)
        }
      }

      // Build year -> results for this participant
      const myResultIds = new Set(matchingParticipants.map(p => p.id))
      const byYear = {}
      allResults
        .filter(r => myResultIds.has(r.participant_id))
        .forEach(r => {
          const event = eventById[r.event_id]
          if (!event) return
          const tournament = tourRes.data.find(t => t.id === event.tournament_id)
          if (!tournament) return
          if (!byYear[tournament.year]) byYear[tournament.year] = []
          byYear[tournament.year].push({ event, placement: r.placement, doeng: calcDoeng(r) })
        })

      const years = tourRes.data
        .filter(t => participantByTournament[t.id])
        .map(t => t.year)

      const allMyResults = Object.values(byYear).flat()
      const totalDoeng = allMyResults.reduce((s, r) => s + r.doeng, 0)
      const avgPlacement = allMyResults.length
        ? (allMyResults.reduce((s, r) => s + r.placement, 0) / allMyResults.length).toFixed(1)
        : null
      const etappeseiere = allMyResults.filter(r => r.placement === 1)

      setData({ name: participantName, years, byYear, totalDoeng, avgPlacement, etappeseiere, byderbyWins })
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
  const { years, byYear, totalDoeng, avgPlacement, etappeseiere, byderbyWins } = data

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
          <span className={styles.statVal}>{etappeseiere.length}</span>
          <span className={styles.statLabel}>Etappeseiere</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statVal}>{years.length}</span>
          <span className={styles.statLabel}>År deltatt</span>
        </div>
      </div>

      {byderbyWins.length > 0 && (
        <div className={styles.trophySection}>
          <h2 className={styles.trophyTitle}>
            <TrophyIcon className={styles.trophyIcon} /> Byderby-pokaler
          </h2>
          <div className={styles.trophyList}>
            {byderbyWins.map(y => (
              <span key={y} className={styles.trophy}>{y}</span>
            ))}
          </div>
        </div>
      )}

      {etappeseiere.length > 0 && (
        <div className={styles.etappeSection}>
          <h2 className={styles.sectionTitle}>Etappeseiere</h2>
          <div className={styles.etappeList}>
            {etappeseiere.map(r => (
              <Link
                key={r.event.id}
                to={`/event/${encodeURIComponent(r.event.name)}`}
                className={styles.etappeChip}
              >
                {r.event.name}
                <span className={styles.etappeYear}>({r.event.tournament_id.substring(0, 4)})</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {years.map(year => {
        const results = (byYear[year] ?? []).slice().sort((a, b) => a.placement - b.placement)
        const yearDoeng = results.reduce((s, r) => s + r.doeng, 0)
        return (
          <div key={year} className={styles.yearBlock}>
            <h2 className={styles.yearTitle}>
              {year} <span className={styles.yearDoeng}>{yearDoeng} doeng</span>
            </h2>
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
