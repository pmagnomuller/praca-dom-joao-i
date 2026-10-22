import { ORIGIN } from './config'

const DEG2RAD = Math.PI / 180
const EARTH_RADIUS = 6378137

/** Meters per degree of longitude at a given latitude */
export function metersPerDegreeLon(lat: number): number {
  return (EARTH_RADIUS * Math.cos(lat * DEG2RAD) * DEG2RAD)
}

export function metersPerDegreeLat(): number {
  return EARTH_RADIUS * DEG2RAD
}

/** Local ENU-ish: +X east, +Z south (Three.js Y-up, looking down -Z is north-ish when facing -Z... 
 *  We use +X east, +Z north so forward (-Z in Three default look) needs care.
 *  Convention: +X = east, +Z = south so that default camera looking down -Z faces north. */
export function latLonToLocal(lat: number, lon: number): { x: number; z: number } {
  const x = (lon - ORIGIN.lon) * metersPerDegreeLon(ORIGIN.lat)
  const z = -(lat - ORIGIN.lat) * metersPerDegreeLat()
  return { x, z }
}

export function localToLatLon(x: number, z: number): { lat: number; lon: number } {
  const lon = ORIGIN.lon + x / metersPerDegreeLon(ORIGIN.lat)
  const lat = ORIGIN.lat - z / metersPerDegreeLat()
  return { lat, lon }
}

/** Bounding box around origin for Overpass (south, west, north, east) */
export function bboxAroundOrigin(radiusM: number): {
  south: number
  west: number
  north: number
  east: number
} {
  const dLat = radiusM / metersPerDegreeLat()
  const dLon = radiusM / metersPerDegreeLon(ORIGIN.lat)
  return {
    south: ORIGIN.lat - dLat,
    west: ORIGIN.lon - dLon,
    north: ORIGIN.lat + dLat,
    east: ORIGIN.lon + dLon,
  }
}

/** Web Mercator tile helpers for aerial imagery */
export function latLonToTile(lat: number, lon: number, zoom: number): { x: number; y: number } {
  const n = 2 ** zoom
  const x = Math.floor(((lon + 180) / 360) * n)
  const latRad = lat * DEG2RAD
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n)
  return { x, y }
}

export function tileBounds(x: number, y: number, zoom: number): {
  north: number
  south: number
  west: number
  east: number
} {
  const n = 2 ** zoom
  const west = (x / n) * 360 - 180
  const east = ((x + 1) / n) * 360 - 180
  const north = (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180) / Math.PI
  const south = (Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 1)) / n))) * 180) / Math.PI
  return { north, south, west, east }
}
