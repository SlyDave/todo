<script setup lang="ts">
import { nextThemePreference, themeToggleLabel, type AppliedTheme } from './themeMode'

const colorMode = useColorMode()

const applied = computed<AppliedTheme>(() => (colorMode.value === 'dark' ? 'dark' : 'light'))

const ariaLabel = computed(() => themeToggleLabel(applied.value))

function toggleTheme(): void {
  colorMode.preference = nextThemePreference(applied.value)
}
</script>

<template>
  <ClientOnly v-if="!colorMode.forced">
    <UButton
      type="button"
      color="neutral"
      variant="ghost"
      square
      :aria-label="ariaLabel"
      :aria-pressed="applied === 'dark'"
      data-testid="theme-toggle"
      @click="toggleTheme"
    >
      <UIcon name="i-lucide-moon" class="hidden size-5 dark:inline-block" aria-hidden="true" />
      <UIcon name="i-lucide-sun" class="inline-block size-5 dark:hidden" aria-hidden="true" />
    </UButton>

    <template #fallback>
      <div class="size-8" aria-hidden="true" />
    </template>
  </ClientOnly>
</template>
