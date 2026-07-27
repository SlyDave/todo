<script setup lang="ts">
import { PAGE_HEADING, PAGE_INTRO } from '../components/boardCopy'
</script>

<template>
  <div class="mx-auto max-w-6xl p-6">
    <h1 class="text-2xl font-semibold text-highlighted">{{ PAGE_HEADING }}</h1>
    <p class="mt-2 text-muted">{{ PAGE_INTRO }}</p>
    <div class="mt-8">
      <TaskBoard />
    </div>
    <div class="mt-8">
      <CalendarHistogram />
    </div>
  </div>
</template>
