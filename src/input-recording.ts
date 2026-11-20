import type { SmartCubeEvent } from 'smartcube-web-bluetooth'

export type RecordableEvent = Extract<SmartCubeEvent, { type: 'MOVE' | 'FACELETS' }>

type SavePicker = (options: { suggestedName: string }) => Promise<{
  name: string
  createWritable(): Promise<WritableStream<string>>
}>

const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
let lastTime = -1
let randomness = 0n

function encode(value: bigint, length: number) {
  let encoded = ''
  for (let i = 0; i < length; i++) {
    encoded = alphabet[Number(value & 31n)] + encoded
    value >>= 5n
  }
  return encoded
}

function nextFilename() {
  const time = Math.max(Date.now(), lastTime)
  if (time === lastTime) randomness++
  else {
    lastTime = time
    randomness = crypto.getRandomValues(new Uint8Array(10))
      .reduce((value, byte) => (value << 8n) | BigInt(byte), 0n)
  }
  return `${encode(BigInt(time), 10)}${encode(randomness, 16)}.jsonl`
}

export function createInputRecording() {
  const start = document.querySelector<HTMLButtonElement>('#start-recording')!
  const stop = document.querySelector<HTMLButtonElement>('#stop-recording')!
  const filename = document.querySelector<HTMLElement>('#recording-filename')!
  const copy = document.querySelector<HTMLButtonElement>('#copy-recording-name')!
  const status = document.querySelector('#recording-status')!
  const browser = window as Window & { showSaveFilePicker?: SavePicker }
  let writer: WritableStreamDefaultWriter<string> | undefined

  if (!browser.showSaveFilePicker) {
    start.disabled = true
    status.textContent = 'Local recording requires Chrome or Edge with file access on localhost.'
  }

  start.addEventListener('click', async () => {
    start.disabled = true
    try {
      const file = await browser.showSaveFilePicker!({ suggestedName: nextFilename() })
      const current = (await file.createWritable()).getWriter()
      writer = current
      filename.textContent = file.name
      filename.hidden = false
      copy.hidden = false
      copy.textContent = 'Copy'
      stop.disabled = false
      status.textContent = 'Recording GAN moves and facelet snapshots.'
      void current.closed.catch(() => {
        if (writer !== current) return
        writer = undefined
        stop.disabled = true
        start.disabled = false
        status.textContent = 'Recording failed. Start a new file to try again.'
      })
    } catch (error) {
      start.disabled = false
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        status.textContent = 'Could not open the recording file.'
      }
    }
  })

  stop.addEventListener('click', async () => {
    const current = writer
    writer = undefined
    stop.disabled = true
    if (!current) return
    status.textContent = 'Saving recording…'
    try {
      await current.close()
      status.textContent = 'Recording saved.'
    } catch {
      status.textContent = 'Could not save the recording.'
    } finally {
      start.disabled = false
    }
  })

  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(filename.textContent ?? '')
      copy.textContent = 'Copied'
    } catch {
      const selection = window.getSelection()
      selection?.selectAllChildren(filename)
      status.textContent = 'Filename selected. Press Ctrl+C or Command+C to copy it.'
    }
  })

  return (event: RecordableEvent) => {
    if (!writer) return
    const line = JSON.stringify({ receivedAt: new Date().toISOString(), ...event })
    void writer.write(`${line}\n`).catch(() => {
      // The writer's closed promise reports stream failures.
    })
  }
}
