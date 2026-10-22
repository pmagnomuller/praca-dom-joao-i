/**
 * Sunken flat granite deck + raised street rim.
 * Coords match this repo: +X east, +Z south (looking −Z faces north).
 * Ported from praca-joao-i-simulation (Origin), with Z flipped.
 */
import * as THREE from 'three'

export const PLAZA_Y = 0
export const STREET_Y = 2.8

/** Axis-aligned sunken deck (world XZ). Outside = raised rim. */
export const DECK = {
  x0: -18,
  x1: 17,
  /** North lip (smaller Z — toward Millennium) */
  z0: -12,
  /** South lip (larger Z — spawn side) */
  z1: 28,
}

export const PLAZA_SPAWN = { x: 2, z: 34, yaw: 0, pitch: 0.18 }

export const CORCELS = [
  { x: -12, z: 28.5 },
  { x: 13, z: 28.3 },
]

const STAIRS = [
  { x: -12, z: 27.5, dx: 0, dz: -1, width: 7 },
  { x: 13, z: 27.5, dx: 0, dz: -1, width: 7 },
]

export function plazaInterior(x: number, z: number): number {
  return x > DECK.x0 && x < DECK.x1 && z > DECK.z0 && z < DECK.z1 ? 1 : 0
}

export function groundY(x: number, z: number): number {
  return plazaInterior(x, z) > 0.5 ? PLAZA_Y : STREET_Y
}

function orientBox(
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  dx: number,
  dz: number,
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color: 0xd8d3c8, roughness: 0.72 }),
  )
  mesh.position.set(x, y, z)
  const len = Math.hypot(dx, dz) || 1
  mesh.lookAt(x + dx / len, y, z + dz / len)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

/** Cut aerial tiles that cover the sunken deck so the hole is visible. */
export function openAerialOverDeck(aerial: THREE.Group): void {
  const remove: THREE.Object3D[] = []
  aerial.traverse((obj: THREE.Object3D) => {
    const mesh = obj as THREE.Mesh
    if (!mesh.isMesh) return
    const p = mesh.position
    if (plazaInterior(p.x, p.z) > 0.5) remove.push(mesh)
  })
  for (const m of remove) {
    m.parent?.remove(m)
    const mesh = m as THREE.Mesh
    mesh.geometry?.dispose()
    const mat = mesh.material
    if (Array.isArray(mat)) mat.forEach((x) => x.dispose())
    else mat?.dispose()
  }
}

/**
 * Flat granite floor, retaining walls, stairs L/R, bollards on the south rim.
 */
export function createSunkenPlaza(scene: THREE.Scene): THREE.Group {
  const group = new THREE.Group()
  group.name = 'sunken-plaza'

  const granite = new THREE.MeshStandardMaterial({ color: 0xe8e2d6, roughness: 0.72 })
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xe8e4dc, roughness: 0.8 })
  const iron = new THREE.MeshStandardMaterial({
    color: 0x1a1c1f,
    roughness: 0.4,
    metalness: 0.65,
  })

  const rise = STREET_Y - PLAZA_Y
  const { x0, x1, z0, z1 } = DECK
  const cx = (x0 + x1) / 2
  const cz = (z0 + z1) / 2
  const wallT = 0.7

  // Flat sunken granite
  const deck = new THREE.Mesh(
    new THREE.PlaneGeometry(x1 - x0, z1 - z0),
    granite,
  )
  deck.rotation.x = -Math.PI / 2
  deck.position.set(cx, PLAZA_Y + 0.02, cz)
  deck.receiveShadow = true
  group.add(deck)

  const addWall = (w: number, d: number, x: number, z: number) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, rise, d), wallMat)
    mesh.position.set(x, PLAZA_Y + rise / 2, z)
    mesh.castShadow = true
    mesh.receiveShadow = true
    group.add(mesh)
  }

  // North (Millennium), east, west — solid; south has stair gaps
  addWall(x1 - x0, wallT, cx, z0) // north
  addWall(wallT, z1 - z0, x0, cz) // west
  addWall(wallT, z1 - z0, x1, cz) // east
  addWall(14, wallT, cx, z1) // south center
  addWall(5, wallT, x0 + 2.5, z1)
  addWall(5, wallT, x1 - 2.5, z1)

  // Ledge under Millennium (north of deck)
  const ledge = new THREE.Mesh(
    new THREE.BoxGeometry(x1 - x0 + 10, 0.18, 16),
    granite,
  )
  ledge.position.set(cx + 3, STREET_Y + 0.08, z0 - 8)
  ledge.receiveShadow = true
  group.add(ledge)

  // Stairs into the plaza (from south rim, stepping north = −Z)
  const steps = Math.max(14, Math.round(rise / 0.14))
  for (const run of STAIRS) {
    for (let i = 0; i < steps; i++) {
      const t = (i + 0.5) / steps
      const travel = (1 - t) * (rise + 0.4)
      const x = run.x + run.dx * travel
      const z = run.z + run.dz * travel
      const y = STREET_Y - rise * t
      group.add(
        orientBox(run.width, 0.16, 0.45, x, y + 0.08, z, run.dx, run.dz),
      )
    }
  }

  // Bollards on south sidewalk
  for (let i = 0; i < 16; i++) {
    const x = -14 + i * 1.9
    const z = z1 + 1.4
    const bollard = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.08, 0.7, 8),
      iron,
    )
    bollard.position.set(x, STREET_Y + 0.35, z)
    bollard.castShadow = true
    group.add(bollard)
  }

  scene.add(group)
  return group
}
