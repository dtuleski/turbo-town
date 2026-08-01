// Traffic Systems Lab — Game Data & Types

export type Direction = 'north' | 'south' | 'east' | 'west'
export type LightState = 'red' | 'green'

export interface Car {
  id: string
  x: number
  y: number
  direction: Direction
  speed: number
  passed: boolean
  crashed: boolean
  lane: number // which lane (for offset)
}

export interface Intersection {
  id: string
  x: number // center X pixel position
  y: number // center Y pixel position
  nsLight: LightState // north-south direction light
  ewLight: LightState // east-west direction light
}

export interface TrafficConfig {
  label: string
  intersections: number
  spawnRate: number
  carSpeed: number
  simulationTime: number
  maxCars: number
}

export const DIFFICULTY_CONFIGS: Record<string, TrafficConfig> = {
  easy: {
    label: 'Easy',
    intersections: 1,
    spawnRate: 2200,
    carSpeed: 1.0,
    simulationTime: 60,
    maxCars: 15,
  },
  medium: {
    label: 'Medium',
    intersections: 2,
    spawnRate: 1500,
    carSpeed: 1.2,
    simulationTime: 90,
    maxCars: 22,
  },
  hard: {
    label: 'Hard',
    intersections: 4,
    spawnRate: 1000,
    carSpeed: 1.4,
    simulationTime: 120,
    maxCars: 30,
  },
}

const ROAD_WIDTH = 40
const INTERSECTION_ZONE = 30 // radius of intersection zone for collision detection

// Generate intersection positions (pixel-based for a 500x400 grid)
export function generateIntersections(count: number): Intersection[] {
  if (count === 1) {
    return [{ id: 'int-0', x: 250, y: 200, nsLight: 'green', ewLight: 'red' }]
  }
  if (count === 2) {
    return [
      { id: 'int-0', x: 170, y: 200, nsLight: 'green', ewLight: 'red' },
      { id: 'int-1', x: 330, y: 200, nsLight: 'red', ewLight: 'green' },
    ]
  }
  return [
    { id: 'int-0', x: 170, y: 140, nsLight: 'green', ewLight: 'red' },
    { id: 'int-1', x: 330, y: 140, nsLight: 'red', ewLight: 'green' },
    { id: 'int-2', x: 170, y: 280, nsLight: 'red', ewLight: 'green' },
    { id: 'int-3', x: 330, y: 280, nsLight: 'green', ewLight: 'red' },
  ]
}

let nextCarId = 0

export function spawnCar(intersections: Intersection[], gridW: number, gridH: number): Car {
  // Pick a random direction
  const dirs: Direction[] = ['north', 'south', 'east', 'west']
  const direction = dirs[Math.floor(Math.random() * dirs.length)]
  // Pick a random intersection to aim at
  const target = intersections[Math.floor(Math.random() * intersections.length)]
  const laneOffset = (Math.random() > 0.5 ? 8 : -8)

  let x: number, y: number
  switch (direction) {
    case 'north': x = target.x + laneOffset; y = gridH + 20; break
    case 'south': x = target.x + laneOffset; y = -20; break
    case 'east': x = -20; y = target.y + laneOffset; break
    case 'west': x = gridW + 20; y = target.y + laneOffset; break
  }

  return { id: `car-${nextCarId++}`, x, y, direction, speed: 0.8 + Math.random() * 0.4, passed: false, crashed: false, lane: laneOffset > 0 ? 1 : 0 }
}

// Check if car is in the intersection zone
export function isInIntersectionZone(car: Car, int: Intersection): boolean {
  return Math.abs(car.x - int.x) < INTERSECTION_ZONE && Math.abs(car.y - int.y) < INTERSECTION_ZONE
}

// Check if car should stop (approaching a red light)
export function shouldCarStop(car: Car, intersections: Intersection[]): boolean {
  for (const int of intersections) {
    const isNS = car.direction === 'north' || car.direction === 'south'
    const light = isNS ? int.nsLight : int.ewLight
    if (light !== 'red') continue

    // Check if car is approaching the intersection (not yet inside, but close)
    const approachDist = 35
    switch (car.direction) {
      case 'north': if (car.y > int.y && car.y < int.y + approachDist + 20 && Math.abs(car.x - int.x) < ROAD_WIDTH) return true; break
      case 'south': if (car.y < int.y && car.y > int.y - approachDist - 20 && Math.abs(car.x - int.x) < ROAD_WIDTH) return true; break
      case 'east': if (car.x < int.x && car.x > int.x - approachDist - 20 && Math.abs(car.y - int.y) < ROAD_WIDTH) return true; break
      case 'west': if (car.x > int.x && car.x < int.x + approachDist + 20 && Math.abs(car.y - int.y) < ROAD_WIDTH) return true; break
    }
  }
  return false
}

// Check if same-direction car ahead is blocking (prevent rear-end)
export function isBlockedByCar(car: Car, allCars: Car[]): boolean {
  for (const other of allCars) {
    if (other.id === car.id || other.crashed || other.passed) continue
    if (other.direction !== car.direction) continue
    const dist = Math.sqrt((car.x - other.x) ** 2 + (car.y - other.y) ** 2)
    if (dist > 25) continue // not close enough
    // Check if other is ahead
    switch (car.direction) {
      case 'north': if (other.y < car.y) return true; break
      case 'south': if (other.y > car.y) return true; break
      case 'east': if (other.x > car.x) return true; break
      case 'west': if (other.x < car.x) return true; break
    }
  }
  return false
}

// Check for REAL collisions — only perpendicular cars in intersection zone
export function checkIntersectionCrash(cars: Car[], intersections: Intersection[]): [string, string] | null {
  for (const int of intersections) {
    const carsInZone = cars.filter(c => !c.crashed && !c.passed && isInIntersectionZone(c, int))
    // Find if there's both a NS car and an EW car in the zone
    const nsCars = carsInZone.filter(c => c.direction === 'north' || c.direction === 'south')
    const ewCars = carsInZone.filter(c => c.direction === 'east' || c.direction === 'west')
    if (nsCars.length > 0 && ewCars.length > 0) {
      return [nsCars[0].id, ewCars[0].id]
    }
  }
  return null
}

export function isCarOffScreen(car: Car, gridW: number, gridH: number): boolean {
  return car.x < -30 || car.x > gridW + 30 || car.y < -30 || car.y > gridH + 30
}

export { ROAD_WIDTH }
