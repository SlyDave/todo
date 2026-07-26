import { access, readFile } from 'node:fs/promises'
import { constants } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(root, '..')
const indexHtml = path.join(projectRoot, '.output', 'public', 'index.html')

async function main() {
  await access(indexHtml, constants.R_OK)
  const html = await readFile(indexHtml, 'utf8')
  if (!html.toLowerCase().includes('to-do') && !html.includes('ToDo')) {
    console.error('Smoke failed: generated index.html does not mention To-Do')
    process.exit(1)
  }
  console.log('Smoke OK: static index.html present and mentions To-Do')
}

main().catch((error) => {
  console.error('Smoke failed:', error instanceof Error ? error.message : error)
  process.exit(1)
})
