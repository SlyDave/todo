<script setup lang="ts">
import type { Task, TaskState } from '../types/task'
import { TaskValidationError } from '../utils/task-domain'
import { type BoardDragChangeEvent, resolveColumnDrop } from './boardDrag'
import { COLUMN_ORDER, groupActiveTasksByColumn, type TasksByColumn } from './boardColumns'
import { resolveSoftDeleteAfterConfirm } from './softDeleteConfirm'
import type { TaskFormPayload } from './TaskForm.vue'

const { load, create, updateDetails, changeState, softDelete } = useTaskStorage()

const tasks = ref<Task[]>([])
const columnTasks = reactive<TasksByColumn>({
  todo: [],
  inProgress: [],
  complete: []
})
const formOpen = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const editingTask = ref<Task | null>(null)
const submitError = ref<string | null>(null)
const deleteConfirmOpen = ref(false)
const pendingDeleteTask = ref<Task | null>(null)

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
}

onMounted(() => {
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
    submitError.value = 'Could not save the task. Please try again.'
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
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex justify-end">
      <UButton type="button" color="primary" data-testid="board-add-task" @click="openCreate">
        Add task
      </UButton>
    </div>

    <div
      class="grid grid-cols-1 gap-4 md:grid-cols-3"
      data-testid="board-columns"
      role="region"
      aria-label="Task board"
    >
      <BoardColumn
        v-for="state in COLUMN_ORDER"
        :key="state"
        v-model="columnTasks[state]"
        :state="state"
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
  </div>
</template>
