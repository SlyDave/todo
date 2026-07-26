<script setup lang="ts">
import type { Task } from '../types/task'
import { COLUMN_ORDER, groupActiveTasksByColumn } from './boardColumns'

const { load } = useTaskStorage()

const tasks = ref<Task[]>([])

function refresh(): void {
  tasks.value = load()
}

onMounted(() => {
  refresh()
})

const tasksByColumn = computed(() => groupActiveTasksByColumn(tasks.value))
</script>

<template>
  <div
    class="grid grid-cols-1 gap-4 md:grid-cols-3"
    data-testid="board-columns"
    role="region"
    aria-label="Task board"
  >
    <BoardColumn
      v-for="state in COLUMN_ORDER"
      :key="state"
      :state="state"
      :tasks="tasksByColumn[state]"
    />
  </div>
</template>
