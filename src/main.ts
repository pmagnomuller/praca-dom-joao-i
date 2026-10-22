import * as THREE from 'three'
import { createAerialGround } from './aerial'
import { createBuildings } from './buildings'
import { MAP_RADIUS_M } from './config'
import { createLandmarks } from './landmarks'
import { fetchMapData } from './overpass'
import { PLAZA_SPAWN, createSunkenPlaza } from './plaza'
import { Player } from './player'
import { createRoadsAndPlazas, type StreetLabel } from './roads'

const canvas = document.querySelector<HTMLCanvasElement>('#c')!
const overlay = document.querySelector<HTMLDivElement>('#overlay')!
const statusEl = document.querySelector<HTMLParagraphElement>('#status')!
const startBtn = document.querySelector<HTMLButtonElement>('#start')!
const hud = document.querySelector<HTMLDivElement>('#hud')!
const streetLabelEl = document.querySelector<HTMLDivElement>('#street-label')!
const minimapCanvas = document.querySelector<HTMLCanvasElement>('#minimap-c')!
const minimapCtx = minimapCanvas.getContext('2d')!

function setStatus(msg: string): void {
  statusEl.textContent = msg
}

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
})
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.05

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x87a0c0)
scene.fog = new THREE.FogExp2(0x9bb0c8, 0.0018)

const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.1,
  2000,
)

const hemi = new THREE.HemisphereLight(0xddeeff, 0x8a7a60, 0.85)
scene.add(hemi)

const sun = new THREE.DirectionalLight(0xfff2dd, 1.35)
sun.position.set(80, 120, 40)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
sun.shadow.camera.near = 10
sun.shadow.camera.far = 400
sun.shadow.camera.left = -200
sun.shadow.camera.right = 200
sun.shadow.camera.top = 200
sun.shadow.camera.bottom = -200
scene.add(sun)

// Soft sky dome
{
  const skyGeo = new THREE.SphereGeometry(900, 32, 16)
  const skyMat = new THREE.MeshBasicMaterial({
    color: 0x7ea0c8,
    side: THREE.BackSide,
    depthWrite: false,
  })
  scene.add(new THREE.Mesh(skyGeo, skyMat))
}

const player = new Player(camera, document.body)
let streetLabels: StreetLabel[] = []
let lastLabel = ''
let labelTimer = 0

// Minimap road polylines in local coords
let minimapRoads: { x: number; z: number }[][] = []

function drawMinimap(): void {
  const w = minimapCanvas.width
  const h = minimapCanvas.height
  const scale = w / (MAP_RADIUS_M * 1.4)
  const cx = w / 2
  const cy = h / 2

  minimapCtx.fillStyle = 'rgba(12, 18, 28, 0.85)'
  minimapCtx.fillRect(0, 0, w, h)

  const px = player.camera.position.x
  const pz = player.camera.position.z

  minimapCtx.strokeStyle = 'rgba(180, 190, 200, 0.55)'
  minimapCtx.lineWidth = 1
  for (const road of minimapRoads) {
    if (road.length < 2) continue
    minimapCtx.beginPath()
    for (let i = 0; i < road.length; i++) {
      const x = cx + (road[i].x - px) * scale
      const y = cy + (road[i].z - pz) * scale
      if (i === 0) minimapCtx.moveTo(x, y)
      else minimapCtx.lineTo(x, y)
    }
    minimapCtx.stroke()
  }

  // Player
  minimapCtx.fillStyle = '#c45c26'
  minimapCtx.beginPath()
  minimapCtx.arc(cx, cy, 4, 0, Math.PI * 2)
  minimapCtx.fill()

  // Facing direction
  const dir = new THREE.Vector3()
  player.camera.getWorldDirection(dir)
  minimapCtx.strokeStyle = '#f2efe8'
  minimapCtx.beginPath()
  minimapCtx.moveTo(cx, cy)
  minimapCtx.lineTo(cx + dir.x * 14, cy + dir.z * 14)
  minimapCtx.stroke()
}

function updateStreetLabel(dt: number): void {
  const px = player.camera.position.x
  const pz = player.camera.position.z
  let best: StreetLabel | null = null
  let bestD = 80
  for (const s of streetLabels) {
    const d = Math.hypot(s.x - px, s.z - pz)
    if (d < bestD) {
      bestD = d
      best = s
    }
  }
  if (best && best.name !== lastLabel) {
    lastLabel = best.name
    streetLabelEl.textContent = best.name
    streetLabelEl.classList.add('visible')
    labelTimer = 2.5
  }
  if (labelTimer > 0) {
    labelTimer -= dt
    if (labelTimer <= 0) streetLabelEl.classList.remove('visible')
  }
}

async function boot(): Promise<void> {
  try {
    await createAerialGround(scene, setStatus)
    createSunkenPlaza(scene)

    const data = await fetchMapData(setStatus)
    setStatus(`Building city… ${data.buildings.length} buildings, ${data.roads.length} streets`)

    const { boxes } = createBuildings(scene, data.buildings)
    player.setColliders(boxes)
    streetLabels = createRoadsAndPlazas(scene, data.roads, data.plazas)
    minimapRoads = data.roads.map((r) => r.points)

    const anisotropy = renderer.capabilities.getMaxAnisotropy()
    createLandmarks(scene, anisotropy)

    // South rim spawn looking north (−Z) at Millennium across the sunken deck
    player.spawnAt(PLAZA_SPAWN.x, PLAZA_SPAWN.z, PLAZA_SPAWN.yaw, PLAZA_SPAWN.pitch)

    setStatus('Ready — click below to walk the praça')
    startBtn.disabled = false
  } catch (err) {
    console.error(err)
    setStatus(
      err instanceof Error
        ? `Failed to load: ${err.message}`
        : 'Failed to load map data',
    )
  }
}

startBtn.addEventListener('click', () => {
  player.lock()
})

player.controls.addEventListener('lock', () => {
  overlay.classList.add('hidden')
  hud.hidden = false
})

player.controls.addEventListener('unlock', () => {
  overlay.classList.remove('hidden')
  hud.hidden = true
  setStatus('Paused — click to continue walking')
  startBtn.disabled = false
  startBtn.textContent = 'Continue'
})

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

const clock = new THREE.Clock()
let minimapAccum = 0

function animate(): void {
  requestAnimationFrame(animate)
  const dt = Math.min(clock.getDelta(), 0.05)
  player.update(dt)
  updateStreetLabel(dt)

  minimapAccum += dt
  if (minimapAccum > 0.1 && !hud.hidden) {
    minimapAccum = 0
    drawMinimap()
  }

  renderer.render(scene, camera)
}

animate()
void boot()
