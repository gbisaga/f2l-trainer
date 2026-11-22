import { VirtualCube } from './virtual-cube.ts'
import { protectedPiecesSolved, targetConfiguration, targetSolved } from './f2l-completion.ts'
import type { Slot } from './f2l-completion.ts'
import { sourceSolutions } from './f2l-solutions.ts'
import type { SourceSolution } from './f2l-solutions.ts'

export interface F2LCase {
  number: number
  slot: Slot
  sourceSetup: string
  setup: string
  solutions: readonly [SourceSolution, ...SourceSolution[]]
  expected: { corner: string; edge: string }
}

// SpeedCubeDB FR setups and numbering. Expected stickers were computed independently
// from the source setups with cubing.js. Cases 8 and 13 use equivalent outer-turn setups.
const sourceCases: readonly (readonly [
  number: number, sourceSetup: string, corner: string, edge: string, outerSetup?: string,
])[] = [
  [1, "F R' F' R", "FRU:D>F FRU:F>U FRU:R>R", "RU:F>U RU:R>R"],
  [2, "R' F R F'", "FRU:D>R FRU:F>F FRU:R>U", "FU:F>F FU:R>U"],
  [3, "F' U F", "FRU:D>F FRU:F>U FRU:R>R", "LU:F>L LU:R>U"],
  [4, "R U' R'", "FRU:D>R FRU:F>F FRU:R>U", "BU:F>U BU:R>B"],
  [5, "R U R' U2' R U' R' U", "FRU:D>F FRU:F>U FRU:R>R", "BU:F>U BU:R>B"],
  [6, "F' U' F U2' F' U F U'", "FRU:D>R FRU:F>F FRU:R>U", "LU:F>L LU:R>U"],
  [7, "R U R' U2' R U2' R' U", "FRU:D>F FRU:F>U FRU:R>R", "LU:F>U LU:R>L"],
  [8, "r' U' R2 U' R2' U2' r", "FRU:D>R FRU:F>F FRU:R>U", "BU:F>B BU:R>U", "F' U' F U2 F' U2 F U'"],
  [9, "F' U F U' R U R' U", "FRU:D>F FRU:F>U FRU:R>R", "BU:F>B BU:R>U"],
  [10, "R U' R' U' R U' R' U", "FRU:D>R FRU:F>F FRU:R>U", "LU:F>U LU:R>L"],
  [11, "F' U F U' R U2' R' U", "FRU:D>F FRU:F>U FRU:R>R", "RU:F>R RU:R>U"],
  [12, "R U R' U2' R U R' U' R U R'", "FRU:D>R FRU:F>F FRU:R>U", "FU:F>U FU:R>F"],
  [13, "r U2' R' U R U' R' U M", "FRU:D>F FRU:F>U FRU:R>R", "FU:F>F FU:R>U", "R U R' F R' F' R U' R U R'"],
  [14, "R U' R' U' R U R' U", "FRU:D>R FRU:F>F FRU:R>U", "RU:F>U RU:R>R"],
  [15, "R U R' U' R U R' U2' R U' R'", "FRU:D>F FRU:F>U FRU:R>R", "FU:F>U FU:R>F"],
  [16, "F' U F U2' R U R'", "FRU:D>R FRU:F>F FRU:R>U", "RU:F>R RU:R>U"],
  [17, "R U' R' U R U2' R'", "FRU:D>U FRU:F>R FRU:R>F", "RU:F>U RU:R>R"],
  [18, "R U R' U' R U R' F R' F' R", "FRU:D>U FRU:F>R FRU:R>F", "FU:F>F FU:R>U"],
  [19, "R U R' U' R U2' R' U'", "FRU:D>U FRU:F>R FRU:R>F", "BU:F>U BU:R>B"],
  [20, "R U R' F R' F' R2' U R' U", "FRU:D>U FRU:F>R FRU:R>F", "LU:F>L LU:R>U"],
  [21, "R U' R' U2' R U R'", "FRU:D>U FRU:F>R FRU:R>F", "LU:F>U LU:R>L"],
  [22, "F' L' U2' L F", "FRU:D>U FRU:F>R FRU:R>F", "BU:F>B BU:R>U"],
  [23, "R U' R' U R U' R' U2' R U' R'", "FRU:D>U FRU:F>R FRU:R>F", "FU:F>U FU:R>F"],
  [24, "R U R' F R U R' U' F'", "FRU:D>U FRU:F>R FRU:R>F", "RU:F>R RU:R>U"],
  [25, "F' R U R' U' R' F R", "DFR:D>D DFR:F>F DFR:R>R", "RU:F>U RU:R>R"],
  [26, "F' U' F U R U R' U'", "DFR:D>D DFR:F>F DFR:R>R", "FU:F>F FU:R>U"],
  [27, "R U R' U' R U R'", "DFR:D>F DFR:F>R DFR:R>D", "RU:F>U RU:R>R"],
  [28, "R' F R F' U R U' R'", "DFR:D>R DFR:F>D DFR:R>F", "FU:F>F FU:R>U"],
  [29, "F R' F' R F R' F' R", "DFR:D>F DFR:F>R DFR:R>D", "FU:F>F FU:R>U"],
  [30, "R U' R' U R U' R'", "DFR:D>R DFR:F>D DFR:R>F", "RU:F>U RU:R>R"],
  [31, "R U R' F R' F' R U", "FRU:D>U FRU:F>R FRU:R>F", "FR:F>R FR:R>F"],
  [32, "R U' R' U R U' R' U R U' R'", "FRU:D>U FRU:F>R FRU:R>F", "FR:F>F FR:R>R"],
  [33, "R U R' U2' R U R' U", "FRU:D>F FRU:F>U FRU:R>R", "FR:F>F FR:R>R"],
  [34, "R U' R' U2' R U' R' U'", "FRU:D>R FRU:F>F FRU:R>U", "FR:F>F FR:R>R"],
  [35, "F' U F U' R U' R' U", "FRU:D>F FRU:F>U FRU:R>R", "FR:F>R FR:R>F"],
  [36, "R U' R' U2' F R' F' R U2'", "FRU:D>R FRU:F>F FRU:R>U", "FR:F>R FR:R>F"],
  [37, "R U' R U2' F R2' F' U2' R2'", "DFR:D>D DFR:F>F DFR:R>R", "FR:F>R FR:R>F"],
  [38, "R U' R' U R U2' R' U R U' R'", "DFR:D>F DFR:F>R DFR:R>D", "FR:F>F FR:R>R"],
  [39, "R U' R' U' R U R' U2' R U' R'", "DFR:D>R DFR:F>D DFR:R>F", "FR:F>F FR:R>R"],
  [40, "R U R' F U R U' R' F' R U R'", "DFR:D>F DFR:F>R DFR:R>D", "FR:F>R FR:R>F"],
  [41, "R F U R U' R' F' U' R'", "DFR:D>R DFR:F>D DFR:R>F", "FR:F>R FR:R>F"],
]

export const cases: readonly F2LCase[] = sourceCases.map(
  ([number, sourceSetup, corner, edge, outerSetup]) => ({
    number, slot: 'FR', sourceSetup, setup: outerSetup ?? sourceSetup.replaceAll("2'", '2'),
    solutions: sourceSolutions[number - 1], expected: { corner, edge },
  }),
)

export const alignments = ['', 'U', 'U2', "U'"] as const
export type Alignment = typeof alignments[number]
const undoAlignment: Record<Alignment, Alignment> = { '': '', U: "U'", U2: 'U2', "U'": 'U' }

export function generateCase(definition: F2LCase, alignment: Alignment = '') {
  const cube = new VirtualCube()
  for (const move of definition.setup.trim().split(/\s+/)) {
    if (!cube.applyMove(move)) throw new Error(`Invalid setup move in F2L ${definition.number}`)
  }
  const { corner, edge } = targetConfiguration(cube, definition.slot)
  if (!protectedPiecesSolved(cube, definition.slot) || targetSolved(cube, definition.slot) ||
      corner !== definition.expected.corner || edge !== definition.expected.edge) {
    throw new Error(`Invalid setup for F2L ${definition.number}`)
  }
  if (alignment) cube.applyMove(alignment)
  return cube
}

export function alignedSolution(definition: F2LCase, alignment: Alignment, index = 0) {
  const [original, fixed] = definition.solutions[index] ?? definition.solutions[0]
  const stack: { face: string; amount: number }[] = []
  const suffix = ['', '', '2', "'"]
  for (const move of [undoAlignment[alignment], fixed ?? original].filter(Boolean).join(' ').split(/\s+/)) {
    const face = move[0]
    const amount = move.endsWith('2') ? 2 : move.endsWith("'") ? 3 : 1
    const last = stack.at(-1)
    if (last?.face === face) {
      last.amount = (last.amount + amount) % 4
      if (last.amount === 0) stack.pop()
    } else {
      stack.push({ face, amount })
    }
  }
  return stack.map(({ face, amount }) => face + suffix[amount]).join(' ')
}

export function pickCase(pool: readonly F2LCase[], previous?: number, random = Math.random) {
  const eligible = pool.length > 1 ? pool.filter(candidate => candidate.number !== previous) : pool
  return eligible[Math.floor(random() * eligible.length)]
}
