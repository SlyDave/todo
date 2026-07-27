<script setup lang="ts">
import type { Task, TaskState } from '../types/task'
import { TaskValidationError } from '../utils/task-domain'
import { type BoardDragChangeEvent, resolveColumnDrop } from './boardDrag'
import {
  COLUMN_ORDER,
  countActiveTasksByColumn,
  groupActiveTasksByColumn,
  type ColumnCounts,
  type TasksByColumn
} from './boardColumns'
import { BOARD_ADD_TASK_LABEL, BOARD_REGION_LABEL, BOARD_SAVE_ERROR } from './boardCopy'
import { resolveSoftDeleteAfterConfirm } from './softDeleteConfirm'
import {
  TASK_RECOVERY_OPEN_LABEL,
  listRecoverableTasks,
  resolveRestoreTaskId
} from './taskRecovery'
import type { TaskFormPayload } from './TaskForm.vue'

const { load, create, updateDetails, changeState, softDelete, restore, purgeExpired } =
  useTaskStorage()

const tasks = ref<Task[]>([])
const columnTasks = reactive<TasksByColumn>({
  todo: [],
  inProgress: [],
  complete: []
})
/** Active totals per column; never tied to priority-filtered card lists. */
const columnCounts = reactive<ColumnCounts>({
  todo: 0,
  inProgress: 0,
  complete: 0
})
const formOpen = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const editingTask = ref<Task | null>(null)
const submitError = ref<string | null>(null)
const deleteConfirmOpen = ref(false)
const pendingDeleteTask = ref<Task | null>(null)
const recoveryOpen = ref(false)

const recoverableTasks = computed(() => listRecoverableTasks(tasks.value))

watch(deleteConfirmOpen, (isOpen) => {
  if (!isOpen) {
    pendingDeleteTask.value = null
  }
})

function syncFromStorage(): void {
  tasks.value = load()
  const grouped = groupActiveTasksByColumn(tasks.value)
  columnTasks.todo = grouped.todo
  columnTasks.inProgress = grouped.inProgress
  columnTasks.complete = grouped.complete
  const counts = countActiveTasksByColumn(tasks.value)
  columnCounts.todo = counts.todo
  columnCounts.inProgress = counts.inProgress
  columnCounts.complete = counts.complete
}

onMounted(() => {
  purgeExpired()
  syncFromStorage()
})

function openCreate(): void {
  formMode.value = 'create'
  editingTask.value = null
  submitError.value = null
  formOpen.value = true
}

function openEdit(task: Task): void {
  formMode.value = 'edit'
  editingTask.value = task
  submitError.value = null
  formOpen.value = true
}

function onSubmit(payload: TaskFormPayload): void {
  submitError.value = null
  try {
    if (formMode.value === 'create') {
      create({
        title: payload.title,
        description: payload.description,
        priority: payload.priority,
        dueDate: payload.dueDate,
        backgroundColour: payload.backgroundColour
      })
    } else if (editingTask.value !== null) {
      updateDetails(editingTask.value.id, {
        title: payload.title,
        description: payload.description,
        priority: payload.priority,
        dueDate: payload.dueDate,
        backgroundColour: payload.backgroundColour
      })
    }
    syncFromStorage()
    formOpen.value = false
  } catch (error) {
    if (error instanceof TaskValidationError) {
      submitError.value = error.message
      return
    }
    submitError.value = BOARD_SAVE_ERROR
  }
}

function onColumnChange(state: TaskState, event: BoardDragChangeEvent): void {
  const action = resolveColumnDrop(state, event)
  if (action !== null) {
    changeState(action.taskId, action.state)
    syncFromStorage()
    return
  }

  // Within-column reorder is deferred (#17); restore storage order.
  if (event.moved !== undefined) {
    syncFromStorage()
  }
}

function openDeleteConfirm(task: Task): void {
  pendingDeleteTask.value = task
  deleteConfirmOpen.value = true
}

function finishDeleteDialog(confirmed: boolean): void {
  const taskId = pendingDeleteTask.value?.id ?? null
  deleteConfirmOpen.value = false
  // pendingDeleteTask cleared by watch when open closes; use local id for confirm.
  const idToDelete = resolveSoftDeleteAfterConfirm(confirmed, taskId)
  if (idToDelete === null) {
    return
  }
  softDelete(idToDelete)
  syncFromStorage()
}

function onDeleteCancel(): void {
  finishDeleteDialog(false)
}

function onDeleteConfirm(): void {
  finishDeleteDialog(true)
}

function openRecovery(): void {
  purgeExpired()
  syncFromStorage()
  recoveryOpen.value = true
}

function onRestore(taskId: string): void {
  const id = resolveRestoreTaskId(taskId)
  if (id === null) {
    return
  }
  restore(id)
  syncFromStorage()
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex justify-end gap-2">
      <UButton
        type="button"
        color="neutral"
        variant="outline"
        data-testid="board-recover-tasks"
        @click="openRecovery"
      >
        {{ TASK_RECOVERY_OPEN_LABEL }}
      </UButton>
      <UButton type="button" color="primary" data-testid="board-add-task" @click="openCreate">
        {{ BOARD_ADD_TASK_LABEL }}
      </UButton>
    </div>

    <div
      class="grid grid-cols-1 gap-4 md:grid-cols-3"
      data-testid="board-columns"
      role="region"
      :aria-label="BOARD_REGION_LABEL"
    >
      <BoardColumn
        v-for="state in COLUMN_ORDER"
        :key="state"
        v-model="columnTasks[state]"
        :state="state"
        :active-count="columnCounts[state]"
        @edit="openEdit"
        @delete="openDeleteConfirm"
        @change="onColumnChange(state, $event)"
      />
    </div>

    <TaskForm
      v-model:open="formOpen"
      :mode="formMode"
      :task="editingTask"
      :submit-error="submitError"
      @submit="onSubmit"
    />

    <SoftDeleteConfirmDialog
      v-model:open="deleteConfirmOpen"
      :task="pendingDeleteTask"
      @cancel="onDeleteCancel"
      @confirm="onDeleteConfirm"
    />

    <TaskRecoveryDialog
      v-model:open="recoveryOpen"
      :tasks="recoverableTasks"
      @restore="onRestore"
    />
  </div>
</template>
