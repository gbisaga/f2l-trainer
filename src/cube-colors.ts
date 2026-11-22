import { createFaceCalibration, faceIds } from './face-calibration.ts'
import { faces } from './virtual-cube.ts'
import type { Face } from './virtual-cube.ts'

export const colorNames: Record<Face, string> = {
  U: 'Yellow', D: 'White', F: 'Green', B: 'Blue', R: 'Orange', L: 'Red',
}

export function cubeColors(top: Face, front: Face) {
  const scheme = createFaceCalibration(top, front)
  if (!scheme) return
  return Object.fromEntries(faceIds.map(face => [
    face, faces[scheme.toPhysicalMove(face) as Face].color,
  ])) as Record<Face, number>
}
