import { AlertTriangle, UserX, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  SHIFT_TYPES,
  type MonthData,
  type ShiftType,
  type Staff,
  getShiftWarnings,
  getSlots,
} from '@/lib/domain'

const SHIFT_ABBR: Record<ShiftType, string> = { morning: 'AM', day: 'PM', night: 'NT' }

const LEVEL_BADGE: Record<number, string> = {
  1: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  2: 'bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-200',
  3: 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-200',
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface CalendarGridProps {
  month: MonthData
  rosterMap: Map<string, Staff>
  numDays: number
  firstWeekday: number
  onOpenShift: (day: number, shift: ShiftType) => void
}

export function CalendarGrid({ month, rosterMap, numDays, firstWeekday, onOpenShift }: CalendarGridProps) {
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: numDays }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border bg-border">
      {WEEKDAY_LABELS.map((w) => (
        <div key={w} className="bg-muted p-1.5 text-center text-xs font-medium text-muted-foreground">
          {w}
        </div>
      ))}
      {cells.map((day, i) => (
        <div key={i} className={cn('min-h-28 bg-background p-1.5', day === null && 'bg-muted/30')}>
          {day !== null && (
            <>
              <div className="mb-1 text-xs font-medium text-muted-foreground">{day}</div>
              <div className="space-y-1">
                {SHIFT_TYPES.map((shift) => {
                  const slots = getSlots(month, day, shift)
                  const warnings = getShiftWarnings(month, rosterMap, day, shift)
                  const hasWarning = warnings.coverageGap || warnings.understaffed || warnings.doubleBooked
                  return (
                    <button
                      key={shift}
                      type="button"
                      onClick={() => onOpenShift(day, shift)}
                      className={cn(
                        'flex w-full flex-wrap items-center gap-0.5 rounded border px-1 py-0.5 text-left text-[10px] hover:bg-muted',
                        hasWarning ? 'border-amber-400/60' : 'border-transparent',
                      )}
                    >
                      <span className="mr-0.5 font-semibold text-muted-foreground">{SHIFT_ABBR[shift]}</span>
                      {slots.map((id, idx) =>
                        id ? (
                          <span key={idx} className={cn('rounded px-1', LEVEL_BADGE[rosterMap.get(id)?.level ?? 1])}>
                            {id}
                          </span>
                        ) : (
                          <span key={idx} className="rounded border border-dashed px-1 text-muted-foreground">
                            —
                          </span>
                        ),
                      )}
                      {warnings.coverageGap && <AlertTriangle className="size-3 text-amber-600" />}
                      {warnings.understaffed && <Users className="size-3 text-amber-600" />}
                      {warnings.doubleBooked && <UserX className="size-3 text-red-600" />}
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  )
}
