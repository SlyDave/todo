<script setup lang="ts">
import type { HistogramIntensity } from '../types/task'
import { loadActivity } from '../utils/activity-storage'
import {
  INTENSITY_SURFACE_CLASS,
  WEEKDAY_HEADERS,
  activityEventsForPaint,
  buildMonthGrid,
  dayCellAriaLabel,
  formatMonthLabel,
  shiftMonth,
  utcYearMonth,
  type YearMonth
} from './calendarMonth'

const { forMonth } = useCalendarHistogram()

const viewed = ref<YearMonth>(utcYearMonth())
/** False until mount so SSR/hydration keep an empty intensity grid (#59). */
const clientReady = ref(false)

onMounted(() => {
  clientReady.value = true
})

const histogram = computed(() => {
  const events = activityEventsForPaint(clientReady.value, loadActivity())
  return forMonth(viewed.value.year, viewed.value.month, { events })
})

const monthLabel = computed(() => formatMonthLabel(viewed.value.year, viewed.value.month))

const gridCells = computed(() => buildMonthGrid(histogram.value.days))

function goPrevious(): void {
  viewed.value = shiftMonth(viewed.value.year, viewed.value.month, -1)
}

function goNext(): void {
  viewed.value = shiftMonth(viewed.value.year, viewed.value.month, 1)
}

function intensityClass(intensity: HistogramIntensity): string {
  return INTENSITY_SURFACE_CLASS[intensity]
}
</script>

<template>
  <section
    class="rounded-lg border border-default bg-default p-4"
    aria-labelledby="calendar-histogram-heading"
    data-testid="calendar-histogram"
  >
    <div class="flex items-center justify-between gap-3">
      <UButton
        type="button"
        color="neutral"
        variant="ghost"
        square
        aria-label="Previous month"
        data-testid="calendar-prev-month"
        @click="goPrevious"
      >
        <UIcon name="i-lucide-chevron-left" class="size-5" aria-hidden="true" />
      </UButton>

      <h2
        id="calendar-histogram-heading"
        class="text-lg font-semibold text-highlighted"
        data-testid="calendar-month-label"
      >
        {{ monthLabel }}
      </h2>

      <UButton
        type="button"
        color="neutral"
        variant="ghost"
        square
        aria-label="Next month"
        data-testid="calendar-next-month"
        @click="goNext"
      >
        <UIcon name="i-lucide-chevron-right" class="size-5" aria-hidden="true" />
      </UButton>
    </div>

    <div
      class="mt-4 grid grid-cols-7 gap-1.5"
      role="grid"
      :aria-label="`Activity for ${monthLabel}`"
      data-testid="calendar-month-grid"
    >
      <div
        v-for="header in WEEKDAY_HEADERS"
        :key="header"
        class="text-center text-xs font-medium text-muted"
        role="columnheader"
      >
        {{ header }}
      </div>

      <template
        v-for="(cell, index) in gridCells"
        :key="cell.kind === 'day' ? cell.date : `pad-${index}`"
      >
        <div
          v-if="cell.kind === 'pad'"
          class="aspect-square rounded-sm"
          role="gridcell"
          aria-hidden="true"
        />
        <div
          v-else
          class="aspect-square rounded-sm"
          role="gridcell"
          :class="intensityClass(cell.intensity)"
          :aria-label="dayCellAriaLabel(cell.date, cell.count)"
          :data-testid="`calendar-day-${cell.date}`"
          :data-intensity="cell.intensity"
          :title="dayCellAriaLabel(cell.date, cell.count)"
        />
      </template>
    </div>
  </section>
</template>
