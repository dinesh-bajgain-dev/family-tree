import { useState } from 'react'
import { adToBs, bsToAd, daysInBsMonth, BS_MONTH_NAMES, BS_MIN_YEAR, BS_MAX_YEAR } from '../../lib/nepaliDate'

type Mode = 'AD' | 'BS'

interface DateFieldProps {
  label: string
  value?: string | null
  onChange: (value: string | undefined) => void
  error?: string
}

const fieldClasses =
  'w-full rounded-lg border border-ink-200 dark:border-ink-700 bg-white/70 dark:bg-ink-900/60 px-2 py-2 text-sm text-ink-900 dark:text-ink-100 focus:outline-none focus:ring-2 focus:ring-brand-500/60 focus:border-brand-500'

function range(min: number, max: number) {
  return Array.from({ length: max - min + 1 }, (_, i) => min + i)
}

const DEFAULT_BS_YEAR = 2050

export function DateField({ label, value, onChange, error }: DateFieldProps) {
  const [mode, setMode] = useState<Mode>('AD')

  const bsFromValue = value ? adToBs(value) : null
  const bsYear = bsFromValue?.year ?? DEFAULT_BS_YEAR
  const bsMonth = bsFromValue?.month ?? 1
  const bsDay = bsFromValue?.date ?? 1
  const dayCount = daysInBsMonth(bsYear, bsMonth)

  function handleBsChange(year: number, month: number, day: number) {
    const clampedDay = Math.min(day, daysInBsMonth(year, month))
    onChange(bsToAd(year, month, clampedDay) ?? undefined)
  }

  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-medium text-ink-700 dark:text-ink-200">{label}</span>
        <div className="flex overflow-hidden rounded-md border border-ink-200 text-xs dark:border-ink-700">
          {(['AD', 'BS'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`px-2 py-0.5 ${
                mode === m
                  ? 'bg-brand-600 text-white'
                  : 'bg-transparent text-ink-500 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {mode === 'AD' ? (
        <input
          type="date"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value || undefined)}
          className={fieldClasses}
        />
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <select
            value={bsYear}
            onChange={(e) => handleBsChange(Number(e.target.value), bsMonth, bsDay)}
            className={fieldClasses}
          >
            {range(BS_MIN_YEAR, BS_MAX_YEAR).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <select
            value={bsMonth}
            onChange={(e) => handleBsChange(bsYear, Number(e.target.value), bsDay)}
            className={fieldClasses}
          >
            {BS_MONTH_NAMES.map((name, i) => (
              <option key={name} value={i + 1}>
                {name}
              </option>
            ))}
          </select>
          <select
            value={bsDay}
            onChange={(e) => handleBsChange(bsYear, bsMonth, Number(e.target.value))}
            className={fieldClasses}
          >
            {range(1, dayCount).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      )}

      {mode === 'BS' && value && <p className="text-xs text-ink-400">AD: {value}</p>}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  )
}
