import { AlertTriangle, UserX, Users } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  SHIFT_LABELS,
  type MonthData,
  type ShiftType,
  type Staff,
  doubleBookedStaffForDay,
  getShiftWarnings,
  getSlots,
  isUnavailable,
} from '@/lib/domain'

const NONE = '__none__'

interface ShiftPickerDialogProps {
  target: { day: number; shift: ShiftType } | null
  onClose: () => void
  month: MonthData
  roster: Staff[]
  rosterMap: Map<string, Staff>
  onSetSlot: (day: number, shift: ShiftType, slotIndex: number, staffId: string | null) => void
}

export function ShiftPickerDialog({ target, onClose, month, roster, rosterMap, onSetSlot }: ShiftPickerDialogProps) {
  if (!target) return null
  const { day, shift } = target
  const slots = getSlots(month, day, shift)
  const warnings = getShiftWarnings(month, rosterMap, day, shift)
  const doubledToday = doubleBookedStaffForDay(month, day)

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Day {day} · {SHIFT_LABELS[shift]}
          </DialogTitle>
          <DialogDescription>Assign staff to each slot. Unavailable staff are hidden from the list.</DialogDescription>
        </DialogHeader>

        {(warnings.coverageGap || warnings.understaffed || warnings.doubleBooked) && (
          <div className="flex flex-col gap-1 rounded-md border border-amber-400/60 bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            {warnings.coverageGap && (
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="size-3.5" /> No level-3 (or level-2 fallback) assigned yet.
              </span>
            )}
            {warnings.understaffed && (
              <span className="flex items-center gap-1.5">
                <Users className="size-3.5" /> Not all slots are filled.
              </span>
            )}
            {warnings.doubleBooked && (
              <span className="flex items-center gap-1.5">
                <UserX className="size-3.5" /> Someone here is also working another shift today.
              </span>
            )}
          </div>
        )}

        <div className="space-y-2">
          {slots.map((current, idx) => {
            const options = roster.filter((s) => {
              if (s.id === current) return true
              if (slots.includes(s.id)) return false
              if (isUnavailable(month, day, shift, s.id)) return false
              return true
            })
            return (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-12 text-xs text-muted-foreground">Slot {idx + 1}</span>
                <Select
                  value={current ?? NONE}
                  onValueChange={(v) => onSetSlot(day, shift, idx, v === NONE ? null : v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>— Unassigned —</SelectItem>
                    {options.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.id} (level {s.level}){doubledToday.has(s.id) && s.id !== current ? ' · also on another shift' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
