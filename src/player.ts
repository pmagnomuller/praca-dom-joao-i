import * as THREE from 'three'
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js'
import { EYE_HEIGHT, RUN_SPEED, WALK_SPEED } from './config'
import type { BuildingColliders } from './buildings'
import { PLAZA_SPAWN, groundY } from './plaza'

const PLAYER_RADIUS = 0.45

export class Player {
  readonly controls: PointerLockControls
  readonly camera: THREE.PerspectiveCamera
  private velocity = new THREE.Vector3()
  private direction = new THREE.Vector3()
  private moveForward = false
  private moveBackward = false
  private moveLeft = false
  private moveRight = false
  private sprint = false
  private colliders: BuildingColliders['boxes'] = []

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera
    this.controls = new PointerLockControls(camera, domElement)
    this.spawnAt(PLAZA_SPAWN.x, PLAZA_SPAWN.z, PLAZA_SPAWN.yaw, PLAZA_SPAWN.pitch)

    const onKey = (e: KeyboardEvent, down: boolean) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.moveForward = down
          break
        case 'KeyS':
        case 'ArrowDown':
          this.moveBackward = down
          break
        case 'KeyA':
        case 'ArrowLeft':
          this.moveLeft = down
          break
        case 'KeyD':
        case 'ArrowRight':
          this.moveRight = down
          break
        case 'ShiftLeft':
        case 'ShiftRight':
          this.sprint = down
          break
      }
    }

    document.addEventListener('keydown', (e) => onKey(e, true))
    document.addEventListener('keyup', (e) => onKey(e, false))
  }

  setColliders(boxes: BuildingColliders['boxes']): void {
    this.colliders = boxes
  }

  spawnAt(x: number, z: number, yaw = 0, pitch = 0): void {
    this.camera.position.set(x, groundY(x, z) + EYE_HEIGHT, z)
    this.camera.rotation.set(pitch, yaw, 0)
  }

  lock(): void {
    this.controls.lock()
  }

  get locked(): boolean {
    return this.controls.isLocked
  }

  private resolveCollision(pos: THREE.Vector3): void {
    for (const b of this.colliders) {
      const nearestX = Math.max(b.minX, Math.min(pos.x, b.maxX))
      const nearestZ = Math.max(b.minZ, Math.min(pos.z, b.maxZ))
      const dx = pos.x - nearestX
      const dz = pos.z - nearestZ
      const distSq = dx * dx + dz * dz
      if (distSq < PLAYER_RADIUS * PLAYER_RADIUS) {
        // Inside AABB — push out along shortest axis
        if (distSq < 1e-8) {
          const left = pos.x - b.minX
          const right = b.maxX - pos.x
          const top = pos.z - b.minZ
          const bottom = b.maxZ - pos.z
          const m = Math.min(left, right, top, bottom)
          if (m === left) pos.x = b.minX - PLAYER_RADIUS
          else if (m === right) pos.x = b.maxX + PLAYER_RADIUS
          else if (m === top) pos.z = b.minZ - PLAYER_RADIUS
          else pos.z = b.maxZ + PLAYER_RADIUS
        } else {
          const dist = Math.sqrt(distSq)
          const push = (PLAYER_RADIUS - dist) / dist
          pos.x += dx * push
          pos.z += dz * push
        }
      }
    }
  }

  update(dt: number): void {
    if (!this.controls.isLocked) return

    const speed = this.sprint ? RUN_SPEED : WALK_SPEED
    this.velocity.x -= this.velocity.x * 10.0 * dt
    this.velocity.z -= this.velocity.z * 10.0 * dt

    this.direction.z = Number(this.moveForward) - Number(this.moveBackward)
    this.direction.x = Number(this.moveRight) - Number(this.moveLeft)
    this.direction.normalize()

    if (this.moveForward || this.moveBackward) {
      this.velocity.z -= this.direction.z * speed * 10 * dt
    }
    if (this.moveLeft || this.moveRight) {
      this.velocity.x -= this.direction.x * speed * 10 * dt
    }

    this.controls.moveRight(-this.velocity.x * dt)
    this.controls.moveForward(-this.velocity.z * dt)

    this.resolveCollision(this.camera.position)
    const gy = groundY(this.camera.position.x, this.camera.position.z)
    this.camera.position.y = gy + EYE_HEIGHT
  }
}
