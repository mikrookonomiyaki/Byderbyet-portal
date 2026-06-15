import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { canonicalize } from '../eventNames'
import styles from './EventHistory.module.css'

export default function EventHistory() {
  const { name } = useParams()
  const eventName = decodeURIComponent(name)

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      // Load all tournaments, events, participants and results
      const [tourRes, eventsRes] = await Promise.all([
        supabase.from('tournaments').select('*').order('year', { ascending: false }),
        supabase.from('events').select('*'),
      ])
      if (tourRes.error || eventsRes.error) {
        setError((tourRes.error ?? eventsRes.error).message)
        setLoading(false)
        return
      }

      // Find events matching this canonical name
      const matchingEvents = eventsRes.data.filter(
        e => canonicalize(e.name).toLowerCase() === eventName.toLowerCase()
      )
      if (matchingEvents.length === 0) {
        setError('Fant ingen øvelse med dette navnet.')
        setLoading(false)
        return
      }

      const isHansa = matchingEvents[0].is_hansa

      // Load doeng scales, participants and results for the relevant tournaments
      const relevantTournamentIds = [...new Set(matchingEvents.map(e => e.tournament_id))]

      const [scalesRes, participantsRes, resultsRes] = await Promise.all([
        supabase.from('doeng_scale').select('*').in('tournament_id', relevantTournamentIds),
        supabase.from('participants').select('*').in('tournament_id', relevantTournamentIds),
        supabase.from('results').select('*').in('event_id', matchingEvents.map(e => e.id)),
      ])

      if (scalesRes.error || participantsRes.error || resultsRes.error) {
        setError((scalesRes.error ?? participantsRes.error ?? resultsRes.error).message)
        setLoading(false)
        return
      }

      // Build scale map per tournament
      const scaleByTournament = {}
      scalesRes.data.forEach(s => {
        if (!scaleByTournament[s.tournament_id]) scaleByTournament[s.tournament_id] = {}
        scaleByTournament[s.tournament_id][s.position] = s.points
      })

      // Build participant map by id
      const participantById = {}
      participantsRes.data.forEach(p => { participantById[p.id] = p })

      // Build event map by id
      const eventById = {}
      matchingEvents.forEach(e => { eventById[e.id] = e })

      // Years with this event (sorted newest first)
      const years = tourRes.data
        .filter(t => relevantTournamentIds.includes(t.id))
        .map(t => t.year)

      // Collect all participant names that appear in any of these events
      const nameSet = new Set()
      resultsRes.data.forEach(r => {
        const p = participantById[r.participant_id]
        if (p) nameSet.add(p.name)
      })
      const allNames = [...nameSet].sort()

      // Build result grid: name -> year -> { placement, doeng }
      const grid = {}
      allNames.forEach(n => { grid[n] = {} })

      resultsRes.data.forEach(r => {
        const p = participantById[r.participant_id]
        if (!p) return
        const event = eventById[r.event_id]
        if (!event) return
        const scale = scaleByTournament[event.tournament_id] ?? {}
        const tournament = tourRes.data.find(t => t.id === event.tournament_id)
        if (!tournament) return
        const doeng = isHansa ? r.placement : (scale[r.placement] ?? r.placement)
        grid[p.name][tournament.year] = { placement: r.placement, doeng }
      })

      // Sort participants by average placement across available years
      const sortedNames = allNames.sort((a, b) => {
        const avg = name => {
          const vals = Object.values(grid[name])
          return vals.length ? vals.reduce((s, r) => s + r.placement, 0) / vals.length : 999
        }
        return avg(a) - avg(b)
      })

      setData({ eventName: canonicalize(eventName), years, grid, sortedNames, isHansa })
      setLoading(false)
    }

    load().catch(err => { setError(err.message); setLoading(false) })
  }, [eventName])

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to="/events" className={styles.back}>← Tilbake</Link>
        <h1 className={styles.title}>{data?.eventName ?? eventName}</h1>
        {data && (
          <p className={styles.subtitle}>
            {data.isHansa ? 'Hansa-øvelse — plassering er direkte doeng' : ''}
          </p>
        )}
      </header>

      <main className={styles.main}>
        {loading && <p className={styles.status}>Laster...</p>}
        {error && <p className={styles.error}>{error}</p>}
        {data && <HistoryTable data={data} />}
      </main>
    </div>
  )
}

function HistoryTable({ data }) {
  const { years, grid, sortedNames } = data

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.nameCol}>Deltaker</th>
            {years.map(y => <th key={y}>{y}</th>)}
          </tr>
        </thead>
        <tbody>
          {sortedNames.map(name => (
            <tr key={name}>
              <td className={styles.nameCol}>
                <Link to={`/participant/${encodeURIComponent(name)}`} className={styles.nameLink}>
                  {name}
                </Link>
              </td>
              {years.map(y => {
                const r = grid[name][y]
                return (
                  <td key={y} className={r ? styles.cell : styles.empty}>
                    {r ? `${r.placement} (${r.doeng})` : '—'}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
