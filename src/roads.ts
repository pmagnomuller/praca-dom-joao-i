import * as THREE from 'three'
import type { PlazaFeature, RoadFeature, Vec2 } from './overpass'

function ribbonGeometry(points: Vec2[], halfWidth: number): THREE.BufferGeometry | null {
  if (points.length < 2) return null

  const left: number[] = []
  const right: number[] = []
  const indices: number[] = []

  for (let i = 0; i < points.length; i++) {
    const prev = points[Math.max(0, i - 1)]
    const next = points[Math.min(points.length - 1, i + 1)]
    const dx = next.x - prev.x
    const dz = next.z - prev.z
    const len = Math.hypot(dx, dz) || 1
    const nx = -dz / len
    const nz = dx / len
    const p = points[i]
    left.push(p.x + nx * halfWidth, 0.02, p.z + nz * halfWidth)
    right.push(p.x - nx * halfWidth, 0.02, p.z - nz * halfWidth)
  }

  const verts: number[] = []
  for (let i = 0; i < points.length; i++) {
    verts.push(left[i * 3], left[i * 3 + 1], left[i * 3 + 2])
    verts.push(right[i * 3], right[i * 3 + 1], right[i * 3 + 2])
  }

  for (let i = 0; i < points.length - 1; i++) {
    const a = i * 2
    const b = a + 1
    const c = a + 2
    const d = a + 3
    indices.push(a, c, b, b, c, d)
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

function plazaShape(ring: Vec2[]): THREE.Shape {
  // Match building convention: shape (x, -z) then rotateX(-π/2) → world (x, y, z)
  const shape = new THREE.Shape()
  shape.moveTo(ring[0].x, -ring[0].z)
  for (let i = 1; i < ring.length; i++) {
    shape.lineTo(ring[i].x, -ring[i].z)
  }
  shape.closePath()
  return shape
}

export type StreetLabel = {
  name: string
  x: number
  z: number
}

export function createRoadsAndPlazas(
  scene: THREE.Scene,
  roads: RoadFeature[],
  plazas: PlazaFeature[],
): StreetLabel[] {
  const group = new THREE.Group()
  group.name = 'roads-plazas'
  const labels: StreetLabel[] = []
  const seenNames = new Set<string>()

  // Semi-transparent overlays so Esri aerial reads through as the main ground texture
  const asphalt = new THREE.MeshStandardMaterial({
    color: 0x2a2a2e,
    roughness: 0.92,
    metalness: 0.05,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  })
  const sidewalk = new THREE.MeshStandardMaterial({
    color: 0xc8b8a0,
    roughness: 0.95,
    metalness: 0,
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
  })
  const plazaMat = new THREE.MeshStandardMaterial({
    color: 0xd4c4a8,
    roughness: 0.9,
    metalness: 0,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  })

  for (const road of roads) {
    const hw = road.width * 0.5
    const geo = ribbonGeometry(road.points, hw)
    if (!geo) continue

    const isPed =
      road.highway === 'pedestrian' ||
      road.highway === 'footway' ||
      road.highway === 'path' ||
      road.highway === 'steps'

    const mesh = new THREE.Mesh(geo, isPed ? sidewalk : asphalt)
    mesh.receiveShadow = true
    group.add(mesh)

    if (road.name && !seenNames.has(road.name)) {
      seenNames.add(road.name)
      const mid = road.points[Math.floor(road.points.length / 2)]
      labels.push({ name: road.name, x: mid.x, z: mid.z })
    }
  }

  for (const plaza of plazas) {
    if (plaza.footprint.length < 4) continue
    try {
      const shape = plazaShape(plaza.footprint)
      const geo = new THREE.ShapeGeometry(shape)
      geo.rotateX(-Math.PI / 2)
      const mesh = new THREE.Mesh(geo, plazaMat)
      mesh.position.y = 0.03
      mesh.receiveShadow = true
      group.add(mesh)

      if (plaza.name && !seenNames.has(plaza.name)) {
        seenNames.add(plaza.name)
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
    } catch {
      // skip
    }
  }

  scene.add(group)
  return labels
}
