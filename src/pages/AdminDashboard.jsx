import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useTournamentData } from '../hooks/useTournamentData'
import styles from './AdminDashboard.module.css'

export default function AdminDashboard() {
  const [tournaments, setTournaments] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [session, setSession] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate('/admin', { replace: true })
      } else {
        setSession(data.session)
      }
    })
  }, [navigate])

  useEffect(() => {
    supabase.from('tournaments').select('*').order('year', { ascending: false }).then(({ data }) => {
      if (data) {
        setTournaments(data)
        const active = data.find(t => t.is_active) ?? data[0]
        if (active) setSelectedId(active.id)
      }
    })
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    navigate('/admin', { replace: true })
  }

  if (!session) return null

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Byderbyet admin</h1>
        <div className={styles.headerRight}>
          <span className={styles.email}>{session.user.email}</span>
          <button className={styles.signOut} onClick={signOut}>Logg ut</button>
        </div>
      </header>

      <div className={styles.tabs}>
        {tournaments.map(t => (
          <button
            key={t.id}
            className={`${styles.tab} ${selectedId === t.id ? styles.active : ''}`}
            onClick={() => setSelectedId(t.id)}
          >
            {t.year}
          </button>
        ))}
      </div>

      <main className={styles.main}>
        {selectedId && <TournamentEditor tournamentId={selectedId} />}
      </main>
    </div>
  )
}

function TournamentEditor({ tournamentId }) {
  const { data, loading, error } = useTournamentData(tournamentId)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [localResults, setLocalResults] = useState({})
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (!data) return
    const map = {}
    data.standings.forEach(p => {
      map[p.id] = {}
      Object.entries(p.eventResults).forEach(([eid, r]) => {
        map[p.id][eid] = String(r.placement)
      })
    })
    setLocalResults(map)
    setDirty(false)
  }, [data])

  function handleChange(participantId, eventId, value) {
    setLocalResults(prev => ({
      ...prev,
      [participantId]: { ...prev[participantId], [eventId]: value },
    }))
    setDirty(true)
  }

  async function save() {
    setSaving(true)
    setSaveError(null)
    const upserts = []
    for (const [participantId, events] of Object.entries(localResults)) {
      for (const [eventId, val] of Object.entries(events)) {
        const placement = parseInt(val, 10)
        if (!isNaN(placement) && placement > 0) {
          upserts.push({ event_id: eventId, participant_id: participantId, placement })
        }
      }
    }
    const { error } = await supabase.from('results').upsert(upserts, { onConflict: 'event_id,participant_id' })
    setSaving(false)
    if (error) {
      setSaveError(error.message)
    } else {
      setDirty(false)
    }
  }

  if (loading) return <p className={styles.status}>Laster...</p>
  if (error) return <p className={styles.error}>Feil: {error}</p>
  if (!data) return null

  const { events, standings } = data
  const days = [...new Set(events.map(e => e.day))].filter(Boolean)

  return (
    <div>
      <div className={styles.toolbar}>
        <button
          className={styles.saveBtn}
          onClick={save}
          disabled={!dirty || saving}
        >
          {saving ? 'Lagrer...' : 'Lagre endringer'}
        </button>
        {saveError && <span className={styles.error}>{saveError}</span>}
        {!dirty && !saving && <span className={styles.saved}>Lagret</span>}
      </div>

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
            </tr>
            <tr>
              <th className={styles.sticky}></th>
              {events.map(e => (
                <th key={e.id} className={styles.eventHeader} title={e.name}>
                  {e.is_hansa ? 'Hansa' : e.name.substring(0, 8)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {standings.map(p => (
              <tr key={p.id}>
                <td className={styles.sticky}>{p.name}</td>
                {events.map(e => (
                  <td key={e.id} className={styles.cell}>
                    <input
                      type="number"
                      min="1"
                      className={styles.cellInput}
                      value={localResults[p.id]?.[e.id] ?? ''}
                      onChange={ev => handleChange(p.id, e.id, ev.target.value)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className={styles.hint}>
        Skriv inn plassering per deltaker per øvelse. For Hansa-øvelser er plasseringen direkte doeng-poeng.
      </p>
    </div>
  )
}
