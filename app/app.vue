<script setup lang="ts">
useHead({
  meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
  link: [{ rel: 'icon', href: '/favicon.ico' }],
  htmlAttrs: { lang: 'en-GB' }
})

useSeoMeta({
  title: 'To-Do',
  description: 'Personal to-do board — ToDo, InProgress, and Complete.'
})
</script>

<template>
  <UApp>
    <UHeader>
      <template #left>
        <NuxtLink to="/" class="font-semibold text-highlighted"> To-Do </NuxtLink>
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
