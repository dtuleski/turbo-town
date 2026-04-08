// ── Color by Number Data ─────────────────────────────────────────────────────
// Real photos pixelized at runtime into color-by-number grids

export interface PhotoDesign {
  id: string
  name: string
  emoji: string
  // We render the emoji to canvas for pixelization
}

export const PHOTO_DESIGNS: PhotoDesign[] = [
  { id: 'car', name: 'Race Car', emoji: '🏎️' },
  { id: 'rainbow', name: 'Rainbow', emoji: '🌈' },
  { id: 'rocket', name: 'Rocket', emoji: '🚀' },
  { id: 'sunflower', name: 'Sunflower', emoji: '🌻' },
  { id: 'butterfly', name: 'Butterfly', emoji: '🦋' },
  { id: 'parrot', name: 'Parrot', emoji: '🦜' },
  { id: 'house', name: 'House', emoji: '🏠' },
  { id: 'fish', name: 'Tropical Fish', emoji: '🐠' },
  { id: 'lion', name: 'Lion', emoji: '🦁' },
  { id: 'tree', name: 'Christmas Tree', emoji: '🎄' },
  { id: 'cake', name: 'Birthday Cake', emoji: '🎂' },
  { id: 'unicorn', name: 'Unicorn', emoji: '🦄' },
  { id: 'dragon', name: 'Dragon', emoji: '🐉' },
  { id: 'robot', name: 'Robot', emoji: '🤖' },
  { id: 'earth', name: 'Earth', emoji: '🌍' },
]

export const DIFFICULTY_CONFIG = {
  easy: { label: 'Easy', gridSize: 16, colors: 6, emoji: '🟢', desc: '16×16 grid · 6 colors' },
  medium: { label: 'Medium', gridSize: 24, colors: 9, emoji: '🟡', desc: '24×24 grid · 9 colors' },
  hard: { label: 'Hard', gridSize: 40, colors: 14, emoji: '🔴', desc: '40×40 grid · 14 colors' },
}

// ── PIXELIZER ─────────────────────────────────────────────────────────────────
// Loads an image, downscales to grid size, quantizes colors

export interface PixelizedResult {
  grid: number[][] // color index per cell (1-based, 0 = unused)
  palette: string[] // hex colors, index 0 = background
}

export function pixelizeImage(
  emojiOrUrl: string,
  gridSize: number,
  numColors: number
): PixelizedResult {
  // Render emoji to a high-res canvas, then downscale to grid size
  const hiRes = 256 // render emoji at this size first
  const srcCanvas = document.createElement('canvas')
  srcCanvas.width = hiRes
  srcCanvas.height = hiRes
  const srcCtx = srcCanvas.getContext('2d')!

  // Fill with white background
  srcCtx.fillStyle = '#FFFFFF'
  srcCtx.fillRect(0, 0, hiRes, hiRes)

  // Draw emoji centered
  srcCtx.font = `${hiRes * 0.85}px serif`
  srcCtx.textAlign = 'center'
  srcCtx.textBaseline = 'middle'
  srcCtx.fillText(emojiOrUrl, hiRes / 2, hiRes / 2 + hiRes * 0.05)

  // Downscale to grid size
  const canvas = document.createElement('canvas')
  canvas.width = gridSize
  canvas.height = gridSize
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(srcCanvas, 0, 0, gridSize, gridSize)

  // Extract pixel data
  const imageData = ctx.getImageData(0, 0, gridSize, gridSize)
  const pixels: [number, number, number][] = []
  for (let i = 0; i < imageData.data.length; i += 4) {
    pixels.push([imageData.data[i], imageData.data[i + 1], imageData.data[i + 2]])
  }

  // Quantize colors using median cut
  const palette = medianCut(pixels, numColors)

  // Map each pixel to nearest palette color
  const grid: number[][] = []
  for (let r = 0; r < gridSize; r++) {
    const row: number[] = []
    for (let c = 0; c < gridSize; c++) {
      const px = pixels[r * gridSize + c]
      const colorIdx = findNearestColor(px, palette)
      row.push(colorIdx + 1) // 1-based
    }
    grid.push(row)
  }

  // Build hex palette (index 0 = unused placeholder)
  const hexPalette = ['#FFFFFF', ...palette.map(([r, g, b]) =>
    '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
  )]

  return { grid, palette: hexPalette }
}

// ── Median Cut Color Quantization ───────────────────────────────────────────

function medianCut(pixels: [number, number, number][], numColors: number): [number, number, number][] {
  if (pixels.length === 0) return [[128, 128, 128]]

  let buckets: [number, number, number][][] = [pixels]

  while (buckets.length < numColors) {
    // Find bucket with largest range
    let maxRange = -1
    let maxIdx = 0
    let maxChannel = 0

    for (let i = 0; i < buckets.length; i++) {
      const bucket = buckets[i]
      if (bucket.length < 2) continue
      for (let ch = 0; ch < 3; ch++) {
        const vals = bucket.map(p => p[ch])
        const range = Math.max(...vals) - Math.min(...vals)
        if (range > maxRange) {
          maxRange = range
          maxIdx = i
          maxChannel = ch
        }
      }
    }

    if (maxRange <= 0) break

    // Split the bucket at median of the widest channel
    const bucket = buckets[maxIdx]
    bucket.sort((a, b) => a[maxChannel] - b[maxChannel])
    const mid = Math.floor(bucket.length / 2)
    buckets.splice(maxIdx, 1, bucket.slice(0, mid), bucket.slice(mid))
  }

  // Average each bucket to get palette colors
  return buckets.map(bucket => {
    const avg: [number, number, number] = [0, 0, 0]
    for (const px of bucket) {
      avg[0] += px[0]
      avg[1] += px[1]
      avg[2] += px[2]
    }
    return [
      Math.round(avg[0] / bucket.length),
      Math.round(avg[1] / bucket.length),
      Math.round(avg[2] / bucket.length),
    ] as [number, number, number]
  }).filter((color, i, arr) => {
    // Remove colors that are too similar to a previous one (min distance 30)
    for (let j = 0; j < i; j++) {
      const dr = color[0] - arr[j][0], dg = color[1] - arr[j][1], db = color[2] - arr[j][2]
      if (Math.sqrt(dr*dr + dg*dg + db*db) < 30) return false
    }
    return true
  })
}

function findNearestColor(pixel: [number, number, number], palette: [number, number, number][]): number {
  let minDist = Infinity
  let minIdx = 0
  for (let i = 0; i < palette.length; i++) {
    const dr = pixel[0] - palette[i][0]
    const dg = pixel[1] - palette[i][1]
    const db = pixel[2] - palette[i][2]
    const dist = dr * dr + dg * dg + db * db
    if (dist < minDist) {
      minDist = dist
      minIdx = i
    }
  }
  return minIdx
}
