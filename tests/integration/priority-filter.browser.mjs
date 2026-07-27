/**
 * Browser verification for issue #16 priority filter (PR #58).
 * Seeds mixed-priority tasks, checks default visibility, deselect, restore,
 * and (when present) that column counts stay on full active totals.
 *
 * Usage: node tests/integration/priority-filter.browser.mjs [baseUrl]
 */
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '../..')
const evidenceDir = path.join(projectRoot, 'tests', 'integration', 'evidence-16')
mkdirSync(evidenceDir, { recursive: true })

const require = createRequire(import.meta.url)
const browserLibRoots = [
  path.resolve(projectRoot, '../qa-24/node_modules/playwright'),
  path.resolve(projectRoot, '../qa-27/node_modules/playwright'),
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

const baseUrl = process.argv[2] ?? 'http://localhost:3016'
const TASKS_STORAGE_KEY = 'todo.tasks.v1'

const now = '2026-07-27T12:00:00.000Z'

function makeTask(id, priority, state = 'todo') {
  return {
    id,
    title: `${priority} ${state}`,
    description: `Seeded ${priority} task in ${state}`,
    priority,
    dueDate: null,
    backgroundColour: null,
    state,
    manualOrder: null,
    createdAt: now,
    detailsModifiedAt: now,
    stateChangedAt: now,
    deletedAt: null
  }
}

/** Mixed priorities across columns so each AC path is visible. */
const seededTasks = [
  makeTask('low-todo', 'low', 'todo'),
  makeTask('med-todo', 'medium', 'todo'),
  makeTask('high-todo', 'high', 'todo'),
  makeTask('low-ip', 'low', 'inProgress'),
  makeTask('med-ip', 'medium', 'inProgress'),
  makeTask('high-ip', 'high', 'inProgress'),
  makeTask('low-done', 'low', 'complete'),
  makeTask('med-done', 'medium', 'complete'),
  makeTask('high-done', 'high', 'complete')
]

function fail(message) {
  console.error(`FAIL: ${message}`)
  process.exitCode = 1
}

function assert(condition, message) {
  if (!condition) fail(message)
}

async function visibleTaskIds(page, state) {
  const items = page.locator(`[data-testid="board-column-${state}"] [data-testid^="board-task-item-"]`)
  const count = await items.count()
  const ids = []
  for (let i = 0; i < count; i += 1) {
    const testId = await items.nth(i).getAttribute('data-testid')
    ids.push(testId?.replace('board-task-item-', '') ?? '')
  }
  return ids
}

async function columnCountText(page, state) {
  const el = page.locator(`[data-testid="column-count-${state}"]`)
  if ((await el.count()) === 0) return null
  return (await el.textContent())?.trim() ?? null
}

const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
})
const page = await browser.newPage()

try {
  await page.addInitScript(
    ({ key, tasks }) => {
      localStorage.setItem(key, JSON.stringify({ version: 1, tasks }))
    },
    { key: TASKS_STORAGE_KEY, tasks: seededTasks }
  )

  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid="priority-filter"]')

  // --- AC1: default filter shows all priorities ---
  const filter = page.locator('[data-testid="priority-filter"]')
  assert((await filter.count()) === 1, 'priority filter control is present')

  for (const priority of ['low', 'medium', 'high']) {
    const box = page.locator(`[data-testid="priority-filter-${priority}"]`)
    assert(await box.isChecked(), `default: ${priority} checkbox is checked`)
  }

  const expectedByState = {
    todo: ['low-todo', 'med-todo', 'high-todo'],
    inProgress: ['low-ip', 'med-ip', 'high-ip'],
    complete: ['low-done', 'med-done', 'high-done']
  }

  for (const state of ['todo', 'inProgress', 'complete']) {
    const ids = await visibleTaskIds(page, state)
    const expected = expectedByState[state]
    for (const id of expected) {
      assert(ids.includes(id), `default: ${id} visible in ${state} (got ${ids.join(',')})`)
    }
    assert(ids.length === 3, `default: expected 3 cards in ${state}, got ${ids.length}: ${ids.join(',')}`)
  }

  await page.screenshot({ path: path.join(evidenceDir, '01-default-all-visible.png'), fullPage: true })
  console.log('PASS: AC1 default shows low, medium, and high in each column')

  const countsAtDefault = {
    todo: await columnCountText(page, 'todo'),
    inProgress: await columnCountText(page, 'inProgress'),
    complete: await columnCountText(page, 'complete')
  }
  const countsPresent = Object.values(countsAtDefault).every((v) => v !== null)
  if (countsPresent) {
    assert(countsAtDefault.todo === '3', `default todo count should be 3, got ${countsAtDefault.todo}`)
    assert(
      countsAtDefault.inProgress === '3',
      `default inProgress count should be 3, got ${countsAtDefault.inProgress}`
    )
    assert(
      countsAtDefault.complete === '3',
      `default complete count should be 3, got ${countsAtDefault.complete}`
    )
    console.log('PASS: column counts present and show all active tasks at default')
  } else {
    console.log('INFO: column-count-* not in DOM on this build (counts UI from #24 may be absent)')
  }

  // --- AC2: deselect medium — only low and high remain ---
  await page.locator('[data-testid="priority-filter-medium"]').click()
  assert(
    !(await page.locator('[data-testid="priority-filter-medium"]').isChecked()),
    'medium checkbox unchecked after click'
  )

  for (const state of ['todo', 'inProgress', 'complete']) {
    const ids = await visibleTaskIds(page, state)
    assert(ids.length === 2, `after deselect medium: expected 2 cards in ${state}, got ${ids.length}`)
    assert(ids.every((id) => !id.startsWith('med-')), `after deselect medium: no medium cards in ${state}`)
    assert(ids.some((id) => id.startsWith('low-')), `after deselect medium: low still in ${state}`)
    assert(ids.some((id) => id.startsWith('high-')), `after deselect medium: high still in ${state}`)
  }

  if (countsPresent) {
    assert((await columnCountText(page, 'todo')) === '3', 'todo count stays 3 after filtering out medium')
    assert(
      (await columnCountText(page, 'inProgress')) === '3',
      'inProgress count stays 3 after filtering out medium'
    )
    assert(
      (await columnCountText(page, 'complete')) === '3',
      'complete count stays 3 after filtering out medium'
    )
    console.log('PASS: column counts unchanged while cards are filtered')
  }

  await page.screenshot({
    path: path.join(evidenceDir, '02-medium-deselected.png'),
    fullPage: true
  })
  console.log('PASS: AC2 deselecting medium hides medium cards in each column')

  // Also deselect low — only high remains
  await page.locator('[data-testid="priority-filter-low"]').click()
  for (const state of ['todo', 'inProgress', 'complete']) {
    const ids = await visibleTaskIds(page, state)
    assert(ids.length === 1, `after deselect low+medium: expected 1 card in ${state}, got ${ids.length}`)
    assert(ids[0]?.startsWith('high-'), `only high remains in ${state}`)
  }
  await page.screenshot({
    path: path.join(evidenceDir, '03-only-high-visible.png'),
    fullPage: true
  })
  console.log('PASS: deselecting multiple priorities keeps only remaining selection')

  // --- AC3: restore medium — medium cards return (low still off) ---
  await page.locator('[data-testid="priority-filter-medium"]').click()
  assert(
    await page.locator('[data-testid="priority-filter-medium"]').isChecked(),
    'medium checkbox checked after restore'
  )

  for (const state of ['todo', 'inProgress', 'complete']) {
    const ids = await visibleTaskIds(page, state)
    assert(ids.length === 2, `after restore medium: expected 2 cards in ${state}, got ${ids.length}`)
    assert(ids.some((id) => id.startsWith('med-')), `after restore medium: medium visible in ${state}`)
    assert(ids.some((id) => id.startsWith('high-')), `after restore medium: high visible in ${state}`)
    assert(!ids.some((id) => id.startsWith('low-')), `after restore medium: low still hidden in ${state}`)
  }

  // Restore low as well — full set again
  await page.locator('[data-testid="priority-filter-low"]').click()
  for (const state of ['todo', 'inProgress', 'complete']) {
    const ids = await visibleTaskIds(page, state)
    assert(ids.length === 3, `after restore low: expected 3 cards in ${state}, got ${ids.length}`)
  }

  if (countsPresent) {
    assert((await columnCountText(page, 'todo')) === '3', 'todo count still 3 after restore')
  }

  await page.screenshot({
    path: path.join(evidenceDir, '04-priorities-restored.png'),
    fullPage: true
  })
  console.log('PASS: AC3 restoring a priority makes those tasks visible again')
} catch (error) {
  fail(error instanceof Error ? error.message : String(error))
  try {
    await page.screenshot({
      path: path.join(evidenceDir, 'failure.png'),
      fullPage: true
    })
  } catch {
    /* ignore */
  }
} finally {
  await browser.close()
}

if (process.exitCode && process.exitCode !== 0) {
  console.error('Priority filter browser verification FAILED')
  process.exit(process.exitCode)
}

console.log('Priority filter browser verification PASSED')
