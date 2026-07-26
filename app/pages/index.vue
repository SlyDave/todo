<template>
  <div class="p-6 max-w-5xl mx-auto">
    <h1 class="text-2xl font-semibold text-highlighted">To-Do</h1>
    <p class="mt-2 text-muted">
      Board scaffold is ready. Columns, drag-and-drop, and metrics land with the first milestone.
    </p>
    <div class="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3" data-testid="board-columns">
      <section class="rounded-lg border border-default p-4 min-h-40">
        <h2 class="font-medium">ToDo</h2>
      </section>
      <section class="rounded-lg border border-default p-4 min-h-40">
        <h2 class="font-medium">InProgress</h2>
      </section>
      <section class="rounded-lg border border-default p-4 min-h-40">
        <h2 class="font-medium">Complete</h2>
      </section>
    </div>
  </div>
</template>
