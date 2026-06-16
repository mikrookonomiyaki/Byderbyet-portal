import { useState } from 'react'
import { supabase } from '../supabaseClient'
import styles from '../pages/AdminDashboard.module.css'

export function AddParticipantForm({ tournamentId, onAdded }) {
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

export function AddEventForm({ tournamentId, onAdded }) {
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
