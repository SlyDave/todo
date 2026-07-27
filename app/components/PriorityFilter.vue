<script setup lang="ts">
import type { TaskPriority } from '../types/task'
import {
  PRIORITY_FILTER_LEGEND,
  PRIORITY_FILTER_OPTIONS,
  isPrioritySelected,
  togglePrioritySelection
} from './priorityFilterUi'

const selected = defineModel<TaskPriority[]>('selected', { required: true })

function onToggle(priority: TaskPriority): void {
  selected.value = togglePrioritySelection(selected.value, priority)
}
</script>

<template>
  <fieldset
    class="flex flex-wrap items-center gap-3"
    data-testid="priority-filter"
    :aria-label="PRIORITY_FILTER_LEGEND"
  >
    <legend class="sr-only">{{ PRIORITY_FILTER_LEGEND }}</legend>
    <span class="text-sm font-medium text-default" aria-hidden="true">
      {{ PRIORITY_FILTER_LEGEND }}
    </span>
    <label
      v-for="option in PRIORITY_FILTER_OPTIONS"
      :key="option.value"
      class="flex items-center gap-2 text-sm text-default"
    >
      <input
        type="checkbox"
        class="size-4 rounded border-default"
        :checked="isPrioritySelected(selected, option.value)"
        :data-testid="`priority-filter-${option.value}`"
        :aria-label="option.label"
        @change="onToggle(option.value)"
      />
      {{ option.label }}
    </label>
  </fieldset>
</template>
