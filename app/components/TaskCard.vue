<script setup lang="ts">
import type { Task } from '../types/task'
import {
  NEEDS_ACTIONED_ICON,
  NEEDS_ACTIONED_WARNING,
  showNeedsActionedIndicator
} from './taskNeedsActioned'
import { PRIORITY_ICON, PRIORITY_LABEL } from './taskPriority'
import { renderTaskMarkdown } from './taskMarkdown'

const props = defineProps<{
  task: Task
}>()

const emit = defineEmits<{
  edit: [task: Task]
  delete: [task: Task]
}>()

const descriptionEl = ref<HTMLElement | null>(null)

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

function refreshMarkdown(): void {
  if (!import.meta.client || descriptionEl.value === null) {
    return
  }
  descriptionEl.value.innerHTML = renderTaskMarkdown(props.task.description)
}

onMounted(() => {
  refreshMarkdown()
})

watch(
  () => props.task.description,
  () => {
    refreshMarkdown()
  }
)

const dueDateLabel = computed(() => {
  if (props.task.dueDate === null || props.task.dueDate.trim() === '') {
    return null
  }
  return props.task.dueDate
})

const priorityIcon = computed(() => PRIORITY_ICON[props.task.priority])
const priorityLabel = computed(() => PRIORITY_LABEL[props.task.priority])

const needsActioned = computed(() => showNeedsActionedIndicator(props.task))
</script>

<template>
  <article
    class="relative rounded-md border border-default bg-default p-3"
    :class="{ 'pb-8': needsActioned }"
    :style="cardStyle"
    :data-testid="`task-card-${task.id}`"
    :data-task-id="task.id"
    :data-task-state="task.state"
    :data-task-priority="task.priority"
  >
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2">
          <span
            class="inline-flex shrink-0 text-muted"
            :data-testid="`task-priority-${task.id}`"
            :aria-label="priorityLabel"
            role="img"
          >
            <FontAwesomeIcon :icon="priorityIcon" aria-hidden="true" />
          </span>
          <h3 v-if="heading" class="truncate text-sm font-medium text-highlighted">
            {{ heading }}
          </h3>
          <span v-else class="sr-only">{{ priorityLabel }}</span>
        </div>

        <div
          ref="descriptionEl"
          class="task-description mt-1 break-words text-sm text-muted"
          data-testid="task-description"
        />

        <p v-if="dueDateLabel" class="mt-2 text-xs text-muted" :data-testid="`task-due-${task.id}`">
          Due {{ dueDateLabel }}
        </p>
      </div>

      <div class="flex shrink-0 items-center gap-1">
        <UButton
          type="button"
          color="neutral"
          variant="ghost"
          size="xs"
          :aria-label="heading ? `Edit ${heading}` : 'Edit task'"
          :data-testid="`task-edit-${task.id}`"
          @click="emit('edit', task)"
        >
          Edit
        </UButton>
        <UButton
          type="button"
          color="error"
          variant="ghost"
          size="xs"
          :aria-label="heading ? `Soft-delete ${heading}` : 'Soft-delete task'"
          :data-testid="`task-delete-${task.id}`"
          @click="emit('delete', task)"
        >
          Delete
        </UButton>
      </div>
    </div>

    <span
      v-if="needsActioned"
      class="absolute bottom-2 right-2 inline-flex text-warning"
      role="img"
      :aria-label="NEEDS_ACTIONED_WARNING"
      :title="NEEDS_ACTIONED_WARNING"
      :data-testid="`task-needs-actioned-${task.id}`"
    >
      <FontAwesomeIcon :icon="NEEDS_ACTIONED_ICON" aria-hidden="true" />
    </span>
  </article>
</template>

<style scoped>
.task-description :deep(p) {
  margin: 0;
}

.task-description :deep(p + p) {
  margin-top: 0.5rem;
}

.task-description :deep(ul),
.task-description :deep(ol) {
  margin: 0.25rem 0 0;
  padding-left: 1.25rem;
}

.task-description :deep(a) {
  text-decoration: underline;
}
</style>
