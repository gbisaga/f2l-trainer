import { Quaternion } from 'three'
import type { SmartCubeGyroEvent } from 'smartcube-web-bluetooth'

export class CubeOrientation {
  private latest = new Quaternion()
  private referenceInverse = new Quaternion()
  private physicalToVirtual = new Quaternion()
  private virtualToPhysical = new Quaternion()
  private hasSample = false
  readonly rotation = new Quaternion()

  constructor(frame = new Quaternion()) {
    this.physicalToVirtual.copy(frame)
    this.virtualToPhysical.copy(frame).invert()
  }

  startSession() {
    this.hasSample = false
    this.rotation.identity()
  }

  recalibrate(frame?: Quaternion) {
    if (!this.hasSample) return
    if (frame) {
      this.physicalToVirtual.copy(frame)
      this.virtualToPhysical.copy(frame).invert()
    }
    this.referenceInverse.copy(this.latest).invert()
    this.rotation.identity()
  }

  update({ x, y, z, w }: SmartCubeGyroEvent['quaternion']) {
    if (!Number.isFinite(x * x + y * y + z * z + w * w) || !(x || y || z || w)) return false
    // Convert GAN's sensor axes to the renderer's right-handed cube axes.
    this.latest.set(x, z, -y, w).normalize()
    if (!this.hasSample) {
      this.hasSample = true
      this.recalibrate()
    } else {
      // Express the reference-relative physical rotation in the calibrated virtual axes.
      this.rotation.multiplyQuaternions(this.referenceInverse, this.latest)
        .premultiply(this.physicalToVirtual).multiply(this.virtualToPhysical).normalize()
    }
    return true
  }
}
