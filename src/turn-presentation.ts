import { parseFaceTurn, VirtualCube } from './virtual-cube.ts'

const defaults = { quarterTurnMs: 100, maxPending: 2 }
type Turn = NonNullable<ReturnType<typeof parseFaceTurn>> & { move: string }

export class TurnPresentation {
  readonly cube = new VirtualCube()
  private active?: Turn
  private startedAt?: number
  private pending: Turn[] = []
  private needsSync = false
  private readonly logical: VirtualCube
  private readonly options: typeof defaults

  constructor(logical: VirtualCube, options = defaults) {
    this.logical = logical
    this.options = options
    this.cube.copyFrom(logical)
  }

  // The caller has already applied and verified this move on the logical cube.
  enqueue(move: string) {
    if (this.needsSync) return
    const parsed = parseFaceTurn(move)
    if (!parsed) return
    const turn = { ...parsed, move }
    if (!this.active) this.active = turn
    else if (this.pending.length < this.options.maxPending) this.pending.push(turn)
    else this.replace()
  }

  replace() {
    this.active = undefined
    this.pending.length = 0
    this.startedAt = undefined
    this.needsSync = true
  }

  frame(now: number) {
    let changed = false
    if (this.needsSync) {
      this.cube.copyFrom(this.logical)
      this.needsSync = false
      changed = true
    }
    if (this.active && this.startedAt !== undefined &&
        now - this.startedAt >= this.options.quarterTurnMs * this.active.turns) {
      this.cube.applyMove(this.active.move)
      this.active = this.pending.shift()
      this.startedAt = undefined
      changed = true
    }
    const turn = this.active
    if (!turn) return { changed, turn, angle: 0 }
    const elapsed = now - (this.startedAt ??= now)
    const progress = elapsed / (this.options.quarterTurnMs * turn.turns)
    const eased = progress * progress * (3 - 2 * progress)
    return { changed, turn, angle: eased * turn.direction * turn.turns * Math.PI / 2 }
  }
}
