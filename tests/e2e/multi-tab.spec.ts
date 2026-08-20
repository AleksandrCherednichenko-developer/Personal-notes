import { makeNote, readNotes, seedNotes } from './support/notes'
import { expect, test } from './support/test'

test.describe('Несколько вкладок', () => {
  test('сохраняет удалённую извне рабочую копию как новую заметку', async ({ context, page }) => {
    const note = makeNote()
    await seedNotes(page, [note])
    await page.goto(`/notes/${note.id}`)
    await page.getByLabel('Название заметки').fill('Спасённая копия')

    const secondPage = await context.newPage()
    await secondPage.goto('/')
    await secondPage.getByRole('button', { name: `Удалить заметку ${note.title}` }).click()
    await secondPage.getByRole('button', { name: 'Удалить', exact: true }).click()

    await expect(page.getByRole('dialog', { name: 'Заметка удалена в другой вкладке' })).toBeVisible()
    await page.getByRole('button', { name: 'Сохранить как новую' }).click()
    await expect(page).toHaveURL('/')

    const notes = await readNotes(page)
    expect(notes).toHaveLength(1)
    expect(notes[0]).toMatchObject({ title: 'Спасённая копия' })
    expect(notes[0]?.id).not.toBe(note.id)
  })
})
