import type { NetworkStats } from './types'

const int = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const oneDp = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

/** 4250 -> "42.50" (no symbol). Integer math, no float drift. */
export function centsToDecimal(cents: number): string {
  const c = Math.round(cents)
  const sign = c < 0 ? '-' : ''
  const abs = Math.abs(c)
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`
}

/** 4250 -> "$42.50" */
export function formatUsd(cents: number): string {
  const c = Math.round(cents)
  const whole = Math.trunc(c / 100)
  const frac = String(Math.abs(c % 100)).padStart(2, '0')
  return `${c < 0 ? '-' : ''}$${int.format(Math.abs(whole))}.${frac}`
}

/** 14289000 -> "$142,890" (whole dollars, for the ticker). */
export function formatUsdWhole(cents: number): string {
  return `$${int.format(Math.round(cents / 100))}`
}

/** 340 -> "$3.40 / min" */
export function formatRate(rateCents: number): string {
  return `${formatUsd(rateCents)} / min`
}

/** (31.9973, -102.0779) -> "31.9973° N, 102.0779° W" */
export function formatCoords(lat: number, lon: number): string {
  const ns = lat >= 0 ? 'N' : 'S'
  const ew = lon >= 0 ? 'E' : 'W'
  return `${Math.abs(lat).toFixed(4)}° ${ns}, ${Math.abs(lon).toFixed(4)}° ${ew}`
}

/** 0 -> "00ms", 140 -> "140ms" (matches the handoff's console timestamps). */
export function formatOffset(ms: number): string {
  return `${String(Math.round(ms)).padStart(2, '0')}ms`
}

/** "0x9f8c...3a1b" */
export function shortHash(hash: string): string {
  const hex = hash.startsWith('0x') ? hash.slice(2) : hash
  if (hex.length <= 8) return `0x${hex}`
  return `0x${hex.slice(0, 4)}...${hex.slice(-4)}`
}

export interface TickerField {
  key: keyof NetworkStats
  label: string
  value: string
}

/**
 * Ticker copy, verbatim from the handoff:
 * ACTIVE NODES: 1,408 | AVAILABLE FLIGHT/ACTUATION HRS: 924.2 | 24H SETTLED VOLUME: $142,890 USDC | NETWORK LATENCY: 18ms
 */
export function tickerFields(s: NetworkStats): TickerField[] {
  return [
    { key: 'activeNodes', label: 'ACTIVE NODES', value: int.format(s.activeNodes) },
    { key: 'availableHrs', label: 'AVAILABLE FLIGHT/ACTUATION HRS', value: oneDp.format(s.availableHrs) },
    { key: 'settled24hCents', label: '24H SETTLED VOLUME', value: `${formatUsdWhole(s.settled24hCents)} USDC` },
    { key: 'latencyMs', label: 'NETWORK LATENCY', value: `${Math.round(s.latencyMs)}ms` },
  ]
}

export function tickerText(s: NetworkStats): string {
  return tickerFields(s)
    .map((f) => `${f.label}: ${f.value}`)
    .join(' | ')
}
