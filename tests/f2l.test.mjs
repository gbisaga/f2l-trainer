import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cube3x3x3 } from 'cubing/puzzles'
import { alignedSolution, alignments, cases, generateCase, pickCase } from '../src/f2l-cases.ts'
import { isF2LSolved, protectedPiecesSolved, targetConfiguration, targetSolved } from '../src/f2l-completion.ts'
import { TrainingSession } from '../src/training-session.ts'
import { VirtualCube } from '../src/virtual-cube.ts'

const reidPositions = {
  CORNERS: 'UFR URB UBL ULF DRF DFL DLB DBR'.split(' '),
  EDGES: 'UF UR UB UL DF DR DB DL FR FL BR BL'.split(' '),
}
const solvedPattern = (await cube3x3x3.kpuzzle()).defaultPattern()

function sourceSignature(pattern, orbit, piece) {
  const { pieces, orientation } = pattern.patternData[orbit]
  const positions = reidPositions[orbit]
  const index = pieces.indexOf(positions.indexOf(piece))
  const location = positions[index]
  const locationLabel = [...location].sort().join('')
  return [...piece].map((color, faceIndex) => {
    const normal = location[(faceIndex - orientation[index] + location.length) % location.length]
    return `${locationLabel}:${color}>${normal}`
  }).sort().join(' ')
}

function apply(cube, algorithm) {
  for (const move of algorithm.split(/\s+/)) assert.equal(cube.applyMove(move), true, move)
}

test('covers SpeedCubeDB numbers 1–41 without duplicate identities modulo U alignment', () => {
  assert.deepEqual(cases.map(({ number }) => number), Array.from({ length: 41 }, (_, i) => i + 1))
  const identities = cases.map(definition => alignments
    .map(alignment => JSON.stringify(targetConfiguration(generateCase(definition, alignment), 'FR')))
    .sort()[0])
  assert.equal(new Set(identities).size, 41)
})

for (const definition of cases) {
  test(`F2L ${definition.number} matches the source and solves at every alignment`, () => {
    for (const alignment of alignments) {
      const source = solvedPattern.applyAlg([definition.sourceSetup, alignment].join(' ').trim())
      const cube = generateCase(definition, alignment)
      assert.deepEqual(targetConfiguration(cube, 'FR'), {
        corner: sourceSignature(source, 'CORNERS', 'DRF'),
        edge: sourceSignature(source, 'EDGES', 'FR'),
      })
      assert.equal(protectedPiecesSolved(cube, 'FR'), true)
      assert.equal(isF2LSolved(cube, 'FR'), false)
      apply(cube, alignedSolution(definition, alignment))
      assert.equal(isF2LSolved(cube, 'FR'), true)
      apply(cube, 'U')
      assert.equal(isF2LSolved(cube, 'FR'), true, 'the last layer may stay scrambled')
      apply(cube, 'L')
      assert.equal(targetSolved(cube, 'FR'), true)
      assert.equal(isF2LSolved(cube, 'FR'), false, 'the left slots and cross must be restored')
      apply(cube, "L'")
      assert.equal(isF2LSolved(cube, 'FR'), true)
    }
  })
}

test('rejects a mismatched target configuration and a setup that damages protected pieces', () => {
  const definition = cases[0]
  assert.throws(() => generateCase({ ...definition, expected: cases[1].expected }), /Invalid setup/)
  assert.throws(() => generateCase({ ...definition, setup: `${definition.setup} L` }), /Invalid setup/)
})

test('a different solution succeeds and an incorrect turn leaves the case unsolved', () => {
  const cube = generateCase(cases[0])
  apply(cube, 'U')
  assert.equal(isF2LSolved(cube, 'FR'), false)
  apply(cube, "U' R' F R F'")
  assert.equal(isF2LSolved(cube, 'FR'), true)
})

test('chooses only enabled cases and avoids repeating when there is a choice', () => {
  const pool = [cases[0], cases[40]]
  assert.equal(pickCase(pool, 1, () => 0)?.number, 41)
  assert.equal(pickCase(pool, 41, () => 0.99)?.number, 1)
  assert.equal(pickCase([cases[0]], 1)?.number, 1)
  assert.equal(pickCase([]), undefined)
})

test('recognition, execution, exact retry, and cancel use the same virtual cube', () => {
  const cube = new VirtualCube()
  const session = new TrainingSession(cube)
  session.start(cases[3], 'U2')
  const initial = JSON.stringify(cube.stickers)
  session.markPresented(100)
  session.markPresented(150)
  const solution = session.reference.algorithm.split(' ')
  solution.forEach((move, index) => {
    cube.applyMove(move)
    assert.equal(session.recordTurn(200 + index * 50), index === solution.length - 1)
  })
  assert.deepEqual(session.result, { recognition: 100, execution: 150, total: 250 })
  session.retry()
  assert.equal(JSON.stringify(cube.stickers), initial)
  assert.equal(session.result, undefined)
  session.markPresented(500)
  solution.forEach((move, index) => {
    cube.applyMove(move)
    session.recordTurn(550 + index * 10)
  })
  assert.deepEqual(session.result, { recognition: 50, execution: 30, total: 80 })
  assert.equal(session.describe().pieces.every(piece => piece.solved), true)
  cube.applyMove('L')
  const report = session.describe()
  assert.equal(report.completed, true)
  assert.equal(report.currentlySolved, false)
  assert.equal(report.pieces.filter(piece => piece.target).length, 2)
  assert.equal(report.pieces.find(piece => piece.home === 'DL').solved, false)
  session.cancel()
  assert.equal(session.reference, undefined)
  assert.equal(session.result, undefined)
})

test('retry restores F2L 3 after the turn sequence that disturbed the back-right slot', () => {
  const cube = new VirtualCube()
  const session = new TrainingSession(cube)
  session.start(cases[2], "U'")
  const initial = JSON.stringify(cube.stickers)
  apply(cube, "F' F R R' R' U' R")
  assert.equal(protectedPiecesSolved(cube, 'FR'), false)
  session.retry()
  assert.equal(JSON.stringify(cube.stickers), initial)
  assert.equal(protectedPiecesSolved(cube, 'FR'), true)
  assert.deepEqual(session.describe().pieces.filter(piece => !piece.solved).map(piece => piece.home), ['DFR', 'FR'])
})
