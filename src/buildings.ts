import * as THREE from 'three'
import {
  DEFAULT_LEVEL_HEIGHT,
  DEFAULT_LEVELS,
  LANDMARK_HEIGHTS,
  MAX_BUILDING_HEIGHT,
} from './config'
import type { BuildingFeature, Vec2 } from './overpass'
import { STREET_Y, plazaInterior } from './plaza'

const PORTO_PALETTE = [
  0xe8dcc8, // warm plaster
  0xd4c4a8,
  0xc9b89a,
  0xb8a88c,
  0xa89078, // granite-ish
  0x8f7a66,
  0xd8c8b0,
  0xf0e6d8, // white azulejo-adjacent
  0xc4a484,
  0x9e8b7a,
]

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

/** Canvas window-grid facade texture */
function makeFacadeTexture(seed: number, levels: number): THREE.CanvasTexture {
  const w = 128
  const h = Math.max(64, Math.min(256, levels * 24))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!

  const base = PORTO_PALETTE[seed % PORTO_PALETTE.length]
  const r = (base >> 16) & 255
  const g = (base >> 8) & 255
  const b = base & 255
  ctx.fillStyle = `rgb(${r},${g},${b})`
  ctx.fillRect(0, 0, w, h)

  // Granite base band
  ctx.fillStyle = `rgb(${Math.max(0, r - 40)},${Math.max(0, g - 35)},${Math.max(0, b - 30)})`
  ctx.fillRect(0, h - h * 0.12, w, h * 0.12)

  const cols = 4 + (seed % 3)
  const rows = Math.max(2, levels)
  const marginX = 10
  const marginY = 8
  const cellW = (w - marginX * 2) / cols
  const cellH = (h * 0.82) / rows

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const wx = marginX + col * cellW + cellW * 0.18
      const wy = marginY + row * cellH + cellH * 0.2
      const ww = cellW * 0.55
      const wh = cellH * 0.55
      const lit = (seed + row * 7 + col * 3) % 5 === 0
      ctx.fillStyle = lit ? 'rgba(255, 230, 180, 0.85)' : 'rgba(40, 55, 75, 0.75)'
      ctx.fillRect(wx, wy, ww, wh)
      ctx.strokeStyle = 'rgba(255,255,255,0.15)'
      ctx.lineWidth = 1
      ctx.strokeRect(wx, wy, ww, wh)
    }
  }

  // Cornice
  ctx.fillStyle = `rgba(255,255,255,0.2)`
  ctx.fillRect(0, 0, w, 4)

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.ClampToEdgeWrapping
  tex.repeat.set(2, 1)
  return tex
}

export type BuildingColliders = {
  /** Axis-aligned boxes in XZ for simple collision */
  boxes: { minX: number; maxX: number; minZ: number; maxZ: number }[]
}

export function createBuildings(
  scene: THREE.Scene,
  buildings: BuildingFeature[],
): BuildingColliders {
  const group = new THREE.Group()
  group.name = 'buildings'
  const boxes: BuildingColliders['boxes'] = []

  const roofMat = new THREE.MeshStandardMaterial({
    color: 0x6b5344,
    roughness: 0.9,
    metalness: 0.05,
  })

  for (const b of buildings) {
    if (b.footprint.length < 4) continue

    // Skip tiny footprints (statues, kiosks, mapping noise)
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
    if (maxX0 - minX0 < 3 || maxZ0 - minZ0 < 3) continue

    // Skip footprints wholly inside the sunken deck (we dress landmarks separately)
    const cx0 = (minX0 + maxX0) / 2
    const cz0 = (minZ0 + maxZ0) / 2
    if (plazaInterior(cx0, cz0) > 0.5) continue

    const height = resolveHeight(b)
    const levels = Math.max(2, Math.round(height / DEFAULT_LEVEL_HEIGHT))
    const seed = hashId(b.id)
    const facadeTex = makeFacadeTexture(seed, levels)
    const wallMat = new THREE.MeshStandardMaterial({
      map: facadeTex,
      roughness: 0.85,
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
      // ExtrudeGeometry extrudes along +Z in shape space; we built shape in (x, -z)
      // Rotate so extrusion goes up Y
      geo.rotateX(-Math.PI / 2)

      let minX = Infinity,
        maxX = -Infinity,
        minZ = Infinity,
        maxZ = -Infinity
      for (const p of b.footprint) {
        minX = Math.min(minX, p.x)
        maxX = Math.max(maxX, p.x)
        minZ = Math.min(minZ, p.z)
        maxZ = Math.max(maxZ, p.z)
      }
      const cx = (minX + maxX) / 2
      const cz = (minZ + maxZ) / 2
      const near = Math.hypot(cx, cz) < 180

      const mesh = new THREE.Mesh(geo, wallMat)
      mesh.position.y = STREET_Y
      mesh.castShadow = near
      mesh.receiveShadow = near
      mesh.userData.name = b.name
      group.add(mesh)

      boxes.push({ minX, maxX, minZ, maxZ })

      if (near && maxX - minX > 4 && maxZ - minZ > 4) {
        const roof = new THREE.Mesh(
          new THREE.PlaneGeometry(maxX - minX - 0.4, maxZ - minZ - 0.4),
          roofMat,
        )
        roof.rotation.x = -Math.PI / 2
        roof.position.set(cx, STREET_Y + height + 0.05, cz)
        roof.receiveShadow = true
        group.add(roof)
      }
    } catch {
      // Skip degenerate footprints
    }
  }

  scene.add(group)
  return { boxes }
}
