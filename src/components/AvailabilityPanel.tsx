import { cn } from '@/lib/utils'
import { SHIFT_TYPES, type ShiftType, type Staff, isUnavailable, type MonthData } from '@/lib/domain'

const SHIFT_ABBR: Record<ShiftType, string> = { morning: 'M', day: 'D', night: 'N' }

const LEVEL_DOT: Record<number, string> = {
  1: 'bg-slate-400',
  2: 'bg-sky-500',
  3: 'bg-violet-600',
}

interface AvailabilityPanelProps {
  month: MonthData
  roster: Staff[]
  numDays: number
  onToggle: (day: number, shift: ShiftType, staffId: string) => void
}

export function AvailabilityPanel({ month, roster, numDays, onToggle }: AvailabilityPanelProps) {
  const days = Array.from({ length: numDays }, (_, i) => i + 1)

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="border-collapse text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 border-b bg-background p-2 text-left font-medium">Staff</th>
            {days.map((day) => (
              <th key={day} className="border-b border-l p-1 text-center font-medium">
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {roster.map((staff) => (
            <tr key={staff.id}>
              <td className="sticky left-0 z-10 flex items-center gap-1.5 border-b bg-background p-2 whitespace-nowrap">
                <span className={cn('inline-block size-2 rounded-full', LEVEL_DOT[staff.level])} />
                {staff.id}
              </td>
              {days.map((day) => (
                <td key={day} className="border-b border-l p-1">
                  <div className="flex gap-0.5">
                    {SHIFT_TYPES.map((shift) => {
                      const off = isUnavailable(month, day, shift, staff.id)
                      return (
                        <button
                          key={shift}
                          type="button"
                          title={`${staff.id} · day ${day} · ${shift}`}
                          onClick={() => onToggle(day, shift, staff.id)}
                          className={cn(
                            'flex size-4 items-center justify-center rounded text-[9px] font-semibold transition-colors',
                            off ? 'bg-destructive text-white' : 'bg-muted text-muted-foreground hover:bg-muted-foreground/20',
                          )}
                        >
                          {SHIFT_ABBR[shift]}
                        </button>
                      )
                    })}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
