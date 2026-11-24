import './style.css'
import { connectCube, supportsBluetooth } from './bluetooth'
import { createInputState, formatQuaternion, logLimit, recordEvent } from './state'
import { createCubeView } from './cube-view'
import { CubeOrientation } from './orientation'
import { faces, VirtualCube } from './virtual-cube'
import { alignments, caseForSlot, pickCase } from './f2l-cases'
import type { Slot } from './f2l-completion'
import { colorNames, cubeColors } from './cube-colors'
import { initializeCaseSelection } from './case-selection'
import { createDebugPane } from './debug-pane'
import { createInputRecording } from './input-recording'
import { TrainingSession } from './training-session'
import { createFaceCalibration, faceIds } from './face-calibration'
import type { Face } from './virtual-cube'

const state = createInputState()
const recordInput = createInputRecording()
const virtualCube = new VirtualCube()
const training = new TrainingSession(virtualCube)
let calibration = createFaceCalibration('D', 'F')!
const orientation = new CubeOrientation(calibration.physicalToVirtual)
const status = document.querySelector('#status')!
const form = document.querySelector<HTMLFormElement>('#connect')!
const button = form.querySelector<HTMLButtonElement>('button[type="submit"]')!
const disconnect = document.querySelector<HTMLButtonElement>('#disconnect')!
const resetCube = document.querySelector<HTMLButtonElement>('#reset-cube')!
const resetGyro = document.querySelector<HTMLButtonElement>('#reset-gyro')!
const physicalTop = document.querySelector<HTMLSelectElement>('#physical-top')!
const physicalFront = document.querySelector<HTMLSelectElement>('#physical-front')!
const topColor = document.querySelector<HTMLSelectElement>('#top-color')!
const frontColor = document.querySelector<HTMLSelectElement>('#front-color')!
const targetSlot = document.querySelector<HTMLSelectElement>('#target-slot')!
const calibrationStatus = document.querySelector('#calibration-status')!
const virtualMove = document.querySelector('#virtual-move')!
const mac = form.querySelector('input')!
const macHelp = document.querySelector<HTMLElement>('#mac-help')!
const lastMove = document.querySelector('#move')!
const moves = document.querySelector('#moves')!
const gyro = document.querySelector('#gyro')!
const total = document.querySelector('#total')!
const axes = ['x', 'y', 'z', 'w'].map(axis => document.getElementById(axis)!)
const log = document.querySelector('#log')!
const recentEvents = document.querySelector<HTMLDetailsElement>('#recent-events')!
const empty = document.querySelector<HTMLElement>('#empty')!
const newCase = document.querySelector<HTMLButtonElement>('#new-case')!
const retryCase = document.querySelector<HTMLButtonElement>('#retry-case')!
const hint = document.querySelector<HTMLButtonElement>('#hint')!
const hintControl = document.querySelector<HTMLElement>('#hint-control')!
const mode = document.querySelector<HTMLSelectElement>('#practice-mode')!
const solutionChoice = document.querySelector<HTMLElement>('#solution-choice')!
const solutionOption = document.querySelector<HTMLSelectElement>('#solution-option')!
const practiceStatus = document.querySelector('#practice-status')!
const solution = document.querySelector<HTMLElement>('#solution')!
const solveHere = document.querySelector<HTMLButtonElement>('#solve-current')!
const currentSolution = document.querySelector<HTMLElement>('#current-solution')!
const times = document.querySelector<HTMLElement>('#times')!
const emptyCaseSelection = document.querySelector<HTMLElement>('#empty-case-selection')!
const debug = createDebugPane(() => ({
  version: 1,
  connection: status.textContent,
  displayedStatus: practiceStatus.textContent,
  physicalToVirtual: Object.fromEntries(faceIds.map(face => [face, calibration.mapMove(face)])),
  viewQuaternion: orientation.rotation.toArray(),
  eventCounts: { total: state.total, moves: state.moves, gyro: state.gyroEvents },
  ...training.describe(),
}))

for (const face of faceIds) {
  physicalTop.add(new Option(face, face, face === 'D', face === 'D'))
  physicalFront.add(new Option(face, face, face === 'F', face === 'F'))
  topColor.add(new Option(colorNames[face], face, face === 'U', face === 'U'))
  frontColor.add(new Option(colorNames[face], face, face === 'F', face === 'F'))
}
function restrictFrontFaces(top: HTMLSelectElement, front: HTMLSelectElement) {
  for (const option of front.options) {
    option.disabled = faces[top.value as Face].axis === faces[option.value as Face].axis
  }
  if (front.selectedOptions[0]?.disabled) {
    front.value = Array.from(front.options).find(option => !option.disabled)!.value
  }
}
physicalTop.addEventListener('change', () => restrictFrontFaces(physicalTop, physicalFront))
restrictFrontFaces(physicalTop, physicalFront)
restrictFrontFaces(topColor, frontColor)

function createLogRow(entry: (typeof state.recent)[number]) {
  const row = document.createElement('li')
  const time = document.createElement('time')
  time.dateTime = entry.receivedAt.toISOString()
  time.textContent = entry.receivedAt.toLocaleTimeString()
  row.append(time, entry.text)
  return row
}

recentEvents.addEventListener('toggle', () => {
  if (!recentEvents.open) {
    log.replaceChildren()
    return
  }
  total.textContent = String(state.total)
  empty.hidden = state.recent.length > 0
  log.replaceChildren(...state.recent.map(createLogRow))
})

let cubeView: ReturnType<typeof createCubeView> | undefined
try {
  cubeView = createCubeView(
    document.querySelector<HTMLElement>('#viewport')!, virtualCube, orientation.rotation,
    () => training.markPresented(performance.now()),
  )
} catch {
  const renderError = document.querySelector<HTMLElement>('#render-error')!
  renderError.textContent = '3D rendering is unavailable. Check that your browser supports WebGL 2.'
  renderError.hidden = false
  document.getElementById('viewport')!.hidden = true
  resetCube.disabled = true
}

let previousCase: number | undefined

function updateCubeColors() {
  restrictFrontFaces(topColor, frontColor)
  const colors = cubeColors(topColor.value as Face, frontColor.value as Face)
  if (colors) cubeView?.setColors(colors)
}
topColor.addEventListener('change', updateCubeColors)
frontColor.addEventListener('change', updateCubeColors)

const enabledCases = initializeCaseSelection(count => {
  newCase.disabled = !cubeView || count === 0
  emptyCaseSelection.hidden = count > 0
})

let justRetried = false
let cubeRevision = 0

function clearCurrentSolution() {
  cubeRevision++
  currentSolution.hidden = true
  currentSolution.replaceChildren()
}

solveHere.addEventListener('click', async () => {
  const revision = cubeRevision
  const slot = training.slot
  const snapshot = new VirtualCube()
  snapshot.copyFrom(virtualCube)
  solveHere.disabled = true
  currentSolution.hidden = false
  currentSolution.textContent = 'Finding a solution…'
  try {
    const { solveCurrent } = await import('./solve-current')
    const algorithm = await solveCurrent(snapshot, slot)
    if (revision !== cubeRevision) {
      if (!currentSolution.hidden) currentSolution.textContent = 'The cube moved. Click Solve from here to try again.'
      return
    }
    if (!algorithm) {
      currentSolution.textContent = slot ? 'The first two layers are already solved.' : 'The cube is already solved.'
      return
    }
    const heading = document.createElement('p')
    heading.textContent = slot ? 'Finish F2L from this position' : 'Solve the cube from this position'
    const turns = document.createElement('code')
    turns.textContent = algorithm
    currentSolution.replaceChildren(heading, turns)
  } catch {
    if (!currentSolution.hidden) currentSolution.textContent = 'Could not find a solution. Try Solve from here again.'
  } finally {
    solveHere.disabled = false
  }
})

function updatePractice(retried = false) {
  justRetried = retried
  const result = training.result
  const slotNames = { FR: 'front-right', FL: 'front-left', BL: 'back-left', BR: 'back-right' }
  const slot = training.slot
  practiceStatus.textContent = slot
    ? `${result ? 'Solved' : retried ? 'Case restored' : 'Unsolved'} · ${slotNames[slot]} slot`
    : 'Select New Case to practice.'
  practiceStatus.toggleAttribute('data-solved', Boolean(result))
  retryCase.disabled = !training.active
  hint.disabled = !training.active
  if (hint.disabled) {
    hintControl.title = 'Select New Case to enable hints.'
    hint.setAttribute('aria-describedby', 'hint-unavailable')
  } else {
    hintControl.removeAttribute('title')
    hint.removeAttribute('aria-describedby')
  }
  times.hidden = !result
  if (result) {
    const values = { recognition: result.recognition, execution: result.execution, 'practice-total': result.total }
    for (const [id, value] of Object.entries(values)) {
      document.getElementById(id)!.textContent = `${(value / 1000).toFixed(2)} s`
    }
  }
}

let hintTimeout: number | undefined

function hideSolution() {
  window.clearTimeout(hintTimeout)
  solution.hidden = true
  solution.replaceChildren()
  hint.setAttribute('aria-expanded', 'false')
}

function updateSolution() {
  hideSolution()
  const learning = mode.value === 'learn'
  hintControl.hidden = learning
  solutionChoice.hidden = !learning || !training.active
  if (learning) showSolution()
}

newCase.addEventListener('click', () => {
  const definition = pickCase(enabledCases(), previousCase)
  if (!definition) return
  training.start(caseForSlot(definition, targetSlot.value as Slot), alignments[Math.floor(Math.random() * alignments.length)])
  clearCurrentSolution()
  solutionOption.replaceChildren(...training.solutionOptions.map(([notation], index) =>
    new Option(`${index + 1}. ${notation}`, String(index))))
  previousCase = definition.number
  updateSolution()
  updatePractice()
  debug.clearTurns('New Case')
  cubeView?.replacePuzzle()
})

retryCase.addEventListener('click', () => {
  training.retry()
  clearCurrentSolution()
  updateSolution()
  updatePractice(true)
  debug.clearTurns('Retry Case')
  cubeView?.replacePuzzle()
})

function showSolution() {
  const reference = training.solution(mode.value === 'learn' ? solutionOption.selectedIndex : 0)
  if (!reference) return
  const algorithm = document.createElement('code')
  algorithm.textContent = reference.algorithm
  const physicalAlgorithm = document.createElement('code')
  physicalAlgorithm.textContent = reference.algorithm.split(/\s+/).map(move => calibration.toPhysicalMove(move)).join(' ')
  const directions = document.createElement('p')
  directions.textContent = 'Make these turns on your cube from the New Case or Retry Case position. Any top-layer turn needed to line up the pair is included.'
  const steps = document.createElement('p')
  steps.append(`F2L ${reference.number} · Turns to make`, algorithm)
  const physicalLabel = document.createElement('p')
  physicalLabel.append('Face IDs reported by your cube', physicalAlgorithm)
  solution.replaceChildren(steps, directions, physicalLabel)
  solution.hidden = false
  hint.setAttribute('aria-expanded', 'true')
}

mode.addEventListener('change', updateSolution)
solutionOption.addEventListener('change', showSolution)
updateSolution()

hint.addEventListener('click', () => {
  window.clearTimeout(hintTimeout)
  showSolution()
  hintTimeout = window.setTimeout(hideSolution, 5000)
})

let disconnectCube: (() => Promise<void>) | undefined

function setConnection(message: string, busy = false) {
  status.textContent = message
  button.disabled = busy || !supportsBluetooth
  mac.disabled = button.disabled
  disconnect.hidden = !disconnectCube
  if (!disconnectCube) resetGyro.disabled = true
  debug.changed()
}

resetCube.addEventListener('click', () => {
  training.cancel()
  virtualCube.reset()
  clearCurrentSolution()
  updateSolution()
  updatePractice()
  debug.clearTurns('Reset Virtual Cube')
  cubeView?.replacePuzzle()
})

resetGyro.addEventListener('click', () => {
  const top = physicalTop.value as Face
  const front = physicalFront.value as Face
  const nextCalibration = createFaceCalibration(top, front)
  if (!nextCalibration) return
  calibration = nextCalibration
  orientation.recalibrate(calibration.physicalToVirtual)
  calibrationStatus.textContent = `Calibrated: physical ${top} → virtual U, physical ${front} → virtual F.`
  if (!solution.hidden) showSolution()
  debug.changed()
  cubeView?.requestDraw()
})

disconnect.addEventListener('click', async () => {
  const close = disconnectCube
  if (!close) return
  disconnect.disabled = true
  try {
    await close()
  } catch (error) {
    if (disconnectCube === close) status.textContent = `Could not disconnect. ${String(error)}`
  } finally {
    disconnect.disabled = false
  }
})

if (!supportsBluetooth) {
  setConnection('Web Bluetooth is unavailable. Open this page in Chrome or Edge over HTTPS or on localhost.')
}

form.addEventListener('submit', event => {
  event.preventDefault()
  if (button.disabled) return

  const address = mac.value
  setConnection('Connecting…', true)
  void connectCube(address, {
    onRecordableEvent: recordInput,
    onStatus: message => setConnection(message, true),
    onConnected: (name, close) => {
      disconnectCube = close
      orientation.startSession()
      cubeView?.requestDraw()
      macHelp.hidden = true
      setConnection(`Connected to ${name || 'cube'}`, true)
    },
    onDisconnected: () => {
      disconnectCube = undefined
      setConnection('Cube disconnected. Select Connect Cube to reconnect.')
    },
    onError: error => {
      disconnectCube = undefined
      if (error instanceof DOMException && error.name === 'NotFoundError' &&
          error.message.includes('cancelled')) {
        setConnection('Cube selection canceled. Select Connect Cube to try again.')
        return
      }
      const detail = error instanceof Error ? error.message : String(error)
      if (detail.includes('Unable to determine cube MAC address') ||
          detail.includes('Check the Bluetooth MAC address')) {
        macHelp.hidden = false
        setConnection(address
          ? 'Could not verify the cube address. Check it and try again.'
          : 'Enter the cube’s Bluetooth address to connect.')
        mac.focus()
        return
      }
      setConnection(`Connection error. ${detail}`)
    },
    onEvent: event => {
      const entry = recordEvent(state, event)
      if (event.type === 'MOVE') {
        const receivedAt = performance.now()
        const mappedMove = calibration.mapMove(event.move)
        const applied = virtualCube.applyMove(mappedMove)
        const completedAttempt = applied && training.recordTurn(receivedAt)
        if (applied) {
          cubeRevision++
          if (completedAttempt || justRetried) updatePractice()
          cubeView?.enqueueTurn(mappedMove)
        }
        debug.recordTurn({
          physical: event.move, virtual: mappedMove, serial: event.serial,
          cubeTimestamp: event.cubeTimestamp, localTimestamp: event.localTimestamp,
          applied, completedAttempt,
        })
        lastMove.textContent = state.lastMove
        virtualMove.textContent = mappedMove
        moves.textContent = String(state.moves)
      }
      if (event.type === 'GYRO') {
        if (orientation.update(event.quaternion)) {
          resetGyro.disabled = !cubeView
          cubeView?.requestDraw()
        }
        gyro.textContent = String(state.gyroEvents)
        formatQuaternion(event.quaternion).forEach((value, index) => {
          axes[index].textContent = value
        })
      }

      if (!recentEvents.open) return
      total.textContent = String(state.total)
      empty.hidden = true
      log.prepend(createLogRow(entry))
      if (log.childElementCount > logLimit) log.lastElementChild?.remove()
    },
  })
})
