import { faces, VirtualCube } from './virtual-cube.ts'
import type { Sticker } from './virtual-cube.ts'

export type Slot = 'FR' | 'BR' | 'BL' | 'FL'

const solved = new VirtualCube().stickers

export function faceLabels(vector: Sticker['position']) {
  return Object.entries(faces)
    .filter(([, { axis, side }]) => vector[axis] === side)
    .map(([face]) => face)
    .sort()
    .join('')
}

const homePositions = solved.map(sticker => faceLabels(sticker.position))

function isAtHome(sticker: Sticker, index: number) {
  const home = solved[index]
  return sticker.color === home.color &&
    sticker.position.every((value, axis) => value === home.position[axis]) &&
    sticker.normal.every((value, axis) => value === home.normal[axis])
}

function isTarget(home: string, slot: Slot) {
  return home === slot || home === [...`D${slot}`].sort().join('')
}

export function protectedPiecesSolved(cube: VirtualCube, slot: Slot) {
  return cube.stickers.every((sticker, index) => {
    const home = homePositions[index]
    // Fixed centers and U-layer pieces are outside the F2L completion criteria.
    return home.length === 1 || home.includes('U') || isTarget(home, slot) || isAtHome(sticker, index)
  })
}

export function targetSolved(cube: VirtualCube, slot: Slot) {
  return cube.stickers.every((sticker, index) =>
    !isTarget(homePositions[index], slot) || isAtHome(sticker, index))
}

export function isF2LSolved(cube: VirtualCube, slot: Slot) {
  return targetSolved(cube, slot) && protectedPiecesSolved(cube, slot)
}

export function describeCompletion(cube: VirtualCube, slot: Slot) {
  const pieces = new Map<string, { solved: boolean; expected: string[]; actual: string[] }>()
  cube.stickers.forEach((sticker, index) => {
    const home = homePositions[index]
    if (home.length === 1 || home.includes('U')) return
    const piece = pieces.get(home) ?? { solved: true, expected: [], actual: [] }
    piece.solved &&= isAtHome(sticker, index)
    piece.expected.push(`${solved[index].color}->${faceLabels(solved[index].normal)}`)
    piece.actual.push(`${sticker.color}->${faceLabels(sticker.normal)} @ ${faceLabels(sticker.position)}`)
    pieces.set(home, piece)
  })
  return [...pieces].sort(([a], [b]) => a.localeCompare(b)).map(([home, piece]) => ({
    home, target: isTarget(home, slot), ...piece,
  }))
}

export function targetConfiguration(cube: VirtualCube, slot: Slot) {
  const corner: string[] = []
  const edge: string[] = []
  cube.stickers.forEach((sticker, index) => {
    const home = homePositions[index]
    if (!isTarget(home, slot)) return
    const piece = home.length === 3 ? corner : edge
    piece.push(`${faceLabels(sticker.position)}:${sticker.color}>${faceLabels(sticker.normal)}`)
  })
  return { corner: corner.sort().join(' '), edge: edge.sort().join(' ') }
}
