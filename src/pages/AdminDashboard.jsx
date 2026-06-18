import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useTournamentData } from '../hooks/useTournamentData'
import { AddParticipantForm, AddEventForm } from '../components/AdminForms'
import styles from './AdminDashboard.module.css'

export default function AdminDashboard() {
  const [tournaments, setTournaments] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [session, setSession] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session || sessionStorage.getItem('pinVerified') !== '1') {
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
    sessionStorage.removeItem('pinVerified')
    await supabase.auth.signOut()
    navigate('/admin', { replace: true })
  }

  if (!session) return null

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Byderbyet admin</h1>
        <div className={styles.headerRight}>
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
  const [completing, setCompleting] = useState(false)

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
  }, [data])

  function handleChange(participantId, eventId, value) {
    setLocalResults(prev => ({
      ...prev,
      [participantId]: { ...prev[participantId], [eventId]: value },
    }))
  }

  async function handleBlur(participantId, eventId, value) {
    const placement = parseInt(value, 10)
    if (!isNaN(placement) && placement > 0) {
      setSaving(true)
      setSaveError(null)
      const { error } = await supabase.from('results').upsert(
        [{ event_id: eventId, participant_id: participantId, placement }],
        { onConflict: 'event_id,participant_id' }
      )
      setSaving(false)
      if (error) {
        setSaveError(error.message)
      } else {
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 2000)
      }
    } else if (value === '') {
      await supabase.from('results').delete()
        .eq('event_id', eventId).eq('participant_id', participantId)
    }
  }

  async function saveAllPending() {
    const upserts = []
    for (const [participantId, eventMap] of Object.entries(localResults)) {
      for (const [eventId, value] of Object.entries(eventMap)) {
        const placement = parseInt(value, 10)
        if (!isNaN(placement) && placement > 0) {
          const saved = data.standings.find(p => p.id === participantId)?.eventResults[eventId]?.placement
          if (saved !== placement) {
            upserts.push({ event_id: eventId, participant_id: participantId, placement })
          }
        }
      }
    }
    if (upserts.length > 0) {
      await supabase.from('results').upsert(upserts, { onConflict: 'event_id,participant_id' })
    }
  }

  async function togglePublish(event) {
    await saveAllPending()
    const newVal = event.is_published === false
    await supabase.from('events').update({ is_published: newVal }).eq('id', event.id)
    refresh()
  }

  async function updateEventDay(eventId, day) {
    await supabase.from('events').update({ day: day || null }).eq('id', eventId)
    refresh()
  }

  async function deleteParticipant(participant) {
    if (!window.confirm(`Slett ${participant.name}? Dette sletter også alle resultater for denne deltakeren.`)) return
    await supabase.from('participants').delete().eq('id', participant.id)
    refresh()
  }

  async function deleteEvent(event) {
    if (!window.confirm(`Slett øvelsen "${event.name}"? Dette sletter også alle resultater for denne øvelsen.`)) return
    await supabase.from('events').delete().eq('id', event.id)
    refresh()
  }


  async function completeTournament() {
    if (!window.confirm('Avslutt turneringen? Dette gjør pokaler og medaljer synlige for alle.')) return
    setCompleting(true)
    await supabase.from('tournaments').update({ is_completed: true }).eq('id', tournamentId)
    setCompleting(false)
    refresh()
  }

  async function reopenTournament() {
    if (!window.confirm('Gjenåpne turneringen? Dette skjuler pokaler og medaljer igjen.')) return
    await supabase.from('tournaments').update({ is_completed: false }).eq('id', tournamentId)
    refresh()
  }

  if (loading) return <p className={styles.status}>Laster...</p>
  if (error) return <p className={styles.error}>Feil: {error}</p>
  if (!data) return null

  const { events, duelEvents, standings, isCompleted } = data
  const days = [...new Set(events.map(e => e.day))].filter(Boolean).sort((a, b) => {
    const order = { Fredag: 0, Lørdag: 1, Søndag: 2 }
    return (order[a] ?? 99) - (order[b] ?? 99)
  })
  // Also show events with no day assigned
  const hasNullDay = events.some(e => !e.day)

  return (
    <div>
      <div className={styles.addSection}>
        <AddParticipantForm tournamentId={tournamentId} onAdded={refresh} />
        <AddEventForm tournamentId={tournamentId} onAdded={refresh} />
      </div>

      {/* Tournament completion */}
      <div className={styles.completionBar}>
        {isCompleted ? (
          <div className={styles.completedState}>
            <span className={styles.completedBadge}>Turnering avsluttet</span>
            <button className={styles.reopenBtn} onClick={reopenTournament}>Gjenåpne</button>
          </div>
        ) : (
          <button className={styles.completeBtn} onClick={completeTournament} disabled={completing}>
            {completing ? 'Avslutter...' : 'Avslutt turnering'}
          </button>
        )}
        <span className={styles.completionHint}>
          {isCompleted ? 'Pokaler og medaljer er synlige.' : 'Pokaler og medaljer skjules til turneringen avsluttes.'}
        </span>
      </div>

      {/* Regular events score grid */}
      <div className={styles.toolbar}>
        {saving && <span className={styles.savedMuted}>Lagrer...</span>}
        {saveSuccess && <span className={styles.saved}>Lagret</span>}
        {saveError && <span className={styles.error}>{saveError}</span>}
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
                {hasNullDay && (
                  <th colSpan={events.filter(e => !e.day).length} className={styles.dayHeader}>
                    Uvisst
                  </th>
                )}
              </tr>
              <tr>
                <th className={styles.sticky}></th>
                {events.map(e => (
                  <th key={e.id} className={styles.eventHeader} title={e.name}>
                    <div className={styles.draftCol}>
                      {e.name.substring(0, 8)}
                      <span
                        className={e.is_published === false ? styles.draftBadge : styles.liveBadge}
                        onClick={() => togglePublish(e)}
                        title={e.is_published === false ? 'Klikk for å publisere' : 'Klikk for å sette som utkast'}
                      >
                        {e.is_published === false ? 'Utkast' : 'Publisert'}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {standings.map(p => (
                <tr key={p.id}>
                  <td className={styles.sticky}>
                    <div className={styles.participantCell}>
                      {p.name}
                      <button className={styles.deleteBtn} onClick={() => deleteParticipant(p)} title="Slett deltaker">x</button>
                    </div>
                  </td>
                  {events.map(e => (
                    <td key={e.id} className={styles.cell}>
                      <input
                        type="number"
                        min="1"
                        className={styles.cellInput}
                        value={localResults[p.id]?.[e.id] ?? ''}
                        onChange={ev => handleChange(p.id, e.id, ev.target.value)}
                        onBlur={ev => handleBlur(p.id, e.id, ev.target.value)}
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
        Skriv inn plassering per deltaker per øvelse. Doeng beregnes automatisk.
      </p>

      {/* Event day management */}
      <EventDayManager
        events={[
          ...events,
          ...(duelEvents ?? []).map(e => ({ ...e, name: `${e.name} (Duell)` })),
        ]}
        onDayChange={updateEventDay}
        onDelete={deleteEvent}
      />

      {/* Duel management */}
      {duelEvents.length > 0 && (
        <DuelEditor
          duelEvents={duelEvents}
          standings={standings}
          onRefresh={refresh}
        />
      )}

    </div>
  )
}

function EventDayManager({ events, onDayChange, onDelete }) {
  const dayOptions = ['Fredag', 'Lørdag', 'Søndag']
  return (
    <div className={styles.dayManager}>
      <h3 className={styles.sectionHeading}>Administrer øvelser</h3>
      <div className={styles.dayManagerList}>
        {events.map(e => (
          <div key={e.id} className={styles.dayManagerRow}>
            <span className={styles.dayManagerName}>{e.name}</span>
            <select
              className={styles.daySelect}
              value={e.day ?? ''}
              onChange={ev => onDayChange(e.id, ev.target.value)}
            >
              <option value="">Uvisst</option>
              {dayOptions.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <button className={styles.deleteBtn} onClick={() => onDelete(e)} title="Slett øvelse">x</button>
          </div>
        ))}
      </div>
    </div>
  )
}

function DuelEditor({ duelEvents, standings, onRefresh }) {
  return (
    <div className={styles.duelSection}>
      <h3 className={styles.sectionHeading}>Dueller</h3>
      <p className={styles.hint}>Vinner får -5 doeng, taper får +5 doeng.</p>
      <div className={styles.duelList}>
        {duelEvents.map(duel => (
          <DuelCard
            key={duel.id}
            duel={duel}
            standings={standings}
            onRefresh={onRefresh}
          />
        ))}
      </div>
    </div>
  )
}

const DUEL_DAYS = ['Fredag', 'Lørdag', 'Søndag']

function DuelCard({ duel, standings, onRefresh }) {
  // Find existing participants in this duel from standings
  const existing = standings
    .filter(p => p.eventResults[duel.id])
    .sort((a, b) => a.eventResults[duel.id].placement - b.eventResults[duel.id].placement)
  // existing[0] = winner (placement 1), existing[1] = loser (placement 2)

  const [p1Id, setP1Id] = useState(existing[0]?.id ?? '')
  const [p2Id, setP2Id] = useState(existing[1]?.id ?? '')
  const [winnerId, setWinnerId] = useState(existing[0]?.id ?? '')
  const [day, setDay] = useState(duel.day ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(existing.length === 0)

  // Keep local state in sync if data reloads
  useEffect(() => {
    if (existing.length > 0 && !editing) {
      setP1Id(existing[0]?.id ?? '')
      setP2Id(existing[1]?.id ?? '')
      setWinnerId(existing[0]?.id ?? '')
    }
  }, [duel.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function saveDuel() {
    if (!p1Id || !p2Id || p1Id === p2Id || !winnerId || !day) return
    setSaving(true)
    setError(null)
    const loserId = winnerId === p1Id ? p2Id : p1Id
    const upserts = [
      { event_id: duel.id, participant_id: winnerId, placement: 1 },
      { event_id: duel.id, participant_id: loserId, placement: 2 },
    ]
    const { error: uErr } = await supabase.from('results').upsert(upserts, { onConflict: 'event_id,participant_id' })
    if (uErr) { setError(uErr.message); setSaving(false); return }

    // Delete any old result rows that no longer apply (player swap scenario)
    const keepIds = [winnerId, loserId]
    const staleParticipants = standings
      .filter(p => p.eventResults[duel.id] && !keepIds.includes(p.id))
    for (const sp of staleParticipants) {
      await supabase.from('results').delete().eq('event_id', duel.id).eq('participant_id', sp.id)
    }

    // Save day and auto-publish
    await supabase.from('events').update({ is_published: true, day }).eq('id', duel.id)
    setSaving(false)
    setEditing(false)
    onRefresh()
  }

  async function togglePublish() {
    const newVal = duel.is_published === false
    await supabase.from('events').update({ is_published: newVal }).eq('id', duel.id)
    onRefresh()
  }

  const winner = existing[0]
  const loser = existing[1]

  return (
    <div className={styles.duelCard}>
      <div className={styles.duelCardHeader}>
        <span className={styles.duelName}>{duel.name}</span>
        <span
          className={duel.is_published === false ? styles.draftBadge : styles.liveBadge}
          onClick={togglePublish}
          title={duel.is_published === false ? 'Klikk for å publisere' : 'Klikk for å sette som utkast'}
        >
          {duel.is_published === false ? 'Utkast' : 'Publisert'}
        </span>
      </div>

      {!editing && winner && loser ? (
        <div className={styles.duelResult}>
          <span className={styles.duelWinner}>{winner.name}</span>
          <span className={styles.duelVs}>vs</span>
          <span className={styles.duelLoser}>{loser.name}</span>
          <div className={styles.duelResultLabel}>Vinner: {winner.name}</div>
          <button className={styles.duelEditBtn} onClick={() => setEditing(true)}>Rediger</button>
        </div>
      ) : (
        <div className={styles.duelForm}>
          <label className={styles.duelLabel}>
            Spiller 1
            <select className={styles.duelSelect} value={p1Id} onChange={e => { setP1Id(e.target.value); if (winnerId === p1Id) setWinnerId(e.target.value) }}>
              <option value="">Velg spiller</option>
              {standings.map(p => (
                <option key={p.id} value={p.id} disabled={p.id === p2Id}>{p.name}</option>
              ))}
            </select>
          </label>
          <label className={styles.duelLabel}>
            Spiller 2
            <select className={styles.duelSelect} value={p2Id} onChange={e => { setP2Id(e.target.value); if (winnerId === p2Id) setWinnerId(e.target.value) }}>
              <option value="">Velg spiller</option>
              {standings.map(p => (
                <option key={p.id} value={p.id} disabled={p.id === p1Id}>{p.name}</option>
              ))}
            </select>
          </label>
          {p1Id && p2Id && p1Id !== p2Id && (
            <div className={styles.duelWinnerPicker}>
              <span className={styles.duelLabel}>Vinner</span>
              <div className={styles.duelWinnerBtns}>
                <button
                  className={`${styles.duelWinnerBtn} ${winnerId === p1Id ? styles.duelWinnerBtnActive : ''}`}
                  onClick={() => setWinnerId(p1Id)}
                  type="button"
                >
                  {standings.find(p => p.id === p1Id)?.name ?? 'Spiller 1'}
                </button>
                <button
                  className={`${styles.duelWinnerBtn} ${winnerId === p2Id ? styles.duelWinnerBtnActive : ''}`}
                  onClick={() => setWinnerId(p2Id)}
                  type="button"
                >
                  {standings.find(p => p.id === p2Id)?.name ?? 'Spiller 2'}
                </button>
              </div>
            </div>
          )}
          <label className={styles.duelLabel}>
            Dag
            <select className={styles.duelSelect} value={day} onChange={e => setDay(e.target.value)}>
              <option value="">Velg dag</option>
              {DUEL_DAYS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.duelFormBtns}>
            <button
              className={styles.duelSaveBtn}
              onClick={saveDuel}
              disabled={saving || !p1Id || !p2Id || p1Id === p2Id || !winnerId || !day}
            >
              {saving ? 'Lagrer...' : 'Lagre og publiser'}
            </button>
            {existing.length > 0 && (
              <button className={styles.duelCancelBtn} onClick={() => setEditing(false)}>Avbryt</button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
