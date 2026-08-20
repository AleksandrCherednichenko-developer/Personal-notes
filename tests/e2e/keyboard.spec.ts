import { makeNote, seedNotes } from './support/notes'
import { expect, test } from './support/test'

test.describe('Клавиатурные modal flows', () => {
  test('удерживает focus в destructive dialog, закрывает Escape и возвращает focus', async ({ page }) => {
    const note = makeNote()
    await seedNotes(page, [note])
    await page.goto('/')
    const deleteButton = page.getByRole('button', { name: `Удалить заметку ${note.title}` })
    await deleteButton.focus()
    await deleteButton.press('Enter')

    const dialog = page.getByRole('dialog', { name: 'Удалить заметку?' })
    await expect(dialog).toBeVisible()
    await expect(page.getByRole('button', { name: 'Оставить' })).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await expect(page.getByRole('button', { name: 'Удалить', exact: true })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(deleteButton).toBeFocused()
  })
})
