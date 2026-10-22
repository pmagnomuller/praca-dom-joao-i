/**
 * Landmarks at correct levels: Millennium high north, Tubitek low south, Rivoli west.
 */
import * as THREE from 'three'
import { CORCELS, NORTH_Y, SOUTH_Y, SIDE_Y, groundY } from './plaza'
import { textTexture } from './textures'

function box(
  w: number,
  h: number,
  d: number,
  color: number,
  x: number,
  y: number,
  z: number,
): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: 0.82 }),
  )
  m.position.set(x, y, z)
  m.castShadow = true
  m.receiveShadow = true
  return m
}

function signPlane(
  label: string,
  w: number,
  h: number,
  anisotropy: number,
  fg: string,
  bg: string,
): THREE.Mesh {
  return new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({
      map: textTexture(label, anisotropy, fg, bg),
      roughness: 0.5,
    }),
  )
}

/** Palácio Atlântico / Millennium — high north rim. */
function buildAtlantico(anisotropy: number): THREE.Group {
  const g = new THREE.Group()
  g.name = 'atlantico'
  const h = 42
  const cx = 8
  const cz = -36
  g.add(box(58, h, 22, 0xd8d4cc, cx, NORTH_Y + h / 2, cz))
  const sign = signPlane('Millennium', 16, 1.2, anisotropy, '#ffffff', '#b01d28')
  sign.position.set(cx, NORTH_Y + 6, cz + 11.2)
  g.add(sign)
  return g
}

/** Teatro Rivoli — west side street (high). */
function buildRivoli(anisotropy: number): THREE.Group {
  const g = new THREE.Group()
  g.name = 'rivoli'
  const h = 26
  const cx = -52
  const cz = -10
  g.add(box(28, h, 36, 0xf0ebe3, cx, SIDE_Y + h / 2, cz))
  const sign = signPlane('RIVOLI', 9, 1.0, anisotropy, '#f6e4a8', '#121212')
  sign.position.set(cx + 14.2, SIDE_Y + 5.5, cz)
  sign.rotation.y = Math.PI / 2
  g.add(sign)
  return g
}

/** Tubitek — low south frontage (Praça D. João I 31). */
function buildTubitek(anisotropy: number): THREE.Group {
  const g = new THREE.Group()
  g.name = 'tubitek'
  const x = -18
  const z = 28
  const w = 8
  const d = 5
  const h = 4.2
  g.add(box(w, h, d, 0x171719, x, SOUTH_Y + h / 2, z))
  const yellow = new THREE.MeshStandardMaterial({ color: 0xe2b13a, roughness: 0.45 })
  const band = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 1.0, 0.35), yellow)
  band.position.set(x, SOUTH_Y + 3.7, z + d / 2)
  g.add(band)
  const sign = signPlane('TUBITEK', 6.2, 0.75, anisotropy, '#141414', '#e2b13a')
  sign.position.set(x, SOUTH_Y + 3.75, z + d / 2 + 0.22)
  g.add(sign)
  return g
}

/** South block mass behind Tubitek (still on the low side). */
function buildSouth(): THREE.Group {
  const g = new THREE.Group()
  g.name = 'south-front'
  g.add(box(55, 28, 12, 0xc4b8a4, 8, SOUTH_Y + 14, 36))
  return g
}

function makeCorcel(): THREE.Group {
  const stone = new THREE.MeshStandardMaterial({ color: 0x5c453c, roughness: 0.45 })
  const bronze = new THREE.MeshStandardMaterial({
    color: 0x4a3426,
    metalness: 0.65,
    roughness: 0.5,
  })
  const g = new THREE.Group()
  const pedestal = new THREE.Mesh(new THREE.BoxGeometry(1.8, 3.6, 1.3), stone)
  pedestal.position.y = 1.8
  pedestal.castShadow = true
  g.add(pedestal)
  const horse = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), bronze)
  horse.scale.set(0.7, 0.85, 1.3)
  horse.position.set(0, 4.0, 0.05)
  horse.castShadow = true
  g.add(horse)
  return g
}

export function createLandmarks(scene: THREE.Scene, anisotropy: number): THREE.Group {
  const group = new THREE.Group()
  group.name = 'landmarks'
  group.add(buildAtlantico(anisotropy))
  group.add(buildRivoli(anisotropy))
  group.add(buildTubitek(anisotropy))
  group.add(buildSouth())

  const corceis = new THREE.Group()
  corceis.name = 'corceis'
  for (const s of CORCELS) {
    const c = makeCorcel()
    c.position.set(s.x, groundY(s.x, s.z), s.z)
    corceis.add(c)
  }
  group.add(corceis)

  scene.add(group)
  return group
}
