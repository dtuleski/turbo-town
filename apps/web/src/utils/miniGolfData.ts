// Physics Mini-Golf — Game Data & Course Definitions

export type Difficulty = 'easy' | 'medium' | 'hard'

export interface Vec2 {
  x: number
  y: number
}

export interface Wall {
  start: Vec2
  end: Vec2
}

export interface Obstacle {
  type: 'circle' | 'rect' | 'windmill' | 'bumper' | 'sand' | 'water'
  x: number
  y: number
  width?: number
  height?: number
  radius?: number
  rotation?: number // degrees
  speed?: number // for windmill blades
}

export interface Hole {
  id: string
  name: string
  par: number
  ball: Vec2
  cup: Vec2
  walls: Wall[]
  obstacles: Obstacle[]
  width: number
  height: number
  theme: string // background theme color
}

export interface Course {
  id: string
  name: string
  emoji: string
  difficulty: Difficulty
  holes: Hole[]
  description: string
}

export interface DifficultyConfig {
  label: string
  emoji: string
  description: string
  maxStrokes: number
  courses: string[]
}

// ─── Physics Constants ───────────────────────────────────────────────────────

export const PHYSICS = {
  BALL_RADIUS: 8,
  CUP_RADIUS: 12,
  FRICTION: 0.975,
  SAND_FRICTION: 0.92,
  MIN_VELOCITY: 0.3,
  MAX_POWER: 14,
  WALL_BOUNCE: 0.65,
  BUMPER_BOUNCE: 1.3,
  GRAVITY: 0, // top-down, no gravity
  TICK_RATE: 1000 / 60, // 60fps
}

// ─── Holes ───────────────────────────────────────────────────────────────────

const EASY_HOLES: Hole[] = [
  {
    id: 'straight-shot',
    name: 'Straight Shot',
    par: 2,
    ball: { x: 80, y: 200 },
    cup: { x: 320, y: 200 },
    walls: [
      { start: { x: 40, y: 140 }, end: { x: 360, y: 140 } },
      { start: { x: 40, y: 260 }, end: { x: 360, y: 260 } },
      { start: { x: 40, y: 140 }, end: { x: 40, y: 260 } },
      { start: { x: 360, y: 140 }, end: { x: 360, y: 260 } },
    ],
    obstacles: [],
    width: 400,
    height: 400,
    theme: '#1a472a',
  },
  {
    id: 'gentle-curve',
    name: 'Gentle Curve',
    par: 2,
    ball: { x: 80, y: 320 },
    cup: { x: 320, y: 80 },
    walls: [
      { start: { x: 40, y: 40 }, end: { x: 360, y: 40 } },
      { start: { x: 40, y: 360 }, end: { x: 360, y: 360 } },
      { start: { x: 40, y: 40 }, end: { x: 40, y: 360 } },
      { start: { x: 360, y: 40 }, end: { x: 360, y: 360 } },
    ],
    obstacles: [],
    width: 400,
    height: 400,
    theme: '#1a472a',
  },
  {
    id: 'one-wall',
    name: 'Bank Shot',
    par: 3,
    ball: { x: 80, y: 300 },
    cup: { x: 320, y: 300 },
    walls: [
      { start: { x: 40, y: 40 }, end: { x: 360, y: 40 } },
      { start: { x: 40, y: 360 }, end: { x: 360, y: 360 } },
      { start: { x: 40, y: 40 }, end: { x: 40, y: 360 } },
      { start: { x: 360, y: 40 }, end: { x: 360, y: 360 } },
      // Inner wall blocking direct path
      { start: { x: 200, y: 180 }, end: { x: 200, y: 360 } },
    ],
    obstacles: [],
    width: 400,
    height: 400,
    theme: '#1a472a',
  },
]

const MEDIUM_HOLES: Hole[] = [
  {
    id: 'bumper-bounce',
    name: 'Bumper Alley',
    par: 3,
    ball: { x: 80, y: 200 },
    cup: { x: 320, y: 200 },
    walls: [
      { start: { x: 40, y: 100 }, end: { x: 360, y: 100 } },
      { start: { x: 40, y: 300 }, end: { x: 360, y: 300 } },
      { start: { x: 40, y: 100 }, end: { x: 40, y: 300 } },
      { start: { x: 360, y: 100 }, end: { x: 360, y: 300 } },
    ],
    obstacles: [
      { type: 'bumper', x: 160, y: 160, radius: 14 },
      { type: 'bumper', x: 240, y: 240, radius: 14 },
      { type: 'bumper', x: 200, y: 200, radius: 14 },
    ],
    width: 400,
    height: 400,
    theme: '#1a3a4a',
  },
  {
    id: 'sand-trap',
    name: 'Sandy Shores',
    par: 3,
    ball: { x: 80, y: 320 },
    cup: { x: 320, y: 80 },
    walls: [
      { start: { x: 40, y: 40 }, end: { x: 360, y: 40 } },
      { start: { x: 40, y: 360 }, end: { x: 360, y: 360 } },
      { start: { x: 40, y: 40 }, end: { x: 40, y: 360 } },
      { start: { x: 360, y: 40 }, end: { x: 360, y: 360 } },
    ],
    obstacles: [
      { type: 'sand', x: 140, y: 140, width: 80, height: 80 },
      { type: 'sand', x: 220, y: 240, width: 60, height: 60 },
    ],
    width: 400,
    height: 400,
    theme: '#2a4a1a',
  },
  {
    id: 'the-maze',
    name: 'The Maze',
    par: 4,
    ball: { x: 80, y: 320 },
    cup: { x: 320, y: 80 },
    walls: [
      { start: { x: 40, y: 40 }, end: { x: 360, y: 40 } },
      { start: { x: 40, y: 360 }, end: { x: 360, y: 360 } },
      { start: { x: 40, y: 40 }, end: { x: 40, y: 360 } },
      { start: { x: 360, y: 40 }, end: { x: 360, y: 360 } },
      // Maze walls
      { start: { x: 140, y: 40 }, end: { x: 140, y: 240 } },
      { start: { x: 260, y: 160 }, end: { x: 260, y: 360 } },
    ],
    obstacles: [],
    width: 400,
    height: 400,
    theme: '#1a472a',
  },
  {
    id: 'water-hazard',
    name: 'Water Hazard',
    par: 3,
    ball: { x: 80, y: 200 },
    cup: { x: 320, y: 200 },
    walls: [
      { start: { x: 40, y: 100 }, end: { x: 360, y: 100 } },
      { start: { x: 40, y: 300 }, end: { x: 360, y: 300 } },
      { start: { x: 40, y: 100 }, end: { x: 40, y: 300 } },
      { start: { x: 360, y: 100 }, end: { x: 360, y: 300 } },
    ],
    obstacles: [
      { type: 'water', x: 160, y: 140, width: 80, height: 120 },
    ],
    width: 400,
    height: 400,
    theme: '#1a3a4a',
  },
]

const HARD_HOLES: Hole[] = [
  {
    id: 'windmill',
    name: 'Windmill',
    par: 4,
    ball: { x: 80, y: 320 },
    cup: { x: 320, y: 80 },
    walls: [
      { start: { x: 40, y: 40 }, end: { x: 360, y: 40 } },
      { start: { x: 40, y: 360 }, end: { x: 360, y: 360 } },
      { start: { x: 40, y: 40 }, end: { x: 40, y: 360 } },
      { start: { x: 360, y: 40 }, end: { x: 360, y: 360 } },
    ],
    obstacles: [
      { type: 'windmill', x: 200, y: 200, radius: 50, speed: 2 },
    ],
    width: 400,
    height: 400,
    theme: '#2a1a4a',
  },
  {
    id: 'bumper-maze',
    name: 'Chaos Course',
    par: 4,
    ball: { x: 80, y: 320 },
    cup: { x: 320, y: 80 },
    walls: [
      { start: { x: 40, y: 40 }, end: { x: 360, y: 40 } },
      { start: { x: 40, y: 360 }, end: { x: 360, y: 360 } },
      { start: { x: 40, y: 40 }, end: { x: 40, y: 360 } },
      { start: { x: 360, y: 40 }, end: { x: 360, y: 360 } },
      { start: { x: 160, y: 40 }, end: { x: 160, y: 180 } },
      { start: { x: 240, y: 220 }, end: { x: 240, y: 360 } },
    ],
    obstacles: [
      { type: 'bumper', x: 120, y: 260, radius: 12 },
      { type: 'bumper', x: 280, y: 140, radius: 12 },
      { type: 'bumper', x: 200, y: 200, radius: 16 },
      { type: 'sand', x: 260, y: 280, width: 60, height: 50 },
    ],
    width: 400,
    height: 400,
    theme: '#3a1a2a',
  },
  {
    id: 'gauntlet',
    name: 'The Gauntlet',
    par: 5,
    ball: { x: 60, y: 340 },
    cup: { x: 340, y: 60 },
    walls: [
      { start: { x: 40, y: 40 }, end: { x: 360, y: 40 } },
      { start: { x: 40, y: 360 }, end: { x: 360, y: 360 } },
      { start: { x: 40, y: 40 }, end: { x: 40, y: 360 } },
      { start: { x: 360, y: 40 }, end: { x: 360, y: 360 } },
      // Zigzag walls
      { start: { x: 120, y: 40 }, end: { x: 120, y: 200 } },
      { start: { x: 200, y: 160 }, end: { x: 200, y: 360 } },
      { start: { x: 280, y: 40 }, end: { x: 280, y: 200 } },
    ],
    obstacles: [
      { type: 'water', x: 60, y: 160, width: 50, height: 60 },
      { type: 'bumper', x: 160, y: 300, radius: 12 },
      { type: 'sand', x: 230, y: 60, width: 40, height: 80 },
      { type: 'windmill', x: 320, y: 280, radius: 30, speed: 3 },
    ],
    width: 400,
    height: 400,
    theme: '#1a1a3a',
  },
]

// ─── Courses ─────────────────────────────────────────────────────────────────

export const COURSES: Course[] = [
  {
    id: 'beginner-meadow',
    name: 'Beginner Meadow',
    emoji: '🌿',
    difficulty: 'easy',
    holes: EASY_HOLES,
    description: 'Open greens, simple angles',
  },
  {
    id: 'seaside-links',
    name: 'Seaside Links',
    emoji: '🏖️',
    difficulty: 'medium',
    holes: MEDIUM_HOLES,
    description: 'Bumpers, sand traps, and water hazards',
  },
  {
    id: 'castle-course',
    name: 'Castle Course',
    emoji: '🏰',
    difficulty: 'hard',
    holes: HARD_HOLES,
    description: 'Windmills, tight mazes, and chaos!',
  },
]

// ─── Difficulty Configs ──────────────────────────────────────────────────────

export const DIFFICULTY_CONFIGS: Record<Difficulty, DifficultyConfig> = {
  easy: {
    label: 'Easy',
    emoji: '🟢',
    description: 'Open courses, simple shots',
    maxStrokes: 8,
    courses: ['beginner-meadow'],
  },
  medium: {
    label: 'Medium',
    emoji: '🟡',
    description: 'Hazards and obstacles',
    maxStrokes: 7,
    courses: ['seaside-links'],
  },
  hard: {
    label: 'Hard',
    emoji: '🔴',
    description: 'Windmills, tight angles, chaos!',
    maxStrokes: 6,
    courses: ['castle-course'],
  },
}

// ─── Helper Functions ────────────────────────────────────────────────────────

export function getCourse(difficulty: Difficulty): Course {
  const config = DIFFICULTY_CONFIGS[difficulty]
  return COURSES.find(c => c.id === config.courses[0])!
}

export function getTotalPar(course: Course): number {
  return course.holes.reduce((sum, h) => sum + h.par, 0)
}

export function getScoreName(strokes: number, par: number): string {
  const diff = strokes - par
  if (diff <= -3) return 'Albatross!'
  if (diff === -2) return 'Eagle!'
  if (diff === -1) return 'Birdie!'
  if (diff === 0) return 'Par'
  if (diff === 1) return 'Bogey'
  if (diff === 2) return 'Double Bogey'
  return 'Triple Bogey+'
}

export function difficultyToNumber(difficulty: Difficulty): number {
  return difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3
}
