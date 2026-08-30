import { useState } from 'react'
import { ChevronLeft, ChevronRight, Settings2, Sparkles, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SettingsPanel } from '@/components/SettingsPanel'
import { AvailabilityPanel } from '@/components/AvailabilityPanel'
import { CalendarGrid } from '@/components/CalendarGrid'
import { ShiftPickerDialog } from '@/components/ShiftPickerDialog'
import { useMonthData } from '@/hooks/useMonthData'
import type { ShiftType } from '@/lib/domain'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export default function App() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [monthIndex0, setMonthIndex0] = useState(now.getMonth())
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [pickerTarget, setPickerTarget] = useState<{ day: number; shift: ShiftType } | null>(null)

  const { month, roster, rosterMap, numDays, setSlot, toggleUnavailable, setLevelCounts, setSlotsPerShift, runAutoAssign, clearMonth } =
    useMonthData(year, monthIndex0)

  const changeMonth = (delta: number) => {
    let m = monthIndex0 + delta
    let y = year
    if (m < 0) {
      m = 11
      y -= 1
    } else if (m > 11) {
      m = 0
      y += 1
    }
    setMonthIndex0(m)
    setYear(y)
  }

  const firstWeekday = new Date(year, monthIndex0, 1).getDay()

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">timetableSkipper</h1>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon-sm" onClick={() => changeMonth(-1)}>
            <ChevronLeft />
          </Button>
          <span className="w-36 text-center text-sm font-medium">
            {MONTH_NAMES[monthIndex0]} {year}
          </span>
          <Button variant="outline" size="icon-sm" onClick={() => changeMonth(1)}>
            <ChevronRight />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setSettingsOpen((o) => !o)}>
            <Settings2 /> Settings
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (confirm(`Clear all assignments for ${MONTH_NAMES[monthIndex0]} ${year}?`)) clearMonth()
            }}
          >
            <Trash2 /> Clear month
          </Button>
          <Button size="sm" onClick={runAutoAssign}>
            <Sparkles /> Auto-assign
          </Button>
        </div>
      </header>

      <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
        <CollapsibleContent>
          <div className="rounded-lg border p-3">
            <SettingsPanel
              levelCounts={month.levelCounts}
              slotsPerShift={month.slotsPerShift}
              onLevelCountsChange={setLevelCounts}
              onSlotsPerShiftChange={setSlotsPerShift}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Tabs defaultValue="calendar">
        <TabsList>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="availability">Availability</TabsTrigger>
        </TabsList>
        <TabsContent value="calendar">
          <CalendarGrid
            month={month}
            rosterMap={rosterMap}
            numDays={numDays}
            firstWeekday={firstWeekday}
            onOpenShift={(day, shift) => setPickerTarget({ day, shift })}
          />
        </TabsContent>
        <TabsContent value="availability">
          <AvailabilityPanel month={month} roster={roster} numDays={numDays} onToggle={toggleUnavailable} />
        </TabsContent>
      </Tabs>

      <ShiftPickerDialog
        target={pickerTarget}
        onClose={() => setPickerTarget(null)}
        month={month}
        roster={roster}
        rosterMap={rosterMap}
        onSetSlot={setSlot}
      />
    </div>
  )
}
