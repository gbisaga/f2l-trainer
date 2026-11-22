import { alignedSolution, generateCase } from './f2l-cases.ts'
import type { Alignment, F2LCase } from './f2l-cases.ts'
import { describeCompletion, isF2LSolved } from './f2l-completion.ts'
import type { VirtualCube } from './virtual-cube.ts'

interface Result {
  recognition: number
  execution: number
  total: number
}

export class TrainingSession {
  private exercise?: { definition: F2LCase; initial: VirtualCube; alignment: Alignment }
  private presentedAt?: number
  private firstTurnAt?: number
  result?: Result

  private readonly cube: VirtualCube

  constructor(cube: VirtualCube) {
    this.cube = cube
  }

  get active() {
    return this.exercise !== undefined
  }

  get slot() {
    return this.exercise?.definition.slot
  }

  get reference() {
    return this.solution()
  }

  get solutionOptions() {
    return this.exercise?.definition.solutions ?? []
  }

  solution(index = 0) {
    if (!this.exercise) return
    const { definition, alignment } = this.exercise
    return { number: definition.number, algorithm: alignedSolution(definition, alignment, index) }
  }

  describe() {
    const { definition, alignment } = this.exercise ?? {}
    const slot = definition?.slot ?? 'FR'
    return {
      exercise: definition ? { ...this.reference, slot, setup: definition.setup, alignment: alignment || 'none' } : null,
      completed: Boolean(this.result),
      currentlySolved: isF2LSolved(this.cube, slot),
      timingMs: this.result ?? null,
      pieces: describeCompletion(this.cube, slot),
    }
  }

  start(definition: F2LCase, alignment: Alignment) {
    this.exercise = { definition, alignment, initial: generateCase(definition, alignment) }
    this.retry()
  }

  retry() {
    if (!this.exercise) return
    this.cube.copyFrom(this.exercise.initial)
    this.clearTiming()
  }

  cancel() {
    this.exercise = undefined
    this.clearTiming()
  }

  markPresented(at: number) {
    if (this.exercise) this.presentedAt ??= at
  }

  recordTurn(at: number) {
    if (!this.exercise || this.result) return false
    // A move arriving before the first frame is still applied and has zero recognition time.
    const presentedAt = this.presentedAt ??= at
    const firstTurnAt = this.firstTurnAt ??= at
    if (!isF2LSolved(this.cube, this.exercise.definition.slot)) return false
    this.result = {
      recognition: firstTurnAt - presentedAt,
      execution: at - firstTurnAt,
      total: at - presentedAt,
    }
    return true
  }

  private clearTiming() {
    this.presentedAt = undefined
    this.firstTurnAt = undefined
    this.result = undefined
  }
}
