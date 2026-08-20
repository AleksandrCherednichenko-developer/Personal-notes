import { expect, test as base } from '@playwright/test'

export { expect }

export const test = base.extend<{ assertNoConsoleErrors: true }>({
  assertNoConsoleErrors: [async ({ context, page }, use) => {
    const errors: string[] = []
    const listen = (targetPage: typeof page): void => {
      targetPage.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text())
      })
      targetPage.on('pageerror', error => errors.push(error.message))
    }

    listen(page)
    context.on('page', listen)
    await use(true)
    expect(errors).toEqual([])
  }, { auto: true }],
})
