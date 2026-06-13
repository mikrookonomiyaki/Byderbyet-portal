import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export function useHallOfFame() {
  const [winners, setWinners] = useState([])

  useEffect(() => {
    async function load() {
      const [tourRes, participantsRes, eventsRes, scalesRes, resultsRes] = await Promise.all([
        supabase.from('tournaments').select('*').order('year', { ascending: true }),
        supabase.from('participants').select('id,tournament_id,name'),
        supabase.from('events').select('id,tournament_id,is_hansa'),
        supabase.from('doeng_scale').select('*'),
        supabase.from('results').select('participant_id,event_id,placement'),
      ])
      for (const r of [tourRes, participantsRes, eventsRes, scalesRes, resultsRes]) {
        if (r.error) return
      }

      const eventById = {}
      eventsRes.data.forEach(e => { eventById[e.id] = e })

      const scaleByTournament = {}
      scalesRes.data.forEach(s => {
        if (!scaleByTournament[s.tournament_id]) scaleByTournament[s.tournament_id] = {}
        scaleByTournament[s.tournament_id][s.position] = s.points
      })

      const participantById = {}
      participantsRes.data.forEach(p => { participantById[p.id] = p })

      function calcDoeng(r) {
        const event = eventById[r.event_id]
        if (!event) return 0
        const scale = scaleByTournament[event.tournament_id] ?? {}
        return event.is_hansa ? r.placement : (scale[r.placement] ?? r.placement)
      }

      const totalByParticipant = {}
      resultsRes.data.forEach(r => {
        const p = participantById[r.participant_id]
        if (!p) return
        const key = `${p.tournament_id}::${p.id}`
        totalByParticipant[key] = (totalByParticipant[key] ?? 0) + calcDoeng(r)
      })

      const result = []
      for (const t of tourRes.data) {
        if (t.is_active) continue
        const participants = participantsRes.data.filter(p => p.tournament_id === t.id)
        if (participants.length === 0) continue

        let minTotal = Infinity
        let winner = null
        for (const p of participants) {
          const total = totalByParticipant[`${t.id}::${p.id}`] ?? 0
          if (total < minTotal) {
            minTotal = total
            winner = p.name
          }
        }
        if (winner) result.push({ year: t.year, name: winner })
      }

      setWinners(result.reverse())
    }

    load()
  }, [])

  return winners
}
