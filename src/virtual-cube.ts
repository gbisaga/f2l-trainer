type Coordinates = [number, number, number]
type Axis = 0 | 1 | 2

// Cube-local axes point right, up, and toward the viewer at the home position.
export const faces = {
  R: { axis: 0, side: 1, color: 0xff871d },
  L: { axis: 0, side: -1, color: 0xd9263c },
  U: { axis: 1, side: 1, color: 0xf8d526 },
  D: { axis: 1, side: -1, color: 0xf7f8ff },
  F: { axis: 2, side: 1, color: 0x17af62 },
  B: { axis: 2, side: -1, color: 0x2879e8 },
} as const

export type Face = keyof typeof faces
export type Sticker = { position: Coordinates; normal: Coordinates; color: Face }

export function parseFaceTurn(move: string) {
  if (!/^[RLUDFB](?:'|2)?$/.test(move)) return
  const { axis, side } = faces[move[0] as Face]
  const direction = move.endsWith("'") ? side : -side
  const turns = move.endsWith('2') ? 2 : 1
  return { axis, side, direction, turns }
}

function rotateQuarter(vector: Coordinates, axis: Axis, direction: number): Coordinates {
  const first = (axis + 1) % 3
  const second = (axis + 2) % 3
  const rotated: Coordinates = [...vector]
  rotated[first] = -direction * vector[second] || 0
  rotated[second] = direction * vector[first] || 0
  return rotated
}

function solvedStickers(): Sticker[] {
  const stickers: Sticker[] = []
  for (const color of Object.keys(faces) as Face[]) {
    const { axis, side } = faces[color]
    const normal: Coordinates = [0, 0, 0]
    normal[axis] = side
    for (const row of [-1, 0, 1]) {
      for (const column of [-1, 0, 1]) {
        const position: Coordinates = [...normal]
        position[(axis + 1) % 3] = row
        position[(axis + 2) % 3] = column
        stickers.push({ position, normal, color })
      }
    }
  }
  return stickers
}

export class VirtualCube {
  private current = solvedStickers()

  get stickers(): readonly Sticker[] {
    return this.current
  }

  reset() {
    this.current = solvedStickers()
  }

  copyFrom(source: VirtualCube) {
    this.current = source.stickers.map(({ position, normal, color }) =>
      ({ position: [...position], normal: [...normal], color }))
  }

  applyMove(move: string) {
    const turn = parseFaceTurn(move)
    if (!turn) return false
    const { axis, side, direction, turns } = turn
    for (const sticker of this.current) {
      if (sticker.position[axis] !== side) continue
      for (let turn = 0; turn < turns; turn++) {
        sticker.position = rotateQuarter(sticker.position, axis, direction)
        sticker.normal = rotateQuarter(sticker.normal, axis, direction)
      }
    }
    return true
  }
}
