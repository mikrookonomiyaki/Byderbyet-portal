import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export function useHallOfFame() {
  const [winners, setWinners] = useState([])

  useEffect(() => {
    Promise.all([
      supabase.rpc('hall_of_fame'),
      supabase.from('tournaments').select('year, winner_override, is_completed'),
    ]).then(([hofRes, tourRes]) => {
      if (hofRes.error) return
      const rpcWinners = hofRes.data ?? []
      const rpcYears = new Set(rpcWinners.map(w => w.year))
      const overrides = (tourRes.data ?? [])
        .filter(t => t.winner_override && t.is_completed !== false && !rpcYears.has(t.year))
        .map(t => ({ year: t.year, name: t.winner_override }))
      const merged = [...rpcWinners, ...overrides].sort((a, b) => a.year - b.year)
      setWinners(merged)
    })
  }, [])

  return winners
}
