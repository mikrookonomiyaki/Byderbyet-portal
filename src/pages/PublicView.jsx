import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useTournamentData } from '../hooks/useTournamentData'
import { useHallOfFame } from '../hooks/useHallOfFame'
import TrophyIcon from '../components/TrophyIcon'
import styles from './PublicView.module.css'

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
            <Link to={`/participant/${encodeURIComponent(w.name)}`} className={styles.hofName}>
              {w.name}
            </Link>
            <TrophyIcon className={styles.hofIcon} />
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function PublicView() {
  const [tournaments, setTournaments] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const { data, loading, error } = useTournamentData(selectedId)

  useEffect(() => {
    supabase.from('tournaments').select('*').order('year', { ascending: false }).then(({ data }) => {
      if (data) {
        setTournaments(data)
        const active = data.find(t => t.is_active) ?? data[0]
        if (active) setSelectedId(active.id)
      }
    })
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.banner}>
        Årets Byderby går snart av den såkalte stabelen! Møt opp 03.07–05.07 med spissede skotupper!
      </div>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div
            className={styles.brand}
            onClick={() => {
              const active = tournaments.find(t => t.is_active) ?? tournaments[0]
              if (active) setSelectedId(active.id)
            }}
          >
            <img src="/byderbyet_emblem.png" alt="Byderbyet emblem" className={styles.emblem} />
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
                <Link to="/events" className={`${styles.tab} ${styles.tabNav}`}>Øvelser</Link>
              </div>
            </div>
          )}
        </nav>
      </header>

      <main className={styles.main}>
        {loading && <p className={styles.status}>Laster...</p>}
        {error && <p className={styles.error}>Feil: {error}</p>}
        {data && data.events.length === 0 && <EmptyTournament year={tournaments.find(t => t.id === selectedId)?.year} />}
        {data && data.events.length > 0 && <TournamentView data={data} />}
      </main>

      <footer className={styles.footer}>
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
          {['?', '?', '?'].map((_, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td className={styles.emptyCell}>?</td>
              <td className={styles.emptyCell}>?</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TournamentView({ data }) {
  const { events, standings, scoringDirection, isCompleted } = data
  const scoreLabel = scoringDirection === 'desc' ? 'Poeng' : 'Doeng'

  return (
    <div>
      <RankingTable standings={standings} scoreLabel={scoreLabel} isCompleted={isCompleted} />
      {events.length > 0 && (
        <div className={styles.detailSection}>
          <p className={styles.detailLabel}>Øvelsesresultater</p>
          <DetailTable standings={standings} events={events} scoreLabel={scoreLabel} />
        </div>
      )}
    </div>
  )
}

function RankingTable({ standings, scoreLabel, isCompleted }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>#</th>
            <th>Deltaker</th>
            <th>{scoreLabel}</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((p, i) => (
            <tr key={p.id} className={i === 0 ? styles.gold : i === 1 ? styles.silver : i === 2 ? styles.bronze : ''}>
              <td>{i + 1}</td>
              <td>
                <Link to={`/participant/${encodeURIComponent(p.name)}`} className={styles.nameLink}>
                  {p.name}
                </Link>
                {i === 0 && isCompleted && <TrophyIcon outline className={styles.trophyIcon} />}
              </td>
              <td>{p.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DetailTable({ standings, events, scoreLabel }) {
  const days = [...new Set(events.map(e => e.day))].filter(Boolean)

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
            <th>{scoreLabel} totalt</th>
          </tr>
          <tr>
            <th className={styles.sticky}></th>
            {events.map(e => (
              <th key={e.id} className={styles.eventHeader}>
                <Link
                  to={`/event/${encodeURIComponent(e.name)}`}
                  className={styles.eventLink}
                  title={e.name}
                >
                  {e.is_hansa ? 'Hansa' : e.name.substring(0, 8)}
                </Link>
              </th>
            ))}
            <th></th>
          </tr>
        </thead>
        <tbody>
          {standings.map(p => (
            <tr key={p.id}>
              <td className={styles.sticky}>
                <Link to={`/participant/${encodeURIComponent(p.name)}`} className={styles.nameLink}>
                  {p.name}
                </Link>
              </td>
              {events.map(e => {
                const r = p.eventResults[e.id]
                return (
                  <td key={e.id} className={styles.cell}>
                    {r != null ? r.doeng : ''}
                  </td>
                )
              })}
              <td className={styles.total}>{p.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
