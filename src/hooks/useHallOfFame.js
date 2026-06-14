import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export function useHallOfFame() {
  const [winners, setWinners] = useState([])

  useEffect(() => {
    async function load() {
      const tourRes = await supabase
        .from('tournaments')
        .select('*')
        .order('year', { ascending: true })
      if (tourRes.error) return

      const inactiveTours = tourRes.data.filter(t => !t.is_active)
      if (inactiveTours.length === 0) { setWinners([]); return }
      const tourIds = inactiveTours.map(t => t.id)

      const [participantsRes, eventsRes, scalesRes] = await Promise.all([
        supabase.from('participants').select('id,tournament_id,name').in('tournament_id', tourIds),
        supabase.from('events').select('id,tournament_id,is_hansa').in('tournament_id', tourIds),
        supabase.from('doeng_scale').select('*').in('tournament_id', tourIds),
      ])
      for (const r of [participantsRes, eventsRes, scalesRes]) {
        if (r.error) return
      }

      const eventIds = eventsRes.data.map(e => e.id)
      const resultsRes = await supabase
        .from('results')
        .select('participant_id,event_id,placement')
        .in('event_id', eventIds)
      if (resultsRes.error) return

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
      for (const t of inactiveTours) {
        const participants = participantsRes.data.filter(p => p.tournament_id === t.id)
        if (participants.length === 0) continue

        const desc = (t.scoring_direction ?? 'asc') === 'desc'
        let bestTotal = desc ? -Infinity : Infinity
        let winner = null
        for (const p of participants) {
          const total = totalByParticipant[`${t.id}::${p.id}`] ?? 0
          if (desc ? total > bestTotal : total < bestTotal) {
            bestTotal = total
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
