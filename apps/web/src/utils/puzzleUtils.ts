/**
 * Jigsaw Puzzle Utilities
 * Handles image slicing, piece management, and puzzle logic
 */

export type PuzzleDifficulty = 'easy' | 'medium' | 'hard'

export interface PuzzlePiece {
  id: number        // unique piece index (0-based, row-major)
  row: number       // correct row position
  col: number       // correct col position
  currentRow: number | null  // current placed row (null = in tray)
  currentCol: number | null  // current placed col (null = in tray)
}

export interface PuzzleImage {
  id: string
  name: string
  emoji: string
  src: string       // URL or import path
}

export const GRID_SIZES: Record<PuzzleDifficulty, number> = {
  easy: 3,    // 3x3 = 9 pieces
  medium: 4,  // 4x4 = 16 pieces
  hard: 5,    // 5x5 = 25 pieces
}

/**
 * Generate SVG-based puzzle images (no external assets needed)
 * Each returns an SVG data URL that can be used as an image source
 */
export const PUZZLE_IMAGES: PuzzleImage[] = [
  { id: 'sunset', name: 'Sunset Beach', emoji: '🌅', src: '' },
  { id: 'mountains', name: 'Mountains', emoji: '🏔️', src: '' },
  { id: 'forest', name: 'Enchanted Forest', emoji: '🌲', src: '' },
  { id: 'ocean', name: 'Ocean Waves', emoji: '🌊', src: '' },
  { id: 'space', name: 'Outer Space', emoji: '🚀', src: '' },
  { id: 'garden', name: 'Flower Garden', emoji: '🌸', src: '' },
  { id: 'city', name: 'City Skyline', emoji: '🏙️', src: '' },
  { id: 'arctic', name: 'Arctic Aurora', emoji: '❄️', src: '' },
]

/** Generate a colorful SVG scene as a data URL */
export function generatePuzzleImageSVG(imageId: string, size: number = 400): string {
  const scenes: Record<string, string> = {
    sunset: `
      <rect width="400" height="400" fill="#1a0533"/>
      <rect width="400" height="200" y="200" fill="#ff6b35"/>
      <circle cx="200" cy="200" r="60" fill="#ffdd00"/>
      <rect width="400" height="80" y="320" fill="#0077b6"/>
      <ellipse cx="100" cy="100" rx="60" ry="30" fill="#ff8fa3" opacity="0.6"/>
      <ellipse cx="300" cy="80" rx="50" ry="20" fill="#ff8fa3" opacity="0.5"/>
      <rect x="50" y="280" width="4" height="120" fill="#2d1b00"/>
      <ellipse cx="52" cy="270" rx="20" ry="15" fill="#228b22"/>
      <rect x="340" y="300" width="4" height="100" fill="#2d1b00"/>
      <ellipse cx="342" cy="290" rx="18" ry="12" fill="#228b22"/>
      <circle cx="200" cy="200" r="65" fill="none" stroke="#ffaa00" stroke-width="3" opacity="0.4"/>
    `,
    mountains: `
      <rect width="400" height="400" fill="#87ceeb"/>
      <rect width="400" height="120" y="280" fill="#228b22"/>
      <polygon points="50,280 150,100 250,280" fill="#6b7b8d"/>
      <polygon points="150,280 280,60 400,280" fill="#8b95a1"/>
      <polygon points="280,60 320,120 280,140" fill="white" opacity="0.9"/>
      <polygon points="150,100 180,140 150,160" fill="white" opacity="0.9"/>
      <circle cx="320" cy="60" r="30" fill="#ffdd00"/>
      <ellipse cx="80" cy="50" rx="40" ry="15" fill="white" opacity="0.8"/>
      <ellipse cx="300" cy="40" rx="35" ry="12" fill="white" opacity="0.7"/>
      <rect x="180" y="320" width="40" height="50" fill="#8b4513"/>
      <polygon points="170,320 220,320 200,290" fill="#b22222"/>
      <circle cx="60" cy="350" r="8" fill="#ff6347"/>
      <circle cx="340" cy="340" r="6" fill="#ff69b4"/>
    `,
    forest: `
      <rect width="400" height="400" fill="#0d3b0d"/>
      <rect width="400" height="100" y="300" fill="#3d2b1f"/>
      <polygon points="80,300 100,120 120,300" fill="#1a6b1a"/>
      <polygon points="60,300 100,80 140,300" fill="#228b22"/>
      <polygon points="180,300 200,100 220,300" fill="#1a6b1a"/>
      <polygon points="160,300 200,60 240,300" fill="#2d8b2d"/>
      <polygon points="280,300 310,140 340,300" fill="#1a6b1a"/>
      <polygon points="260,300 310,90 360,300" fill="#228b22"/>
      <rect x="95" y="300" width="10" height="40" fill="#5c3a1e"/>
      <rect x="195" y="300" width="10" height="40" fill="#5c3a1e"/>
      <rect x="305" y="300" width="10" height="40" fill="#5c3a1e"/>
      <circle cx="150" cy="350" r="12" fill="#ff4500" opacity="0.8"/>
      <circle cx="250" cy="360" r="8" fill="#ff6347" opacity="0.7"/>
      <circle cx="50" cy="30" r="15" fill="#ffdd00" opacity="0.3"/>
      <circle cx="350" cy="50" r="10" fill="#ffdd00" opacity="0.2"/>
    `,
    ocean: `
      <rect width="400" height="400" fill="#006994"/>
      <rect width="400" height="200" y="0" fill="#87ceeb"/>
      <ellipse cx="100" cy="40" rx="50" ry="18" fill="white" opacity="0.8"/>
      <ellipse cx="300" cy="60" rx="40" ry="14" fill="white" opacity="0.7"/>
      <path d="M0,200 Q50,180 100,200 Q150,220 200,200 Q250,180 300,200 Q350,220 400,200 L400,250 Q350,270 300,250 Q250,230 200,250 Q150,270 100,250 Q50,230 0,250 Z" fill="#0077b6"/>
      <path d="M0,250 Q50,230 100,250 Q150,270 200,250 Q250,230 300,250 Q350,270 400,250 L400,300 Q350,320 300,300 Q250,280 200,300 Q150,320 100,300 Q50,280 0,300 Z" fill="#005f8d"/>
      <path d="M0,300 Q50,280 100,300 Q150,320 200,300 Q250,280 300,300 Q350,320 400,300 L400,400 L0,400 Z" fill="#004a73"/>
      <circle cx="320" cy="320" r="20" fill="#ff6347" opacity="0.6"/>
      <polygon points="320,300 325,310 315,310" fill="#ff6347" opacity="0.6"/>
      <circle cx="80" cy="350" r="15" fill="#ffd700" opacity="0.4"/>
    `,
    space: `
      <rect width="400" height="400" fill="#0a0a2e"/>
      <circle cx="2" cy="2" r="1" fill="white"/><circle cx="50" cy="30" r="1.5" fill="white"/>
      <circle cx="120" cy="15" r="1" fill="white"/><circle cx="200" cy="50" r="2" fill="#ffd700"/>
      <circle cx="300" cy="20" r="1" fill="white"/><circle cx="350" cy="80" r="1.5" fill="white"/>
      <circle cx="80" cy="100" r="1" fill="white"/><circle cx="380" cy="150" r="1" fill="white"/>
      <circle cx="30" cy="200" r="1.5" fill="white"/><circle cx="170" cy="120" r="1" fill="white"/>
      <circle cx="250" cy="180" r="2" fill="#87ceeb"/><circle cx="370" cy="250" r="1" fill="white"/>
      <circle cx="200" cy="220" r="50" fill="#c0392b"/>
      <circle cx="185" cy="210" r="8" fill="#a93226" opacity="0.7"/>
      <circle cx="220" cy="240" r="12" fill="#e74c3c" opacity="0.5"/>
      <circle cx="100" cy="300" r="30" fill="#3498db"/>
      <circle cx="90" cy="290" r="10" fill="#2ecc71" opacity="0.6"/>
      <ellipse cx="100" cy="300" rx="40" ry="5" fill="#bdc3c7" opacity="0.3"/>
      <circle cx="320" cy="350" r="20" fill="#f39c12"/>
      <circle cx="315" cy="345" r="5" fill="#e67e22" opacity="0.6"/>
    `,
    garden: `
      <rect width="400" height="400" fill="#87ceeb"/>
      <rect width="400" height="180" y="220" fill="#228b22"/>
      <circle cx="80" cy="260" r="20" fill="#ff69b4"/>
      <circle cx="80" cy="260" r="8" fill="#ffd700"/>
      <rect x="78" y="280" width="4" height="40" fill="#228b22"/>
      <circle cx="160" cy="240" r="18" fill="#ff4500"/>
      <circle cx="160" cy="240" r="7" fill="#ffd700"/>
      <rect x="158" y="258" width="4" height="50" fill="#228b22"/>
      <circle cx="240" cy="250" r="22" fill="#da70d6"/>
      <circle cx="240" cy="250" r="9" fill="#ffd700"/>
      <rect x="238" y="272" width="4" height="45" fill="#228b22"/>
      <circle cx="320" cy="235" r="16" fill="#ff1493"/>
      <circle cx="320" cy="235" r="6" fill="#ffd700"/>
      <rect x="318" y="251" width="4" height="55" fill="#228b22"/>
      <circle cx="50" cy="50" r="30" fill="#ffdd00"/>
      <ellipse cx="200" cy="30" rx="50" ry="18" fill="white" opacity="0.7"/>
      <path d="M0,380 Q100,360 200,380 Q300,400 400,380 L400,400 L0,400 Z" fill="#1a6b1a"/>
      <circle cx="370" cy="280" r="12" fill="#ff6347"/>
      <circle cx="370" cy="280" r="5" fill="#ffd700"/>
    `,
    city: `
      <rect width="400" height="400" fill="#1a1a2e"/>
      <rect width="400" height="100" y="300" fill="#2d2d44"/>
      <rect x="20" y="150" width="50" height="200" fill="#4a4a6a" rx="2"/>
      <rect x="90" y="100" width="60" height="250" fill="#3d3d5c" rx="2"/>
      <rect x="170" y="80" width="45" height="270" fill="#5a5a7a" rx="2"/>
      <rect x="230" y="120" width="55" height="230" fill="#4a4a6a" rx="2"/>
      <rect x="300" y="60" width="40" height="290" fill="#3d3d5c" rx="2"/>
      <rect x="350" y="140" width="40" height="210" fill="#5a5a7a" rx="2"/>
      <rect x="30" y="170" width="8" height="12" fill="#ffd700" opacity="0.8"/>
      <rect x="45" y="200" width="8" height="12" fill="#ffd700" opacity="0.6"/>
      <rect x="100" y="120" width="8" height="12" fill="#ffd700" opacity="0.8"/>
      <rect x="120" y="160" width="8" height="12" fill="#ffd700" opacity="0.7"/>
      <rect x="180" y="100" width="8" height="12" fill="#ffd700" opacity="0.8"/>
      <rect x="240" y="140" width="8" height="12" fill="#ffd700" opacity="0.6"/>
      <rect x="260" y="180" width="8" height="12" fill="#ffd700" opacity="0.8"/>
      <rect x="310" y="80" width="8" height="12" fill="#ffd700" opacity="0.7"/>
      <rect x="360" y="160" width="8" height="12" fill="#ffd700" opacity="0.8"/>
      <circle cx="350" cy="30" r="20" fill="#f0e68c" opacity="0.9"/>
      <circle cx="50" cy="20" r="1" fill="white"/><circle cx="150" cy="15" r="1.5" fill="white"/>
      <circle cx="250" cy="25" r="1" fill="white"/>
    `,
    arctic: `
      <rect width="400" height="400" fill="#0a1628"/>
      <rect width="400" height="150" y="250" fill="#e8f4f8"/>
      <path d="M0,250 Q50,240 100,250 Q150,260 200,250 Q250,240 300,250 Q350,260 400,250 L400,260 Q350,270 300,260 Q250,250 200,260 Q150,270 100,260 Q50,250 0,260 Z" fill="#b8d8e8"/>
      <path d="M50,80 Q100,40 150,80 Q200,120 250,80 Q300,40 350,80" fill="none" stroke="#00ff88" stroke-width="8" opacity="0.6"/>
      <path d="M30,100 Q100,50 180,100 Q260,150 340,100" fill="none" stroke="#00ffaa" stroke-width="6" opacity="0.4"/>
      <path d="M80,70 Q150,30 220,70 Q290,110 360,70" fill="none" stroke="#88ff88" stroke-width="4" opacity="0.5"/>
      <polygon points="120,250 140,180 160,250" fill="white"/>
      <polygon points="200,250 225,160 250,250" fill="#f0f8ff"/>
      <polygon points="300,250 315,200 330,250" fill="white"/>
      <circle cx="100" cy="310" r="20" fill="white"/>
      <circle cx="100" cy="290" r="15" fill="white"/>
      <circle cx="100" cy="275" r="10" fill="white"/>
      <circle cx="96" cy="273" r="2" fill="black"/>
      <circle cx="104" cy="273" r="2" fill="black"/>
      <circle cx="50" cy="15" r="1.5" fill="white"/><circle cx="200" cy="20" r="1" fill="white"/>
      <circle cx="350" cy="30" r="2" fill="#ffd700"/>
    `,
  }

  const scene = scenes[imageId] || scenes.sunset
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 400 400">${scene}</svg>`
  return `data:image/svg+xml;base64,${btoa(svg)}`
}


/** Create initial puzzle pieces (all in tray, shuffled order) */
export function createPuzzlePieces(gridSize: number): PuzzlePiece[] {
  const pieces: PuzzlePiece[] = []
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      pieces.push({
        id: r * gridSize + c,
        row: r,
        col: c,
        currentRow: null,
        currentCol: null,
      })
    }
  }
  // Shuffle for the tray
  for (let i = pieces.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pieces[i], pieces[j]] = [pieces[j], pieces[i]]
  }
  return pieces
}

/** Check if a piece is in its correct position */
export function isPieceCorrect(piece: PuzzlePiece): boolean {
  return piece.currentRow === piece.row && piece.currentCol === piece.col
}

/** Check if all pieces are placed correctly */
export function isPuzzleComplete(pieces: PuzzlePiece[]): boolean {
  return pieces.every(p => isPieceCorrect(p))
}

/** Get a random image for the puzzle */
export function getRandomImage(): PuzzleImage {
  const idx = Math.floor(Math.random() * PUZZLE_IMAGES.length)
  return PUZZLE_IMAGES[idx]
}

/** Slice an image into pieces using canvas and return data URLs */
export async function sliceImage(
  imageSrc: string,
  gridSize: number,
  targetSize: number = 400
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const pieceSize = targetSize / gridSize
      const pieces: string[] = []

      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          const canvas = document.createElement('canvas')
          canvas.width = pieceSize
          canvas.height = pieceSize
          const ctx = canvas.getContext('2d')!
          // Source coordinates scaled to actual image size
          const sx = (c / gridSize) * img.width
          const sy = (r / gridSize) * img.height
          const sw = img.width / gridSize
          const sh = img.height / gridSize
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, pieceSize, pieceSize)
          pieces.push(canvas.toDataURL())
        }
      }
      resolve(pieces)
    }
    img.onerror = reject
    img.src = imageSrc
  })
}
