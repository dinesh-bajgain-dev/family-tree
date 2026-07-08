// @remotemerge/nepali-date-converter v1.2.0 ships a broken `types` path in its
// package.json (points at a root `index.d.ts` that doesn't exist — the real
// one lives under `src/`). This ambient declaration matches its documented
// public API so we don't depend on that broken resolution.
declare module '@remotemerge/nepali-date-converter' {
  interface ConvertedDate {
    year: number
    month: number
    date: number
    day: string
  }

  export default class DateConverter {
    constructor(dateInput: string)
    toAd(): ConvertedDate
    toBs(): ConvertedDate
  }
}
