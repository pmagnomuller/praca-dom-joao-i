import type { Scene } from 'three'
import type { PlazaFeature, RoadFeature } from './overpass'

export type StreetLabel = {
  name: string
  x: number
  z: number
}

/**
 * Labels only — no road/plaza meshes. Aerial + granite deck carry the ground.
 */
export function createRoadsAndPlazas(
  _scene: Scene,
  roads: RoadFeature[],
  plazas: PlazaFeature[],
): StreetLabel[] {
  const labels: StreetLabel[] = []
  const seen = new Set<string>()

  for (const road of roads) {
    if (!road.name || seen.has(road.name)) continue
    seen.add(road.name)
    const mid = road.points[Math.floor(road.points.length / 2)]
    labels.push({ name: road.name, x: mid.x, z: mid.z })
  }

  for (const plaza of plazas) {
    if (!plaza.name || seen.has(plaza.name) || plaza.footprint.length < 4) continue
    seen.add(plaza.name)
    let cx = 0,
      cz = 0
    for (const p of plaza.footprint) {
      cx += p.x
      cz += p.z
    }
    cx /= plaza.footprint.length
    cz /= plaza.footprint.length
    labels.push({ name: plaza.name, x: cx, z: cz })
  }

  return labels
}
