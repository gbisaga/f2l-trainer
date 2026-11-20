import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Quaternion, Vector3 } from 'three'
import { createFaceCalibration, faceIds } from '../src/face-calibration.ts'
import { CubeOrientation } from '../src/orientation.ts'
import { faces, VirtualCube } from '../src/virtual-cube.ts'
import { cases, generateCase } from '../src/f2l-cases.ts'

function ganSample({ x, y, z, w }) {
  return { x, y: -z, z: y, w }
}

test('home colors are yellow up, white down, and green front', () => {
  assert.deepEqual([faces.U.color, faces.D.color, faces.F.color], [0xf8d526, 0xf7f8ff, 0x17af62])
})

test('all 24 adjacent-face calibrations map six faces and preserve turn direction', () => {
  let validCount = 0
  for (const top of faceIds) {
    for (const front of faceIds) {
      const calibration = createFaceCalibration(top, front)
      if (faces[top].axis === faces[front].axis) {
        assert.equal(calibration, undefined)
        continue
      }
      validCount++
      assert.equal(calibration.mapMove(top), 'U')
      assert.equal(calibration.mapMove(front), 'F')
      assert.equal(new Set(faceIds.map(face => calibration.mapMove(face))).size, 6)
      for (const face of faceIds) {
        const mapped = calibration.mapMove(face)
        assert.equal(calibration.mapMove(`${face}'`), `${mapped}'`)
        assert.equal(calibration.mapMove(`${face}2`), `${mapped}2`)
        assert.equal(calibration.toGanMove(`${mapped}'`), `${face}'`)
        const { axis, side } = faces[face]
        const direction = new Vector3().setComponent(axis, side).applyQuaternion(calibration.physicalToVirtual)
        const mappedNormal = new Vector3().setComponent(faces[mapped].axis, faces[mapped].side)
        assert.ok(direction.distanceTo(mappedNormal) < 1e-9)
      }
    }
  }
  assert.equal(validCount, 24)
})

test('after recalibration, a whole-cube rotation changes the view and the same physical turn hits the same virtual layer', () => {
  const cube = generateCase(cases[0])
  const initial = JSON.stringify(cube.stickers)
  const orientation = new CubeOrientation()
  const start = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), 0.7)
  orientation.update(ganSample(start))

  const calibration = createFaceCalibration('R', 'F')
  orientation.recalibrate(calibration.physicalToVirtual)
  assert.deepEqual(orientation.rotation.toArray(), [0, 0, 0, 1])
  assert.equal(JSON.stringify(cube.stickers), initial)
  assert.equal(calibration.mapMove("D'"), "R'")

  const physicalRotation = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2)
  orientation.update(ganSample(start.clone().multiply(physicalRotation)))
  const expectedView = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2)
  assert.ok(orientation.rotation.angleTo(expectedView) < 1e-7)
  assert.equal(JSON.stringify(cube.stickers), initial)

  const expectedPuzzle = new VirtualCube()
  expectedPuzzle.copyFrom(cube)
  expectedPuzzle.applyMove("R'")
  cube.applyMove(calibration.mapMove("D'"))
  assert.deepEqual(cube.stickers, expectedPuzzle.stickers)

  cube.reset()
  assert.ok(orientation.rotation.angleTo(expectedView) < 1e-7)
  assert.equal(calibration.mapMove("D'"), "R'")
})
