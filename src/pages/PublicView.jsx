import { useEffect, useRef, useState, useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import confetti from 'canvas-confetti'
import { useTournamentData } from '../hooks/useTournamentData'
import { useHallOfFame } from '../hooks/useHallOfFame'
import TrophyIcon from '../components/TrophyIcon'
import { canonicalize } from '../eventNames'
import styles from './PublicView.module.css'

// Module-level cache so event history is fetched at most once per event name per page load
const eventHistoryCache = {}

function HallOfFame() {
  const winners = useHallOfFame()
  if (winners.length === 0) return null
  return (
    <div className={styles.hallOfFame}>
      <p className={styles.hofTitle}>Æresgalleri</p>
      <ul className={styles.hofList}>
        {winners.map(w => (
          <li key={w.year} className={styles.hofItem}>
            <span className={styles.hofYear}>{w.year}</span>
            <Link to={`/participant/${encodeURIComponent(w.name)}`} state={{ confetti: true }} className={styles.hofName}>
              {w.name}
            </Link>
            <TrophyIcon className={styles.hofIcon} />
          </li>
        ))}
      </ul>
    </div>
  )
}

const FAQ_QUESTIONS = [
  'Hva er Byderbyet?',
  'Kan jeg se resultater fra tidligere år?',
  'Hvorfor har jeg fått de adjektivene jeg har fått?',
  'Hva betyr mastergrad-hatten på adjektivet?',
  'Hva betyr "Doeng"?',
  'Hvordan beregnes doeng per øvelse?',
  'Hva er en Duell?',
  'Hva er Hansa-sanksjonen?',
  'Hva er Æresgalleriet?',
  'Hvem kan delta i Byderbyet?',
  'Når oppdateres resultatene på siden?',
  'Hva skjer ved poenglikhet?',
]

function GlobalSearch({ tournaments, setSelectedId }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [participants, setParticipants] = useState(null)
  const [searchEvents, setSearchEvents] = useState(null)
  const containerRef = useRef(null)
  const loadedRef = useRef(false)

  useEffect(() => {
    function handlePointerDown(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  async function loadData() {
    if (loadedRef.current) return
    loadedRef.current = true
    const [pRes, eRes] = await Promise.all([
      supabase.from('participants').select('name').limit(10000),
      supabase.from('events').select('name').neq('is_published', false).limit(10000),
    ])
    const pNames = [...new Set((pRes.data ?? []).map(p => p.name))]
    const eNames = [...new Set((eRes.data ?? []).map(e => canonicalize(e.name)))]
    setParticipants(pNames)
    setSearchEvents(eNames)
  }

  const q = query.trim().toLowerCase()
  const hasQuery = q.length >= 2

  const matchedParticipants = hasQuery && participants
    ? [...new Set(participants.filter(n => n.toLowerCase().includes(q)))].slice(0, 5)
    : []
  const matchedEvents = hasQuery && searchEvents
    ? [...new Set(searchEvents.filter(n => n.toLowerCase().includes(q)))].slice(0, 4)
    : []
  const matchedYears = hasQuery
    ? tournaments.filter(t => String(t.year).includes(q)).slice(0, 3)
    : []
  const matchedFAQ = hasQuery
    ? FAQ_QUESTIONS.filter(f => f.toLowerCase().includes(q)).slice(0, 3)
    : []

  const hasResults = matchedParticipants.length + matchedEvents.length + matchedYears.length + matchedFAQ.length > 0
  const showDropdown = open && hasQuery

  function select() {
    setQuery('')
    setOpen(false)
  }

  return (
    <div className={styles.globalSearch} ref={containerRef}>
      <input
        type="search"
        placeholder="Søk etter deltaker, øvelse..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => { setOpen(true); loadData() }}
        className={styles.globalSearchInput}
        aria-label="Søk på siden"
      />
      {showDropdown && (
        <div className={styles.globalSearchDropdown}>
          {!hasResults && <p className={styles.dropdownEmpty}>Ingen treff</p>}
          {matchedParticipants.length > 0 && (
            <div className={styles.dropdownGroup}>
              <span className={styles.dropdownGroupLabel}>Deltakere</span>
              {matchedParticipants.map(name => (
                <button
                  key={name}
                  className={styles.dropdownItem}
                  onPointerDown={() => { navigate(`/participant/${encodeURIComponent(name)}`); select() }}
                >
                  {name}
                </button>
              ))}
            </div>
          )}
          {matchedEvents.length > 0 && (
            <div className={styles.dropdownGroup}>
              <span className={styles.dropdownGroupLabel}>Øvelser</span>
              {matchedEvents.map(name => (
                <button
                  key={name}
                  className={styles.dropdownItem}
                  onPointerDown={() => { navigate(`/event/${encodeURIComponent(name)}`); select() }}
                >
                  {name}
                </button>
              ))}
            </div>
          )}
          {matchedYears.length > 0 && (
            <div className={styles.dropdownGroup}>
              <span className={styles.dropdownGroupLabel}>År</span>
              {matchedYears.map(t => (
                <button
                  key={t.id}
                  className={styles.dropdownItem}
                  onPointerDown={() => { setSelectedId(t.id); select() }}
                >
                  {t.year}
                </button>
              ))}
            </div>
          )}
          {matchedFAQ.length > 0 && (
            <div className={styles.dropdownGroup}>
              <span className={styles.dropdownGroupLabel}>FAQ</span>
              {matchedFAQ.map(faq => (
                <button
                  key={faq}
                  className={styles.dropdownItem}
                  onPointerDown={() => { navigate('/faq'); select() }}
                >
                  {faq}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function PublicView() {
  const [tournaments, setTournaments] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const { data, loading, error } = useTournamentData(selectedId)
  const [searchParams] = useSearchParams()

  useEffect(() => {
    supabase.from('tournaments').select('*').order('year', { ascending: false }).then(({ data }) => {
      if (data) {
        setTournaments(data)
        const yearParam = searchParams.get('year')
        const matched = yearParam ? data.find(t => String(t.year) === yearParam) : null
        const active = matched ?? data.find(t => t.is_active) ?? data[0]
        if (active) setSelectedId(active.id)
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const selectedTournament = tournaments.find(t => t.id === selectedId)

  return (
    <div className={styles.page}>
      {selectedTournament?.banner_text && (
        <div className={styles.banner}>{selectedTournament.banner_text}</div>
      )}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div
            className={styles.brand}
            onClick={() => {
              const active = tournaments.find(t => t.is_active) ?? tournaments[0]
              if (active) setSelectedId(active.id)
            }}
          >
            <img src="/byderbyet_emblem.png" alt="Byderbyet-emblem" className={styles.emblem} />
            <h1 className={styles.title}>Byderbyet</h1>
          </div>
          <HallOfFame />
        </div>
        <nav className={styles.nav}>
          <div className={styles.activeTabs}>
            {tournaments.filter(t => t.is_active).map(t => (
              <button
                key={t.id}
                className={`${styles.tab} ${styles.tabActive} ${selectedId === t.id ? styles.selected : ''}`}
                onClick={() => setSelectedId(t.id)}
              >
                {t.year}
              </button>
            ))}
          </div>
          {tournaments.some(t => !t.is_active) && (
            <div className={styles.historiskGroup}>
              <span className={styles.historiskLabel}>Historiske resultater</span>
              <div className={styles.historiskTabs}>
                {tournaments.filter(t => !t.is_active).map(t => (
                  <button
                    key={t.id}
                    className={`${styles.tab} ${styles.tabHistoric} ${selectedId === t.id ? styles.selected : ''}`}
                    onClick={() => setSelectedId(t.id)}
                  >
                    {t.year}
                  </button>
                ))}
                <span className={styles.tabSeparator} aria-hidden="true" />
                <Link to="/events" className={`${styles.tab} ${styles.tabNav}`}>Øvelsesoversikt</Link>
                <GlobalSearch tournaments={tournaments} setSelectedId={setSelectedId} />
              </div>
            </div>
          )}
        </nav>
      </header>

      <main className={styles.main}>
        {loading && <p className={styles.status}>Laster...</p>}
        {error && <p className={styles.error}>Feil: {error}</p>}
        {data && data.events.length === 0 && <EmptyTournament year={tournaments.find(t => t.id === selectedId)?.year} />}
        {data && data.events.length > 0 && <TournamentView key={selectedId} data={data} isActiveTournament={selectedTournament?.is_active ?? false} isTournamentClosed={selectedTournament?.is_completed === true} />}
      </main>

      <footer className={styles.footer}>
        <Link to="/faq" className={styles.faqLink}>Ofte stilte spørsmål om Byderbyet</Link>
        <a href="/admin">Admin</a>
      </footer>
    </div>
  )
}

function EmptyTournament({ year }) {
  return (
    <div className={styles.empty}>
      <p className={styles.emptyYear}>{year}</p>
      <p className={styles.emptyMsg}>Øvelser og resultater er ikke klare ennå.</p>
      <table className={styles.table} style={{ maxWidth: 320, marginTop: '1.5rem' }}>
        <thead>
          <tr>
            <th>#</th>
            <th>Deltaker</th>
            <th>Poeng</th>
          </tr>
        </thead>
        <tbody>
          {[1, 2, 3].map(i => (
            <tr key={i}>
              <td>{i}</td>
              <td className={styles.emptyCell}>?</td>
              <td className={styles.emptyCell}>?</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const DAY_ORDER_PV = { Fredag: 0, Lørdag: 1, Søndag: 2 }
const TOURNAMENT_START_MS = new Date('2026-07-03T18:00:00').getTime()

// --- Countdown ---

function Countdown() {
  const [ms, setMs] = useState(() => Math.max(0, TOURNAMENT_START_MS - Date.now()))

  useEffect(() => {
    const t = setInterval(() => {
      const left = Math.max(0, TOURNAMENT_START_MS - Date.now())
      setMs(left)
      if (left === 0) clearInterval(t)
    }, 1000)
    return () => clearInterval(t)
  }, [])

  if (ms <= 0) return null

  const days = Math.floor(ms / 86400000)
  const hours = Math.floor((ms % 86400000) / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  const pad = n => String(n).padStart(2, '0')

  return (
    <div className={styles.countdown}>
      <span className={styles.countdownLabel}>Turneringen starter om</span>
      <div className={styles.countdownUnits}>
        {[{ v: days, l: 'dager' }, { v: hours, l: 'timer' }, { v: minutes, l: 'min' }, { v: seconds, l: 'sek' }].map(({ v, l }) => (
          <div key={l} className={styles.countdownUnit}>
            <span className={styles.countdownValue}>{pad(v)}</span>
            <span className={styles.countdownUnitLabel}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// --- Event history hook (lazy, cached) ---

function useEventHistory(eventName) {
  const [state, setState] = useState({ data: null, loading: false })

  useEffect(() => {
    if (!eventName) { setState({ data: null, loading: false }); return }
    if (eventHistoryCache[eventName] !== undefined) {
      setState({ data: eventHistoryCache[eventName], loading: false })
      return
    }
    setState({ data: null, loading: true })

    async function load() {
      const evRes = await supabase
        .from('events')
        .select('id, tournament_id, name')
        .neq('is_published', false)
        .limit(10000)

      const matching = (evRes.data ?? []).filter(e => canonicalize(e.name) === eventName)
      if (matching.length === 0) {
        eventHistoryCache[eventName] = []
        setState({ data: [], loading: false })
        return
      }

      const eventIds = matching.map(e => e.id)
      const tournamentIds = [...new Set(matching.map(e => e.tournament_id))]

      const [resRes, tourRes] = await Promise.all([
        supabase.from('results').select('event_id, participant_id, placement').in('event_id', eventIds).eq('placement', 1),
        supabase.from('tournaments').select('id, year').in('id', tournamentIds),
      ])

      const winners = resRes.data ?? []
      if (winners.length === 0) {
        eventHistoryCache[eventName] = []
        setState({ data: [], loading: false })
        return
      }

      const participantIds = [...new Set(winners.map(r => r.participant_id))]
      const partRes = await supabase.from('participants').select('id, name').in('id', participantIds)

      const partById = {}
      ;(partRes.data ?? []).forEach(p => { partById[p.id] = p.name })
      const tourById = {}
      ;(tourRes.data ?? []).forEach(t => { tourById[t.id] = t.year })
      const evTourMap = {}
      matching.forEach(e => { evTourMap[e.id] = e.tournament_id })

      const result = winners
        .map(r => ({ year: tourById[evTourMap[r.event_id]], name: partById[r.participant_id] ?? '?' }))
        .filter(r => r.year != null)
        .sort((a, b) => b.year - a.year)

      eventHistoryCache[eventName] = result
      setState({ data: result, loading: false })
    }

    load().catch(() => setState({ data: null, loading: false }))
  }, [eventName])

  return state
}

// --- Event history panel (shown below matrix when a column is sorted) ---

function EventHistoryPanel({ eventName, onClose }) {
  const { data, loading } = useEventHistory(eventName)
  return (
    <div className={styles.historyPanel}>
      <div className={styles.historyPanelHeader}>
        <span className={styles.historyPanelTitle}>Tidligere vinnere: {eventName}</span>
        <button className={styles.historyPanelClose} onClick={onClose}>Lukk</button>
      </div>
      {loading && <p className={styles.historyPanelMsg}>Laster...</p>}
      {!loading && data && data.length === 0 && <p className={styles.historyPanelMsg}>Ingen historiske data</p>}
      {data && data.length > 0 && (
        <ul className={styles.historyPanelList}>
          {data.map(({ year, name }) => (
            <li key={year} className={styles.historyPanelItem}>
              <span className={styles.historyPanelYear}>{year}</span>
              <Link to={`/participant/${encodeURIComponent(name)}`} className={styles.historyPanelName}>{name}</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// --- Compare panel ---

function ComparePanel({ players, events, scoringDirection, onClose }) {
  const [p1, p2] = players
  const better = (a, b) => a != null && b != null && (scoringDirection === 'desc' ? a > b : a < b)

  return (
    <div className={styles.comparePanel}>
      <div className={styles.comparePanelHeader}>
        <span className={styles.comparePanelTitle}>Sammenligning</span>
        <button className={styles.comparePanelClose} onClick={onClose} title="Lukk">&#x2715;</button>
      </div>
      <div className={styles.tableWrap} style={{ borderRadius: 0, boxShadow: 'none' }}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Øvelse</th>
              <th className={styles.comparePlayerHead}>{p1.name}</th>
              <th className={styles.comparePlayerHead}>{p2.name}</th>
            </tr>
          </thead>
          <tbody>
            {events.map(e => {
              const r1 = p1.eventResults[e.id]?.doeng
              const r2 = p2.eventResults[e.id]?.doeng
              return (
                <tr key={e.id}>
                  <td>{e.displayName ?? e.name}</td>
                  <td className={better(r1, r2) ? styles.compareWin : ''}>{r1 != null ? r1 : '–'}</td>
                  <td className={better(r2, r1) ? styles.compareWin : ''}>{r2 != null ? r2 : '–'}</td>
                </tr>
              )
            })}
            <tr className={styles.compareTotal}>
              <td>Totalt</td>
              <td className={better(p1.total, p2.total) ? styles.compareWin : ''}>{p1.total}</td>
              <td className={better(p2.total, p1.total) ? styles.compareWin : ''}>{p2.total}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

// --- Main tournament view ---

function TournamentView({ data, isActiveTournament, isTournamentClosed }) {
  const { events, duelEvents, standings, scoringDirection, isCompleted } = data
  const scoreLabel = scoringDirection === 'desc' ? 'Poeng' : 'Doeng'

  const confettiFiredRef = useRef(false)
  useEffect(() => {
    if (isActiveTournament && isTournamentClosed && standings.length > 0 && standings[0].total !== 0 && !confettiFiredRef.current) {
      confettiFiredRef.current = true
      confetti({ particleCount: 160, spread: 90, origin: { y: 0.55 }, ticks: 400 })
      setTimeout(() => {
        confetti({ particleCount: 90, angle: 60, spread: 60, origin: { x: 0.1, y: 0.6 }, ticks: 380 })
        confetti({ particleCount: 90, angle: 120, spread: 60, origin: { x: 0.9, y: 0.6 }, ticks: 380 })
      }, 700)
      setTimeout(() => confetti({ particleCount: 70, spread: 75, origin: { y: 0.45 }, ticks: 350 }), 1600)
    }
  }, [isActiveTournament, isTournamentClosed, standings])

  const [sortColumn, setSortColumn] = useState(null)
  const [highlightedId, setHighlightedId] = useState(null)
  const [compareIds, setCompareIds] = useState([])

  const allEvents = useMemo(() => [
    ...events,
    ...(duelEvents ?? []).map(e => ({ ...e, displayName: `${e.name} (Duell)` })),
  ].sort((a, b) => {
    const da = DAY_ORDER_PV[a.day] ?? 99
    const db = DAY_ORDER_PV[b.day] ?? 99
    if (da !== db) return da - db
    return (a.sort_order ?? 0) - (b.sort_order ?? 0)
  }), [events, duelEvents])

  const sortedStandings = useMemo(() => {
    if (!sortColumn) {
      if (standings.length > 0 && standings.every(p => p.total === 0)) {
        return [...standings].sort((a, b) => a.name.localeCompare(b.name, 'no'))
      }
      return standings
    }
    return [...standings].sort((a, b) => {
      const ra = a.eventResults[sortColumn]?.doeng
      const rb = b.eventResults[sortColumn]?.doeng
      if (ra == null && rb == null) return 0
      if (ra == null) return 1
      if (rb == null) return -1
      return scoringDirection === 'desc' ? rb - ra : ra - rb
    })
  }, [standings, sortColumn, scoringDirection])

  const handleHighlight = id => setHighlightedId(prev => prev === id ? null : id)
  const handleCompare = id => setCompareIds(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 2 ? [...prev, id] : prev
  )
  const handleSort = eventId => setSortColumn(prev => prev === eventId ? null : eventId)

  const comparePlayers = compareIds.map(id => sortedStandings.find(p => p.id === id)).filter(Boolean)
  const sortedEvent = sortColumn ? allEvents.find(e => e.id === sortColumn) : null

  return (
    <div>
      {!isCompleted && <Countdown />}
      <RankingTable
        standings={sortedStandings}
        scoreLabel={scoreLabel}
        isCompleted={isCompleted}
        highlightedId={highlightedId}
        compareIds={compareIds}
        onHighlight={handleHighlight}
        onCompare={handleCompare}
      />
      {allEvents.length > 0 && (
        <div className={styles.detailSection}>
          <p className={styles.detailLabel}>Øvelsesresultater</p>
          <DetailTable
            standings={sortedStandings}
            events={allEvents}
            scoreLabel={scoreLabel}
            sortColumn={sortColumn}
            onSort={handleSort}
            highlightedId={highlightedId}
            onHighlight={handleHighlight}
          />
        </div>
      )}
      {sortedEvent && (
        <EventHistoryPanel eventName={sortedEvent.name} onClose={() => setSortColumn(null)} />
      )}
      {comparePlayers.length === 2 && (
        <div
          className={styles.modalBackdrop}
          onClick={e => { if (e.target === e.currentTarget) setCompareIds([]) }}
        >
          <div className={styles.modalBox}>
            <ComparePanel
              players={comparePlayers}
              events={allEvents}
              scoringDirection={scoringDirection}
              onClose={() => setCompareIds([])}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// --- Ranking table ---

function RankingTable({ standings, scoreLabel, isCompleted, highlightedId, compareIds, onHighlight, onCompare }) {
  const prevRanksRef = useRef({})
  const rowRefsRef = useRef({})

  useEffect(() => {
    const prev = prevRanksRef.current
    const timers = []
    standings.forEach((p, i) => {
      const prevRank = prev[p.id]
      const el = rowRefsRef.current[p.id]
      if (el && prevRank !== undefined && prevRank !== i) {
        el.classList.remove(styles.rankFlashUp, styles.rankFlashDown)
        void el.offsetWidth
        el.classList.add(prevRank > i ? styles.rankFlashUp : styles.rankFlashDown)
        timers.push(setTimeout(() => el.classList.remove(styles.rankFlashUp, styles.rankFlashDown), 1200))
      }
    })
    prevRanksRef.current = Object.fromEntries(standings.map((p, i) => [p.id, i]))
    return () => timers.forEach(t => clearTimeout(t))
  }, [standings])

  return (
    <div className={styles.rankingTableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>#</th>
            <th>Deltaker</th>
            <th>{scoreLabel}</th>
            <th className={styles.compareCol}>Sammenlikn</th>
          </tr>
        </thead>
        <tbody>
          {standings.length > 0 ? standings.map((p, i) => {
            const isHighlighted = highlightedId === p.id
            const isCompared = compareIds.includes(p.id)
            const isWinner = i === 0 && isCompleted
            const canAdd = compareIds.length < 2 || isCompared
            const allZero = standings.every(s => s.total === 0)
            return (
              <tr
                key={p.id}
                ref={el => { if (el) rowRefsRef.current[p.id] = el; else delete rowRefsRef.current[p.id] }}
                className={[
                  !allZero && (i === 0 ? styles.gold : i === 1 ? styles.silver : i === 2 ? styles.bronze : ''),
                  isHighlighted ? styles.highlighted : '',
                ].filter(Boolean).join(' ')}
                onClick={e => {
                  if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON') return
                  onHighlight(p.id)
                }}
                style={{ cursor: 'pointer' }}
              >
                <td>{i + 1}</td>
                <td>
                  <Link
                    to={`/participant/${encodeURIComponent(p.name)}`}
                    state={isWinner ? { confetti: true } : undefined}
                    className={styles.nameLink}
                  >
                    {p.name}
                  </Link>
                  {isWinner && <TrophyIcon outline className={styles.trophyIcon} />}
                </td>
                <td>{p.total}</td>
                <td className={styles.compareCol}>
                  {canAdd && (
                    <button
                      className={isCompared ? styles.compareBtnSelected : styles.compareBtnAdd}
                      onClick={() => onCompare(p.id)}
                    >
                      {isCompared ? 'Fjern' : 'Velg'}
                    </button>
                  )}
                </td>
              </tr>
            )
          }) : [1, 2, 3].map(i => (
            <tr key={i}>
              <td>{i}</td>
              <td className={styles.emptyCell}>?</td>
              <td className={styles.emptyCell}>?</td>
              <td className={styles.compareCol}></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// --- Detail matrix table ---

function DetailTable({ standings, events, scoreLabel, sortColumn, onSort, highlightedId, onHighlight }) {
  const days = [...new Set(events.map(e => e.day))].filter(Boolean)
    .sort((a, b) => (DAY_ORDER_PV[a] ?? 99) - (DAY_ORDER_PV[b] ?? 99))
  const noDayCount = events.filter(e => !e.day).length

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.sticky}>Deltaker</th>
            {days.map(day => (
              <th key={day} colSpan={events.filter(e => e.day === day).length} className={styles.dayHeader}>
                {day}
              </th>
            ))}
            {noDayCount > 0 && (
              <th colSpan={noDayCount} className={styles.dayHeader}>Dag ikke satt</th>
            )}
            <th
              className={!sortColumn ? styles.sortTotalActive : styles.sortTotalReset}
              onClick={() => onSort(sortColumn)}
              style={sortColumn ? { cursor: 'pointer' } : {}}
              title={sortColumn ? 'Tilbakestill sortering' : undefined}
            >
              {scoreLabel} totalt
            </th>
          </tr>
          <tr>
            <th className={styles.sticky}></th>
            {events.map(e => (
              <th
                key={e.id}
                className={`${styles.eventHeader} ${sortColumn === e.id ? styles.sortActive : ''}`}
                onClick={() => onSort(e.id)}
                style={{ cursor: 'pointer' }}
                title="Klikk for å sortere etter denne øvelsen"
              >
                <div className={styles.eventHeaderInner}>
                  <Link
                    to={`/event/${encodeURIComponent(e.name)}`}
                    className={styles.eventLink}
                    onClick={ev => ev.stopPropagation()}
                  >
                    {e.displayName ?? e.name}
                  </Link>
                </div>
              </th>
            ))}
            <th></th>
          </tr>
        </thead>
        <tbody>
          {standings.length > 0 ? standings.map(p => {
            const isHighlighted = highlightedId === p.id
            return (
              <tr
                key={p.id}
                className={isHighlighted ? styles.highlighted : ''}
                onClick={e => {
                  if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON') return
                  onHighlight(p.id)
                }}
                style={{ cursor: 'pointer' }}
              >
                <td className={`${styles.sticky} ${isHighlighted ? styles.stickyHighlighted : ''}`}>
                  <Link to={`/participant/${encodeURIComponent(p.name)}`} className={styles.nameLink}>
                    {p.name}
                  </Link>
                </td>
                {events.map(e => (
                  <td key={e.id} className={`${styles.cell} ${sortColumn === e.id ? styles.sortColumnCell : ''}`}>
                    {p.eventResults[e.id] != null ? p.eventResults[e.id].doeng : ''}
                  </td>
                ))}
                <td className={styles.total}>{p.total}</td>
              </tr>
            )
          }) : [1, 2, 3].map(i => (
            <tr key={i}>
              <td className={`${styles.sticky} ${styles.emptyCell}`}>?</td>
              {events.map(e => <td key={e.id} className={styles.cell}></td>)}
              <td className={styles.total}></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
