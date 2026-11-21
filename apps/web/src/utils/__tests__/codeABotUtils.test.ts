import { describe, it, expect } from 'vitest'
import { getLevel, simulate, type Instruction } from '../codeABotUtils'

describe('Code-a-Bot easy level 1', () => {
  it('is solved by repeating FORWARD 4 times', () => {
    const level = getLevel('easy', 1)
    const program: Instruction[] = ['FORWARD', 'FORWARD', 'FORWARD', 'FORWARD']
    expect(program.length).toBeLessThanOrEqual(level.maxInstructions)
    const steps = simulate(level, program)
    expect(steps[steps.length - 1].reachedGoal).toBe(true)
  })

  it('does not reach the goal with fewer forwards', () => {
    const steps = simulate(getLevel('easy', 1), ['FORWARD', 'FORWARD'])
    expect(steps[steps.length - 1].reachedGoal).toBe(false)
  })
})
