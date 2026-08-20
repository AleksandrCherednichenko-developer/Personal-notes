import { DRAFTS_STORAGE_KEY, makeNote, seedNotes } from './support/notes'
import { expect, test } from './support/test'

test.describe('Редактор заметки', () => {
  test('создаёт заметку, валидирует поля и сохраняет категории', async ({ page }) => {
    await page.goto('/notes/new')
    await page.getByRole('button', { name: 'Сохранить' }).click()
    await expect(page.getByRole('alert')).toContainText('Введите название заметки')

    await page.getByLabel('Название заметки').fill('Покупки')
    await page.getByLabel('Категории').fill('Личное')
    await page.getByLabel('Категории').press('Enter')
    await page.getByRole('button', { name: 'Добавить задачу' }).click()
    await page.getByLabel('Текст задачи 1').fill('Купить хлеб')
    await page.getByRole('button', { name: 'Сохранить' }).click()

    await expect(page).toHaveURL('/')
    await expect(page.getByRole('heading', { name: 'Покупки' })).toBeVisible()
    await expect(page.getByTestId('note-category')).toHaveText('Личное')
  })

  test('редактирует и удаляет существующую заметку через подтверждение', async ({ page }) => {
    const note = makeNote()
    await seedNotes(page, [note])
    await page.goto(`/notes/${note.id}`)
    await page.getByLabel('Название заметки').fill('Обновлённые планы')
    await page.getByRole('button', { name: 'Сохранить' }).click()
    await expect(page.getByRole('heading', { name: 'Обновлённые планы' })).toBeVisible()

    await page.getByRole('button', { name: 'Удалить заметку Обновлённые планы' }).click()
    await expect(page.getByRole('dialog', { name: 'Удалить заметку?' })).toBeVisible()
    await page.getByRole('button', { name: 'Удалить', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Заметок пока нет' })).toBeVisible()
  })

  test('поддерживает application undo/redo и не перехватывает native undo поля', async ({ page }) => {
    await page.goto('/notes/new')
    const title = page.getByLabel('Название заметки')
    await title.fill('Первый вариант')
    await title.blur()
    await page.getByRole('button', { name: 'Отменить', exact: true }).click()
    await expect(title).toHaveValue('')
    await page.getByRole('button', { name: 'Повторить' }).click()
    await expect(title).toHaveValue('Первый вариант')

    await title.focus()
    await title.pressSequentially('X')
    await title.press('Meta+z')
    await expect(title).toHaveValue('Первый вариант')
  })

  test('предлагает восстановить draft после reload и возвращает его history', async ({ page }) => {
    await page.goto('/notes/new')
    await page.getByLabel('Название заметки').fill('Несохранённый текст')
    await expect.poll(() => page.evaluate(key => localStorage.getItem(key), DRAFTS_STORAGE_KEY)).not.toBeNull()

    await page.reload()
    await expect(page.getByRole('dialog', { name: 'Найден несохранённый черновик' })).toBeVisible()
    await page.getByRole('button', { name: 'Восстановить' }).click()
    await expect(page.getByLabel('Название заметки')).toHaveValue('Несохранённый текст')
    await page.getByRole('button', { name: 'Отменить', exact: true }).click()
    await expect(page.getByLabel('Название заметки')).toHaveValue('')
  })

  test('показывает устойчивое состояние для неизвестного URL', async ({ page }) => {
    await page.goto('/notes/missing')
    await expect(page.getByRole('heading', { name: 'Заметка не найдена' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Вернуться к заметкам' })).toBeVisible()
  })
})
