import { describe, expect, it } from 'vitest'
import {
  DEFAULT_LEVEL_COUNTS,
  emptyMonthData,
  generateRoster,
  getShiftWarnings,
  slotKey,
  staffById,
} from './domain'

describe('generateRoster', () => {
  it('generates ids as level+letter, restarting letters at each level', () => {
    const roster = generateRoster({ 1: 2, 2: 1, 3: 1 })
    expect(roster.map((s) => s.id)).toEqual(['1A', '1B', '2A', '3A'])
    expect(roster.map((s) => s.level)).toEqual([1, 1, 2, 3])
  })

  it('changing one level count does not shift another level ids', () => {
    const before = generateRoster({ 1: 3, 2: 3, 3: 2 })
    const after = generateRoster({ 1: 4, 2: 3, 3: 2 })
    const level2And3Before = before.filter((s) => s.level !== 1)
    const level2And3After = after.filter((s) => s.level !== 1)
    expect(level2And3After).toEqual(level2And3Before)
  })
})

describe('getShiftWarnings', () => {
  const roster = staffById(generateRoster(DEFAULT_LEVEL_COUNTS))

  it('flags a coverage gap when only level-1 staff are assigned', () => {
    const month = emptyMonthData(DEFAULT_LEVEL_COUNTS, 3)
    month.assignments[slotKey(1, 'morning')] = ['1A', '1B', null]
    const warnings = getShiftWarnings(month, roster, 1, 'morning')
    expect(warnings.coverageGap).toBe(true)
    expect(warnings.understaffed).toBe(true)
  })

  it('clears the coverage gap when a level-3 is present', () => {
    const month = emptyMonthData(DEFAULT_LEVEL_COUNTS, 3)
    month.assignments[slotKey(1, 'morning')] = ['1A', '1B', '3A']
    const warnings = getShiftWarnings(month, roster, 1, 'morning')
    expect(warnings.coverageGap).toBe(false)
    expect(warnings.understaffed).toBe(false)
  })

  it('accepts a level-2 as a fallback for coverage', () => {
    const month = emptyMonthData(DEFAULT_LEVEL_COUNTS, 3)
    month.assignments[slotKey(1, 'morning')] = ['1A', '2A', '1B']
    const warnings = getShiftWarnings(month, roster, 1, 'morning')
    expect(warnings.coverageGap).toBe(false)
  })

  it('flags double-booking when the same staff appears in two shifts the same day', () => {
    const month = emptyMonthData(DEFAULT_LEVEL_COUNTS, 3)
    month.assignments[slotKey(1, 'morning')] = ['3A', '1A', '1B']
    month.assignments[slotKey(1, 'night')] = ['3A', '2A', '2B']
    expect(getShiftWarnings(month, roster, 1, 'morning').doubleBooked).toBe(true)
    expect(getShiftWarnings(month, roster, 1, 'night').doubleBooked).toBe(true)
    expect(getShiftWarnings(month, roster, 1, 'day').doubleBooked).toBe(false)
  })
})
