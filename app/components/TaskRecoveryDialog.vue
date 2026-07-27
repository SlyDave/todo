<script setup lang="ts">
import type { Task } from '../types/task'
import {
  TASK_RECOVERY_CLOSE_LABEL,
  TASK_RECOVERY_EMPTY_MESSAGE,
  TASK_RECOVERY_RESTORE_LABEL,
  TASK_RECOVERY_TITLE,
  formatRecoverableDeletedAt,
  recoverablePriorColumnLabel,
  recoverableTaskHeading
} from './taskRecovery'

const open = defineModel<boolean>('open', { required: true })

defineProps<{
  tasks: Task[]
}>()

const emit = defineEmits<{
  restore: [taskId: string]
  close: []
}>()

const listId = 'task-recovery-list-description'

function deletedLabel(task: Task): string | null {
  return formatRecoverableDeletedAt(task.deletedAt)
}

function onClose(): void {
  open.value = false
  emit('close')
}

function onRestore(taskId: string): void {
  emit('restore', taskId)
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="TASK_RECOVERY_TITLE"
    :ui="{ content: 'sm:max-w-lg' }"
    :aria-describedby="listId"
    data-testid="task-recovery-modal"
  >
    <template #body>
      <div class="flex flex-col gap-4" data-testid="task-recovery-body">
        <p :id="listId" class="sr-only">
          Soft-deleted tasks still within the recovery window. Restore returns a task to its prior
          column.
        </p>

        <ul
          v-if="tasks.length > 0"
          class="flex max-h-80 flex-col gap-2 overflow-y-auto"
          data-testid="task-recovery-list"
          aria-label="Recoverable tasks"
        >
          <li
            v-for="task in tasks"
            :key="task.id"
            class="flex items-start justify-between gap-3 rounded-md border border-default p-3"
            :data-testid="`task-recovery-row-${task.id}`"
          >
            <div class="min-w-0 flex-1">
              <p
                class="truncate text-sm font-medium text-highlighted"
                :data-testid="`task-recovery-title-${task.id}`"
              >
                {{ recoverableTaskHeading(task) }}
              </p>
              <p class="mt-1 text-xs text-muted" :data-testid="`task-recovery-meta-${task.id}`">
                Prior column: {{ recoverablePriorColumnLabel(task.state) }}
                <template v-if="deletedLabel(task)">
                  · Soft-deleted {{ deletedLabel(task) }}</template
                >
              </p>
            </div>
            <UButton
              type="button"
              color="primary"
              size="xs"
              class="shrink-0"
              :aria-label="`Restore ${recoverableTaskHeading(task)}`"
              :data-testid="`task-recovery-restore-${task.id}`"
              @click="onRestore(task.id)"
            >
              {{ TASK_RECOVERY_RESTORE_LABEL }}
            </UButton>
          </li>
        </ul>

        <p v-else class="text-sm text-muted" data-testid="task-recovery-empty" role="status">
          {{ TASK_RECOVERY_EMPTY_MESSAGE }}
        </p>

        <div class="flex justify-end pt-2">
          <UButton
            type="button"
            color="neutral"
            variant="ghost"
            data-testid="task-recovery-close"
            @click="onClose"
          >
            {{ TASK_RECOVERY_CLOSE_LABEL }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
