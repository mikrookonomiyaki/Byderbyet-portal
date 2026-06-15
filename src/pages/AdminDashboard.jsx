import { useState, useEffect, useCallback } from 'react'
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
  const [refreshKey, setRefreshKey] = useState(0)
  const refresh = useCallback(() => setRefreshKey(k => k + 1), [])

  const { data, loading, error } = useTournamentData(tournamentId, refreshKey, { publishedOnly: false })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
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

  async function togglePublish(event) {
    const newVal = event.is_published === false
    await supabase.from('events').update({ is_published: newVal }).eq('id', event.id)
    refresh()
  }

  async function save() {
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)
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
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
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
        <button className={styles.saveBtn} onClick={save} disabled={!dirty || saving}>
          {saving ? 'Lagrer...' : 'Lagre endringer'}
        </button>
        {saveError && <span className={styles.error}>{saveError}</span>}
        {saveSuccess && <span className={styles.saved}>Lagret!</span>}
        {!dirty && !saving && !saveSuccess && <span className={styles.savedMuted}>Ingen ulagrede endringer</span>}
      </div>

      {events.length > 0 && (
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
                    <div className={styles.draftCol}>
                      {e.is_hansa ? 'Hansa' : e.name.substring(0, 8)}
                      <span
                        className={e.is_published === false ? styles.draftBadge : styles.liveBadge}
                        onClick={() => togglePublish(e)}
                        title={e.is_published === false ? 'Klikk for å publisere' : 'Klikk for å sette som utkast'}
                      >
                        {e.is_published === false ? 'Utkast' : 'Live'}
                      </span>
                    </div>
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
      )}

      <p className={styles.hint}>
        Skriv inn plassering per deltaker per øvelse. For Hansa-øvelser er plasseringen direkte doeng-poeng.
      </p>

      <div className={styles.addSection}>
        <AddParticipantForm tournamentId={tournamentId} onAdded={refresh} />
        <AddEventForm tournamentId={tournamentId} onAdded={refresh} />
      </div>
    </div>
  )
}

function AddParticipantForm({ tournamentId, onAdded }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function submit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    const { error } = await supabase.from('participants').insert({
      tournament_id: tournamentId,
      name: name.trim(),
      sort_order: 999,
    })
    setSaving(false)
    if (error) {
      setError(error.message)
    } else {
      setName('')
      setOpen(false)
      onAdded()
    }
  }

  return (
    <div className={styles.addCard}>
      <button className={styles.addToggle} onClick={() => setOpen(o => !o)}>
        {open ? 'Avbryt' : '+ Ny deltaker'}
      </button>
      {open && (
        <form onSubmit={submit} className={styles.addForm}>
          <input
            className={styles.addInput}
            placeholder="Navn"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
          />
          <button type="submit" className={styles.addSubmit} disabled={saving}>
            {saving ? '...' : 'Legg til'}
          </button>
          {error && <p className={styles.error}>{error}</p>}
        </form>
      )}
    </div>
  )
}

function AddEventForm({ tournamentId, onAdded }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [day, setDay] = useState('Fredag')
  const [isHansa, setIsHansa] = useState(false)
  const [isPublished, setIsPublished] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function submit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    const id = `${tournamentId}-${Date.now().toString(36)}`
    const { error } = await supabase.from('events').insert({
      id,
      tournament_id: tournamentId,
      name: name.trim(),
      day,
      is_hansa: isHansa,
      is_published: isPublished,
      sort_order: 999,
    })
    setSaving(false)
    if (error) {
      setError(error.message)
    } else {
      setName('')
      setDay('Fredag')
      setIsHansa(false)
      setIsPublished(false)
      setOpen(false)
      onAdded()
    }
  }

  return (
    <div className={styles.addCard}>
      <button className={styles.addToggle} onClick={() => setOpen(o => !o)}>
        {open ? 'Avbryt' : '+ Ny øvelse'}
      </button>
      {open && (
        <form onSubmit={submit} className={styles.addForm}>
          <input
            className={styles.addInput}
            placeholder="Navn på øvelse"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
          />
          <select
            className={styles.addSelect}
            value={day}
            onChange={e => setDay(e.target.value)}
          >
            <option>Fredag</option>
            <option>Lørdag</option>
            <option>Søndag</option>
          </select>
          <label className={styles.addCheckbox}>
            <input
              type="checkbox"
              checked={isHansa}
              onChange={e => setIsHansa(e.target.checked)}
            />
            Hansa-øvelse
          </label>
          <label className={styles.addCheckbox}>
            <input
              type="checkbox"
              checked={isPublished}
              onChange={e => setIsPublished(e.target.checked)}
            />
            Publiser med én gang
          </label>
          <button type="submit" className={styles.addSubmit} disabled={saving}>
            {saving ? '...' : 'Legg til'}
          </button>
          {error && <p className={styles.error}>{error}</p>}
        </form>
      )}
    </div>
  )
}
