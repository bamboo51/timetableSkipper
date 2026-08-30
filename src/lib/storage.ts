import { type MonthData } from './domain'

const PREFIX = 'timetableSkipper:month:'

export function loadMonth(key: string): MonthData | null {
  const raw = localStorage.getItem(PREFIX + key)
  if (!raw) return null
  try {
    return JSON.parse(raw) as MonthData
  } catch {
    return null
  }
}

export function saveMonth(key: string, data: MonthData): void {
  localStorage.setItem(PREFIX + key, JSON.stringify(data))
}
