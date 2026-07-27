/**
 * Browser verification for issue #17 per-column manual order (PR #66).
 *
 * Usage: node tests/integration/manual-order-override.browser.mjs [baseUrl]
 */
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '../..')
const evidenceDir = path.join(projectRoot, 'tests', 'integration', 'evidence-17')
mkdirSync(evidenceDir, { recursive: true })

const require = createRequire(import.meta.url)
const browserLibRoots = [
  path.resolve(projectRoot, '../qa-27/node_modules/playwright'),
  path.resolve(projectRoot, '../qa-24/node_modules/playwright'),
  path.resolve(projectRoot, 'node_modules/playwright')
]

let chromium
for (const root of browserLibRoots) {
  try {
    ;({ chromium } = require(root))
    break
  } catch {
    /* try next */
  }
}
if (!chromium) {
  console.error('Browser automation library not found')
  process.exit(1)
}

const baseUrl = process.argv[2] ?? 'http://localhost:3017'
const TASKS_STORAGE_KEY = 'todo.tasks.v1'
const now = '2026-07-27T12:00:00.000Z'

function makeTask(id, title, state, priority, manualOrder = null) {
  return {
    id,
    title,
    description: `Seeded ${title}`,
    priority,
    dueDate: null,
    backgroundColour: null,
    state,
    manualOrder,
    createdAt: now,
    detailsModifiedAt: now,
    stateChangedAt: now,
    deletedAt: null
  }
}

/** No overrides — used for AC1–AC3. */
const seedNoOverride = [
  makeTask('todo-z', 'Zebra', 'todo', 'low'),
  makeTask('todo-a', 'Alpha', 'todo', 'high'),
  makeTask('todo-m', 'Mike', 'todo', 'medium'),
  makeTask('ip-z', 'Zebra IP', 'inProgress', 'low'),
  makeTask('ip-a', 'Apple IP', 'inProgress', 'high'),
  makeTask('done-b', 'Beta Done', 'complete', 'medium'),
  makeTask('done-a', 'Alpha Done', 'complete', 'low')
]

/** Destination InProgress already has override — AC4. */
const seedDestOverride = [
  makeTask('todo-z', 'Zebra', 'todo', 'low'),
  makeTask('todo-a', 'Alpha', 'todo', 'high'),
  makeTask('todo-m', 'Mike', 'todo', 'medium'),
  makeTask('ip-z', 'Zebra IP', 'inProgress', 'low', 0),
  makeTask('ip-a', 'Apple IP', 'inProgress', 'high', 1),
  makeTask('done-b', 'Beta Done', 'complete', 'medium'),
  makeTask('done-a', 'Alpha Done', 'complete', 'low')
]

let failed = false
function fail(message) {
  console.error(`FAIL: ${message}`)
  failed = true
}
function assert(condition, message) {
  if (!condition) fail(message)
}

async function columnTaskIds(page, state) {
  return page.locator(`[data-testid="board-column-list-${state}"] li`).evaluateAll((lis) =>
    lis.map((li) => li.getAttribute('data-testid')?.replace('board-task-item-', '') ?? '')
  )
}

async function setSortMode(page, label) {
  await page.getByTestId('board-sort-mode').click()
  await page.getByRole('option', { name: label }).click()
  await page.waitForTimeout(150)
}

/**
 * Drag a card to sit above the first card in the same column.
 * Uses stepped pointer moves so Sortable registers the reorder.
 */
async function dragToTopOfColumn(page, state, fromId) {
  const source = page.getByTestId(`board-task-item-${fromId}`)
  const list = page.getByTestId(`board-column-list-${state}`)
  const boxFrom = await source.boundingBox()
  const boxList = await list.boundingBox()
  if (!boxFrom || !boxList) {
    fail(`Missing bounding box for drag-to-top ${fromId} in ${state}`)
    return false
  }
  const startX = boxFrom.x + boxFrom.width / 2
  const startY = boxFrom.y + boxFrom.height / 2
  const endX = boxList.x + boxList.width / 2
  const endY = boxList.y + 8
  await page.mouse.move(startX, startY)
  await page.mouse.down()
  await page.mouse.move(endX, endY, { steps: 24 })
  await page.waitForTimeout(80)
  await page.mouse.up()
  await page.waitForTimeout(400)
  return true
}

async function dragAcrossColumns(page, taskId, destState) {
  const source = page.getByTestId(`board-task-item-${taskId}`)
  const destList = page.getByTestId(`board-column-list-${destState}`)
  const boxFrom = await source.boundingBox()
  const boxTo = await destList.boundingBox()
  if (!boxFrom || !boxTo) {
    fail(`Missing bounding box for cross drag ${taskId} -> ${destState}`)
    return
  }
  await page.mouse.move(boxFrom.x + boxFrom.width / 2, boxFrom.y + boxFrom.height / 2)
  await page.mouse.down()
  await page.mouse.move(boxTo.x + boxTo.width / 2, boxTo.y + boxTo.height - 12, { steps: 20 })
  await page.waitForTimeout(80)
  await page.mouse.up()
  await page.waitForTimeout(450)
}

async function readStorageTasks(page) {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    return JSON.parse(raw).tasks ?? []
  }, TASKS_STORAGE_KEY)
}

async function openSeeded(page, tasks) {
  await page.addInitScript(
    ({ key, payload }) => {
      localStorage.setItem(key, JSON.stringify(payload))
    },
    { key: TASKS_STORAGE_KEY, payload: { version: 1, tasks } }
  )
  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  await page.getByTestId('board-columns').waitFor()
}

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })

try {
  // --- AC1 + AC2 + AC3 ---
  await openSeeded(page, seedNoOverride)
  await setSortMode(page, 'Alphabetically')
  let todoIds = await columnTaskIds(page, 'todo')
  assert(
    JSON.stringify(todoIds) === JSON.stringify(['todo-a', 'todo-m', 'todo-z']),
    `setup alphabetical todo expected [todo-a,todo-m,todo-z], got ${JSON.stringify(todoIds)}`
  )
  await page.screenshot({ path: path.join(evidenceDir, '01-alphabetical-before-reorder.png') })

  const beforeReorder = [...todoIds]
  await dragToTopOfColumn(page, 'todo', 'todo-z')
  todoIds = await columnTaskIds(page, 'todo')
  const reordered = JSON.stringify(todoIds) !== JSON.stringify(beforeReorder)
  assert(reordered, `AC1: within-column drag should change order, still ${JSON.stringify(todoIds)}`)

  const badgeCount = await page.locator('[data-testid="column-manual-order-badge"]').count()
  assert(badgeCount > 0, 'AC1: Manual order badge should appear after within-column reorder')

  let stored = await readStorageTasks(page)
  const todoStored = stored.filter((t) => t.state === 'todo' && t.deletedAt === null)
  assert(
    todoStored.every((t) => t.manualOrder !== null),
    `AC1: all todo ranks non-null, got ${JSON.stringify(todoStored.map((t) => [t.id, t.manualOrder]))}`
  )
  const manualTodoOrder = [...todoIds]
  await page.screenshot({ path: path.join(evidenceDir, '02-after-within-column-reorder.png') })

  // AC2: sort change leaves override column; updates others
  await setSortMode(page, 'Priority')
  todoIds = await columnTaskIds(page, 'todo')
  const ipIds = await columnTaskIds(page, 'inProgress')
  assert(
    JSON.stringify(todoIds) === JSON.stringify(manualTodoOrder),
    `AC2: todo keeps manual order ${JSON.stringify(manualTodoOrder)}, got ${JSON.stringify(todoIds)}`
  )
  assert(
    JSON.stringify(ipIds) === JSON.stringify(['ip-a', 'ip-z']),
    `AC2: inProgress follows priority [ip-a,ip-z], got ${JSON.stringify(ipIds)}`
  )
  await page.screenshot({ path: path.join(evidenceDir, '03-sort-changed-override-held.png') })

  // AC3: clear
  await page.getByTestId('column-clear-manual-order-todo').click()
  await page.waitForTimeout(250)
  assert(
    (await page.locator('[data-testid="column-manual-order-badge"]').count()) === 0,
    'AC3: badge gone after clear'
  )
  todoIds = await columnTaskIds(page, 'todo')
  assert(
    JSON.stringify(todoIds) === JSON.stringify(['todo-a', 'todo-m', 'todo-z']),
    `AC3: after clear under Priority got ${JSON.stringify(todoIds)}`
  )
  stored = await readStorageTasks(page)
  assert(
    stored
      .filter((t) => t.state === 'todo' && t.deletedAt === null)
      .every((t) => t.manualOrder === null),
    'AC3: todo ranks null after clear'
  )
  await page.screenshot({ path: path.join(evidenceDir, '04-after-clear-override.png') })

  // --- AC4: destination already has override ---
  const page2 = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await openSeeded(page2, seedDestOverride)
  await setSortMode(page2, 'Alphabetically')

  let ipOrder = await columnTaskIds(page2, 'inProgress')
  assert(
    JSON.stringify(ipOrder) === JSON.stringify(['ip-z', 'ip-a']),
    `AC4 setup: seeded override display [ip-z,ip-a], got ${JSON.stringify(ipOrder)}`
  )
  assert(
    (await page2.locator('[data-testid="column-manual-order-badge"]').count()) > 0,
    'AC4 setup: destination shows Manual order badge'
  )
  const completeBefore = await columnTaskIds(page2, 'complete')
  const todoBadgeBefore = await page2
    .locator('[data-testid="board-column-todo"] [data-testid="column-manual-order-badge"]')
    .count()

  await dragAcrossColumns(page2, 'todo-a', 'inProgress')
  ipOrder = await columnTaskIds(page2, 'inProgress')
  const todoAfter = await columnTaskIds(page2, 'todo')
  const completeAfter = await columnTaskIds(page2, 'complete')

  assert(ipOrder.includes('todo-a'), `AC4: todo-a in inProgress, got ${JSON.stringify(ipOrder)}`)
  assert(
    ipOrder[ipOrder.length - 1] === 'todo-a',
    `AC4: append under destination override, got ${JSON.stringify(ipOrder)}`
  )
  assert(
    JSON.stringify(ipOrder.slice(0, 2)) === JSON.stringify(['ip-z', 'ip-a']),
    `AC4: prior ranks preserved ahead of newcomer, got ${JSON.stringify(ipOrder)}`
  )
  assert(!todoAfter.includes('todo-a'), 'AC4: todo-a left ToDo')
  assert(
    JSON.stringify(completeAfter) === JSON.stringify(completeBefore),
    `AC4: Complete unaffected`
  )
  assert(
    (await page2
      .locator('[data-testid="board-column-todo"] [data-testid="column-manual-order-badge"]')
      .count()) === todoBadgeBefore,
    'AC4: ToDo override state unaffected'
  )

  stored = await readStorageTasks(page2)
  const entered = stored.find((t) => t.id === 'todo-a')
  assert(entered?.state === 'inProgress', 'AC4: stored state inProgress')
  assert(entered?.manualOrder === 2, `AC4: append rank 2, got ${entered?.manualOrder}`)
  const ipStored = stored.filter((t) => t.state === 'inProgress' && t.deletedAt === null)
  assert(
    ipStored.find((t) => t.id === 'ip-z')?.manualOrder === 0 &&
      ipStored.find((t) => t.id === 'ip-a')?.manualOrder === 1,
    'AC4: existing destination ranks unchanged'
  )
  await page2.screenshot({ path: path.join(evidenceDir, '05-after-cross-column.png') })
  await page2.close()

  writeFileSync(
    path.join(evidenceDir, 'summary.json'),
    JSON.stringify({ failed, baseUrl, at: new Date().toISOString() }, null, 2)
  )
} finally {
  await browser.close()
}

if (failed) {
  console.error('Browser verification FAILED')
  process.exit(1)
}
console.log('Browser verification PASSED')
