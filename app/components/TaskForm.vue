<script setup lang="ts">
import type { Task, TaskPriority } from '../types/task'
import { PRIORITY_OPTIONS } from './taskPriority'

export interface TaskFormPayload {
  title: string
  description: string
  priority: TaskPriority
  dueDate: string | null
  backgroundColour: string | null
}

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  mode: 'create' | 'edit'
  task?: Task | null
  submitError?: string | null
}>()

const emit = defineEmits<{
  submit: [payload: TaskFormPayload]
}>()

const title = ref('')
const description = ref('')
const priority = ref<TaskPriority>('medium')
const dueDate = ref('')
const useBackgroundColour = ref(false)
const backgroundColour = ref('#ffffff')
const descriptionError = ref<string | null>(null)

const dialogTitle = computed(() => (props.mode === 'create' ? 'Create task' : 'Edit task'))
const submitLabel = computed(() => (props.mode === 'create' ? 'Create task' : 'Save changes'))

function resetFromTask(): void {
  descriptionError.value = null
  if (props.mode === 'edit' && props.task) {
    title.value = props.task.title
    description.value = props.task.description
    priority.value = props.task.priority
    dueDate.value = props.task.dueDate ?? ''
    useBackgroundColour.value = props.task.backgroundColour !== null
    backgroundColour.value = props.task.backgroundColour ?? '#ffffff'
    return
  }

  title.value = ''
  description.value = ''
  priority.value = 'medium'
  dueDate.value = ''
  useBackgroundColour.value = false
  backgroundColour.value = '#ffffff'
}

watch(open, (isOpen) => {
  if (isOpen) {
    resetFromTask()
  }
})

function validate(): boolean {
  if (description.value.trim() === '') {
    descriptionError.value = 'Description is required.'
    return false
  }
  descriptionError.value = null
  return true
}

function onSubmit(): void {
  if (!validate()) {
    return
  }

  const trimmedDue = dueDate.value.trim()
  emit('submit', {
    title: title.value,
    description: description.value,
    priority: priority.value,
    dueDate: trimmedDue === '' ? null : trimmedDue,
    backgroundColour: useBackgroundColour.value ? backgroundColour.value : null
  })
}

function onCancel(): void {
  open.value = false
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="dialogTitle"
    :ui="{ content: 'sm:max-w-lg' }"
    data-testid="task-form-modal"
  >
    <template #body>
      <form class="flex flex-col gap-4" data-testid="task-form" @submit.prevent="onSubmit">
        <UFormField label="Title" name="title" hint="Optional">
          <UInput
            v-model="title"
            name="title"
            autocomplete="off"
            placeholder="Short label"
            data-testid="task-form-title"
          />
        </UFormField>

        <UFormField
          label="Description"
          name="description"
          required
          :error="descriptionError ?? undefined"
        >
          <UTextarea
            v-model="description"
            name="description"
            :rows="5"
            autoresize
            required
            placeholder="What needs doing? Markdown is supported."
            data-testid="task-form-description"
            :aria-invalid="descriptionError !== null"
            aria-describedby="description-hint"
            @update:model-value="descriptionError = null"
          />
          <p id="description-hint" class="mt-1 text-xs text-muted">
            Required. You may use Markdown for formatting.
          </p>
        </UFormField>

        <UFormField label="Priority" name="priority" hint="Optional — defaults to Medium">
          <USelect
            v-model="priority"
            name="priority"
            :items="PRIORITY_OPTIONS"
            value-key="value"
            label-key="label"
            data-testid="task-form-priority"
          />
        </UFormField>

        <UFormField label="Due date" name="dueDate" hint="Optional">
          <UInput v-model="dueDate" type="date" name="dueDate" data-testid="task-form-due-date" />
        </UFormField>

        <fieldset class="flex flex-col gap-2">
          <legend class="text-sm font-medium text-default">Background colour</legend>
          <label class="flex items-center gap-2 text-sm text-default">
            <input
              v-model="useBackgroundColour"
              type="checkbox"
              class="size-4 rounded border-default"
              data-testid="task-form-use-colour"
            />
            Use a background colour
          </label>
          <UFormField
            v-if="useBackgroundColour"
            label="Colour"
            name="backgroundColour"
            class="max-w-40"
          >
            <UInput
              v-model="backgroundColour"
              type="color"
              name="backgroundColour"
              data-testid="task-form-colour"
            />
          </UFormField>
        </fieldset>

        <p
          v-if="submitError"
          class="text-sm text-error"
          role="alert"
          data-testid="task-form-submit-error"
        >
          {{ submitError }}
        </p>

        <div class="flex justify-end gap-2 pt-2">
          <UButton
            type="button"
            color="neutral"
            variant="ghost"
            data-testid="task-form-cancel"
            @click="onCancel"
          >
            Cancel
          </UButton>
          <UButton type="submit" color="primary" data-testid="task-form-submit">
            {{ submitLabel }}
          </UButton>
        </div>
      </form>
    </template>
  </UModal>
</template>
