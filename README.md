# Конструктор дегустаций — кейс РСХБ

Открытые и слепые дегустации вина: организатор собирает событие с ноутбука, гости оценивают с телефона по QR,
итоги публикуются, валидные оценки уходят в «Народный винный рейтинг». План — [docs/PLAN.md](docs/PLAN.md).

> Вход организатора — по секретной ссылке `/org/[adminKey]`. **Авторизация в планах.**

## Запуск локально

```bash
cp .env.example .env      # укажите NEXT_PUBLIC_BASE_URL = http://<IP ноутбука>:3000
npm install
npm run dev               # создаёт/обновляет SQLite и стартует dev-сервер
npm run seed              # демо-данные (идемпотентно, можно запускать сколько угодно)
```

Демо-кабинет: `/org/demo-organizer-public-key`, код для гостей: `DEGUST`.

## Скрипты

| Скрипт | Что делает |
|---|---|
| `dev` | `prisma db push` + `next dev` |
| `build` | `prisma generate` + `next build` |
| `start` | `prisma db push` → seed → `next start` (для Render: SQLite сбрасывается) |
| `seed` | идемпотентный seed |
| `typecheck` | `tsc --noEmit` |

## Render

Build: `npm install && npm run build`, Start: `npm start`.
Env: `DATABASE_URL=file:./prod.db`, `NEXT_PUBLIC_BASE_URL=https://<сервис>.onrender.com` (задать до сборки), `EXPORT_SALT`.
