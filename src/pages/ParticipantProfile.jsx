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

// Years where the winner is known but not in the database (no results registered)
const KNOWN_WINS = [
  { year: 2022, nameIncludes: 'philip' },
]

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

      const myTourIds = matchingParticipants.map(p => p.tournament_id)
      const myTourIdSet = new Set(myTourIds)

      // Fetch ALL published events (all years) so keyword ranking matches CategoryView.
      // Scales are only needed for Ingunn's tournaments (doeng computation for display).
      const [allEventsRes, scalesRes] = await Promise.all([
        supabase.from('events').select('*').neq('is_published', false).limit(10000),
        supabase.from('doeng_scale').select('*').in('tournament_id', myTourIds).limit(10000),
      ])
      for (const r of [allEventsRes, scalesRes]) {
        if (r.error) { setError(r.error.message); setLoading(false); return }
      }

      // Group published events by tournament for efficient per-tournament result fetching
      const eventsByTour = {}
      allEventsRes.data.forEach(e => {
        if (!eventsByTour[e.tournament_id]) eventsByTour[e.tournament_id] = []
        eventsByTour[e.tournament_id].push(e)
      })

      // Fetch results for ALL tournaments in parallel (needed for accurate keyword ranking)
      let allResults = []
      try {
        const resultArrays = await Promise.all(
          Object.entries(eventsByTour).map(async ([, events]) => {
            const ids = events.map(e => e.id)
            const { data, error } = await supabase.from('results').select('*').in('event_id', ids).limit(10000)
            if (error) throw error
            return data
          })
        )
        allResults = resultArrays.flat()
      } catch (err) {
        setError(err.message); setLoading(false); return
      }

      // Subset of results scoped to Ingunn's tournaments (used for display/standings)
      const myEventIds = new Set(
        allEventsRes.data.filter(e => myTourIdSet.has(e.tournament_id)).map(e => e.id)
      )
      const myTourResults = allResults.filter(r => myEventIds.has(r.event_id))

      const eventById = {}
      allEventsRes.data.forEach(e => { eventById[e.id] = { ...e, name: canonicalize(e.name) } })

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

      // Compute total per participant per tournament using only Ingunn's tournaments
      // (scaleByTournament only covers those years, and standings are per-tournament)
      const totalByParticipant = {}
      myTourResults.forEach(r => {
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
      const knownWins = KNOWN_WINS
        .filter(w => participantName.toLowerCase().includes(w.nameIncludes))
        .map(w => w.year)
      const byderbyWins = [
        ...(hofData ?? [])
          .filter(w => w.name.toLowerCase() === participantName.toLowerCase() && completedYears.has(w.year))
          .map(w => w.year),
        ...overrideWins,
        ...knownWins,
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

      // Build year -> results for this participant (scoped to their own tournaments)
      const myResultIds = new Set(matchingParticipants.map(p => p.id))
      const byYear = {}
      myTourResults
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

      setData({ name: participantName, years, byYear, avgPlacement, etappeseiere, solvAar, bronseAar, byderbyWins, scoringByYear, standingByYear, keywords, participantCountByYear, completedYears })
      setLoading(false)
    }

    load().catch(err => { setError(err.message); setLoading(false) })
  }, [participantName])

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to="/" className={styles.back}>← Tilbake</Link>
        <h1 className={styles.title}>
          {participantName}
          {data && <span className={styles.yearsTag}>{data.years.length} år</span>}
        </h1>
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
  const { name, years, byYear, avgPlacement, etappeseiere, solvAar, bronseAar, byderbyWins, scoringByYear, standingByYear, keywords, participantCountByYear, completedYears } = data
  const firstName = name.split(' ')[0]
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

      {byderbyWins.length > 0 && (
        <div className={styles.trophySection}>
          <div className={styles.trophyAndMedals}>
            <div>
              <h2 className={styles.trophyTitle}>
                <TrophyIcon className={styles.trophyIcon} /> Byderby-pokaler
              </h2>
              <div className={styles.trophyList}>
                {byderbyWins.map(y => (
                  <Link key={y} to={`/?year=${y}`} className={styles.trophy}>{y}</Link>
                ))}
              </div>
            </div>
            {(solvAar.length > 0 || bronseAar.length > 0) && (
              <div className={styles.medalBlock}>
                <h2 className={styles.sectionTitle}>Medaljer</h2>
                <div className={styles.medalList}>
                  {[...solvAar.map(y => ({ year: y, type: 'solv' })), ...bronseAar.map(y => ({ year: y, type: 'bronse' }))]
                    .sort((a, b) => b.year - a.year)
                    .map(m => (
                      <Link key={`${m.type}-${m.year}`} to={`/?year=${m.year}`} className={styles.medalLink}>
                        <MedalEmblem year={m.year} type={m.type} />
                      </Link>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {(solvAar.length > 0 || bronseAar.length > 0) && byderbyWins.length === 0 && (
        <div className={styles.medalSection}>
          <h2 className={styles.sectionTitle}>Medaljer</h2>
          <div className={styles.medalList}>
            {[...solvAar.map(y => ({ year: y, type: 'solv' })), ...bronseAar.map(y => ({ year: y, type: 'bronse' }))]
              .sort((a, b) => b.year - a.year)
              .map(m => (
                <Link key={`${m.type}-${m.year}`} to={`/?year=${m.year}`} className={styles.medalLink}>
                  <MedalEmblem year={m.year} type={m.type} />
                </Link>
              ))}
          </div>
        </div>
      )}

      {years.filter(y => completedYears.has(y)).length >= 2 && (
        <Sparkline years={years.filter(y => completedYears.has(y))} standingByYear={standingByYear} participantCountByYear={participantCountByYear} />
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

      {[...years, ...byderbyWins.filter(y => !years.includes(y))].sort((a, b) => b - a).map(year => {
        const isStub = !years.includes(year)
        const results = isStub ? [] : (byYear[year] ?? []).slice().sort((a, b) => a.placement - b.placement)
        const yearDoeng = results.reduce((s, r) => s + r.doeng, 0)
        const scoreLabel = (scoringByYear[year] ?? 'asc') === 'desc' ? 'Poeng' : 'Doeng'
        const rank = standingByYear[year]
        return (
          <div key={year} className={styles.yearBlock}>
            <h2 className={styles.yearTitle}>
              <Link to={`/?year=${year}`} className={styles.yearLink}>{year}</Link>
              {results.length > 0 && (
                <span className={styles.yearDoeng}>{yearDoeng} {scoreLabel.toLowerCase()} · {rank}. plass</span>
              )}
            </h2>
            {isStub ? (
              <p className={styles.noResults}>Vi har rota bort resultatene for dette året, men {firstName} vant.</p>
            ) : results.length === 0 ? (
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
