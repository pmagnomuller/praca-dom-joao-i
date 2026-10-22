import * as THREE from 'three'
import {
  DEFAULT_LEVEL_HEIGHT,
  DEFAULT_LEVELS,
  LANDMARK_HEIGHTS,
  MAP_RADIUS_M,
  MAX_BUILDING_HEIGHT,
} from './config'
import type { BuildingFeature, Vec2 } from './overpass'
import { DECK, STREET_Y, plazaInterior } from './plaza'

const PALETTE = [0xcfc4b0, 0xc0b4a0, 0xb8a890, 0xa89880, 0xd4c8b4, 0xe8e0d4]

function hashId(id: number): number {
  let h = id | 0
  h = ((h >>> 16) ^ h) * 0x45d9f3b
  h = ((h >>> 16) ^ h) * 0x45d9f3b
  h = (h >>> 16) ^ h
  return Math.abs(h)
}

function resolveHeight(b: BuildingFeature): number {
  const name = (b.name ?? '').toLowerCase()
  for (const [key, h] of Object.entries(LANDMARK_HEIGHTS)) {
    if (name.includes(key)) return Math.min(h, MAX_BUILDING_HEIGHT)
  }
  let h = b.height
  if (!h || h < 3) h = DEFAULT_LEVELS * DEFAULT_LEVEL_HEIGHT
  return Math.min(Math.max(h, 4), MAX_BUILDING_HEIGHT)
}

function shapeFromRing(ring: Vec2[]): THREE.Shape {
  const shape = new THREE.Shape()
  shape.moveTo(ring[0].x, -ring[0].z)
  for (let i = 1; i < ring.length; i++) {
    shape.lineTo(ring[i].x, -ring[i].z)
  }
  shape.closePath()
  return shape
}

export type BuildingColliders = {
  boxes: { minX: number; maxX: number; minZ: number; maxZ: number }[]
}

/**
 * Flat-color OSM extrusions only — no window grids. Cull far / deck-overlapping.
 */
export function createBuildings(
  scene: THREE.Scene,
  buildings: BuildingFeature[],
): BuildingColliders {
  const group = new THREE.Group()
  group.name = 'buildings'
  const boxes: BuildingColliders['boxes'] = []

  for (const b of buildings) {
    if (b.footprint.length < 4) continue

    let minX0 = Infinity,
      maxX0 = -Infinity,
      minZ0 = Infinity,
      maxZ0 = -Infinity
    for (const p of b.footprint) {
      minX0 = Math.min(minX0, p.x)
      maxX0 = Math.max(maxX0, p.x)
      minZ0 = Math.min(minZ0, p.z)
      maxZ0 = Math.max(maxZ0, p.z)
    }
    if (maxX0 - minX0 < 4 || maxZ0 - minZ0 < 4) continue

    const cx = (minX0 + maxX0) / 2
    const cz = (minZ0 + maxZ0) / 2
    if (Math.hypot(cx, cz) > MAP_RADIUS_M) continue
    if (plazaInterior(cx, cz)) continue

    // Skip footprints that heavily overlap the sunken deck
    if (
      minX0 < DECK.x1 &&
      maxX0 > DECK.x0 &&
      minZ0 < DECK.z1 &&
      maxZ0 > DECK.z0
    ) {
      const overlapX = Math.min(maxX0, DECK.x1) - Math.max(minX0, DECK.x0)
      const overlapZ = Math.min(maxZ0, DECK.z1) - Math.max(minZ0, DECK.z0)
      if (overlapX > 8 && overlapZ > 8) continue
    }

    const height = resolveHeight(b)
    const seed = hashId(b.id)
    const wallMat = new THREE.MeshStandardMaterial({
      color: PALETTE[seed % PALETTE.length],
      roughness: 0.88,
      metalness: 0.02,
    })

    try {
      const shape = shapeFromRing(b.footprint)
      if (b.holes) {
        for (const hole of b.holes) {
          if (hole.length < 4) continue
          const path = new THREE.Path()
          path.moveTo(hole[0].x, -hole[0].z)
          for (let i = 1; i < hole.length; i++) {
            path.lineTo(hole[i].x, -hole[i].z)
          }
          path.closePath()
          shape.holes.push(path)
        }
      }

      const geo = new THREE.ExtrudeGeometry(shape, {
        depth: height,
        bevelEnabled: false,
      })
      geo.rotateX(-Math.PI / 2)

      const mesh = new THREE.Mesh(geo, wallMat)
      mesh.position.y = STREET_Y
      mesh.castShadow = Math.hypot(cx, cz) < 100
      mesh.receiveShadow = true
      mesh.userData.name = b.name
      group.add(mesh)

      boxes.push({ minX: minX0, maxX: maxX0, minZ: minZ0, maxZ: maxZ0 })
    } catch {
      // skip
    }
  }

  scene.add(group)
  return { boxes }
}
