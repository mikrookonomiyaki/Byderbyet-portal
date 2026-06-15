import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export function useHallOfFame() {
  const [winners, setWinners] = useState([])

  useEffect(() => {
    supabase.rpc('hall_of_fame').then(({ data, error }) => {
      if (!error && data) {
        setWinners([...data].reverse())
      }
    })
  }, [])

  return winners
}
