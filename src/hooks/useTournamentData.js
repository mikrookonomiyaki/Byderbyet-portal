import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { canonicalize } from '../eventNames'

export function useTournamentData(tournamentId, refreshKey = 0) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!tournamentId) return
    setLoading(true)
    setError(null)

    async function load() {
      const [eventsRes, participantsRes, scaleRes, resultsRes] = await Promise.all([
        supabase.from('events').select('*').eq('tournament_id', tournamentId).order('sort_order'),
        supabase.from('participants').select('*').eq('tournament_id', tournamentId).order('sort_order'),
        supabase.from('doeng_scale').select('*').eq('tournament_id', tournamentId),
        supabase.from('results').select('event_id, participant_id, placement').in(
          'event_id',
          (await supabase.from('events').select('id').eq('tournament_id', tournamentId)).data?.map(e => e.id) ?? []
        ),
      ])

      for (const res of [eventsRes, participantsRes, scaleRes]) {
        if (res.error) { setError(res.error.message); setLoading(false); return }
      }

      const scale = {}
      scaleRes.data.forEach(r => { scale[r.position] = r.points })

      const events = eventsRes.data.map(e => ({ ...e, name: canonicalize(e.name) }))
      const participants = participantsRes.data

      // Build a map: participantId -> { eventId -> doeng }
      const resultMap = {}
      ;(resultsRes.data ?? []).forEach(r => {
        if (!resultMap[r.participant_id]) resultMap[r.participant_id] = {}
        const event = events.find(e => e.id === r.event_id)
        if (!event) return
        const doeng = event.is_hansa ? r.placement : (scale[r.placement] ?? r.placement)
        resultMap[r.participant_id][r.event_id] = { placement: r.placement, doeng }
      })

      const standings = participants.map(p => {
        const eventResults = resultMap[p.id] ?? {}
        const total = Object.values(eventResults).reduce((sum, r) => sum + (r.doeng ?? 0), 0)
        return { ...p, eventResults, total }
      })

      standings.sort((a, b) => a.total - b.total)

      setData({ events, participants, standings, scale })
      setLoading(false)
    }

    load().catch(err => { setError(err.message); setLoading(false) })

    // Live updates: re-fetch when any result changes for this tournament
    const channel = supabase
      .channel(`results-${tournamentId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'results' }, () => {
        load().catch(() => {})
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [tournamentId, refreshKey])

  return { data, loading, error }
}
