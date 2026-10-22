import * as THREE from 'three'
import { createLandmarks } from './landmarks'
import { PLAZA_SPAWN, createSunkenPlaza } from './plaza'
import { Player } from './player'

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
scene.background = new THREE.Color(0x8aa3c0)
scene.fog = new THREE.Fog(0x8aa3c0, 80, 220)

const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.1,
  500,
)

const hemi = new THREE.HemisphereLight(0xe8f0ff, 0x8a7a60, 1.0)
scene.add(hemi)

const sun = new THREE.DirectionalLight(0xfff2dd, 1.2)
sun.position.set(40, 80, 30)
sun.castShadow = true
sun.shadow.mapSize.set(1024, 1024)
sun.shadow.camera.near = 5
sun.shadow.camera.far = 200
sun.shadow.camera.left = -80
sun.shadow.camera.right = 80
sun.shadow.camera.top = 80
sun.shadow.camera.bottom = -80
scene.add(sun)

const player = new Player(camera, document.body)

function drawMinimap(): void {
  const w = minimapCanvas.width
  const h = minimapCanvas.height
  const scale = w / 120
  const cx = w / 2
  const cy = h / 2
  minimapCtx.fillStyle = 'rgba(12, 18, 28, 0.85)'
  minimapCtx.fillRect(0, 0, w, h)

  // Deck rectangle (local: +Z south → down on minimap)
  minimapCtx.strokeStyle = 'rgba(200, 190, 170, 0.8)'
  minimapCtx.strokeRect(cx - 28 * scale, cy - 16 * scale, 54 * scale, 34 * scale)

  const px = player.camera.position.x
  const pz = player.camera.position.z
  minimapCtx.fillStyle = '#c45c26'
  minimapCtx.beginPath()
  minimapCtx.arc(cx + px * scale, cy + pz * scale, 4, 0, Math.PI * 2)
  minimapCtx.fill()

  const dir = new THREE.Vector3()
  player.camera.getWorldDirection(dir)
  minimapCtx.strokeStyle = '#f2efe8'
  minimapCtx.beginPath()
  minimapCtx.moveTo(cx + px * scale, cy + pz * scale)
  minimapCtx.lineTo(cx + px * scale + dir.x * 12, cy + pz * scale + dir.z * 12)
  minimapCtx.stroke()
}

function boot(): void {
  setStatus('Building the square…')
  createSunkenPlaza(scene)
  const anisotropy = renderer.capabilities.getMaxAnisotropy()
  createLandmarks(scene, anisotropy)

  player.setColliders([
    { minX: -21, maxX: 37, minZ: -47, maxZ: -25 }, // Atlântico (high)
    { minX: -66, maxX: -38, minZ: -28, maxZ: 8 }, // Rivoli
    { minX: -22, maxX: -14, minZ: 25.5, maxZ: 30.5 }, // Tubitek
    { minX: -20, maxX: 35, minZ: 30, maxZ: 42 }, // south block
  ])

  player.spawnAt(PLAZA_SPAWN.x, PLAZA_SPAWN.z, PLAZA_SPAWN.yaw, PLAZA_SPAWN.pitch)
  streetLabelEl.textContent = 'Praça de Dom João I'
  streetLabelEl.classList.add('visible')

  setStatus('Ready — Tubitek side (low), Millennium ahead (high), stairs on the sides')
  startBtn.disabled = false
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

  minimapAccum += dt
  if (minimapAccum > 0.1 && !hud.hidden) {
    minimapAccum = 0
    drawMinimap()
  }

  renderer.render(scene, camera)
}

animate()
boot()
