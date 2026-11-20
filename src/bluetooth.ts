import { connectSmartCube } from 'smartcube-web-bluetooth'
import type { SmartCubeEvent } from 'smartcube-web-bluetooth'
import type { RecordableEvent } from './input-recording'

export type CubeInputEvent =
  | Exclude<SmartCubeEvent, { type: 'FACELETS' }>
  | Pick<Extract<SmartCubeEvent, { type: 'FACELETS' }>, 'type' | 'timestamp'>

interface CubeListener {
  onStatus: (message: string) => void
  onConnected: (deviceName: string, disconnect: () => Promise<void>) => void
  onEvent: (event: CubeInputEvent) => void
  onRecordableEvent: (event: RecordableEvent) => void
  onDisconnected: () => void
  onError: (error: unknown) => void
}

export const supportsBluetooth = window.isSecureContext && 'bluetooth' in navigator

export async function connectCube(mac: string, listener: CubeListener) {
  try {
    const cube = await connectSmartCube({
      onStatus: listener.onStatus,
      macAddressProvider: async () => mac || null,
    })

    listener.onConnected(cube.deviceName, () => cube.disconnect())
    cube.events$.subscribe({
      next: event => {
        listener.onEvent(event.type === 'FACELETS'
          ? { type: event.type, timestamp: event.timestamp }
          : event)
        if (event.type === 'MOVE' || event.type === 'FACELETS') listener.onRecordableEvent(event)
      },
      complete: listener.onDisconnected,
      error: (error: unknown) => {
        void cube.disconnect().catch(() => {})
        listener.onError(error)
      },
    })
  } catch (error) {
    listener.onError(error)
  }
}
