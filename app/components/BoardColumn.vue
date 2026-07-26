<script setup lang="ts">
import type { Task, TaskState } from '../types/task'
import { COLUMN_HEADINGS } from './boardColumns'

const props = defineProps<{
  state: TaskState
  tasks: Task[]
}>()

const heading = computed(() => COLUMN_HEADINGS[props.state])
</script>

<template>
  <section
    class="flex min-h-40 flex-col rounded-lg border border-default bg-elevated/50 p-4"
    :data-testid="`board-column-${state}`"
    :aria-labelledby="`column-heading-${state}`"
  >
    <h2 :id="`column-heading-${state}`" class="font-medium text-highlighted">
      {{ heading }}
    </h2>

    <ul
      v-if="tasks.length > 0"
      class="mt-3 flex list-none flex-col gap-2 p-0"
      :aria-label="`${heading} tasks`"
    >
      <li v-for="task in tasks" :key="task.id">
        <TaskCard :task="task" />
      </li>
    </ul>

    <p v-else class="mt-3 text-sm text-muted" data-testid="column-empty">No tasks</p>
  </section>
</template>
