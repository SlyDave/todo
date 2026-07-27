<script setup lang="ts">
import type { CalendarViewMode, HistogramIntensity, YearDayCell } from '../types/task'
import { loadActivity } from '../utils/activity-storage'
import { INTENSITY_SURFACE_CLASS, activityEventsForPaint, dayCellAriaLabel } from './calendarMonth'
import {
  CALENDAR_MODE_LABEL,
  CALENDAR_MODE_OPTIONS,
  CALENDAR_YEAR_HEADING,
  YEAR_CELL_CLASS,
  YEAR_GRID_GAP_CLASS,
  YEAR_WEEKDAY_HEADERS,
  buildYearMonthHeaders,
  groupYearDaysByWeek
} from './calendarYear'

interface YearGridRow {
  weekday: (typeof YEAR_WEEKDAY_HEADERS)[number]
  cells: YearDayCell[]
}

const { forYear } = useCalendarHistogram()

const viewMode = ref<CalendarViewMode>('activity')
/** False until mount so SSR/hydration keep an empty intensity grid (#59). */
const clientReady = ref(false)

onMounted(() => {
  clientReady.value = true
})

const histogram = computed(() => {
  const events = activityEventsForPaint(clientReady.value, loadActivity())
  return forYear({ events, mode: viewMode.value })
})

const weeks = computed(() => groupYearDaysByWeek(histogram.value.days, histogram.value.weekCount))

const monthHeaders = computed(() => buildYearMonthHeaders(weeks.value))

const rows = computed((): YearGridRow[] =>
  YEAR_WEEKDAY_HEADERS.map((weekday, rowIndex) => ({
    weekday,
    cells: weeks.value.map((week) => {
      const cell = week[rowIndex]
      if (cell === undefined) {
        return {
          date: `missing-${String(rowIndex)}`,
          weekRow: rowIndex,
          weekIndex: 0,
          count: 0,
          intensity: 0 as HistogramIntensity,
          inRange: false
        }
      }
      return cell
    })
  }))
)

const gridAriaLabel = computed(() => {
  const modeLabel =
    CALENDAR_MODE_OPTIONS.find((option) => option.value === viewMode.value)?.label ?? 'Activity'
  return `${modeLabel} for the past year`
})

function intensityClass(intensity: HistogramIntensity): string {
  return INTENSITY_SURFACE_CLASS[intensity]
}

function cellSurfaceClass(cell: YearDayCell): string {
  if (!cell.inRange) {
    return `${YEAR_CELL_CLASS} bg-transparent`
  }
  return `${YEAR_CELL_CLASS} ${intensityClass(cell.intensity)}`
}

function cellAriaLabel(cell: YearDayCell): string | undefined {
  if (!cell.inRange) {
    return undefined
  }
  return dayCellAriaLabel(cell.date, cell.count)
}
</script>

<template>
  <section
    class="rounded-lg border border-default bg-default p-3 sm:p-4"
    aria-labelledby="calendar-histogram-heading"
    data-testid="calendar-histogram"
  >
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <h2
        id="calendar-histogram-heading"
        class="text-base font-semibold text-highlighted"
        data-testid="calendar-year-heading"
      >
        {{ CALENDAR_YEAR_HEADING }}
      </h2>

      <UFormField :label="CALENDAR_MODE_LABEL" name="calendarMode" class="min-w-40">
        <USelect
          v-model="viewMode"
          name="calendarMode"
          :items="[...CALENDAR_MODE_OPTIONS]"
          value-key="value"
          label-key="label"
          data-testid="calendar-view-mode"
        />
      </UFormField>
    </div>

    <div
      class="mt-3 overflow-x-auto"
      role="grid"
      :aria-label="gridAriaLabel"
      data-testid="calendar-year-grid"
    >
      <div class="inline-flex min-w-full flex-col" :class="YEAR_GRID_GAP_CLASS">
        <div class="flex" :class="YEAR_GRID_GAP_CLASS" role="row">
          <div class="w-8 shrink-0 sm:w-9" role="columnheader" aria-hidden="true" />
          <div
            v-for="(label, weekIndex) in monthHeaders"
            :key="`month-${String(weekIndex)}`"
            class="flex w-2.5 shrink-0 justify-start sm:w-3"
            role="columnheader"
          >
            <span
              v-if="label"
              class="text-[0.65rem] leading-none text-muted"
              data-testid="calendar-month-header"
            >
              {{ label }}
            </span>
          </div>
        </div>

        <div
          v-for="row in rows"
          :key="row.weekday"
          class="flex items-center"
          :class="YEAR_GRID_GAP_CLASS"
          role="row"
        >
          <div class="w-8 shrink-0 text-[0.65rem] leading-none text-muted sm:w-9" role="rowheader">
            {{ row.weekday }}
          </div>
          <div
            v-for="cell in row.cells"
            :key="cell.date"
            role="gridcell"
            :class="cellSurfaceClass(cell)"
            :aria-label="cellAriaLabel(cell)"
            :aria-hidden="cell.inRange ? undefined : true"
            :data-testid="`calendar-day-${cell.date}`"
            :data-intensity="cell.inRange ? cell.intensity : undefined"
            :data-in-range="cell.inRange ? 'true' : 'false'"
            :title="cellAriaLabel(cell)"
          />
        </div>
      </div>
    </div>
  </section>
</template>
