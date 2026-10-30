import { describe, expect, it } from 'vitest'
import { MARS_ROVER, getLevel } from '../circuitEngine'
import type { LevelDefinition } from '../circuitEngine'
import { deriveRoverView } from '../marsRover'
import { REFERENCE, mustLevel, solveRecipe } from './circuitTestLayouts'

function activeRoles(view: ReturnType<typeof deriveRoverView>): string[] {
  return view.roles.filter((r) => r.active).map((r) => r.roleId)
}

function availableRoles(view: ReturnType<typeof deriveRoverView>): string[] {
  return view.roles.filter((r) => r.available).map((r) => r.roleId)
}

function solved(levelId: string): ReturnType<typeof solveRecipe> & { level: LevelDefinition } {
  const level = mustLevel(levelId)
  const recipe = REFERENCE[levelId]
  if (recipe === undefined) throw new Error(`no reference for ${levelId}`)
  return { level, ...solveRecipe(level, recipe) }
}

describe('deriveRoverView', () => {
  it('cb-01 reference activates only the headlight', () => {
    const { level, result } = solved('cb-01-closed-circuit')
    const view = deriveRoverView(level, result, false)
    expect(activeRoles(view)).toEqual(['headlight'])
    expect(view.allRequiredActive).toBe(true)
  })

  it('cb-05 reference activates drive motor, headlight and buzzer', () => {
    const { level, result } = solved('cb-05-series-vs-parallel')
    const view = deriveRoverView(level, result, false)
    expect(activeRoles(view).sort()).toEqual(['buzzerAlert', 'driveMotor', 'headlight'])
    expect(view.allRequiredActive).toBe(true)
  })

  it('a blown fuse deactivates every role', () => {
    const { level, result } = solved('cb-05-series-vs-parallel')
    const view = deriveRoverView(level, result, true)
    expect(activeRoles(view)).toEqual([])
    expect(view.allRequiredActive).toBe(false)
  })

  it('a null result deactivates every role', () => {
    const view = deriveRoverView(mustLevel('cb-01-closed-circuit'), null, false)
    expect(activeRoles(view)).toEqual([])
    expect(view.allRequiredActive).toBe(false)
  })

  it('an unknown machine yields no roles and does not throw', () => {
    const level: LevelDefinition = { ...mustLevel('cb-01-closed-circuit'), targetMachineId: 'nope' }
    const { result } = solved('cb-01-closed-circuit')
    const view = deriveRoverView(level, result, false)
    expect(view.roles).toEqual([])
    expect(view.allRequiredActive).toBe(false)
  })

  it('flags only the headlight as available on cb-01', () => {
    const view = deriveRoverView(mustLevel('cb-01-closed-circuit'), null, false)
    expect(availableRoles(view)).toEqual(['headlight'])
  })

  it('counts pre-placed kinds as available (cb-07 has a pre-placed LED)', () => {
    const view = deriveRoverView(mustLevel('cb-07-resistance-limits-current'), null, false)
    expect(availableRoles(view)).toEqual(['headlight'])
  })

  it('flags every role available on the sandbox', () => {
    const sandbox = getLevel('sandbox')
    if (sandbox === undefined) throw new Error('missing sandbox')
    const view = deriveRoverView(sandbox, null, false)
    expect(availableRoles(view).sort()).toEqual(MARS_ROVER.roles.map((r) => r.roleId).sort())
  })

  it('uses the machine presentation keys as labels', () => {
    const view = deriveRoverView(mustLevel('cb-01-closed-circuit'), null, false)
    expect(view.roles.map((r) => r.labelKey)).toEqual(MARS_ROVER.roles.map((r) => r.presentationKey))
  })

  it('does not call a partly powered level fully powered', () => {
    const level = mustLevel('cb-05-series-vs-parallel')
    // The cb-01 layout lights only the LED, which cb-05 offers alongside motor and buzzer.
    const recipe = REFERENCE['cb-01-closed-circuit']
    if (recipe === undefined) throw new Error('missing recipe')
    const { result } = solveRecipe(mustLevel('cb-01-closed-circuit'), recipe)
    const view = deriveRoverView(level, result, false)
    expect(activeRoles(view)).toEqual(['headlight'])
    expect(view.allRequiredActive).toBe(false)
  })
})
