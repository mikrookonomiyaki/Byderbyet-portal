import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { canonicalize } from '../eventNames'

const DAY_ORDER = { Fredag: 0, Lørdag: 1, Søndag: 2 }

export function useTournamentData(tournamentId, refreshKey = 0, { publishedOnly = true } = {}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!tournamentId) return
    setLoading(true)
    setError(null)

    async function load() {
      const [tourRes, eventsRes, participantsRes, scaleRes] = await Promise.all([
        supabase.from('tournaments').select('scoring_direction, is_completed').eq('id', tournamentId).single(),
        supabase.from('events').select('*').eq('tournament_id', tournamentId).order('sort_order'),
        supabase.from('participants').select('*').eq('tournament_id', tournamentId).order('sort_order'),
        supabase.from('doeng_scale').select('*').eq('tournament_id', tournamentId),
      ])

      for (const res of [tourRes, eventsRes, participantsRes, scaleRes]) {
        if (res.error) { setError(res.error.message); setLoading(false); return }
      }

      const scoringDirection = tourRes.data?.scoring_direction ?? 'asc'
      const isCompleted = tourRes.data?.is_completed ?? true

      const scale = {}
      scaleRes.data.forEach(r => { scale[r.position] = r.points })

      const allEvents = eventsRes.data.map(e => ({ ...e, name: canonicalize(e.name) }))
      allEvents.sort((a, b) => {
        const da = DAY_ORDER[a.day] ?? 99
        const db = DAY_ORDER[b.day] ?? 99
        if (da !== db) return da - db
        return (a.sort_order ?? 0) - (b.sort_order ?? 0)
      })

      // Events for display: always show all events regardless of publishedOnly
      const events = allEvents.filter(e => !e.is_duel)
      const duelEvents = allEvents.filter(e => e.is_duel)

      // Events for scoring: only published events (so unpublished results stay hidden)
      const visibleEvents = publishedOnly
        ? allEvents.filter(e => e.is_published !== false)
        : allEvents

      const participants = participantsRes.data

      // Fetch results for ALL visible events (regular + duels) so totals include duel doeng
      const allEventIds = visibleEvents.map(e => e.id)
      const resultsRes = allEventIds.length > 0
        ? await supabase.from('results').select('event_id, participant_id, placement').in('event_id', allEventIds).limit(10000)
        : { data: [] }

      if (resultsRes.error) { setError(resultsRes.error.message); setLoading(false); return }

      const eventById = {}
      visibleEvents.forEach(e => { eventById[e.id] = e })

      const resultMap = {}
      ;(resultsRes.data ?? []).forEach(r => {
        if (!resultMap[r.participant_id]) resultMap[r.participant_id] = {}
        const event = eventById[r.event_id]
        if (!event) return
        let doeng
        if (event.is_duel) {
          doeng = r.placement === 1 ? -5 : 5
        } else if (event.is_hansa) {
          doeng = r.placement
        } else {
          doeng = scale[r.placement] ?? r.placement
        }
        resultMap[r.participant_id][r.event_id] = { placement: r.placement, doeng }
      })

      const standings = participants.map(p => {
        const eventResults = resultMap[p.id] ?? {}
        const total = Object.values(eventResults).reduce((sum, r) => sum + (r.doeng ?? 0), 0)
        return { ...p, eventResults, total }
      })

      if (scoringDirection === 'desc') {
        standings.sort((a, b) => b.total - a.total)
      } else {
        standings.sort((a, b) => a.total - b.total)
      }

      setData({ events, duelEvents, participants, standings, scale, scoringDirection, isCompleted })
      setLoading(false)
    }

    load().catch(err => { setError(err.message); setLoading(false) })

    const channel = supabase
      .channel(`results-${tournamentId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'results' }, () => {
        load().catch(() => {})
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [tournamentId, refreshKey, publishedOnly])

  return { data, loading, error }
}
