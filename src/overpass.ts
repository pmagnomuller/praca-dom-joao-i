import { MAP_RADIUS_M } from './config'
import { bboxAroundOrigin, latLonToLocal } from './geo'

const OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

export type Vec2 = { x: number; z: number }

export type BuildingFeature = {
  id: number
  name?: string
  height: number
  footprint: Vec2[]
  holes?: Vec2[][]
}

export type RoadFeature = {
  id: number
  name?: string
  highway: string
  width: number
  points: Vec2[]
}

export type PlazaFeature = {
  id: number
  name?: string
  footprint: Vec2[]
}

export type MapData = {
  buildings: BuildingFeature[]
  roads: RoadFeature[]
  plazas: PlazaFeature[]
}

type OsmNode = { type: 'node'; id: number; lat: number; lon: number }
type OsmWay = {
  type: 'way'
  id: number
  nodes: number[]
  tags?: Record<string, string>
}
type OsmRelation = {
  type: 'relation'
  id: number
  members: { type: string; ref: number; role: string }[]
  tags?: Record<string, string>
}
type OsmElement = OsmNode | OsmWay | OsmRelation

const ROAD_WIDTHS: Record<string, number> = {
  motorway: 14,
  trunk: 12,
  primary: 11,
  secondary: 9,
  tertiary: 8,
  unclassified: 7,
  residential: 7,
  living_street: 6,
  service: 5,
  pedestrian: 8,
  footway: 3,
  path: 2.5,
  steps: 3,
  cycleway: 3,
}

function parseHeight(tags: Record<string, string> | undefined, name?: string): number {
  if (!tags) return 16

  const lowerName = (name ?? tags.name ?? '').toLowerCase()
  if (tags.height) {
    const h = parseFloat(tags.height.replace(',', '.').replace(/m$/i, ''))
    if (!Number.isNaN(h) && h > 0) return h
  }
  if (tags['building:levels']) {
    const levels = parseFloat(tags['building:levels'])
    if (!Number.isNaN(levels) && levels > 0) return levels * 3.2
  }
  if (tags.levels) {
    const levels = parseFloat(tags.levels)
    if (!Number.isNaN(levels) && levels > 0) return levels * 3.2
  }
  if (tags.building === 'church' || tags.building === 'cathedral') return 22
  if (tags.building === 'hotel') return 28
  if (tags.building === 'commercial' || tags.building === 'office') return 24
  if (tags.building === 'apartments' || tags.building === 'residential') return 18
  if (tags.building === 'retail') return 12
  if (lowerName.includes('teatro')) return 22
  return 16
}

function wayToLocalPoints(way: OsmWay, nodes: Map<number, OsmNode>): Vec2[] | null {
  const pts: Vec2[] = []
  for (const nid of way.nodes) {
    const n = nodes.get(nid)
    if (!n) return null
    pts.push(latLonToLocal(n.lat, n.lon))
  }
  return pts.length >= 2 ? pts : null
}

function closeRing(pts: Vec2[]): Vec2[] {
  if (pts.length < 3) return pts
  const first = pts[0]
  const last = pts[pts.length - 1]
  if (Math.hypot(first.x - last.x, first.z - last.z) > 0.05) {
    return [...pts, { ...first }]
  }
  return pts
}

function areaOfRing(pts: Vec2[]): number {
  let a = 0
  for (let i = 0; i < pts.length - 1; i++) {
    a += pts[i].x * pts[i + 1].z - pts[i + 1].x * pts[i].z
  }
  return a / 2
}

function parseOsmJson(json: { elements: OsmElement[] }): MapData {
  const nodes = new Map<number, OsmNode>()
  const ways = new Map<number, OsmWay>()
  const relations: OsmRelation[] = []

  for (const el of json.elements) {
    if (el.type === 'node') nodes.set(el.id, el)
    else if (el.type === 'way') ways.set(el.id, el)
    else if (el.type === 'relation') relations.push(el)
  }

  const buildings: BuildingFeature[] = []
  const roads: RoadFeature[] = []
  const plazas: PlazaFeature[] = []
  const usedWayIds = new Set<number>()

  for (const rel of relations) {
    const tags = rel.tags ?? {}
    if (!tags.building) continue
    const outers: Vec2[][] = []
    const inners: Vec2[][] = []
    for (const m of rel.members) {
      if (m.type !== 'way') continue
      const way = ways.get(m.ref)
      if (!way) continue
      const pts = wayToLocalPoints(way, nodes)
      if (!pts || pts.length < 3) continue
      usedWayIds.add(way.id)
      const ring = closeRing(pts)
      if (m.role === 'inner') inners.push(ring)
      else outers.push(ring)
    }
    if (outers.length === 0) continue
    outers.sort((a, b) => Math.abs(areaOfRing(b)) - Math.abs(areaOfRing(a)))
    const name = tags.name
    buildings.push({
      id: rel.id,
      name,
      height: parseHeight(tags, name),
      footprint: outers[0],
      holes: inners.length ? inners : undefined,
    })
  }

  for (const way of ways.values()) {
    if (usedWayIds.has(way.id)) continue
    const tags = way.tags ?? {}
    const pts = wayToLocalPoints(way, nodes)
    if (!pts) continue

    if (tags.building) {
      if (pts.length < 3) continue
      const name = tags.name
      buildings.push({
        id: way.id,
        name,
        height: parseHeight(tags, name),
        footprint: closeRing(pts),
      })
      continue
    }

    const isPlaza =
      tags.place === 'square' ||
      (tags.highway === 'pedestrian' && tags.area === 'yes') ||
      tags['area:highway'] === 'pedestrian' ||
      ((tags.name ?? '').toLowerCase().includes('joão') &&
        (tags.place === 'square' || tags.highway === 'pedestrian'))

    if (isPlaza && pts.length >= 3) {
      plazas.push({
        id: way.id,
        name: tags.name,
        footprint: closeRing(pts),
      })
      continue
    }

    if (tags.highway && tags.area !== 'yes') {
      const hw = tags.highway
      const width =
        tags.width && !Number.isNaN(parseFloat(tags.width))
          ? parseFloat(tags.width)
          : (ROAD_WIDTHS[hw] ?? 6)
      roads.push({
        id: way.id,
        name: tags.name,
        highway: hw,
        width,
        points: pts,
      })
    }
  }

  if (!plazas.some((p) => (p.name ?? '').toLowerCase().includes('joão'))) {
    const r = 45
    const ring: Vec2[] = []
    for (let i = 0; i <= 32; i++) {
      const a = (i / 32) * Math.PI * 2
      ring.push({ x: Math.cos(a) * r, z: Math.sin(a) * r })
    }
    plazas.push({ id: -1, name: 'Praça de Dom João I', footprint: ring })
  }

  return { buildings, roads, plazas }
}

async function fetchLiveOverpass(
  onProgress?: (msg: string) => void,
): Promise<{ elements: OsmElement[] }> {
  const bb = bboxAroundOrigin(MAP_RADIUS_M)
  const bbox = `${bb.south},${bb.west},${bb.north},${bb.east}`

  const query = `
[out:json][timeout:90];
(
  way["building"](${bbox});
  relation["building"](${bbox});
  way["highway"](${bbox});
  way["area:highway"](${bbox});
  way["place"="square"](${bbox});
  way["leisure"="park"](${bbox});
  way["highway"="pedestrian"]["area"="yes"](${bbox});
  relation["place"="square"](${bbox});
);
(._;>;);
out body;
`.trim()

  onProgress?.('Fetching OpenStreetMap data…')

  let lastError: Error | null = null

  for (const url of OVERPASS_URLS) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 45000)
      const res = await fetch(url, {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        signal: controller.signal,
      })
      clearTimeout(timer)
      if (!res.ok) throw new Error(`Overpass ${res.status} from ${url}`)
      return (await res.json()) as { elements: OsmElement[] }
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e))
    }
  }

  throw lastError ?? new Error('Overpass request failed')
}

async function fetchCachedFallback(
  onProgress?: (msg: string) => void,
): Promise<{ elements: OsmElement[] }> {
  onProgress?.('Loading cached map data…')
  const res = await fetch('/map-data.json')
  if (!res.ok) throw new Error('Cached map data missing')
  return (await res.json()) as { elements: OsmElement[] }
}

export async function fetchMapData(
  onProgress?: (msg: string) => void,
): Promise<MapData> {
  // Prefer bundled snapshot for fast reliable loads; fall back to live Overpass.
  let json: { elements: OsmElement[] }
  try {
    json = await fetchCachedFallback(onProgress)
  } catch {
    json = await fetchLiveOverpass(onProgress)
  }

  onProgress?.('Parsing buildings and streets…')
  return parseOsmJson(json)
}
