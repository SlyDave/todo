<script setup lang="ts">
import type { Task, TaskPriority } from '../types/task'
import { PRIORITY_OPTIONS } from './taskPriority'
import {
  TASK_FORM_BACKGROUND_COLOUR_LEGEND,
  TASK_FORM_CANCEL_LABEL,
  TASK_FORM_COLOUR_LABEL,
  TASK_FORM_DESCRIPTION_HINT,
  TASK_FORM_DESCRIPTION_LABEL,
  TASK_FORM_DESCRIPTION_PLACEHOLDER,
  TASK_FORM_DESCRIPTION_REQUIRED,
  TASK_FORM_DUE_DATE_HINT,
  TASK_FORM_DUE_DATE_LABEL,
  TASK_FORM_PRIORITY_HINT,
  TASK_FORM_PRIORITY_LABEL,
  TASK_FORM_TITLE_HINT,
  TASK_FORM_TITLE_LABEL,
  TASK_FORM_TITLE_PLACEHOLDER,
  TASK_FORM_USE_BACKGROUND_COLOUR,
  taskFormDialogTitle,
  taskFormSubmitLabel
} from './taskFormCopy'

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

const dialogTitle = computed(() => taskFormDialogTitle(props.mode))
const submitLabel = computed(() => taskFormSubmitLabel(props.mode))

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
    descriptionError.value = TASK_FORM_DESCRIPTION_REQUIRED
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
        <UFormField :label="TASK_FORM_TITLE_LABEL" name="title" :hint="TASK_FORM_TITLE_HINT">
          <UInput
            v-model="title"
            name="title"
            autocomplete="off"
            :placeholder="TASK_FORM_TITLE_PLACEHOLDER"
            data-testid="task-form-title"
          />
        </UFormField>

        <UFormField
          :label="TASK_FORM_DESCRIPTION_LABEL"
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
            :placeholder="TASK_FORM_DESCRIPTION_PLACEHOLDER"
            data-testid="task-form-description"
            :aria-invalid="descriptionError !== null"
            aria-describedby="description-hint"
            @update:model-value="descriptionError = null"
          />
          <p id="description-hint" class="mt-1 text-xs text-muted">
            {{ TASK_FORM_DESCRIPTION_HINT }}
          </p>
        </UFormField>

        <UFormField
          :label="TASK_FORM_PRIORITY_LABEL"
          name="priority"
          :hint="TASK_FORM_PRIORITY_HINT"
        >
          <USelect
            v-model="priority"
            name="priority"
            :items="PRIORITY_OPTIONS"
            value-key="value"
            label-key="label"
            data-testid="task-form-priority"
          />
        </UFormField>

        <UFormField
          :label="TASK_FORM_DUE_DATE_LABEL"
          name="dueDate"
          :hint="TASK_FORM_DUE_DATE_HINT"
        >
          <UInput v-model="dueDate" type="date" name="dueDate" data-testid="task-form-due-date" />
        </UFormField>

        <fieldset class="flex flex-col gap-2">
          <legend class="text-sm font-medium text-default">
            {{ TASK_FORM_BACKGROUND_COLOUR_LEGEND }}
          </legend>
          <label class="flex items-center gap-2 text-sm text-default">
            <input
              v-model="useBackgroundColour"
              type="checkbox"
              class="size-4 rounded border-default"
              data-testid="task-form-use-colour"
            />
            {{ TASK_FORM_USE_BACKGROUND_COLOUR }}
          </label>
          <UFormField
            v-if="useBackgroundColour"
            :label="TASK_FORM_COLOUR_LABEL"
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
            {{ TASK_FORM_CANCEL_LABEL }}
          </UButton>
          <UButton type="submit" color="primary" data-testid="task-form-submit">
            {{ submitLabel }}
          </UButton>
        </div>
      </form>
    </template>
  </UModal>
</template>
