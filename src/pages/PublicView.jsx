import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useTournamentData } from '../hooks/useTournamentData'
import styles from './PublicView.module.css'

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
      <header className={styles.header}>
        <h1 className={styles.title}>Byderbyet</h1>
        <nav className={styles.tabs}>
          {tournaments.map(t => (
            <button
              key={t.id}
              className={`${styles.tab} ${selectedId === t.id ? styles.active : ''}`}
              onClick={() => setSelectedId(t.id)}
            >
              {t.year}
            </button>
          ))}
        </nav>
      </header>

      <main className={styles.main}>
        {loading && <p className={styles.status}>Laster...</p>}
        {error && <p className={styles.error}>Feil: {error}</p>}
        {data && <TournamentView data={data} />}
      </main>

      <footer className={styles.footer}>
        <a href="/admin">Admin</a>
      </footer>
    </div>
  )
}

function TournamentView({ data }) {
  const { events, standings } = data
  const [view, setView] = useState('ranking')

  return (
    <div>
      <div className={styles.viewToggle}>
        <button
          className={`${styles.toggleBtn} ${view === 'ranking' ? styles.active : ''}`}
          onClick={() => setView('ranking')}
        >
          Totalrangering
        </button>
        <button
          className={`${styles.toggleBtn} ${view === 'detail' ? styles.active : ''}`}
          onClick={() => setView('detail')}
        >
          Øvelser
        </button>
      </div>

      {view === 'ranking' && <RankingTable standings={standings} />}
      {view === 'detail' && <DetailTable standings={standings} events={events} />}
    </div>
  )
}

function RankingTable({ standings }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>#</th>
            <th>Deltaker</th>
            <th>Doeng</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((p, i) => (
            <tr key={p.id} className={i === 0 ? styles.winner : ''}>
              <td>{i + 1}</td>
              <td>{p.name}</td>
              <td>{p.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DetailTable({ standings, events }) {
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
            <th>Total</th>
          </tr>
          <tr>
            <th className={styles.sticky}></th>
            {events.map(e => (
              <th key={e.id} className={styles.eventHeader} title={e.name}>
                {e.is_hansa ? 'Hansa' : e.name.substring(0, 8)}
              </th>
            ))}
            <th></th>
          </tr>
        </thead>
        <tbody>
          {standings.map(p => (
            <tr key={p.id}>
              <td className={styles.sticky}>{p.name}</td>
              {events.map(e => {
                const r = p.eventResults[e.id]
                return (
                  <td key={e.id} className={styles.cell}>
                    {r ? `${r.placement} (${r.doeng})` : ''}
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
