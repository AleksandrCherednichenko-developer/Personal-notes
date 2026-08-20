// @vitest-environment happy-dom

import { describe, expect, it } from 'vitest'

import {
  HISTORY_SHORTCUT_ACTION,
  getHistoryShortcutAction,
  isEditableTarget,
} from '../../../app/editor/history-shortcuts'

describe('editor history shortcuts', () => {
  it('recognizes text inputs, textareas and nested contenteditable targets', () => {
    const input = document.createElement('input')
    const textarea = document.createElement('textarea')
    const editor = document.createElement('div')
    const nested = document.createElement('span')
    editor.contentEditable = 'true'
    editor.append(nested)

    expect(isEditableTarget(input)).toBe(true)
    expect(isEditableTarget(textarea)).toBe(true)
    expect(isEditableTarget(nested)).toBe(true)
    expect(isEditableTarget(document.createElement('button'))).toBe(false)
    expect(isEditableTarget(null)).toBe(false)
  })

  it('routes Ctrl/Cmd+Z and shifted variants outside editable controls', () => {
    const button = document.createElement('button')

    expect(getHistoryShortcutAction(new KeyboardEvent('keydown', {
      bubbles: true,
      ctrlKey: true,
      key: 'z',
    }), button)).toBe(HISTORY_SHORTCUT_ACTION.UNDO)
    expect(getHistoryShortcutAction(new KeyboardEvent('keydown', {
      bubbles: true,
      key: 'Z',
      metaKey: true,
      shiftKey: true,
    }), button)).toBe(HISTORY_SHORTCUT_ACTION.REDO)
  })

  it('leaves native history shortcuts inside editable controls untouched', () => {
    const input = document.createElement('input')

    expect(getHistoryShortcutAction(new KeyboardEvent('keydown', {
      ctrlKey: true,
      key: 'z',
    }), input)).toBeNull()
  })

  it('ignores unrelated, modified and already handled keyboard events', () => {
    const button = document.createElement('button')

    expect(getHistoryShortcutAction(new KeyboardEvent('keydown', { key: 'z' }), button)).toBeNull()
    expect(getHistoryShortcutAction(new KeyboardEvent('keydown', {
      altKey: true,
      ctrlKey: true,
      key: 'z',
    }), button)).toBeNull()
    expect(getHistoryShortcutAction(new KeyboardEvent('keydown', {
      ctrlKey: true,
      key: 'y',
    }), button)).toBeNull()

    const handledEvent = new KeyboardEvent('keydown', {
      cancelable: true,
      ctrlKey: true,
      key: 'z',
    })
    handledEvent.preventDefault()
    expect(getHistoryShortcutAction(handledEvent, button)).toBeNull()
  })
})
