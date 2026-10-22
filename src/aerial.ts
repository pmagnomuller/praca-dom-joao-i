import * as THREE from 'three'
import { MAP_RADIUS_M, ORIGIN } from './config'
import { latLonToLocal, latLonToTile, tileBounds } from './geo'
import { STREET_Y, openAerialOverDeck, overDeckPad } from './plaza'

const ZOOM = 18

/** Esri World Imagery — free for non-commercial / attribution required */
function tileUrl(x: number, y: number, z: number): string {
  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`
}

async function loadTileTexture(url: string): Promise<THREE.Texture> {
  const loader = new THREE.TextureLoader()
  loader.crossOrigin = 'anonymous'
  const tex = await loader.loadAsync(url)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.minFilter = THREE.LinearFilter
  tex.magFilter = THREE.LinearFilter
  tex.generateMipmaps = false
  return tex
}

export async function createAerialGround(
  scene: THREE.Scene,
  onProgress?: (msg: string) => void,
): Promise<THREE.Group> {
  onProgress?.('Loading aerial imagery…')

  const group = new THREE.Group()
  group.name = 'aerial-ground'

  const center = latLonToTile(ORIGIN.lat, ORIGIN.lon, ZOOM)
  // Tight tile set — just the square (~110 m radius)
  const span = 2

  const tiles: Promise<void>[] = []
  let loaded = 0
  const total = (span * 2 + 1) ** 2

  for (let dx = -span; dx <= span; dx++) {
    for (let dy = -span; dy <= span; dy++) {
      const tx = center.x + dx
      const ty = center.y + dy
      const bounds = tileBounds(tx, ty, ZOOM)
      const nw = latLonToLocal(bounds.north, bounds.west)
      const se = latLonToLocal(bounds.south, bounds.east)
      const width = se.x - nw.x
      const depth = se.z - nw.z
      const cx = (nw.x + se.x) / 2
      const cz = (nw.z + se.z) / 2

      if (Math.hypot(cx, cz) > MAP_RADIUS_M + 40) continue
      if (overDeckPad(cx, cz)) continue

      tiles.push(
        (async () => {
          try {
            const tex = await loadTileTexture(tileUrl(tx, ty, ZOOM))
            const geo = new THREE.PlaneGeometry(Math.abs(width), Math.abs(depth))
            const mat = new THREE.MeshStandardMaterial({
              map: tex,
              roughness: 0.95,
              metalness: 0,
            })
            const mesh = new THREE.Mesh(geo, mat)
            mesh.rotation.x = -Math.PI / 2
            mesh.position.set(cx, STREET_Y, cz)
            mesh.receiveShadow = true
            group.add(mesh)
          } catch {
            const geo = new THREE.PlaneGeometry(Math.abs(width), Math.abs(depth))
            const mat = new THREE.MeshStandardMaterial({
              color: 0x6a6a62,
              roughness: 1,
            })
            const mesh = new THREE.Mesh(geo, mat)
            mesh.rotation.x = -Math.PI / 2
            mesh.position.set(cx, STREET_Y, cz)
            group.add(mesh)
          } finally {
            loaded++
            if (loaded % 3 === 0) {
              onProgress?.(`Loading aerial imagery… ${loaded}/${total}`)
            }
          }
        })(),
      )
    }
  }

  await Promise.all(tiles)
  openAerialOverDeck(group)
  scene.add(group)
  return group
}
