import { defineConfig } from 'vitest/config'

/** Frontend-owned Vitest config — root `tests/**` is backend-owned. */
export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['app/components/**/*.test.ts']
  }
})
