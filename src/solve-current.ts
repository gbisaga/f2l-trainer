import { KPattern } from 'cubing/kpuzzle'
import { cube3x3x3 } from 'cubing/puzzles'
import { alignedSolution, alignments, caseForSlot, cases } from './f2l-cases.ts'
import { faceLabels, isF2LSolved, protectedPiecesSolved, targetConfiguration } from './f2l-completion.ts'
import type { Slot } from './f2l-completion.ts'
import { VirtualCube } from './virtual-cube.ts'

// The face order within each piece is cubing.js's orientation convention.
const corners = 'UFR URB UBL ULF DRF DFL DLB DBR'.split(' ')
const edges = 'UF UR UB UL DF DR DB DL FR FL BR BL'.split(' ')
const sorted = (labels: string) => [...labels].sort().join('')

export async function patternFromCube(cube: VirtualCube) {
  const stickers = new Map<string, Map<string, string>>()
  for (const sticker of cube.stickers) {
    const position = faceLabels(sticker.position)
    const piece = stickers.get(position) ?? new Map()
    piece.set(faceLabels(sticker.normal), sticker.color)
    stickers.set(position, piece)
  }
  function orbit(order: string[]) {
    const pieces: number[] = []
    const orientation: number[] = []
    for (const location of order) {
      const piece = stickers.get(sorted(location))!
      const colors = sorted([...piece.values()].join(''))
      const id = order.findIndex(name => sorted(name) === colors)
      pieces.push(id)
      orientation.push(order[id].indexOf(piece.get(location[0])!))
    }
    return { pieces, orientation }
  }
  const puzzle = await cube3x3x3.kpuzzle()
  return new KPattern(puzzle, {
    ...puzzle.defaultPattern().patternData,
    CORNERS: orbit(corners),
    EDGES: orbit(edges),
  })
}

function listedSolution(cube: VirtualCube, slot: Slot) {
  if (!protectedPiecesSolved(cube, slot)) return
  const probe = new VirtualCube()
  probe.copyFrom(cube)
  const definitions = cases.map(definition => caseForSlot(definition, slot))
  for (const alignment of alignments) {
    const { corner, edge } = targetConfiguration(probe, slot)
    const matching = definitions.find(({ expected }) => expected.corner === corner && expected.edge === edge)
    if (matching) return alignedSolution(matching, alignment)
    // Each successive probe undoes one more top turn from the captured position.
    probe.applyMove("U'")
  }
}

export async function solveCurrent(cube: VirtualCube, slot?: Slot) {
  // Work from a copy captured before loading the solver or waiting on its worker.
  const snapshot = new VirtualCube()
  snapshot.copyFrom(cube)
  if (slot) {
    if (isF2LSolved(snapshot, slot)) return ''
    const preferred = listedSolution(snapshot, slot)
    if (preferred) return preferred
  }
  const pattern = await patternFromCube(snapshot)
  if (pattern.isIdentical(pattern.kpuzzle.defaultPattern())) return ''
  const { experimentalSolve3x3x3IgnoringCenters, setSearchDebug } = await import('cubing/search')
  // Vite fingerprints the worker entry, so use the bundled URL in the browser.
  if (typeof window !== 'undefined') {
    setSearchDebug({ prioritizeEsbuildWorkaroundForWorkerInstantiation: true })
  }
  const solution = (await experimentalSolve3x3x3IgnoringCenters(pattern)).toString().trim()
  if (!slot || !solution) return solution

  const turns: string[] = []
  for (const move of solution.split(/\s+/)) {
    if (!snapshot.applyMove(move)) throw new Error('Solver returned an unsupported turn')
    turns.push(move)
    if (isF2LSolved(snapshot, slot)) return turns.join(' ')
  }
  throw new Error('Solver could not verify the F2L solution')
}
