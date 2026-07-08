import DateConverter from '@remotemerge/nepali-date-converter'

export const BS_MONTH_NAMES = [
  'Baishakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin',
  'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra',
]

export const BS_MIN_YEAR = 1975
export const BS_MAX_YEAR = 2099

export interface BsDate {
  year: number
  month: number
  date: number
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

export function adToBs(adIso: string): BsDate | null {
  try {
    const r = new DateConverter(adIso).toBs()
    return { year: r.year, month: r.month, date: r.date }
  } catch {
    return null
  }
}

export function bsToAd(year: number, month: number, date: number): string | null {
  try {
    const r = new DateConverter(`${year}-${pad(month)}-${pad(date)}`).toAd()
    return `${r.year}-${pad(r.month)}-${pad(r.date)}`
  } catch {
    return null
  }
}

/**
 * Days in a given BS month, derived from the public AD<->BS conversion
 * primitives rather than a hardcoded table: convert day 1 of the *next* BS
 * month to AD, step back one day, convert back to BS, and read the day.
 * Correctly handles Falgun/Chaitra's variable length across years.
 */
export function daysInBsMonth(year: number, month: number): number {
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  const firstOfNextAd = bsToAd(nextYear, nextMonth, 1)
  if (!firstOfNextAd) return 30

  const d = new Date(`${firstOfNextAd}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  const lastDayIso = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`

  const bs = adToBs(lastDayIso)
  return bs?.date ?? 30
}
