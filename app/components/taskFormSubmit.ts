/** True when the create/edit form may submit (description trim non-empty). */
export function taskFormCanSubmit(description: string): boolean {
  return description.trim() !== ''
}
