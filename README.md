# My Notes Application

Локальное SPA для заметок: списки задач, категории, поиск, фильтры, сортировка,
история изменений и черновики. Backend и авторизация не нужны — данные
остаются в браузере.

## Стек

Nuxt 4 (SPA), Vue 3, TypeScript strict, Pinia, SCSS, Vitest, Playwright.
Production — статическая сборка и Nginx.

## Требования

- Node.js 24.11.0 (`.nvmrc`)
- pnpm 11.20.0 через Corepack
- Docker Compose — только для контейнерного запуска

```bash
nvm use
corepack enable
pnpm install --frozen-lockfile --config.engine-strict=false
```

Флаг нужен из‑за транзитивной dev-зависимости, которой требуется более новый Node,
чем зафиксированный в проекте.

## Запуск

```bash
pnpm dev          # http://localhost:3000
pnpm generate     # статика в .output/public
```

## Данные

Заметки: `notes-app:v1:notes`. Черновики: `notes-app:v1:drafts`.
Компоненты в `localStorage` не ходят — только слой persistence.
Если storage недоступен, приложение работает в памяти и показывает предупреждение.
Изменения между вкладками синхронизируются; совместное редактирование не сливается.

## Проверки

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm build
```

Покрытие domain, stores и persistence — не ниже 80%.

```bash
pnpm exec playwright install   # один раз
pnpm test:e2e
```

## Docker

```bash
docker compose up --build
docker compose down
```

Приложение на `http://localhost:3000`. Прямые URL вроде `/notes/example-id` отдаёт Nginx.
