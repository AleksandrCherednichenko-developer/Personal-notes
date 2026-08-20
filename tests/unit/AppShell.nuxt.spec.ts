import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'

import App from '../../app/app.vue'

describe('application shell accessibility', () => {
  it('provides a keyboard skip link targeting the active main landmark', async () => {
    const wrapper = await mountSuspended(App, { route: '/' })

    expect(wrapper.get('[data-testid="skip-link"]').attributes('href')).toBe('#app-main')
    expect(wrapper.get('main').attributes('id')).toBe('app-main')
    wrapper.unmount()
  })
})
