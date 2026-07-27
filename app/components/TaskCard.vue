<script setup lang="ts">
import type { Task } from '../types/task'

const props = defineProps<{
  task: Task
}>()

const cardStyle = computed(() => {
  if (props.task.backgroundColour === null) {
    return undefined
  }
  return { backgroundColor: props.task.backgroundColour }
})

const heading = computed(() => {
  const trimmed = props.task.title.trim()
  return trimmed.length > 0 ? trimmed : null
})
</script>

<template>
  <article
    class="rounded-md border border-default bg-default p-3"
    :style="cardStyle"
    :data-testid="`task-card-${task.id}`"
    :data-task-id="task.id"
    :data-task-state="task.state"
  >
    <h3 v-if="heading" class="text-sm font-medium text-highlighted">
      {{ heading }}
    </h3>
    <p
      class="text-sm text-muted whitespace-pre-wrap break-words"
      :class="{ 'mt-1': heading !== null }"
    >
      {{ task.description }}
    </p>
  </article>
</template>
