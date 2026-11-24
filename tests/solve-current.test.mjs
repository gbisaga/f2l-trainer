import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cube3x3x3 } from 'cubing/puzzles'
import { alignedSolution, alignments, cases, caseForSlot, generateCase } from '../src/f2l-cases.ts'
import { isF2LSolved, targetConfiguration } from '../src/f2l-completion.ts'
import { patternFromCube, solveCurrent } from '../src/solve-current.ts'
import { VirtualCube } from '../src/virtual-cube.ts'

function apply(cube, algorithm) {
  for (const turn of algorithm.split(' ')) assert.equal(cube.applyMove(turn), true)
}

test('the solver receives the same cubie permutation and orientation as cubing.js', async () => {
  const moves = "R U F2 D' B L2 F' U R2"
  const cube = new VirtualCube()
  apply(cube, moves)
  const puzzle = await cube3x3x3.kpuzzle()
  const expected = puzzle.defaultPattern().applyAlg(moves)
  assert.equal((await patternFromCube(cube)).isIdentical(expected), true)
})

test('solving from a disturbed exercise leaves the live cube untouched', async () => {
  const cube = generateCase(caseForSlot(cases[9], 'FL'), 'U')
  apply(cube, "R2 D F' B")
  const before = JSON.stringify(cube.stickers)
  const solution = await solveCurrent(cube, 'FL')
  assert.equal(JSON.stringify(cube.stickers), before)
  apply(cube, solution)
  assert.equal(isF2LSolved(cube, 'FL'), true)
  assert.equal(await solveCurrent(cube, 'FL'), '')
})

test('current F2L positions prefer the first listed solution, adjusted for the actual top layer', async () => {
  for (const slot of ['FR', 'FL', 'BL', 'BR']) {
    for (const canonical of cases) {
      const definition = caseForSlot(canonical, slot)
      const checkedPositions = new Set()
      for (const alignment of alignments) {
        const cube = generateCase(definition, alignment)
        const target = targetConfiguration(cube, slot)
        // If both pieces are in the slot, further U turns do not affect recognition.
        const signature = JSON.stringify(target)
        if (checkedPositions.has(signature)) continue
        checkedPositions.add(signature)
        const solution = await solveCurrent(cube, slot)
        assert.equal(solution, alignedSolution(definition, alignment), `F2L ${definition.number} ${slot} ${alignment}`)
        apply(cube, solution)
        assert.equal(isF2LSolved(cube, slot), true)
      }
    }
  }
})

test('solving without an exercise restores the full cube', async () => {
  const cube = new VirtualCube()
  apply(cube, "L2 U R' B D2")
  apply(cube, await solveCurrent(cube))
  assert.deepEqual(cube.stickers, new VirtualCube().stickers)
  assert.equal(await solveCurrent(cube), '')
})
