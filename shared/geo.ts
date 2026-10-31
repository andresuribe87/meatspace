const EARTH_RADIUS_KM = 6371.0088
const KM_PER_DEG_LAT = 111.32

const rad = (d: number) => (d * Math.PI) / 180

/** Great-circle distance in km between two (lat, lon) points. */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = rad(lat2 - lat1)
  const dLon = rad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)))
}

/** Offset a (lat, lon) by north/east kilometres (small-distance approximation). Returns [lon, lat] (GeoJSON order). */
export function offsetKm(lat: number, lon: number, northKm: number, eastKm: number): [number, number] {
  const dLat = northKm / KM_PER_DEG_LAT
  const dLon = eastKm / (KM_PER_DEG_LAT * Math.cos(rad(lat)))
  return [round5(lon + dLon), round5(lat + dLat)]
}

export function round5(n: number): number {
  return Math.round(n * 1e5) / 1e5
}

export function isLon(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n >= -180 && n <= 180
}

export function isLat(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n >= -90 && n <= 90
}
