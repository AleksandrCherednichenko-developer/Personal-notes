export const HISTORY_SHORTCUT_ACTION = {
  REDO: 'redo',
  UNDO: 'undo',
} as const

export type HistoryShortcutAction = (
  typeof HISTORY_SHORTCUT_ACTION
)[keyof typeof HISTORY_SHORTCUT_ACTION]

const EDITABLE_SELECTOR = 'input, textarea, [contenteditable]:not([contenteditable="false"])'

export const isEditableTarget = (target: EventTarget | null): boolean => (
  target instanceof Element && target.closest(EDITABLE_SELECTOR) !== null
)

export const getHistoryShortcutAction = (
  event: KeyboardEvent,
  target: EventTarget | null = event.target,
): HistoryShortcutAction | null => {
  const usesHistoryModifier = event.ctrlKey || event.metaKey
  const isHistoryKey = event.key.toLowerCase() === 'z'

  if (
    event.defaultPrevented
    || event.altKey
    || !usesHistoryModifier
    || !isHistoryKey
    || isEditableTarget(target)
  ) return null

  return event.shiftKey
    ? HISTORY_SHORTCUT_ACTION.REDO
    : HISTORY_SHORTCUT_ACTION.UNDO
}
