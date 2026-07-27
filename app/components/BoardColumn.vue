<script setup lang="ts">
import draggable from 'vuedraggable'
import type { Task, TaskState } from '../types/task'
import { BOARD_DRAG_GROUP, type BoardDragChangeEvent } from './boardDrag'
import { COLUMN_HEADINGS } from './boardColumns'

const props = defineProps<{
  state: TaskState
  modelValue: Task[]
}>()

const emit = defineEmits<{
  'update:modelValue': [tasks: Task[]]
  edit: [task: Task]
  change: [event: BoardDragChangeEvent]
}>()

const heading = computed(() => COLUMN_HEADINGS[props.state])

const list = computed({
  get: () => props.modelValue,
  set: (value: Task[]) => {
    emit('update:modelValue', value)
  }
})

function onDragChange(event: BoardDragChangeEvent): void {
  emit('change', event)
}
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

    <div class="relative mt-3 min-h-24 flex-1">
      <draggable
        v-model="list"
        :group="BOARD_DRAG_GROUP"
        item-key="id"
        tag="ul"
        class="absolute inset-0 flex list-none flex-col gap-2 p-0"
        :aria-label="`${heading} tasks`"
        :data-testid="`board-column-list-${state}`"
        @change="onDragChange"
      >
        <template #item="{ element }">
          <li :data-testid="`board-task-item-${element.id}`">
            <TaskCard :task="element" @edit="emit('edit', $event)" />
          </li>
        </template>
      </draggable>

      <p
        v-if="list.length === 0"
        class="pointer-events-none text-sm text-muted"
        data-testid="column-empty"
      >
        No tasks
      </p>
    </div>
  </section>
</template>
