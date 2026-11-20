interface DebugTurn {
  physical: string
  virtual: string
  serial?: number
  cubeTimestamp: number | null
  localTimestamp: number | null
  applied: boolean
  completedAttempt: boolean
}

export function createDebugPane(snapshot: () => object) {
  const pane = document.querySelector<HTMLDetailsElement>('#debug-pane')!
  const report = document.querySelector<HTMLTextAreaElement>('#debug-report')!
  const status = document.querySelector('#debug-copy-status')!
  const turns: DebugTurn[] = []
  const limit = 250
  let dropped = 0
  let lastReset: { action: string; at: string } | null = null

  function refresh() {
    report.value = JSON.stringify({
      ...snapshot(), lastReset, turnsSinceReset: dropped + turns.length, droppedTurns: dropped, turns,
    }, null, 2)
  }

  function changed() {
    if (pane.open) refresh()
  }

  pane.addEventListener('toggle', () => {
    status.textContent = ''
    changed()
  })
  document.querySelector('#copy-debug')!.addEventListener('click', async () => {
    refresh()
    try {
      await navigator.clipboard.writeText(report.value)
      status.textContent = 'Debug report copied.'
    } catch {
      report.focus()
      report.select()
      status.textContent = 'Report selected. Press Ctrl+C or Command+C to copy it.'
    }
  })

  return {
    changed,
    clearTurns(action: string) {
      turns.length = 0
      dropped = 0
      lastReset = { action, at: new Date().toISOString() }
      changed()
    },
    recordTurn(turn: DebugTurn) {
      turns.push(turn)
      if (turns.length > limit) {
        turns.shift()
        dropped++
      }
      changed()
    },
  }
}
