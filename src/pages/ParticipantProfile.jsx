import { useState, useEffect } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
import confetti from 'canvas-confetti'
import { supabase } from '../supabaseClient'
import { canonicalize } from '../eventNames'
import TrophyIcon from '../components/TrophyIcon'
import MedalEmblem from '../components/MedalEmblem'
import MortarboardIcon from '../components/MortarboardIcon'
import { computeKeywordsFromAllResults } from '../utils/playerKeywords'
import styles from './ParticipantProfile.module.css'

export default function ParticipantProfile() {
  const { name } = useParams()
  const participantName = decodeURIComponent(name)
  const location = useLocation()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (location.state?.confetti) {
      confetti({ particleCount: 130, spread: 80, origin: { y: 0.55 } })
    }
  }, [location.state?.confetti])

  useEffect(() => {
    async function load() {
      const [tourRes, allParticipantsRes] = await Promise.all([
        supabase.from('tournaments').select('*').order('year', { ascending: false }),
        supabase.from('participants').select('*').limit(10000),
      ])
      for (const r of [tourRes, allParticipantsRes]) {
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

      // Scope events, scales, and results to only tournaments this player participated in
      const myTourIds = matchingParticipants.map(p => p.tournament_id)

      const [eventsRes, scalesRes] = await Promise.all([
        supabase.from('events').select('*').in('tournament_id', myTourIds).neq('is_published', false).limit(10000),
        supabase.from('doeng_scale').select('*').in('tournament_id', myTourIds).limit(10000),
      ])
      for (const r of [eventsRes, scalesRes]) {
        if (r.error) { setError(r.error.message); setLoading(false); return }
      }

      // Fetch results per tournament to avoid the 1000-row Supabase page cap
      // A single cross-year query can exceed 1000 rows and silently truncate.
      const allResults = []
      for (const tourId of myTourIds) {
        const tourEventIds = eventsRes.data.filter(e => e.tournament_id === tourId).map(e => e.id)
        if (tourEventIds.length === 0) continue
        const { data: tourResults, error: rErr } = await supabase
          .from('results').select('*').in('event_id', tourEventIds).limit(10000)
        if (rErr) { setError(rErr.message); setLoading(false); return }
        allResults.push(...tourResults)
      }

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

      // Compute total per participant per tournament (needed for standings and byderby)
      const totalByParticipant = {}
      allResults.forEach(r => {
        const p = participantById[r.participant_id]
        if (!p) return
        const key = `${p.tournament_id}::${p.id}`
        totalByParticipant[key] = (totalByParticipant[key] ?? 0) + calcDoeng(r)
      })

      const participantByTournament = {}
      matchingParticipants.forEach(p => { participantByTournament[p.tournament_id] = p })

      // Find Byderby-winning years — use the same RPC as Æresgalleri to guarantee consistency
      const { data: hofData } = await supabase.rpc('hall_of_fame')
      const completedYears = new Set(
        tourRes.data.filter(t => t.is_completed !== false).map(t => t.year)
      )
      const overrideWins = tourRes.data
        .filter(t => t.winner_override?.toLowerCase() === participantName.toLowerCase() && completedYears.has(t.year))
        .map(t => t.year)
      const byderbyWins = [
        ...(hofData ?? [])
          .filter(w => w.name.toLowerCase() === participantName.toLowerCase() && completedYears.has(w.year))
          .map(w => w.year),
        ...overrideWins,
      ].filter((y, i, arr) => arr.indexOf(y) === i).sort((a, b) => b - a)

      // Compute final standing per year
      const standingByYear = {}
      tourRes.data.forEach(t => {
        const myP = participantByTournament[t.id]
        if (!myP) return
        const allInTour = allParticipantsRes.data.filter(p => p.tournament_id === t.id)
        const desc = (t.scoring_direction ?? 'asc') === 'desc'
        const myTotal = totalByParticipant[`${t.id}::${myP.id}`] ?? 0
        const rank = allInTour.filter(p => {
          const pTotal = totalByParticipant[`${t.id}::${p.id}`] ?? 0
          return desc ? pTotal > myTotal : pTotal < myTotal
        }).length + 1
        standingByYear[t.year] = rank
      })

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
          byYear[tournament.year].push({ event, placement: r.placement, doeng: calcDoeng(r), year: tournament.year })
        })

      const years = tourRes.data
        .filter(t => participantByTournament[t.id])
        .map(t => t.year)

      const scoringByYear = {}
      tourRes.data.forEach(t => { scoringByYear[t.year] = t.scoring_direction ?? 'asc' })

      const participantCountByEvent = {}
      allResults.forEach(r => {
        participantCountByEvent[r.event_id] = (participantCountByEvent[r.event_id] ?? 0) + 1
      })

      const allMyResults = Object.values(byYear).flat()
      const avgPlacement = allMyResults.length
        ? (allMyResults.reduce((s, r) => s + r.placement, 0) / allMyResults.length).toFixed(1)
        : null
      const etappeseiere = allMyResults.filter(r => r.placement === 1)

      const solvAar = Object.entries(standingByYear)
        .filter(([year, rank]) => rank === 2 && completedYears.has(Number(year)))
        .map(([year]) => Number(year))
        .sort((a, b) => b - a)
      const bronseAar = Object.entries(standingByYear)
        .filter(([year, rank]) => rank === 3 && completedYears.has(Number(year)))
        .map(([year]) => Number(year))
        .sort((a, b) => b - a)

      const keywords = computeKeywordsFromAllResults(participantName, allResults, eventById, participantById, participantCountByEvent)

      const participantCountByYear = {}
      tourRes.data.forEach(t => {
        participantCountByYear[t.year] = allParticipantsRes.data.filter(p => p.tournament_id === t.id).length
      })

      setData({ name: participantName, years, byYear, avgPlacement, etappeseiere, solvAar, bronseAar, byderbyWins, scoringByYear, standingByYear, keywords, participantCountByYear })
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

function Sparkline({ years, standingByYear, participantCountByYear }) {
  const sorted = [...years].sort((a, b) => a - b)
  if (sorted.length < 2) return null

  const W = 300, H = 80, padX = 20, padTop = 20, padBottom = 18
  const n = sorted.length
  const xScale = i => padX + (i / (n - 1)) * (W - 2 * padX)
  const yScale = (rank, year) => {
    const total = participantCountByYear[year] ?? rank
    return padTop + ((rank - 1) / Math.max(total - 1, 1)) * (H - padTop - padBottom)
  }

  const points = sorted.map((y, i) => ({
    x: xScale(i),
    y: yScale(standingByYear[y] ?? 1, y),
    year: y,
    rank: standingByYear[y],
  }))

  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')

  return (
    <div className={styles.sparklineSection}>
      <h2 className={styles.sectionTitle}>Utvikling</h2>
      <svg viewBox={`0 0 ${W} ${H}`} className={styles.sparkline} aria-hidden="true">
        <path d={d} className={styles.sparklineLine} />
        {points.map(p => (
          <g key={p.year}>
            <circle cx={p.x} cy={p.y} r={3.5} className={styles.sparklineDot} />
            {p.rank != null && (
              <text x={p.x} y={p.y - 7} className={styles.sparklineRank}>{p.rank}.</text>
            )}
            <text x={p.x} y={H - 3} className={styles.sparklineYear}>{p.year}</text>
          </g>
        ))}
      </svg>
    </div>
  )
}

function ProfileView({ data }) {
  const { years, byYear, avgPlacement, etappeseiere, solvAar, bronseAar, byderbyWins, scoringByYear, standingByYear, keywords, participantCountByYear } = data
  const allResults = Object.values(byYear).flat()
  const hasHansa = allResults.some(r => r.event.name.toLowerCase().includes('sanksjon'))

  return (
    <div>
      {(keywords.length > 0 || hasHansa) && (
        <div className={styles.keywords}>
          {keywords.map(kw => (
            <Link key={kw.adjective} to={`/category/${kw.categoryKey}`} className={styles.keywordWrap}>
              {kw.isElite && <MortarboardIcon className={styles.mortarboard} />}
              <span className={kw.isElite ? styles.keywordElite : styles.keyword}>{kw.adjective}</span>
            </Link>
          ))}
          {hasHansa && <span className={styles.hansaKeyword}>Hansa-dranker</span>}
        </div>
      )}
      <div className={styles.stats}>
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

      {years.length >= 2 && (
        <Sparkline years={years} standingByYear={standingByYear} participantCountByYear={participantCountByYear} />
      )}

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

      {(solvAar.length > 0 || bronseAar.length > 0) && (
        <div className={styles.medalSection}>
          <h2 className={styles.sectionTitle}>Medaljer</h2>
          <div className={styles.medalList}>
            {[...solvAar.map(y => ({ year: y, type: 'solv' })), ...bronseAar.map(y => ({ year: y, type: 'bronse' }))]
              .sort((a, b) => b.year - a.year)
              .map(m => <MedalEmblem key={`${m.type}-${m.year}`} year={m.year} type={m.type} />)}
          </div>
        </div>
      )}

      {etappeseiere.length > 0 && (
        <div className={styles.etappeSection}>
          <h2 className={styles.sectionTitle}>Etappeseiere</h2>
          <div className={styles.etappeList}>
            {etappeseiere.map(r => (
              <Link
                key={`${r.event.id}-${r.year}`}
                to={`/event/${encodeURIComponent(r.event.name)}`}
                className={styles.etappeChip}
              >
                {r.event.name}
                <span className={styles.etappeYear}>({r.year})</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {years.map(year => {
        const results = (byYear[year] ?? []).slice().sort((a, b) => a.placement - b.placement)
        const yearDoeng = results.reduce((s, r) => s + r.doeng, 0)
        const scoreLabel = (scoringByYear[year] ?? 'asc') === 'desc' ? 'Poeng' : 'Doeng'
        const rank = standingByYear[year]
        return (
          <div key={year} className={styles.yearBlock}>
            <h2 className={styles.yearTitle}>
              {year}
              {results.length > 0 && (
                <span className={styles.yearDoeng}>{yearDoeng} {scoreLabel.toLowerCase()} · {rank}. plass</span>
              )}
            </h2>
            {results.length === 0 ? (
              <p className={styles.noResults}>Ingen øvelseresultater registrert.</p>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Øvelse</th>
                      <th>Dag</th>
                      <th>Plass</th>
                      <th>{scoreLabel}</th>
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
            )}
          </div>
        )
      })}
    </div>
  )
}
