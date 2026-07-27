<script setup lang="ts">
import type { Task } from '../types/task'
import {
  SOFT_DELETE_CANCEL_LABEL,
  SOFT_DELETE_CONFIRM_LABEL,
  SOFT_DELETE_CONFIRM_TITLE,
  softDeleteConfirmMessage
} from './softDeleteConfirm'

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  task: Task | null
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

/** True while confirm is in flight so dismiss-from-close does not also emit cancel. */
const confirming = ref(false)

const message = computed(() => {
  if (props.task === null) {
    return softDeleteConfirmMessage('')
  }
  return softDeleteConfirmMessage(props.task.title)
})

const messageId = 'soft-delete-confirm-description'

function onCancel(): void {
  open.value = false
}

function onConfirm(): void {
  confirming.value = true
  emit('confirm')
}

watch(open, (isOpen, wasOpen) => {
  if (wasOpen === true && isOpen === false) {
    if (!confirming.value) {
      emit('cancel')
    }
    confirming.value = false
  }
})
</script>

<template>
  <UModal
    v-model:open="open"
    :title="SOFT_DELETE_CONFIRM_TITLE"
    :ui="{ content: 'sm:max-w-md' }"
    :aria-describedby="messageId"
    data-testid="soft-delete-confirm-modal"
  >
    <template #body>
      <div class="flex flex-col gap-4" data-testid="soft-delete-confirm-body">
        <p :id="messageId" class="text-sm text-default" data-testid="soft-delete-confirm-message">
          {{ message }}
        </p>

        <div class="flex justify-end gap-2 pt-2">
          <UButton
            type="button"
            color="neutral"
            variant="ghost"
            data-testid="soft-delete-confirm-cancel"
            @click="onCancel"
          >
            {{ SOFT_DELETE_CANCEL_LABEL }}
          </UButton>
          <UButton
            type="button"
            color="error"
            data-testid="soft-delete-confirm-submit"
            @click="onConfirm"
          >
            {{ SOFT_DELETE_CONFIRM_LABEL }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
