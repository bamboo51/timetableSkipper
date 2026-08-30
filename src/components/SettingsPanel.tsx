import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Level, LevelCounts } from '@/lib/domain'

interface StepperProps {
  label: string
  value: number
  min?: number
  onChange: (value: number) => void
}

function Stepper({ label, value, min = 0, onChange }: StepperProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          <Minus />
        </Button>
        <span className="w-6 text-center tabular-nums">{value}</span>
        <Button type="button" variant="outline" size="icon-sm" onClick={() => onChange(value + 1)}>
          <Plus />
        </Button>
      </div>
    </div>
  )
}

interface SettingsPanelProps {
  levelCounts: LevelCounts
  slotsPerShift: number
  onLevelCountsChange: (counts: LevelCounts) => void
  onSlotsPerShiftChange: (n: number) => void
}

export function SettingsPanel({ levelCounts, slotsPerShift, onLevelCountsChange, onSlotsPerShiftChange }: SettingsPanelProps) {
  const setLevel = (level: Level, value: number) => {
    onLevelCountsChange({ ...levelCounts, [level]: value })
  }

  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <Stepper label="Level 1 staff" value={levelCounts[1]} onChange={(v) => setLevel(1, v)} />
      <Stepper label="Level 2 staff" value={levelCounts[2]} onChange={(v) => setLevel(2, v)} />
      <Stepper label="Level 3 staff" value={levelCounts[3]} onChange={(v) => setLevel(3, v)} />
      <Stepper label="Staff per shift" value={slotsPerShift} min={1} onChange={onSlotsPerShiftChange} />
    </div>
  )
}
