export function getNextVisibleTaskIndex(taskCompletionState: boolean[]): number | null {
  const nextPendingIndex = taskCompletionState.findIndex((isCompleted) => !isCompleted);

  return nextPendingIndex === -1 ? null : nextPendingIndex;
}
