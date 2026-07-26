import { describe, expect, it } from 'vitest'
import type { TaskState } from '../app/types/task'

describe('task types', () => {
  it('accepts the three board states', () => {
    const states: TaskState[] = ['todo', 'inProgress', 'complete']
    expect(states).toHaveLength(3)
  })
})
