/**
 * Landmark dressing ported from praca-joao-i-simulation (Origin).
 * Coords: +X east, +Z south (Z flipped from Origin).
 */
import * as THREE from 'three'
import { CORCELS, DECK, STREET_Y, groundY } from './plaza'
import { textTexture } from './textures'

function mesh(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
  rx = 0,
  ry = 0,
  rz = 0,
): THREE.Mesh {
  const m = new THREE.Mesh(geometry, material)
  m.position.set(x, y, z)
  m.rotation.set(rx, ry, rz)
  m.castShadow = true
  m.receiveShadow = true
  return m
}

function sign(
  label: string,
  w: number,
  h: number,
  anisotropy: number,
  fg: string,
  bg: string,
  emissive = '',
): THREE.Mesh {
  const mat = new THREE.MeshStandardMaterial({
    map: textTexture(label, anisotropy, fg, bg),
    roughness: 0.48,
    metalness: 0.08,
  })
  if (emissive) {
    mat.emissive.set(emissive)
    mat.emissiveIntensity = 0.55
  }
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat)
}

function placeFacing(
  obj: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  nx: number,
  nz: number,
): void {
  obj.position.set(x, y, z)
  obj.up.set(0, 1, 0)
  obj.lookAt(x + nx, y, z + nz)
}

/** Teatro Municipal Rivoli — white Art Deco façade facing into the square (+X). */
export function buildRivoli(anisotropy: number): THREE.Group {
  const group = new THREE.Group()
  group.name = 'rivoli'

  const faceX = -38.4
  const centerZ = 1.5
  const faceSquare = Math.PI / 2

  const stone = new THREE.MeshStandardMaterial({ color: 0xf4efe6, roughness: 0.68 })
  const white = new THREE.MeshStandardMaterial({ color: 0xf7f4ee, roughness: 0.62 })
  const dark = new THREE.MeshStandardMaterial({
    color: 0x141414,
    roughness: 0.38,
    metalness: 0.28,
  })
  const gold = new THREE.MeshStandardMaterial({
    color: 0xe0c06a,
    emissive: 0x9a7428,
    emissiveIntensity: 0.7,
    roughness: 0.32,
    metalness: 0.45,
  })
  const red = new THREE.MeshStandardMaterial({ color: 0x6d1520, roughness: 0.55 })
  const glass = new THREE.MeshStandardMaterial({
    color: 0x9eb6c2,
    roughness: 0.06,
    metalness: 0.82,
  })

  group.add(mesh(new THREE.BoxGeometry(2.8, 18, 22), white, faceX - 0.4, 9.2, centerZ))
  for (let i = -4; i <= 4; i++) {
    group.add(
      mesh(new THREE.BoxGeometry(0.35, 14, 0.35), stone, faceX + 0.9, 8.5, centerZ + i * 2.2),
    )
  }
  group.add(mesh(new THREE.BoxGeometry(3.2, 1.15, 14.5), dark, faceX + 2.0, 4.7, centerZ))
  for (let i = 0; i < 11; i++) {
    group.add(
      mesh(
        new THREE.SphereGeometry(0.1, 8, 8),
        gold,
        faceX + 3.55,
        5.4,
        centerZ - 6.5 + i * 1.3,
      ),
    )
  }

  group.add(mesh(new THREE.BoxGeometry(0.35, 1.5, 12.8), dark, faceX + 3.85, 4.75, centerZ))
  const marquee = sign('RIVOLI', 12, 1.25, anisotropy, '#f6e4a8', '#0c0c0c', '#b08630')
  marquee.position.set(faceX + 4.1, 4.8, centerZ)
  marquee.rotation.y = faceSquare
  group.add(marquee)

  const subtitle = sign(
    'TEATRO MUNICIPAL DO PORTO',
    11,
    0.52,
    anisotropy,
    '#f3ebe0',
    '#2a1c18',
  )
  subtitle.position.set(faceX + 4.05, 3.9, centerZ)
  subtitle.rotation.y = faceSquare
  group.add(subtitle)

  for (let i = -2; i <= 2; i++) {
    group.add(
      mesh(
        new THREE.CylinderGeometry(0.34, 0.38, 4.4, 14),
        stone,
        faceX + 1.35,
        2.2,
        centerZ + i * 2.45,
      ),
    )
  }
  group.add(mesh(new THREE.BoxGeometry(2.4, 0.5, 13.5), stone, faceX + 1.35, 4.5, centerZ))

  for (let i = -1; i <= 1; i++) {
    group.add(
      mesh(new THREE.BoxGeometry(0.14, 2.7, 1.55), red, faceX + 0.55, 1.45, centerZ + i * 2.45),
    )
    group.add(
      mesh(new THREE.BoxGeometry(0.1, 1.15, 1.15), glass, faceX + 0.65, 2.1, centerZ + i * 2.45),
    )
  }

  for (const side of [-7.2, 7.2]) {
    group.add(mesh(new THREE.BoxGeometry(0.22, 2.6, 1.7), dark, faceX + 0.7, 2.1, centerZ + side))
    const poster = sign(
      side < 0 ? 'TEMPORADA 26/27' : 'BILHETEIRA',
      1.4,
      2.2,
      anisotropy,
      '#f7f1e4',
      side < 0 ? '#1f3a4a' : '#5a1d28',
    )
    poster.position.set(faceX + 0.85, 2.1, centerZ + side)
    poster.rotation.y = faceSquare
    group.add(poster)
  }

  const blade = sign('RIVOLI', 0.7, 5.5, anisotropy, '#f3e2a8', '#141414', '#7a5a20')
  blade.position.set(faceX + 4.9, 8.5, centerZ + 8.8)
  blade.rotation.y = faceSquare
  group.add(blade)

  group.position.y = groundY(faceX + 2, centerZ)
  return group
}

/** Millennium / Palácio Atlântico — glass grid + red signs on the north rim. */
export function buildMillennium(anisotropy: number): THREE.Group {
  const group = new THREE.Group()
  group.name = 'millennium'

  const by = STREET_Y
  const roofY = by + 42
  // North rim, façade facing south (+Z) into the square
  const faceZ = DECK.z0 - 3
  const faceX = 2
  const nx = 0
  const nz = 1
  const span = 48
  const tx = 1
  const tz = 0

  const stone = new THREE.MeshStandardMaterial({ color: 0xe8e4dc, roughness: 0.7 })
  const frame = new THREE.MeshStandardMaterial({
    color: 0x2a2e34,
    roughness: 0.42,
    metalness: 0.55,
  })
  const glass = new THREE.MeshStandardMaterial({
    color: 0x6a8494,
    roughness: 0.06,
    metalness: 0.88,
  })
  const red = new THREE.MeshStandardMaterial({
    color: 0xb01d28,
    emissive: 0x5a1018,
    emissiveIntensity: 0.25,
    roughness: 0.45,
  })

  // Mass behind the façade
  group.add(mesh(new THREE.BoxGeometry(span + 4, roofY - by, 12), stone, faceX, by + (roofY - by) / 2, faceZ - 6))

  const count = Math.max(5, Math.floor(span / 3.4))
  for (let i = 0; i < count; i++) {
    const t = (i - (count - 1) / 2) * (span / Math.max(1, count - 1))
    const cx = faceX + tx * t + nx * 1.85
    const cz = faceZ + tz * t + nz * 1.85
    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 5.4, 14), stone)
    column.position.set(cx, by + 2.7, cz)
    column.castShadow = true
    column.receiveShadow = true
    group.add(column)
  }

  const beam = new THREE.Mesh(new THREE.BoxGeometry(span + 1.2, 0.7, 2.2), stone)
  placeFacing(beam, faceX + nx * 1.85, by + 5.55, faceZ + nz * 1.85, nx, nz)
  beam.castShadow = true
  group.add(beam)

  const shopFront = new THREE.Mesh(new THREE.BoxGeometry(span * 0.92, 3.6, 0.25), glass)
  placeFacing(shopFront, faceX + nx * 0.55, by + 2.4, faceZ + nz * 0.55, nx, nz)
  group.add(shopFront)

  const floors = 10
  const bays = Math.max(8, Math.floor(span / 3.05))
  for (let f = 0; f < floors; f++) {
    for (let b = 0; b < bays; b++) {
      const t = (b - (bays - 1) / 2) * (span / Math.max(1, bays - 1))
      const wx = faceX + tx * t + nx * 0.42
      const wz = faceZ + tz * t + nz * 0.42
      const wy = by + 6.4 + f * 3.1
      const pane = new THREE.Mesh(new THREE.BoxGeometry(2.55, 2.55, 0.12), glass)
      placeFacing(pane, wx, wy, wz, nx, nz)
      const mullion = new THREE.Mesh(new THREE.BoxGeometry(2.7, 2.7, 0.08), frame)
      placeFacing(mullion, wx - nx * 0.06, wy, wz - nz * 0.06, nx, nz)
      group.add(mullion, pane)
    }
  }

  const bank = sign('Millennium', 16, 0.95, anisotropy, '#ffffff', '#b01d28')
  placeFacing(bank, faceX + nx * 2.45, by + 4.9, faceZ + nz * 2.45, nx, nz)
  group.add(bank)

  const parapetBoard = new THREE.Mesh(new THREE.BoxGeometry(Math.min(36, span * 0.78), 2.4, 1.1), red)
  placeFacing(parapetBoard, faceX + nx * 0.55, roofY + 0.2, faceZ + nz * 0.55, nx, nz)
  parapetBoard.castShadow = true
  group.add(parapetBoard)

  const roofSign = sign('Millennium', 28, 1.85, anisotropy, '#ffffff', '#b01d28')
  placeFacing(roofSign, faceX + nx * 1.2, roofY + 0.35, faceZ + nz * 1.2, nx, nz)
  group.add(roofSign)

  return group
}

function makeCorcel(anisotropy: number): THREE.Group {
  const bronze = new THREE.MeshStandardMaterial({
    color: 0x4a3426,
    metalness: 0.7,
    roughness: 0.5,
  })
  const stone = new THREE.MeshStandardMaterial({
    color: 0x6a4e44,
    roughness: 0.38,
    metalness: 0.06,
  })
  const group = new THREE.Group()

  const pedestalH = 4.6
  group.add(mesh(new THREE.BoxGeometry(2.9, 0.45, 2.1), stone, 0, 0.22, 0))
  group.add(mesh(new THREE.BoxGeometry(2.15, pedestalH, 1.55), stone, 0, 0.45 + pedestalH / 2, 0))
  group.add(mesh(new THREE.BoxGeometry(2.45, 0.28, 1.8), stone, 0, 0.45 + pedestalH + 0.14, 0))

  const plaque = new THREE.Mesh(
    new THREE.BoxGeometry(1.35, 0.42, 0.05),
    new THREE.MeshStandardMaterial({
      map: textTexture('OS CORCÉIS', anisotropy, '#f0e6d4', '#4a2c22'),
      roughness: 0.75,
    }),
  )
  plaque.position.set(0, 1.8, 0.82)
  plaque.castShadow = true
  group.add(plaque)

  const topY = 0.45 + pedestalH + 0.28
  const sculpture = new THREE.Group()
  sculpture.position.set(0, topY, 0)
  group.add(sculpture)

  const horse = new THREE.Group()
  horse.position.set(0, 1.05, 0)
  horse.rotation.x = -0.85
  sculpture.add(horse)

  horse.add(mesh(new THREE.SphereGeometry(0.48, 18, 14), bronze, 0, 0, 0))
  horse.children[0].scale.set(0.85, 0.95, 1.55)
  horse.add(mesh(new THREE.CylinderGeometry(0.14, 0.22, 0.7, 10), bronze, 0, 0.42, 0.68, 0.9))
  horse.add(mesh(new THREE.SphereGeometry(0.22, 14, 12), bronze, 0, 0.72, 0.98))
  horse.children[2].scale.set(0.8, 0.88, 1.4)
  horse.add(mesh(new THREE.SphereGeometry(0.11, 10, 8), bronze, 0, 0.64, 1.22))
  horse.children[3].scale.set(0.72, 0.65, 1.55)

  horse.add(mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.85, 8), bronze, -0.18, 0.35, 0.55, 1.05))
  horse.add(mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.85, 8), bronze, 0.18, 0.35, 0.55, 1.05))
  sculpture.add(mesh(new THREE.CylinderGeometry(0.09, 0.11, 1.05, 8), bronze, -0.2, 0.55, -0.45, 0.12))
  sculpture.add(mesh(new THREE.CylinderGeometry(0.09, 0.11, 1.05, 8), bronze, 0.2, 0.55, -0.45, 0.12))

  const rider = new THREE.Group()
  rider.position.set(0, 1.55, -0.05)
  rider.rotation.x = 0.4
  sculpture.add(rider)
  rider.add(mesh(new THREE.BoxGeometry(0.34, 0.48, 0.2), bronze, 0, 0.22, 0))
  rider.add(mesh(new THREE.SphereGeometry(0.14, 12, 10), bronze, 0, 0.55, 0.02))

  return group
}

/** Os Corcéis — bronze horses on the south rim, facing south (+Z). */
export function placeCorceis(anisotropy: number): THREE.Group {
  const group = new THREE.Group()
  group.name = 'corceis'
  for (const s of CORCELS) {
    const corcel = makeCorcel(anisotropy)
    corcel.position.set(s.x, groundY(s.x, s.z), s.z)
    // Horse mesh faces +Z by default = south in this coord system
    group.add(corcel)
  }
  return group
}

export function createLandmarks(scene: THREE.Scene, anisotropy: number): THREE.Group {
  const group = new THREE.Group()
  group.name = 'landmarks'
  group.add(buildRivoli(anisotropy))
  group.add(buildMillennium(anisotropy))
  group.add(placeCorceis(anisotropy))
  scene.add(group)
  return group
}
