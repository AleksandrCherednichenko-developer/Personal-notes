import { makeNote, seedNotes } from './support/notes'
import { expect, test } from './support/test'

test.describe('Список заметок', () => {
  test('ищет, фильтрует, сортирует и восстанавливает состояние из URL', async ({ page }) => {
    const work = makeNote()
    const home = makeNote({
      id: 'note-2',
      title: 'Домашние дела',
      todos: [{ id: 'todo-2', text: 'Купить молоко', completed: true }],
      categories: ['Дом'],
      updatedAt: '2026-08-19T00:00:00.000Z',
    })
    await seedNotes(page, [work, home])
    await page.goto('/')

    await page.getByRole('searchbox', { name: 'Поиск' }).fill('молоко')
    await expect(page).toHaveURL(/q=/)
    await expect(page.getByRole('heading', { name: home.title })).toBeVisible()
    await expect(page.getByRole('heading', { name: work.title })).toBeHidden()

    await page.getByRole('searchbox', { name: 'Поиск' }).fill('')
    await expect(page).not.toHaveURL(/q=/)
    await page.getByRole('checkbox', { name: 'Работа' }).check()
    await expect(page).toHaveURL(/category=/)
    await page.getByLabel('Сортировать по').selectOption('title')
    await page.getByLabel('Направление').selectOption('asc')
    await expect(page).toHaveURL(/sort=title/)

    await page.reload()
    await expect(page.getByRole('checkbox', { name: 'Работа' })).toBeChecked()
    await expect(page.getByLabel('Сортировать по')).toHaveValue('title')
  })

  test('раскрывает длинный Todo list партиями при прокрутке страницы', async ({ page }) => {
    const note = makeNote({
      todos: Array.from({ length: 14 }, (_, index) => ({
        id: `todo-${index}`,
        text: `Задача ${index + 1}`,
        completed: false,
      })),
    })
    await seedNotes(page, [note])
    await page.goto('/')
    const card = page.getByTestId('note-card')
    await expect(card.getByRole('listitem')).toHaveCount(6)

    await card.getByTestId('todo-reveal-sentinel').scrollIntoViewIfNeeded()
    await expect(card.getByRole('listitem')).toHaveCount(12)
    await page.mouse.wheel(0, 160)
    await expect(card.getByRole('listitem')).toHaveCount(14)
    await expect(card.getByTestId('todo-reveal-sentinel')).toHaveCount(0)
  })

  test('заполняет свободное место под короткими карточками', async ({ page }) => {
    const notes = [
      makeNote({ id: 'note-1', title: 'Короткая', updatedAt: '2026-08-20T04:00:00.000Z' }),
      makeNote({
        id: 'note-2',
        title: 'Высокая',
        updatedAt: '2026-08-20T03:00:00.000Z',
        todos: Array.from({ length: 6 }, (_, index) => ({
          id: `tall-${index}`,
          text: `Задача ${index + 1}`,
          completed: false,
        })),
      }),
      makeNote({
        id: 'note-3',
        title: 'Средняя',
        updatedAt: '2026-08-20T02:00:00.000Z',
        todos: Array.from({ length: 3 }, (_, index) => ({
          id: `medium-${index}`,
          text: `Задача ${index + 1}`,
          completed: false,
        })),
      }),
      makeNote({ id: 'note-4', title: 'Следующая', updatedAt: '2026-08-20T01:00:00.000Z' }),
    ]
    await seedNotes(page, notes)
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/')

    const cards = page.getByTestId('note-card')
    await expect(cards).toHaveCount(4)
    await expect.poll(async () => {
      const [shortCard, tallCard, nextCard] = await Promise.all([
        cards.nth(0).boundingBox(),
        cards.nth(1).boundingBox(),
        cards.nth(3).boundingBox(),
      ])
      return shortCard !== null
        && tallCard !== null
        && nextCard !== null
        && Math.abs(shortCard.x - nextCard.x) < 2
        && nextCard.y > shortCard.y + shortCard.height
        && nextCard.y < tallCard.y + tallCard.height
    }).toBe(true)

    await page.setViewportSize({ width: 600, height: 900 })
    await expect.poll(async () => {
      const boxes = await Promise.all(
        Array.from({ length: 4 }, (_, index) => cards.nth(index).boundingBox()),
      )
      return boxes.every(box => box !== null)
        && boxes.slice(1).every((box, index) => {
          const previousBox = boxes[index]
          return box !== null
            && previousBox !== null
            && Math.abs(box.x - previousBox.x) < 2
            && box.y >= previousBox.y + previousBox.height
        })
    }).toBe(true)
  })

  test('не создаёт горизонтальную прокрутку на целевых ширинах и при 200% тексте', async ({ page }) => {
    const longValue = 'ОченьДлинноеЗначениеБезПробеловДляПроверкиПереносаКонтента'
    await seedNotes(page, [makeNote({
      title: longValue,
      categories: [longValue],
      todos: [{ id: 'todo-long', text: longValue, completed: false }],
    })])
    await page.goto('/')
    await page.addStyleTag({ content: 'html { font-size: 200% !important; }' })

    for (const width of [360, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 })
      await expect.poll(() => page.evaluate(() => (
        document.documentElement.scrollWidth <= document.documentElement.clientWidth
      ))).toBe(true)
    }
  })
})
