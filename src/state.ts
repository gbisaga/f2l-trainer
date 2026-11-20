import type { SmartCubeGyroEvent } from 'smartcube-web-bluetooth'
import type { CubeInputEvent } from './bluetooth'

export const logLimit = 20

export function formatQuaternion(quaternion: SmartCubeGyroEvent['quaternion']) {
  const { x, y, z, w } = quaternion
  return [x, y, z, w].map(value => value.toFixed(5))
}

export function createInputState() {
  return {
    total: 0,
    moves: 0,
    gyroEvents: 0,
    lastMove: '',
    quaternion: null as SmartCubeGyroEvent['quaternion'] | null,
    recent: [] as { receivedAt: Date; text: string }[],
  }
}

export function recordEvent(state: ReturnType<typeof createInputState>, event: CubeInputEvent) {
  let text: string = event.type
  state.total++

  switch (event.type) {
    case 'MOVE':
      state.moves++
      state.lastMove = event.move
      text = `MOVE · ${event.move}`
      break
    case 'GYRO':
      state.gyroEvents++
      state.quaternion = event.quaternion
      text = `GYRO · ${formatQuaternion(event.quaternion).join('  ')}`
      break
    case 'BATTERY':
      text = `BATTERY · ${event.batteryLevel}%`
      break
    case 'HARDWARE':
      if (event.hardwareName) text = `HARDWARE · ${event.hardwareName}`
      break
  }

  const entry = { receivedAt: new Date(), text }
  state.recent.unshift(entry)
  if (state.recent.length > logLimit) state.recent.pop()
  return entry
}
