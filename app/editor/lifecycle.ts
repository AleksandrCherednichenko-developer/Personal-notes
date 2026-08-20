import type { PageLifecycle } from './types'

export const createBrowserPageLifecycle = (): PageLifecycle => ({
  subscribePageHide: (listener) => {
    if (typeof window === 'undefined') return () => undefined
    window.addEventListener('pagehide', listener)
    return () => window.removeEventListener('pagehide', listener)
  },
})
