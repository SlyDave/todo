<script setup lang="ts">
import type { Task, TaskPriority } from '../types/task'
import { DESCRIPTION_MAX_LENGTH, TITLE_MAX_LENGTH } from '../utils/task-domain'
import { PRIORITY_OPTIONS } from './taskPriority'
import {
  TASK_FORM_BACKGROUND_COLOUR_LABEL,
  TASK_FORM_CANCEL_LABEL,
  TASK_FORM_COLOUR_CUSTOM_LABEL,
  TASK_FORM_COLOUR_LABEL,
  TASK_FORM_COLOUR_NONE_LABEL,
  TASK_FORM_DESCRIPTION_LABEL,
  TASK_FORM_DESCRIPTION_PLACEHOLDER,
  TASK_FORM_DESCRIPTION_REQUIRED,
  TASK_FORM_DUE_DATE_LABEL,
  TASK_FORM_PRIORITY_LABEL,
  TASK_FORM_TITLE_LABEL,
  TASK_FORM_TITLE_PLACEHOLDER,
  taskFormDialogTitle,
  taskFormSubmitLabel
} from './taskFormCopy'
import { taskFormCanSubmit } from './taskFormSubmit'

export interface TaskFormPayload {
  title: string
  description: string
  priority: TaskPriority
  dueDate: string | null
  backgroundColour: string | null
}

type ColourPreset = 'none' | 'custom'

const COLOUR_PRESET_OPTIONS = [
  { value: 'none' as const, label: TASK_FORM_COLOUR_NONE_LABEL },
  { value: 'custom' as const, label: TASK_FORM_COLOUR_CUSTOM_LABEL }
]

const DEFAULT_CUSTOM_COLOUR = '#ffffff'

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
const colourPreset = ref<ColourPreset>('none')
const customColour = ref(DEFAULT_CUSTOM_COLOUR)
const descriptionError = ref<string | null>(null)

const dialogTitle = computed(() => taskFormDialogTitle(props.mode))
const submitLabel = computed(() => taskFormSubmitLabel(props.mode))
const canSubmit = computed(() => taskFormCanSubmit(description.value))

function resetFromTask(): void {
  descriptionError.value = null
  if (props.mode === 'edit' && props.task) {
    title.value = props.task.title
    description.value = props.task.description
    priority.value = props.task.priority
    dueDate.value = props.task.dueDate ?? ''
    if (props.task.backgroundColour !== null) {
      colourPreset.value = 'custom'
      customColour.value = props.task.backgroundColour
    } else {
      colourPreset.value = 'none'
      customColour.value = DEFAULT_CUSTOM_COLOUR
    }
    return
  }

  title.value = ''
  description.value = ''
  priority.value = 'medium'
  dueDate.value = ''
  colourPreset.value = 'none'
  customColour.value = DEFAULT_CUSTOM_COLOUR
}

watch(open, (isOpen) => {
  if (isOpen) {
    resetFromTask()
  }
})

function onCustomColourInput(value: string | number): void {
  customColour.value = String(value)
  colourPreset.value = 'custom'
}

function validate(): boolean {
  if (description.value.trim() === '') {
    descriptionError.value = TASK_FORM_DESCRIPTION_REQUIRED
    return false
  }
  descriptionError.value = null
  return true
}

function onSubmit(): void {
  if (!canSubmit.value || !validate()) {
    return
  }

  const trimmedDue = dueDate.value.trim()
  emit('submit', {
    title: title.value,
    description: description.value,
    priority: priority.value,
    dueDate: trimmedDue === '' ? null : trimmedDue,
    backgroundColour: colourPreset.value === 'none' ? null : customColour.value
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
      <form class="flex w-full flex-col gap-4" data-testid="task-form" @submit.prevent="onSubmit">
        <UFormField :label="TASK_FORM_TITLE_LABEL" name="title" class="w-full">
          <UInput
            v-model="title"
            name="title"
            class="w-full"
            autocomplete="off"
            :maxlength="TITLE_MAX_LENGTH"
            :placeholder="TASK_FORM_TITLE_PLACEHOLDER"
            data-testid="task-form-title"
          />
        </UFormField>

        <UFormField
          :label="TASK_FORM_DESCRIPTION_LABEL"
          name="description"
          required
          class="w-full"
          :error="descriptionError ?? undefined"
        >
          <UTextarea
            v-model="description"
            name="description"
            class="w-full"
            :rows="5"
            autoresize
            required
            :maxlength="DESCRIPTION_MAX_LENGTH"
            :placeholder="TASK_FORM_DESCRIPTION_PLACEHOLDER"
            data-testid="task-form-description"
            :aria-invalid="descriptionError !== null"
            @update:model-value="descriptionError = null"
          />
        </UFormField>

        <UFormField :label="TASK_FORM_PRIORITY_LABEL" name="priority" class="w-full">
          <USelect
            v-model="priority"
            name="priority"
            class="w-full"
            :items="PRIORITY_OPTIONS"
            value-key="value"
            label-key="label"
            data-testid="task-form-priority"
          />
        </UFormField>

        <UFormField :label="TASK_FORM_DUE_DATE_LABEL" name="dueDate" class="w-full">
          <UInput
            v-model="dueDate"
            type="date"
            name="dueDate"
            class="w-full"
            data-testid="task-form-due-date"
          />
        </UFormField>

        <UFormField
          :label="TASK_FORM_BACKGROUND_COLOUR_LABEL"
          name="backgroundColour"
          class="w-full"
        >
          <div class="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
            <USelect
              v-model="colourPreset"
              name="colourPreset"
              class="w-full sm:w-44"
              :items="COLOUR_PRESET_OPTIONS"
              value-key="value"
              label-key="label"
              data-testid="task-form-colour-preset"
            />
            <UInput
              :model-value="customColour"
              type="color"
              name="backgroundColour"
              class="h-10 w-full min-w-48 flex-1"
              :aria-label="TASK_FORM_COLOUR_LABEL"
              data-testid="task-form-colour"
              @update:model-value="onCustomColourInput"
            />
          </div>
        </UFormField>

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
          <UButton
            type="submit"
            color="primary"
            :disabled="!canSubmit"
            data-testid="task-form-submit"
          >
            {{ submitLabel }}
          </UButton>
        </div>
      </form>
    </template>
  </UModal>
</template>
