import {
  type Assignments,
  type Level,
  type MonthData,
  type ShiftType,
  type Staff,
  SHIFT_TYPES,
  getSlots,
  isUnavailable,
  slotKey,
} from './domain'

interface Counts {
  total: Map<string, number>
  byShiftType: Map<string, Map<ShiftType, number>>
}

function buildCounts(assignments: Assignments): Counts {
  const total = new Map<string, number>()
  const byShiftType = new Map<string, Map<ShiftType, number>>()
  for (const key of Object.keys(assignments)) {
    const shift = key.split('|')[1] as ShiftType
    for (const id of assignments[key]) {
      if (id === null) continue
      total.set(id, (total.get(id) ?? 0) + 1)
      if (!byShiftType.has(id)) byShiftType.set(id, new Map())
      const m = byShiftType.get(id)!
      m.set(shift, (m.get(shift) ?? 0) + 1)
    }
  }
  return { total, byShiftType }
}

function recordAssignment(counts: Counts, id: string, shift: ShiftType) {
  counts.total.set(id, (counts.total.get(id) ?? 0) + 1)
  if (!counts.byShiftType.has(id)) counts.byShiftType.set(id, new Map())
  const m = counts.byShiftType.get(id)!
  m.set(shift, (m.get(shift) ?? 0) + 1)
}

/** Lower is more deserving of the next assignment: fewest total shifts, then fewest of this shift type, then id for determinism. */
function rank(counts: Counts, id: string, shift: ShiftType): [number, number, string] {
  return [counts.total.get(id) ?? 0, counts.byShiftType.get(id)?.get(shift) ?? 0, id]
}

function pickBest(candidates: string[], counts: Counts, shift: ShiftType): string | undefined {
  if (candidates.length === 0) return undefined
  return [...candidates].sort((a, b) => {
    const ra = rank(counts, a, shift)
    const rb = rank(counts, b, shift)
    if (ra[0] !== rb[0]) return ra[0] - rb[0]
    if (ra[1] !== rb[1]) return ra[1] - rb[1]
    return ra[2] < rb[2] ? -1 : 1
  })[0]
}

/**
 * Fills only empty slots, never touches existing (manual or prior auto) assignments.
 * Balances shift counts within each level, uses shift-type rotation as a tiebreak,
 * ensures the level-3/level-2 coverage floor per shift, and avoids same-day double-booking
 * when an alternative exists (falls back to it rather than leaving a gap).
 */
export function autoAssign(month: MonthData, roster: Staff[], numDays: number): MonthData {
  const assignments: Assignments = {}
  for (const key of Object.keys(month.assignments)) {
    assignments[key] = [...month.assignments[key]]
  }

  const staffById = new Map(roster.map((s) => [s.id, s]))
  const rosterByLevel = new Map<Level, string[]>([
    [1, roster.filter((s) => s.level === 1).map((s) => s.id)],
    [2, roster.filter((s) => s.level === 2).map((s) => s.id)],
    [3, roster.filter((s) => s.level === 3).map((s) => s.id)],
  ])

  const counts = buildCounts(assignments)
  const assignedToday = new Set<string>()

  const workingMonth: MonthData = { ...month, assignments }

  const candidatesFor = (day: number, shift: ShiftType, pool: string[], slots: (string | null)[]) => {
    const alreadyInShift = new Set(slots.filter((s): s is string => s !== null))
    return pool.filter((id) => !alreadyInShift.has(id) && !isUnavailable(workingMonth, day, shift, id))
  }

  const assign = (key: string, slots: (string | null)[], index: number, id: string, shift: ShiftType) => {
    slots[index] = id
    assignments[key] = slots
    recordAssignment(counts, id, shift)
    assignedToday.add(id)
  }

  for (let day = 1; day <= numDays; day++) {
    assignedToday.clear()
    for (const shift of SHIFT_TYPES) {
      const key = slotKey(day, shift)
      const slots = getSlots(workingMonth, day, shift)
      const emptyIndices: number[] = []
      slots.forEach((s, i) => {
        if (s === null) emptyIndices.push(i)
        else assignedToday.add(s)
      })
      if (emptyIndices.length === 0) continue

      const currentLevels = slots
        .filter((id): id is string => id !== null)
        .map((id) => staffById.get(id)?.level)
      let coverageOk = currentLevels.includes(3) || currentLevels.includes(2)

      if (!coverageOk) {
        const seniorPool = [...rosterByLevel.get(3)!, ...rosterByLevel.get(2)!]
        const eligible = candidatesFor(day, shift, seniorPool, slots)
        const notDoubleBooked = eligible.filter((id) => !assignedToday.has(id))
        const pick = pickBest(notDoubleBooked, counts, shift) ?? pickBest(eligible, counts, shift)
        if (pick !== undefined) {
          const idx = emptyIndices.shift()!
          assign(key, slots, idx, pick, shift)
          coverageOk = true
        }
      }

      for (const idx of emptyIndices) {
        const eligible = candidatesFor(day, shift, roster.map((s) => s.id), slots)
        const notDoubleBooked = eligible.filter((id) => !assignedToday.has(id))
        const pick = pickBest(notDoubleBooked, counts, shift) ?? pickBest(eligible, counts, shift)
        if (pick !== undefined) {
          assign(key, slots, idx, pick, shift)
        }
      }
    }
  }

  return { ...month, assignments }
}
