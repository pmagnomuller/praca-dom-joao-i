/**
 * Praça Dom João I levels (real layout):
 * - Flat granite deck in the middle
 * - North (Millennium) raised high
 * - South (Tubitek) low — almost plaza height
 * - Stairs on east & west sides down into the flat praça
 *
 * Coords: +X east, +Z south (look −Z = north).
 */
import * as THREE from 'three'

export const PLAZA_Y = 0
/** Tubitek / south frontage — lower than Millennium */
export const SOUTH_Y = 0.35
/** Millennium / Atlântico north ledge */
export const NORTH_Y = 2.8
/** East & west sidewalks (match the high north rim) */
export const SIDE_Y = 2.8

/** @deprecated use NORTH_Y or SOUTH_Y */
export const STREET_Y = NORTH_Y

export const DECK = {
  x0: -28,
  x1: 26,
  z0: -18, // north lip under Millennium
  z1: 16, // south lip toward Tubitek
}

/** South (Tubitek) side, looking north across the flat deck at Millennium. */
export const PLAZA_SPAWN = { x: 2, z: 22, yaw: 0, pitch: 0.12 }

/** Corcéis on the high north rim, flanking Atlântico. */
export const CORCELS = [
  { x: -22, z: -19.5 },
  { x: 20, z: -19.5 },
]

type StairRun = {
  x: number
  z: number
  dx: number
  dz: number
  width: number
  run: number
  topY: number
}

/** Stairs only on the sides (E/W), from high sidewalk down to flat praça. */
const STAIRS: StairRun[] = [
  { x: -28, z: -2, dx: 1, dz: 0, width: 9, run: 7, topY: SIDE_Y },
  { x: 26, z: -2, dx: -1, dz: 0, width: 9, run: 7, topY: SIDE_Y },
]

export function plazaInterior(x: number, z: number): boolean {
  return x > DECK.x0 && x < DECK.x1 && z > DECK.z0 && z < DECK.z1
}

export function overDeckPad(x: number, z: number): boolean {
  return (
    x > DECK.x0 - 16 &&
    x < DECK.x1 + 16 &&
    z > DECK.z0 - 16 &&
    z < DECK.z1 + 16
  )
}

export function openAerialOverDeck(aerial: THREE.Group): void {
  const remove: THREE.Object3D[] = []
  aerial.traverse((obj: THREE.Object3D) => {
    const mesh = obj as THREE.Mesh
    if (!mesh.isMesh) return
    if (overDeckPad(mesh.position.x, mesh.position.z)) remove.push(mesh)
  })
  for (const m of remove) m.parent?.remove(m)
}

/**
 * Outside the deck: south = low, north/east/west = high.
 * On stairs: interpolate from side height down to plaza.
 */
export function groundY(x: number, z: number): number {
  for (const s of STAIRS) {
    const len = Math.hypot(s.dx, s.dz) || 1
    const ux = s.dx / len
    const uz = s.dz / len
    const along = (x - s.x) * ux + (z - s.z) * uz
    if (along < -0.25 || along > s.run + 0.25) continue
    const px = s.x + ux * along
    const pz = s.z + uz * along
    if (Math.hypot(x - px, z - pz) > s.width * 0.55) continue
    const t = Math.min(1, Math.max(0, along / s.run))
    return s.topY + (PLAZA_Y - s.topY) * t
  }

  if (plazaInterior(x, z)) return PLAZA_Y

  // South of deck → Tubitek level (low)
  if (z >= DECK.z1) return SOUTH_Y
  // North of deck → Millennium ledge (high)
  if (z <= DECK.z0) return NORTH_Y
  // East / west of deck → high side streets
  return SIDE_Y
}

export function createSunkenPlaza(scene: THREE.Scene): THREE.Group {
  const group = new THREE.Group()
  group.name = 'sunken-plaza'

  const granite = new THREE.MeshStandardMaterial({ color: 0xe6e1d6, roughness: 0.75 })
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xd2cdc4, roughness: 0.85 })
  const streetHi = new THREE.MeshStandardMaterial({ color: 0xa8a298, roughness: 0.92 })
  const streetLo = new THREE.MeshStandardMaterial({ color: 0xb5aea2, roughness: 0.92 })

  const { x0, x1, z0, z1 } = DECK
  const cx = (x0 + x1) / 2
  const cz = (z0 + z1) / 2
  const deckW = x1 - x0
  const deckD = z1 - z0
  const rimPad = 36

  // —— Flat praça ——
  const deck = new THREE.Mesh(new THREE.PlaneGeometry(deckW, deckD), granite)
  deck.rotation.x = -Math.PI / 2
  deck.position.set(cx, PLAZA_Y, cz)
  deck.receiveShadow = true
  group.add(deck)

  const slab = (
    w: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material,
  ) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.14, d), mat)
    m.position.set(x, y - 0.07, z)
    m.receiveShadow = true
    group.add(m)
  }

  // North rim — high (Millennium)
  slab(deckW + rimPad * 2, rimPad, cx, NORTH_Y, z0 - rimPad / 2, streetHi)
  // South rim — low (Tubitek)
  slab(deckW + rimPad * 2, rimPad, cx, SOUTH_Y, z1 + rimPad / 2, streetLo)
  // West / east — high, with stairs into the plaza
  slab(rimPad, deckD, x0 - rimPad / 2, SIDE_Y, cz, streetHi)
  slab(rimPad, deckD, x1 + rimPad / 2, SIDE_Y, cz, streetHi)

  const wall = (w: number, h: number, d: number, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat)
    m.position.set(x, y + h / 2, z)
    m.castShadow = true
    m.receiveShadow = true
    group.add(m)
  }

  // North retaining wall under Millennium (full drop)
  wall(deckW, NORTH_Y - PLAZA_Y, 0.55, cx, PLAZA_Y, z0)

  // South: only a low curb — Tubitek side is nearly plaza level
  wall(deckW, Math.max(0.2, SOUTH_Y - PLAZA_Y), 0.4, cx, PLAZA_Y, z1)

  // East / west retaining walls with gap for stairs (centered near z=-2)
  const gap = 11
  const northLen = Math.max(4, -2 - gap / 2 - z0)
  const southLen = Math.max(4, z1 - (-2 + gap / 2))
  const t = 0.5
  // West
  wall(t, SIDE_Y - PLAZA_Y, northLen, x0, PLAZA_Y, z0 + northLen / 2)
  wall(t, SIDE_Y - PLAZA_Y, southLen, x0, PLAZA_Y, z1 - southLen / 2)
  // East
  wall(t, SIDE_Y - PLAZA_Y, northLen, x1, PLAZA_Y, z0 + northLen / 2)
  wall(t, SIDE_Y - PLAZA_Y, southLen, x1, PLAZA_Y, z1 - southLen / 2)

  // Side stairs: high sidewalk → flat praça
  for (const s of STAIRS) {
    const rise = s.topY - PLAZA_Y
    const steps = Math.max(12, Math.round(rise / 0.15))
    const len = Math.hypot(s.dx, s.dz) || 1
    const ux = s.dx / len
    const uz = s.dz / len
    for (let i = 0; i < steps; i++) {
      const tStep = (i + 0.5) / steps
      const along = tStep * s.run
      const y = s.topY - rise * tStep
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(
          Math.abs(ux) > 0.5 ? 0.3 : s.width,
          0.13,
          Math.abs(uz) > 0.5 ? 0.3 : s.width,
        ),
        granite,
      )
      m.position.set(s.x + ux * along, y - 0.06, s.z + uz * along)
      m.castShadow = true
      m.receiveShadow = true
      group.add(m)
    }
  }

  scene.add(group)
  return group
}
