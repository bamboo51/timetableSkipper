import { useCallback, useEffect, useMemo, useState } from 'react'
import { autoAssign } from '@/lib/autoAssign'
import {
  DEFAULT_LEVEL_COUNTS,
  DEFAULT_SLOTS_PER_SHIFT,
  type LevelCounts,
  type MonthData,
  type ShiftType,
  availKey,
  daysInMonth,
  emptyMonthData,
  generateRoster,
  monthKey,
  slotKey,
  staffById,
} from '@/lib/domain'
import { loadMonth, saveMonth } from '@/lib/storage'

export function useMonthData(year: number, monthIndex0: number) {
  const key = monthKey(year, monthIndex0)
  const numDays = daysInMonth(year, monthIndex0)

  const [loadedKey, setLoadedKey] = useState(key)
  const [month, setMonth] = useState<MonthData>(() => loadMonth(key) ?? emptyMonthData(DEFAULT_LEVEL_COUNTS, DEFAULT_SLOTS_PER_SHIFT))

  if (key !== loadedKey) {
    setLoadedKey(key)
    setMonth(loadMonth(key) ?? emptyMonthData(DEFAULT_LEVEL_COUNTS, DEFAULT_SLOTS_PER_SHIFT))
  }

  useEffect(() => {
    saveMonth(key, month)
  }, [key, month])

  const roster = useMemo(() => generateRoster(month.levelCounts), [month.levelCounts])
  const rosterMap = useMemo(() => staffById(roster), [roster])

  const setSlot = useCallback((day: number, shift: ShiftType, slotIndex: number, staffId: string | null) => {
    setMonth((prev) => {
      const key2 = slotKey(day, shift)
      const existing = prev.assignments[key2] ?? Array.from({ length: prev.slotsPerShift }, () => null)
      const next = [...existing]
      next[slotIndex] = staffId
      return { ...prev, assignments: { ...prev.assignments, [key2]: next } }
    })
  }, [])

  const toggleUnavailable = useCallback((day: number, shift: ShiftType, staffId: string) => {
    setMonth((prev) => {
      const k = availKey(day, shift, staffId)
      const nextValue = !prev.unavailability[k]
      return { ...prev, unavailability: { ...prev.unavailability, [k]: nextValue } }
    })
  }, [])

  const setLevelCounts = useCallback((counts: LevelCounts) => {
    setMonth((prev) => ({ ...prev, levelCounts: counts }))
  }, [])

  const setSlotsPerShift = useCallback((n: number) => {
    setMonth((prev) => ({ ...prev, slotsPerShift: n }))
  }, [])

  const runAutoAssign = useCallback(() => {
    setMonth((prev) => autoAssign(prev, generateRoster(prev.levelCounts), daysInMonth(year, monthIndex0)))
  }, [year, monthIndex0])

  const clearMonth = useCallback(() => {
    setMonth((prev) => ({ ...prev, assignments: {} }))
  }, [])

  return {
    month,
    roster,
    rosterMap,
    numDays,
    setSlot,
    toggleUnavailable,
    setLevelCounts,
    setSlotsPerShift,
    runAutoAssign,
    clearMonth,
  }
}
