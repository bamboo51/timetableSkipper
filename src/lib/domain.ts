export type Level = 1 | 2 | 3
export type ShiftType = 'morning' | 'day' | 'night'

export const SHIFT_TYPES: ShiftType[] = ['morning', 'day', 'night']

export const SHIFT_LABELS: Record<ShiftType, string> = {
  morning: 'Morning',
  day: 'Day',
  night: 'Night',
}

export interface Staff {
  id: string
  level: Level
}

export type LevelCounts = Record<Level, number>

export const DEFAULT_LEVEL_COUNTS: LevelCounts = { 1: 3, 2: 3, 3: 2 }
export const DEFAULT_SLOTS_PER_SHIFT = 3

/**
 * Generates a roster like 1A, 1B, 2A, 2B, 2C, 3A — letters restart at each level so that
 * changing one level's count never reassigns another level's existing staff ids.
 */
export function generateRoster(levelCounts: LevelCounts): Staff[] {
  const roster: Staff[] = []
  for (const level of [1, 2, 3] as Level[]) {
    for (let i = 0; i < levelCounts[level]; i++) {
      roster.push({ id: `${level}${String.fromCharCode('A'.charCodeAt(0) + i)}`, level })
    }
  }
  return roster
}

export function staffById(roster: Staff[]): Map<string, Staff> {
  return new Map(roster.map((s) => [s.id, s]))
}

export function daysInMonth(year: number, monthIndex0: number): number {
  return new Date(year, monthIndex0 + 1, 0).getDate()
}

export function monthKey(year: number, monthIndex0: number): string {
  return `${year}-${String(monthIndex0 + 1).padStart(2, '0')}`
}

export function slotKey(day: number, shift: ShiftType): string {
  return `${day}|${shift}`
}

export function availKey(day: number, shift: ShiftType, staffId: string): string {
  return `${day}|${shift}|${staffId}`
}

/** slotId -> array of staffId | null, one entry per slot */
export type Assignments = Record<string, (string | null)[]>

/** availKey -> true means that staff member is unavailable for that day+shift */
export type Unavailability = Record<string, boolean>

export interface MonthData {
  levelCounts: LevelCounts
  slotsPerShift: number
  assignments: Assignments
  unavailability: Unavailability
}

export function emptyMonthData(levelCounts: LevelCounts, slotsPerShift: number): MonthData {
  return { levelCounts, slotsPerShift, assignments: {}, unavailability: {} }
}

export function getSlots(month: MonthData, day: number, shift: ShiftType): (string | null)[] {
  const key = slotKey(day, shift)
  const existing = month.assignments[key]
  if (existing && existing.length === month.slotsPerShift) return existing
  const filled = existing ?? []
  return Array.from({ length: month.slotsPerShift }, (_, i) => filled[i] ?? null)
}

export function isUnavailable(month: MonthData, day: number, shift: ShiftType, staffId: string): boolean {
  return month.unavailability[availKey(day, shift, staffId)] === true
}

export function assignedLevelsForShift(month: MonthData, roster: Map<string, Staff>, day: number, shift: ShiftType): Level[] {
  return getSlots(month, day, shift)
    .filter((id): id is string => id !== null)
    .map((id) => roster.get(id)?.level)
    .filter((l): l is Level => l !== undefined)
}

/** Coverage rule: each shift needs >=1 level-3, falling back to >=1 level-2, among its assigned staff. */
export function hasCoverageGap(month: MonthData, roster: Map<string, Staff>, day: number, shift: ShiftType): boolean {
  const levels = assignedLevelsForShift(month, roster, day, shift)
  if (levels.length === 0) return false
  return !levels.includes(3) && !levels.includes(2)
}

export function isUnderstaffed(month: MonthData, day: number, shift: ShiftType): boolean {
  const slots = getSlots(month, day, shift)
  return slots.some((s) => s === null)
}

/** staffIds assigned to more than one shift on the given day. */
export function doubleBookedStaffForDay(month: MonthData, day: number): Set<string> {
  const counts = new Map<string, number>()
  for (const shift of SHIFT_TYPES) {
    for (const id of getSlots(month, day, shift)) {
      if (id === null) continue
      counts.set(id, (counts.get(id) ?? 0) + 1)
    }
  }
  const doubled = new Set<string>()
  for (const [id, count] of counts) {
    if (count > 1) doubled.add(id)
  }
  return doubled
}

export interface ShiftWarnings {
  coverageGap: boolean
  understaffed: boolean
  doubleBooked: boolean
}

export function getShiftWarnings(month: MonthData, roster: Map<string, Staff>, day: number, shift: ShiftType): ShiftWarnings {
  const doubled = doubleBookedStaffForDay(month, day)
  const slots = getSlots(month, day, shift)
  return {
    coverageGap: hasCoverageGap(month, roster, day, shift),
    understaffed: isUnderstaffed(month, day, shift),
    doubleBooked: slots.some((id) => id !== null && doubled.has(id)),
  }
}
