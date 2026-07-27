<script setup lang="ts">
import { DOCUMENT_DESCRIPTION, DOCUMENT_TITLE, PAGE_HEADING } from './components/boardCopy'

useHead({
  meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
  link: [{ rel: 'icon', href: '/favicon.ico' }],
  htmlAttrs: { lang: 'en-GB' }
})

useSeoMeta({
  title: DOCUMENT_TITLE,
  description: DOCUMENT_DESCRIPTION
})
</script>

<template>
  <UApp>
    <UHeader>
      <template #left>
        <NuxtLink to="/" class="font-semibold text-highlighted"> {{ PAGE_HEADING }} </NuxtLink>
      </template>
      <template #right>
        <ThemeToggle />
      </template>
    </UHeader>

    <UMain>
      <NuxtPage />
    </UMain>
  </UApp>
</template>
