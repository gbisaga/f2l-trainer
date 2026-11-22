import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cases } from '../src/f2l-cases.ts'
import { TrainingSession } from '../src/training-session.ts'
import { TurnPresentation } from '../src/turn-presentation.ts'
import { VirtualCube } from '../src/virtual-cube.ts'

function setup() {
  const logical = new VirtualCube()
  const presentation = new TurnPresentation(logical)
  function move(notation) {
    assert.equal(logical.applyMove(notation), true)
    presentation.enqueue(notation)
  }
  return { logical, presentation, move }
}

test('slow turns interpolate and settle to exact sticker positions', () => {
  const { logical, presentation, move } = setup()
  move('R')
  assert.equal(Math.abs(presentation.frame(0).angle), 0)
  const halfway = presentation.frame(50)
  assert.equal(halfway.turn.move, 'R')
  assert.equal(halfway.angle, -Math.PI / 4)
  assert.notDeepEqual(presentation.cube.stickers, logical.stickers)
  assert.equal(presentation.frame(100).turn, undefined)
  assert.deepEqual(presentation.cube.stickers, logical.stickers)
  move("U'")
  assert.equal(presentation.frame(250).turn.move, "U'")
  assert.equal(presentation.frame(300).angle, Math.PI / 4)
})

test('two waiting moves animate in order', () => {
  const { logical, presentation, move } = setup()
  for (const turn of ['R', 'U', "F'"]) move(turn)
  assert.equal(presentation.frame(0).turn.move, 'R')
  assert.equal(presentation.frame(100).turn.move, 'U')
  assert.equal(presentation.frame(200).turn.move, "F'")
  assert.equal(presentation.frame(300).turn, undefined)
  assert.deepEqual(presentation.cube.stickers, logical.stickers)
})

test('overflow interrupts a turn, snaps to the entire burst, and resumes on the next move', () => {
  const { logical, presentation, move } = setup()
  const expected = new VirtualCube()
  move('R')
  expected.applyMove('R')
  presentation.frame(0)
  assert.equal(presentation.frame(40).turn.move, 'R')
  const burst = Array.from({ length: 503 }, (_, i) => ['U', 'R2', "F'", 'D', "L'"][i % 5])
  for (const turn of burst) {
    move(turn)
    expected.applyMove(turn)
  }
  assert.deepEqual(logical.stickers, expected.stickers)
  assert.equal(presentation.frame(50).turn, undefined)
  assert.deepEqual(presentation.cube.stickers, expected.stickers)
  assert.equal(presentation.frame(1000).turn, undefined)
  move('B')
  assert.equal(presentation.frame(1010).turn.move, 'B')
  presentation.frame(1110)
  assert.deepEqual(presentation.cube.stickers, logical.stickers)
})

test('a solve can finish before the presentation has drawn a single move', () => {
  const { logical, presentation } = setup()
  const session = new TrainingSession(logical)
  session.start(cases[0], '')
  presentation.replace()
  presentation.frame(0)
  session.markPresented(0)
  const turns = session.reference.algorithm.split(' ')
  turns.forEach((turn, i) => {
    logical.applyMove(turn)
    assert.equal(session.recordTurn(20 * (i + 1)), i === turns.length - 1)
    presentation.enqueue(turn)
  })
  assert.deepEqual(session.result, { recognition: 20, execution: 60, total: 80 })
  assert.notDeepEqual(presentation.cube.stickers, logical.stickers)
  presentation.frame(90)
  assert.deepEqual(presentation.cube.stickers, logical.stickers)
})

test('new case, retry, and reset replace an active turn and its pending moves', () => {
  const { logical, presentation, move } = setup()
  const session = new TrainingSession(logical)
  const actions = [
    () => session.start(cases[0], 'U2'),
    () => session.retry(),
    () => { session.cancel(); logical.reset() },
  ]
  actions.forEach((action, i) => {
    const now = i * 1000
    move('R')
    presentation.frame(now)
    move('U')
    action()
    presentation.replace()
    assert.equal(presentation.frame(now + 20).turn, undefined)
    assert.deepEqual(presentation.cube.stickers, logical.stickers)
    assert.equal(presentation.frame(now + 100).turn, undefined)
  })
})
