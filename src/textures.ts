import { CanvasTexture, ClampToEdgeWrapping, SRGBColorSpace } from 'three'

/** Simple labeled sign texture for landmark marquees. */
export function textTexture(
  label: string,
  anisotropy: number,
  foreground: string,
  background: string,
): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 256
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = background
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.strokeStyle = foreground
  ctx.lineWidth = 18
  ctx.strokeRect(16, 16, canvas.width - 32, canvas.height - 32)
  ctx.fillStyle = foreground
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  let size = 120
  do {
    ctx.font = `700 ${size}px Palatino, "Palatino Linotype", Georgia, serif`
    if (ctx.measureText(label).width <= canvas.width - 96) break
    size -= 4
  } while (size > 36)
  ctx.fillText(label, canvas.width / 2, canvas.height / 2 + 4)

  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  tex.wrapS = ClampToEdgeWrapping
  tex.wrapT = ClampToEdgeWrapping
  tex.anisotropy = anisotropy
  return tex
}
