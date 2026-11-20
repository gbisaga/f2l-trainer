import { cases } from './f2l-cases.ts'

// Membership follows the category on each SpeedCubeDB F2L case.
const groups = [
  ['Free Pairs', [1, 2, 3, 4]],
  ['Disconnected Pairs', [5, 6, 7, 8, 9, 10, 19, 20, 21, 22]],
  ['Connected Pairs', [11, 12, 13, 14, 15, 16, 17, 18, 23, 24]],
  ['Corner In Slot', [25, 26, 27, 28, 29, 30]],
  ['Edge In Slot', [31, 32, 33, 34, 35, 36]],
  ['Pieces In Slot', [37, 38, 39, 40, 41]],
] as const

const storageKey = 'f2l-trainer:selected-cases'
const allNumbers = cases.map(definition => definition.number)

function loadSelection() {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) ?? 'null')
    if (Array.isArray(stored)) return new Set(allNumbers.filter(number => stored.includes(number)))
  } catch {
    // Use the default pool when storage is unavailable or its value is invalid.
  }
  return new Set(allNumbers)
}

export function initializeCaseSelection(onCountChanged: (count: number) => void) {
  const dialog = document.querySelector<HTMLDialogElement>('#case-selection')!
  const openButton = document.querySelector<HTMLButtonElement>('#open-case-selection')!
  const count = dialog.querySelector('#enabled-count')!
  const options = dialog.querySelector('#case-options')!
  const selected = loadSelection()

  function setSelected(numbers: readonly number[], checked: boolean) {
    for (const number of numbers) {
      if (checked) selected.add(number)
      else selected.delete(number)
    }
    try {
      localStorage.setItem(storageKey, JSON.stringify([...selected]))
    } catch {
      // Selection still works for this page if storage is unavailable.
    }
    refresh()
  }

  const refreshGroups = groups.map(([name, numbers]) => {
    const row = document.createElement('div')
    row.className = 'case-category'
    const category = document.createElement('input')
    category.type = 'checkbox'
    category.setAttribute('aria-label', `Select all in ${name}`)
    category.addEventListener('change', () => setSelected(numbers, category.checked))

    const details = document.createElement('details')
    const summary = document.createElement('summary')
    const children = document.createElement('div')
    children.className = 'case-options'
    const checkboxes = numbers.map(number => {
      const checkbox = document.createElement('input')
      checkbox.type = 'checkbox'
      checkbox.addEventListener('change', () => setSelected([number], checkbox.checked))
      const label = document.createElement('label')
      label.append(checkbox, `F2L ${number}`)
      children.append(label)
      return checkbox
    })
    details.append(summary, children)
    row.append(category, details)
    options.append(row)

    return () => {
      checkboxes.forEach((checkbox, index) => { checkbox.checked = selected.has(numbers[index]) })
      const enabled = numbers.filter(number => selected.has(number)).length
      category.checked = enabled === numbers.length
      category.indeterminate = enabled > 0 && enabled < numbers.length
      summary.textContent = `${name} (${enabled}/${numbers.length})`
    }
  })

  function refresh() {
    refreshGroups.forEach(update => update())
    count.textContent = `${selected.size} of ${cases.length} selected`
    openButton.textContent = `Select F2L Cases (${selected.size})`
    onCountChanged(selected.size)
  }

  openButton.addEventListener('click', () => dialog.showModal())
  dialog.querySelector('#all-cases')!.addEventListener('click', () => setSelected(allNumbers, true))
  dialog.querySelector('#no-cases')!.addEventListener('click', () => setSelected(allNumbers, false))
  refresh()
  return () => cases.filter(definition => selected.has(definition.number))
}
