import { describe, expect, it } from 'vitest'
import { autoAssign } from './autoAssign'
import {
  DEFAULT_LEVEL_COUNTS,
  SHIFT_TYPES,
  emptyMonthData,
  generateRoster,
  getSlots,
  hasCoverageGap,
  staffById,
  slotKey,
} from './domain'

describe('autoAssign', () => {
  const roster = generateRoster(DEFAULT_LEVEL_COUNTS)
  const rosterMap = staffById(roster)

  it('fills every slot for every shift across the month', () => {
    const month = emptyMonthData(DEFAULT_LEVEL_COUNTS, 3)
    const result = autoAssign(month, roster, 5)
    for (let day = 1; day <= 5; day++) {
      for (const shift of SHIFT_TYPES) {
        const slots = getSlots(result, day, shift)
        expect(slots.every((s) => s !== null)).toBe(true)
      }
    }
  })

  it('never produces a coverage gap when enough seniors exist', () => {
    const month = emptyMonthData(DEFAULT_LEVEL_COUNTS, 3)
    const result = autoAssign(month, roster, 10)
    for (let day = 1; day <= 10; day++) {
      for (const shift of SHIFT_TYPES) {
        expect(hasCoverageGap(result, rosterMap, day, shift)).toBe(false)
      }
    }
  })

  it('leaves existing manual assignments untouched and only fills empty slots', () => {
    const month = emptyMonthData(DEFAULT_LEVEL_COUNTS, 3)
    month.assignments[slotKey(1, 'morning')] = ['1A', null, null]
    const result = autoAssign(month, roster, 1)
    expect(getSlots(result, 1, 'morning')[0]).toBe('1A')
  })

  it('balances total shift counts evenly within each level', () => {
    const month = emptyMonthData(DEFAULT_LEVEL_COUNTS, 3)
    const result = autoAssign(month, roster, 30)
    const totals = new Map<string, number>()
    for (let day = 1; day <= 30; day++) {
      for (const shift of SHIFT_TYPES) {
        for (const id of getSlots(result, day, shift)) {
          if (id) totals.set(id, (totals.get(id) ?? 0) + 1)
        }
      }
    }
    const byLevel = new Map<number, number[]>()
    for (const s of roster) {
      const arr = byLevel.get(s.level) ?? []
      arr.push(totals.get(s.id) ?? 0)
      byLevel.set(s.level, arr)
    }
    for (const [, counts] of byLevel) {
      expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1)
    }
  })

  it('avoids double-booking a staff member on the same day when an alternative exists', () => {
    // 9 shift-slots/day (3 shifts x 3 slots); use a roster with more than 9 staff
    // so double-booking is never forced by a headcount shortfall.
    const largeCounts = { 1: 4, 2: 4, 3: 3 }
    const largeRoster = generateRoster(largeCounts)
    const month = emptyMonthData(largeCounts, 3)
    const result = autoAssign(month, largeRoster, 10)
    for (let day = 1; day <= 10; day++) {
      const seen = new Map<string, number>()
      for (const shift of SHIFT_TYPES) {
        for (const id of getSlots(result, day, shift)) {
          if (id) seen.set(id, (seen.get(id) ?? 0) + 1)
        }
      }
      for (const [, count] of seen) {
        expect(count).toBe(1)
      }
    }
  })
})
