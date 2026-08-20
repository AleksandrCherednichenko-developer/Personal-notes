import { onBeforeUnmount, onMounted } from 'vue'
import type { Ref } from 'vue'

import {
  HISTORY_SHORTCUT_ACTION,
  getHistoryShortcutAction,
} from '../editor/history-shortcuts'

interface EditorHistoryShortcutOptions {
  canRedo: Readonly<Ref<boolean>>
  canUndo: Readonly<Ref<boolean>>
  enabled: Readonly<Ref<boolean>>
  redo: () => void
  undo: () => void
}

export const useEditorHistoryShortcuts = (
  options: EditorHistoryShortcutOptions,
): void => {
  const handleKeydown = (event: KeyboardEvent): void => {
    if (!options.enabled.value) return

    const action = getHistoryShortcutAction(event)
    const canRunAction = (
      action === HISTORY_SHORTCUT_ACTION.UNDO && options.canUndo.value
    ) || (
      action === HISTORY_SHORTCUT_ACTION.REDO && options.canRedo.value
    )

    if (!canRunAction) return

    event.preventDefault()
    if (action === HISTORY_SHORTCUT_ACTION.UNDO) options.undo()
    else options.redo()
  }

  onMounted(() => window.addEventListener('keydown', handleKeydown))
  onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown))
}
