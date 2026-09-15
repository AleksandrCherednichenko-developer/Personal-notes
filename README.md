# My Notes Application

Локальное SPA для заметок: списки задач, категории, поиск, фильтры, сортировка,
история изменений и черновики. Backend и авторизация не нужны — данные
остаются в браузере.

## Стек

Nuxt 4 (SPA), Vue 3, TypeScript strict, Pinia, SCSS, Vitest, Playwright.
Production — статическая сборка и Nginx.

## Требования

- Node.js: pnpm не блокирует установку по версии Node
- Рекомендуемая локальная версия: 24.11.0 (`.nvmrc`)
- pnpm 11.20.0 через Corepack
- Docker Compose — только для контейнерного запуска

```bash
nvm use   # необязательно, если Node уже стоит
corepack enable
pnpm install --frozen-lockfile
```

Nuxt 4.5 сам рассчитан на Node 22.19+, 24.11+ или 26+.
На более старых версиях установка пройдёт, но `dev` / `build` могут упасть.

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
