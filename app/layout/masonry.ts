import type { Directive } from 'vue'

const DEFAULT_GAP_PX = 20
const DEFAULT_ROW_HEIGHT_PX = 8

const observers = new WeakMap<HTMLElement, ResizeObserver>()

export const calculateMasonryRowSpan = (
  itemHeight: number,
  rowHeight = DEFAULT_ROW_HEIGHT_PX,
  gap = DEFAULT_GAP_PX,
): number => Math.max(
  1,
  Math.ceil((itemHeight + gap) / (rowHeight + gap)),
)

const parsePixels = (value: string, fallback: number): number => {
  const parsedValue = Number.parseFloat(value)
  return Number.isFinite(parsedValue) ? parsedValue : fallback
}

const getLayoutMetrics = (element: HTMLElement) => {
  const container = element.parentElement
  if (container === null) {
    return { gap: DEFAULT_GAP_PX, rowHeight: DEFAULT_ROW_HEIGHT_PX }
  }

  const styles = getComputedStyle(container)
  return {
    gap: parsePixels(styles.rowGap, DEFAULT_GAP_PX),
    rowHeight: parsePixels(styles.gridAutoRows, DEFAULT_ROW_HEIGHT_PX),
  }
}

const updateItemSpan = (element: HTMLElement): void => {
  const { gap, rowHeight } = getLayoutMetrics(element)
  const itemHeight = element.getBoundingClientRect().height
  element.style.gridRowEnd = `span ${calculateMasonryRowSpan(itemHeight, rowHeight, gap)}`
}

export const vMasonryItem: Directive<HTMLElement> = {
  mounted(element) {
    updateItemSpan(element)

    if (typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(() => updateItemSpan(element))
    observer.observe(element)
    observers.set(element, observer)
  },
  updated(element) {
    if (typeof ResizeObserver !== 'undefined') return
    updateItemSpan(element)
  },
  unmounted(element) {
    observers.get(element)?.disconnect()
    observers.delete(element)
  },
}
