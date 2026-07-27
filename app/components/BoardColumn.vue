<script setup lang="ts">
import draggable from 'vuedraggable'
import type { Task, TaskPriority, TaskState } from '../types/task'
import { columnHasManualOrderOverride } from '../utils/task-manual-order'
import { ALL_TASK_PRIORITIES, filterTasksByPriority } from '../utils/priority-filter'
import {
  BOARD_COLUMN_EMPTY,
  COLUMN_CLEAR_MANUAL_ORDER_LABEL,
  COLUMN_MANUAL_ORDER_BADGE,
  boardColumnCountLabel,
  columnClearManualOrderAriaLabel
} from './boardCopy'
import {
  BOARD_DRAG_GROUP,
  type BoardColumnChangePayload,
  type BoardDragChangeEvent
} from './boardDrag'
import { COLUMN_HEADINGS } from './boardColumns'
import {
  BOARD_COLUMN_LIST_CLASS,
  BOARD_COLUMN_LIST_WRAPPER_CLASS,
  BOARD_COLUMN_SECTION_CLASS
} from './boardColumnLayout'

const props = withDefaults(
  defineProps<{
    state: TaskState
    modelValue: Task[]
    /** All active tasks in this column — not the filtered-visible subset. */
    activeCount: number
    /** Priorities whose cards are visible; defaults to all. */
    selectedPriorities?: readonly TaskPriority[]
  }>(),
  {
    selectedPriorities: () => [...ALL_TASK_PRIORITIES]
  }
)

const emit = defineEmits<{
  'update:modelValue': [tasks: Task[]]
  edit: [task: Task]
  delete: [task: Task]
  change: [payload: BoardColumnChangePayload]
  'clear-manual-order': []
}>()

const heading = computed(() => COLUMN_HEADINGS[props.state])

const countLabel = computed(() => boardColumnCountLabel(props.activeCount))

const hasManualOrder = computed(() => columnHasManualOrderOverride(props.modelValue))

const clearManualOrderAria = computed(() => columnClearManualOrderAriaLabel(heading.value))

/**
 * Local visible list for drag UX. Filtered from the full column list so
 * deselected priorities never write back into the parent column state.
 */
const visibleList = ref<Task[]>([])

function refreshVisible(): void {
  visibleList.value = filterTasksByPriority(props.modelValue, props.selectedPriorities)
}

watch(
  () => [props.modelValue, props.selectedPriorities] as const,
  () => {
    refreshVisible()
  },
  { immediate: true, deep: true }
)

const list = computed({
  get: () => visibleList.value,
  set: (value: Task[]) => {
    visibleList.value = value
  }
})

function onDragChange(event: BoardDragChangeEvent): void {
  emit('change', {
    event,
    visibleOrder: visibleList.value.map((task) => task.id)
  })
}

function onClearManualOrder(): void {
  emit('clear-manual-order')
}
</script>

<template>
  <section
    :class="BOARD_COLUMN_SECTION_CLASS"
    :data-testid="`board-column-${state}`"
    :aria-labelledby="`column-heading-${state}`"
  >
    <div class="flex items-baseline justify-between gap-2">
      <h2 :id="`column-heading-${state}`" class="font-medium text-highlighted">
        {{ heading }}
      </h2>
      <p
        class="text-sm text-muted tabular-nums"
        :data-testid="`column-count-${state}`"
        :aria-label="`${heading}: ${countLabel}`"
      >
        {{ activeCount }}
      </p>
    </div>

    <div
      v-if="hasManualOrder"
      class="mt-2 flex flex-wrap items-center justify-between gap-2"
      data-testid="column-manual-order-controls"
    >
      <span class="text-xs text-muted" data-testid="column-manual-order-badge">
        {{ COLUMN_MANUAL_ORDER_BADGE }}
      </span>
      <UButton
        type="button"
        color="neutral"
        variant="ghost"
        size="xs"
        :data-testid="`column-clear-manual-order-${state}`"
        :aria-label="clearManualOrderAria"
        @click="onClearManualOrder"
      >
        {{ COLUMN_CLEAR_MANUAL_ORDER_LABEL }}
      </UButton>
    </div>

    <div :class="BOARD_COLUMN_LIST_WRAPPER_CLASS">
      <draggable
        v-model="list"
        :group="BOARD_DRAG_GROUP"
        item-key="id"
        tag="ul"
        :class="BOARD_COLUMN_LIST_CLASS"
        :aria-label="`${heading} tasks`"
        :data-testid="`board-column-list-${state}`"
        @change="onDragChange"
      >
        <template #item="{ element }">
          <li :data-testid="`board-task-item-${element.id}`">
            <TaskCard
              :task="element"
              @edit="emit('edit', $event)"
              @delete="emit('delete', $event)"
            />
          </li>
        </template>
      </draggable>

      <p
        v-if="list.length === 0"
        class="pointer-events-none text-sm text-muted"
        data-testid="column-empty"
      >
        {{ BOARD_COLUMN_EMPTY }}
      </p>
    </div>
  </section>
</template>
