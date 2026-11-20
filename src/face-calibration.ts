import { Matrix4, Quaternion, Vector3 } from 'three'
import { faces } from './virtual-cube.ts'
import type { Face } from './virtual-cube.ts'

export const faceIds = Object.keys(faces) as Face[]

function normal(face: Face) {
  const { axis, side } = faces[face]
  return new Vector3().setComponent(axis, side)
}

export function createFaceCalibration(top: Face, front: Face) {
  if (faces[top].axis === faces[front].axis) return undefined
  const up = normal(top)
  const forward = normal(front)
  const right = up.clone().cross(forward)
  const physicalToVirtual = new Quaternion()
    .setFromRotationMatrix(new Matrix4().makeBasis(right, up, forward)).invert()
  const mapping = new Map(faceIds.map(face => {
    const direction = normal(face)
    const mapped = new Vector3(direction.dot(right), direction.dot(up), direction.dot(forward))
    return [face, faceIds.find(candidate => normal(candidate).equals(mapped))!] as const
  }))

  return {
    physicalToVirtual,
    mapMove(move: string) {
      const face = mapping.get(move[0] as Face)
      return face ? face + move.slice(1) : move
    },
    toGanMove(move: string) {
      const face = faceIds.find(candidate => mapping.get(candidate) === move[0])
      return face ? face + move.slice(1) : move
    },
  }
}
