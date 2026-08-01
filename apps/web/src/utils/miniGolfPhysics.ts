// Physics Mini-Golf — Physics Engine with Environmental Factors

import { type Vec2, type Wall, type Obstacle, type Hole, PHYSICS } from './miniGolfData'

export interface BallState {
  pos: Vec2
  vel: Vec2
  inSand: boolean
  inWater: boolean
  sunk: boolean
}

export interface EnvironmentConditions {
  windSpeed: number       // 0–20 km/h
  windDirection: number   // degrees (0 = right, 90 = down, 180 = left, 270 = up)
  temperature: number     // -10 to 45 °C
  altitude: number        // 0–3000 meters above sea level
}

// ─── Vector Helpers ──────────────────────────────────────────────────────────

export function vec2(x: number, y: number): Vec2 {
  return { x, y }
}

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y }
}

export function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y }
}

export function scale(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s }
}

export function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y
}

export function length(v: Vec2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y)
}

export function normalize(v: Vec2): Vec2 {
  const l = length(v)
  if (l === 0) return { x: 0, y: 0 }
  return { x: v.x / l, y: v.y / l }
}

export function reflect(v: Vec2, normal: Vec2): Vec2 {
  const d = 2 * dot(v, normal)
  return { x: v.x - d * normal.x, y: v.y - d * normal.y }
}

export function distance(a: Vec2, b: Vec2): number {
  return length(sub(b, a))
}

// ─── Environment Physics ─────────────────────────────────────────────────────

/**
 * Calculate wind force vector applied each tick.
 * Wind pushes the ball in its direction proportional to speed.
 * Kept subtle so it's a factor but doesn't dominate gameplay.
 */
export function getWindForce(env: EnvironmentConditions): Vec2 {
  const rad = (env.windDirection * Math.PI) / 180
  const magnitude = env.windSpeed * 0.0006 // subtle: noticeable over distance but not overpowering
  return { x: Math.cos(rad) * magnitude, y: Math.sin(rad) * magnitude }
}

/**
 * Temperature affects friction:
 * - Cold (< 5°C): frost → less friction (ball rolls farther)
 * - Hot (> 35°C): dry/sticky → more friction (ball slows faster)
 * - Normal: baseline friction
 * Returns a multiplier on the friction coefficient.
 */
export function getTemperatureFrictionMultiplier(temperature: number): number {
  if (temperature < 5) {
    // Frosty — less friction (higher multiplier = less slowdown applied)
    return 1.005 + (5 - temperature) * 0.0008
  }
  if (temperature > 35) {
    // Hot/sticky — more friction
    return 0.995 - (temperature - 35) * 0.001
  }
  return 1.0
}

/**
 * Altitude affects air density and thus drag:
 * - Higher altitude → thinner air → less drag → ball travels farther
 * Returns a multiplier on friction (>1 = less drag = travels farther).
 */
export function getAltitudeDragMultiplier(altitude: number): number {
  // At sea level = 1.0, at 3000m ≈ 1.008 (ball rolls ~1% farther per 1000m)
  return 1.0 + altitude * 0.0000025
}

/**
 * Generate random environment conditions based on difficulty.
 * Harder = more extreme conditions.
 */
export function generateEnvironment(difficulty: 'easy' | 'medium' | 'hard'): EnvironmentConditions {
  if (difficulty === 'easy') {
    return {
      windSpeed: Math.round(Math.random() * 5),           // 0–5 km/h (gentle)
      windDirection: Math.round(Math.random() * 360),
      temperature: 18 + Math.round(Math.random() * 10),   // 18–28°C (pleasant)
      altitude: Math.round(Math.random() * 500),           // 0–500m
    }
  }
  if (difficulty === 'medium') {
    return {
      windSpeed: 3 + Math.round(Math.random() * 10),      // 3–13 km/h
      windDirection: Math.round(Math.random() * 360),
      temperature: 5 + Math.round(Math.random() * 35),    // 5–40°C
      altitude: Math.round(Math.random() * 1500),          // 0–1500m
    }
  }
  // Hard
  return {
    windSpeed: 8 + Math.round(Math.random() * 12),       // 8–20 km/h (strong)
    windDirection: Math.round(Math.random() * 360),
    temperature: -5 + Math.round(Math.random() * 45),    // -5–40°C (extreme)
    altitude: 500 + Math.round(Math.random() * 2500),    // 500–3000m
  }
}

// ─── Wall Collision ──────────────────────────────────────────────────────────

function closestPointOnSegment(p: Vec2, a: Vec2, b: Vec2): Vec2 {
  const ab = sub(b, a)
  const ap = sub(p, a)
  let t = dot(ap, ab) / dot(ab, ab)
  t = Math.max(0, Math.min(1, t))
  return add(a, scale(ab, t))
}

export function checkWallCollision(ball: BallState, wall: Wall): { hit: boolean; point: Vec2; normal: Vec2 } {
  const closest = closestPointOnSegment(ball.pos, wall.start, wall.end)
  const dist = distance(ball.pos, closest)

  if (dist <= PHYSICS.BALL_RADIUS) {
    const normal = normalize(sub(ball.pos, closest))
    return { hit: true, point: closest, normal }
  }
  return { hit: false, point: closest, normal: { x: 0, y: 0 } }
}

// ─── Obstacle Collision ──────────────────────────────────────────────────────

function isPointInRect(p: Vec2, obs: Obstacle): boolean {
  const w = obs.width || 40
  const h = obs.height || 40
  return p.x >= obs.x && p.x <= obs.x + w && p.y >= obs.y && p.y <= obs.y + h
}

function checkCircleObstacle(ball: BallState, obs: Obstacle): { hit: boolean; normal: Vec2 } {
  const r = obs.radius || 14
  const center = { x: obs.x, y: obs.y }
  const dist = distance(ball.pos, center)
  const combinedRadius = PHYSICS.BALL_RADIUS + r

  if (dist <= combinedRadius) {
    const normal = normalize(sub(ball.pos, center))
    return { hit: true, normal }
  }
  return { hit: false, normal: { x: 0, y: 0 } }
}

// ─── Windmill blade collision ────────────────────────────────────────────────

export function getWindmillBladeWalls(obs: Obstacle, time: number): Wall[] {
  const speed = obs.speed || 2
  const angle = (time * speed * 0.001) % (Math.PI * 2)
  const r = obs.radius || 50
  const center = { x: obs.x, y: obs.y }
  const walls: Wall[] = []

  // 4 blades
  for (let i = 0; i < 4; i++) {
    const a = angle + (i * Math.PI) / 2
    const end = { x: center.x + Math.cos(a) * r, y: center.y + Math.sin(a) * r }
    walls.push({ start: center, end })
  }
  return walls
}

// ─── Physics Step ────────────────────────────────────────────────────────────

export function physicsTick(ball: BallState, hole: Hole, time: number, env: EnvironmentConditions): BallState {
  if (ball.sunk) return ball

  let { pos, vel } = ball
  let inSand = false
  let inWater = false

  // Only apply wind when ball has meaningful velocity (prevents infinite drift)
  const speed = length(vel)
  if (speed > 0.5) {
    const windForce = getWindForce(env)
    vel = add(vel, windForce)
  }

  // Apply velocity
  pos = add(pos, vel)

  // Check zone overlaps (sand/water)
  for (const obs of hole.obstacles) {
    if (obs.type === 'sand' && isPointInRect(pos, obs)) {
      inSand = true
    }
    if (obs.type === 'water' && isPointInRect(pos, obs)) {
      inWater = true
    }
  }

  // Apply friction with environmental modifiers
  const tempMult = getTemperatureFrictionMultiplier(env.temperature)
  const altMult = getAltitudeDragMultiplier(env.altitude)
  const baseFriction = inSand ? PHYSICS.SAND_FRICTION : PHYSICS.FRICTION
  const effectiveFriction = Math.min(0.999, baseFriction * tempMult * altMult)
  vel = scale(vel, effectiveFriction)

  // Wall collisions
  for (const wall of hole.walls) {
    const result = checkWallCollision({ ...ball, pos }, wall)
    if (result.hit) {
      vel = scale(reflect(vel, result.normal), PHYSICS.WALL_BOUNCE)
      const overlap = PHYSICS.BALL_RADIUS - distance(pos, result.point)
      if (overlap > 0) {
        pos = add(pos, scale(result.normal, overlap + 1))
      }
    }
  }

  // Windmill blade collisions
  for (const obs of hole.obstacles) {
    if (obs.type === 'windmill') {
      const bladeWalls = getWindmillBladeWalls(obs, time)
      for (const bw of bladeWalls) {
        const result = checkWallCollision({ ...ball, pos }, bw)
        if (result.hit) {
          vel = scale(reflect(vel, result.normal), PHYSICS.WALL_BOUNCE)
          const overlap = PHYSICS.BALL_RADIUS - distance(pos, result.point)
          if (overlap > 0) {
            pos = add(pos, scale(result.normal, overlap + 1))
          }
        }
      }
    }
  }

  // Bumper collisions
  for (const obs of hole.obstacles) {
    if (obs.type === 'bumper') {
      const result = checkCircleObstacle({ ...ball, pos, vel, inSand: false, inWater: false, sunk: false }, obs)
      if (result.hit) {
        vel = scale(reflect(vel, result.normal), PHYSICS.BUMPER_BOUNCE)
        const r = obs.radius || 14
        const center = { x: obs.x, y: obs.y }
        const dist = distance(pos, center)
        const pushDist = PHYSICS.BALL_RADIUS + r - dist + 1
        if (pushDist > 0) {
          pos = add(pos, scale(result.normal, pushDist))
        }
      }
    }
  }

  // Check if ball is in cup
  const cupDist = distance(pos, hole.cup)
  const currentSpeed = length(vel)
  if (cupDist <= PHYSICS.CUP_RADIUS && currentSpeed < 6) {
    return { pos: hole.cup, vel: { x: 0, y: 0 }, inSand: false, inWater: false, sunk: true }
  }

  // Stop ball if below threshold
  if (currentSpeed < PHYSICS.MIN_VELOCITY) {
    vel = { x: 0, y: 0 }
  }

  return { pos, vel, inSand, inWater, sunk: false }
}

export function isBallMoving(ball: BallState): boolean {
  return length(ball.vel) >= PHYSICS.MIN_VELOCITY
}

export function calculatePower(dragDistance: number): number {
  return Math.min(PHYSICS.MAX_POWER, dragDistance * 0.1)
}

export function calculateDirection(ballPos: Vec2, mousePos: Vec2): Vec2 {
  return normalize(sub(ballPos, mousePos))
}
