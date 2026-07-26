// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'
import prettier from 'eslint-config-prettier'

export default withNuxt(
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error'
    }
  },
  {
    ignores: [
      '.sdlc/**',
      '.claude/**',
      '.cursor/**',
      '.cursor-plugin/**',
      '.output/**',
      '.nuxt/**',
      'node_modules/**'
    ]
  },
  prettier
)
