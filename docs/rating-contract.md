# Контракт передачи оценок в «Народный винный рейтинг»

Версия формата: **1.1** (`schemaVersion: "1.1"`). Импорт принимает и 1.0 — в ней у оценок нет `scale` и `normalized5`. Типы в коде — `RatingExportV1` и `ImportResultDTO` в
[`lib/dto.ts`](../lib/dto.ts), zod-схема входа — `ratingExportSchema` в [`lib/validation.ts`](../lib/validation.ts).
Экспорт формирует [`services/exportService.ts`](../services/exportService.ts), импорт — [`services/ratingService.ts`](../services/ratingService.ts).

## Как это работает

```
Конструктор                                           Народный рейтинг
GET /api/org/{adminKey}/export  ──RatingExportV1──▶  POST /api/rating/import  ──▶  GET /api/rating, /rating
```

1. Организатор завершает дегустацию (`closed`) или публикует итоги (`published`).
2. Кнопка «Передать в рейтинг» на вкладке «Итоги» забирает экспорт и отправляет его в `POST /api/rating/import`
   тем же HTTP-запросом, каким воспользовалась бы внешняя система. «Скачать JSON» отдаёт тот же экспорт файлом.
3. Рейтинг заново проверяет все правила, сохраняет принятые оценки и возвращает отчёт: сколько принято, сколько
   отклонено и почему.
4. Повторная передача безопасна: импорт идемпотентен по `exportId`.

## Эндпоинты

| Метод | Путь | Тело | Ответ |
|---|---|---|---|
| GET | `/api/org/{adminKey}/export` | — | `RatingExportV1`, 200. С `?download=1` отдаётся файлом `{exportId}.json` |
| POST | `/api/rating/import` | `RatingExportV1` | `ImportResultDTO`: **201**, если экспорт принят впервые, **200** при повторе `exportId` |
| GET | `/api/rating` | — | `PublicRatingRowDTO[]`: публичный рейтинг вин |

## Формат `RatingExportV1`

Все поля обязательны. Там, где значения нет, передаётся `null`. Поля, которых нет в схеме, рейтинг игнорирует
и не учитывает при сравнении тел.

| Поле | Тип | Описание |
|---|---|---|
| `schemaVersion` | `"1.1"` | Версия контракта. Импорт принимает `"1.0"` и `"1.1"`, другие отклоняются с 400 |
| `exportId` | string, 8..64 символа `[A-Za-z0-9_-]` | Ключ идемпотентности. Конструктор строит его как `exp_` + первые 32 hex-символа `sha256(tastingId + "\|" + closedAt + "\|" + schemaVersion)`: у одной дегустации в одной версии формата он всегда один и тот же. Версия входит в ключ, потому что новая версия меняет тело — под старым `exportId` импорт ответил бы 409 |
| `source.system` | `"wine-tasting-constructor"` | Система-источник |
| `source.tastingId` | string | id дегустации в источнике |
| `source.title` | string, 1..120 | Название дегустации |
| `source.mode` | `"open"` \| `"blind"` | Режим дегустации |
| `source.closedAt` | string, ISO 8601 | Момент завершения дегустации. Без него экспорт не принимается: оценки берутся только из завершённых дегустаций |
| `source.scale` | `{ id, min, max, step }` | Шкала дегустации. `id`: `points100` (0..100, шаг 1), `stars5` (1..5, шаг 1), `points10` (1..10, шаг 0,5). `min`, `max` и `step` должны совпадать с эталоном для этого `id` |
| `wines[]` | 1..200 элементов | Программа дегустации |
| `wines[].tastingWineId` | string | id вина в программе, уникален в пределах `wines` |
| `wines[].position` | int ≥ 1 | Номер «Вино №N» |
| `wines[].wineId` | string | id вина в общем каталоге. По нему оценка привязывается к вину в рейтинге |
| `wines[].name` | string, 1..160 | Название |
| `wines[].producer`, `region`, `country`, `grape` | string \| null | Справочные поля, до 120 символов |
| `wines[].vintage` | int \| null | Год урожая |
| `wines[].color` | `red` \| `white` \| `rose` \| `sparkling` \| `orange` \| `fortified` \| null | Цвет |
| `ratings[]` | 0..20 000 элементов | Оценки, отсортированы по позиции вина, затем по `guestHash` |
| `ratings[].guestHash` | 32 hex-символа | Анонимный id гостя: `sha256(EXPORT_SALT + guestId)`, первые 32 символа. Без соли по нему нельзя узнать гостя |
| `ratings[].tastingWineId` | string | Ссылка на элемент `wines[]` |
| `ratings[].value` | number | Исходная оценка в шкале дегустации |
| `ratings[].scale` | `points100` \| `stars5` \| `points10` | Шкала, по которой поставлена оценка (совпадает с `source.scale.id`). С версии 1.1 |
| `ratings[].normalized100` | number | Оценка, приведённая к 0..100: `(value − min) / (max − min) × 100`, один знак после запятой |
| `ratings[].normalized5` | number | Оценка, приведённая к 1..5: `1 + 4 × (value − min) / (max − min)`, один знак. Для `stars5` совпадает с `value`. С версии 1.1 |
| `stats.totalRatings` | int | Сколько всего оценок было в дегустации |
| `stats.exportedRatings` | int | Сколько оценок в `ratings`. Должно совпадать с `ratings.length` |
| `stats.rejected[]` | `{ reason, count }` | Какие оценки конструктор отсеял до отправки и почему |

В экспорт **никогда** не попадают имена гостей, их заметки, cookie-токены и `adminKey`. Время выгрузки и статус
дегустации в экспорт тоже не входят: благодаря этому выгрузки до и после публикации совпадают байт в байт.

## Правила валидности

### Экспорт (конструктор)

- Экспорт доступен, только когда дегустация в статусе `closed` или `published` (иначе 409 `NOT_CLOSED`). После
  закрытия новых оценок нет. Организатор может удалить гостя или оценку, но только до публикации итогов и до
  первой передачи в рейтинг, поэтому после передачи повторные выгрузки дают одинаковые данные.
- Оценка попадает в `ratings`, если:
  - шкала, сохранённая вместе с оценкой, совпадает со шкалой дегустации, иначе `SCALE_MISMATCH`;
  - значение лежит в диапазоне шкалы и кратно её шагу, иначе `VALUE_OUT_OF_SCALE`;
  - вино оценили не меньше гостей, чем задано в настройке «Минимум гостей» (`Tasting.minGuests`, по умолчанию 0),
    иначе все оценки этого вина отсеиваются с `BELOW_MIN_GUESTS`.
- Защита от двойного голоса работает раньше, при голосовании: UNIQUE(guestId, tastingWineId), так что одна
  оценка гостя на вино гарантирована ещё до экспорта. Отказы при голосовании (вне диапазона, после закрытия,
  дубль, вино не в программе) пишутся в журнал `RejectedRating` и видны организатору в «Итогах».

### Импорт (рейтинг): ошибки структуры, весь экспорт отклоняется с 400

| Код | Когда |
|---|---|
| `INVALID_JSON` | Тело не является JSON |
| `VALIDATION` | Нарушена схема: нет поля, неверный тип, неизвестная версия или система, неверный формат `exportId` или `guestHash`, нет `closedAt`. В `message` указано поле |
| `SCALE_MISMATCH` | `source.scale.min`, `max` или `step` не совпадают с эталоном для `source.scale.id` |
| `STATS_MISMATCH` | `stats.exportedRatings ≠ ratings.length` |
| `DUPLICATE_WINE` | В `wines` повторяется `tastingWineId` |

### Импорт (рейтинг): ошибки отдельных оценок

Такая оценка отклоняется, остальные оценки экспорта принимаются. Проверки идут в этом порядке:

| Причина (`reasons[].reason`) | Когда |
|---|---|
| `UNKNOWN_TASTING_WINE` | `tastingWineId` оценки нет в `wines[]` |
| `UNKNOWN_WINE` | `wineId` нет в каталоге рейтинга |
| `SCALE_MISMATCH` | `ratings[].scale` (если передан) не совпадает с `source.scale.id` |
| `VALUE_OUT_OF_SCALE` | `value` вне диапазона шкалы или не кратно шагу |
| `NORMALIZATION_MISMATCH` | `normalized100` или `normalized5` (если передан) расходится с пересчётом больше чем на 0,05 |
| `DUPLICATE_IN_EXPORT` | Тот же гость (`guestHash`) повторно оценил то же вино в одном экспорте |
| `ALREADY_IMPORTED` | Оценка этого гостя этому вину из этой дегустации уже есть в рейтинге (пришла с другим `exportId`) |

Рейтинг сохраняет **свой** пересчёт `normalized100`, а не присланное число. Нормализация одна на всю систему:
`normalize100` и `normalize5` в [`lib/scales.ts`](../lib/scales.ts).

### Идемпотентность

- Первый импорт `exportId` сохраняет оценки и отчёт в одной транзакции.
- Повтор того же `exportId` с тем же телом ничего не пишет и возвращает сохранённый отчёт с кодом **200** и
  `repeated: true`. Тела сравниваются по `sha256` канонического JSON (с отсортированными ключами).
- Тот же `exportId` с другим телом — это **409 `EXPORT_ID_CONFLICT`**.
- Если два одинаковых импорта пришли одновременно, первый сохраняет данные, а второй получает его отчёт.
- Второй рубеж против дублей: UNIQUE(sourceTastingId, guestHash, wineId) в таблице рейтинга. Если та же
  дегустация придёт с другим `exportId` (например, в новой версии формата), уже принятые оценки отклоняются
  как `ALREADY_IMPORTED`.

## Ответ `ImportResultDTO`

| Поле | Тип | Описание |
|---|---|---|
| `exportId` | string | Из запроса |
| `accepted` | int | Сколько оценок принято |
| `rejected` | int | Сколько оценок отклонено |
| `reasons[]` | `{ reason, count }` | Причины отклонения, отсортированы по коду |
| `repeated` | boolean | `true`: этот `exportId` уже импортировался, возвращён сохранённый отчёт |

## Примеры

### Запрос

```http
POST /api/rating/import
Content-Type: application/json
```

```json
{
  "schemaVersion": "1.1",
  "exportId": "exp_320d09dd4e4af6e10137d12d24f689a4",
  "source": {
    "system": "wine-tasting-constructor",
    "tastingId": "cmvr4x4mi000pofa0kb7iqizq",
    "title": "Чеклист: слепая",
    "mode": "blind",
    "closedAt": "2026-10-27T20:25:28.748Z",
    "scale": { "id": "stars5", "min": 1, "max": 5, "step": 1 }
  },
  "wines": [
    {
      "tastingWineId": "cmvr4x68i000rofa0zz1r5r82",
      "position": 1,
      "wineId": "cmvr4t2n20000oflkp0o31yvl",
      "name": "Абрау-Дюрсо Брют",
      "producer": "Абрау-Дюрсо",
      "vintage": null,
      "region": "Краснодарский край",
      "country": "Россия",
      "grape": null,
      "color": "sparkling"
    },
    {
      "tastingWineId": "cmvr4x6cu000tofa0zidz8q2m",
      "position": 2,
      "wineId": "cmvr4t2o40003oflkbfdehwlc",
      "name": "Cloudy Bay Sauvignon Blanc",
      "producer": "Cloudy Bay",
      "vintage": null,
      "region": "Мальборо",
      "country": "Новая Зеландия",
      "grape": "Совиньон блан",
      "color": "white"
    }
  ],
  "ratings": [
    { "guestHash": "269b9431d09ada914cb014eee6ac4005", "tastingWineId": "cmvr4x68i000rofa0zz1r5r82", "value": 4, "scale": "stars5", "normalized100": 75, "normalized5": 4 },
    { "guestHash": "8b8f9f8199efb6be6401425fa8f2ddcd", "tastingWineId": "cmvr4x68i000rofa0zz1r5r82", "value": 5, "scale": "stars5", "normalized100": 100, "normalized5": 5 },
    { "guestHash": "aca1d4b4a96394a318d9a244e5102af6", "tastingWineId": "cmvr4x68i000rofa0zz1r5r82", "value": 3, "scale": "stars5", "normalized100": 50, "normalized5": 3 }
  ],
  "stats": { "totalRatings": 3, "exportedRatings": 3, "rejected": [] }
}
```

### Ответ: первый импорт, `201 Created`

```json
{ "exportId": "exp_320d09dd4e4af6e10137d12d24f689a4", "accepted": 3, "rejected": 0, "reasons": [], "repeated": false }
```

### Ответ: повтор того же тела, `200 OK`

```json
{ "exportId": "exp_320d09dd4e4af6e10137d12d24f689a4", "accepted": 3, "rejected": 0, "reasons": [], "repeated": true }
```

### Ответ: часть оценок отклонена, `201 Created`

```json
{
  "exportId": "exp_7c1f0a9e2b4d4e8f9a0b1c2d3e4f5a6b",
  "accepted": 1,
  "rejected": 2,
  "reasons": [
    { "reason": "NORMALIZATION_MISMATCH", "count": 1 },
    { "reason": "UNKNOWN_TASTING_WINE", "count": 1 }
  ],
  "repeated": false
}
```

### Ошибки

Формат ошибки во всём API один: `{ "error": { "code": "…", "message": "…" } }`.

```jsonc
// 409: тот же exportId, другое тело
{ "error": { "code": "EXPORT_ID_CONFLICT", "message": "Этот exportId уже импортирован с другим содержимым" } }

// 400: неизвестная версия
{ "error": { "code": "VALIDATION", "message": "schemaVersion: поддерживаются schemaVersion \"1.0\", \"1.1\"" } }

// 409: экспорт до завершения дегустации (GET /api/org/{adminKey}/export)
{ "error": { "code": "NOT_CLOSED", "message": "Передать оценки в рейтинг можно после завершения дегустации" } }
```

## Коды ответов

| HTTP | Код | Эндпоинт | Значение |
|---|---|---|---|
| 200 | — | export, import, rating | Успех. Для import: повтор `exportId`, возвращён сохранённый отчёт |
| 201 | — | import | Экспорт принят впервые (в том числе если все оценки отклонены) |
| 400 | `INVALID_JSON`, `VALIDATION`, `SCALE_MISMATCH`, `STATS_MISMATCH`, `DUPLICATE_WINE` | import | Ошибка структуры, ничего не сохранено |
| 404 | `NOT_FOUND` | export | Неверный `adminKey` |
| 409 | `NOT_CLOSED` | export | Дегустация ещё не завершена |
| 409 | `EXPORT_ID_CONFLICT` | import | `exportId` уже импортирован с другим телом |
| 409 | `IMPORT_IN_PROGRESS` | import | Параллельный импорт конфликтует по оценкам. Повторите запрос |
| 500 | `EXPORT_SALT_MISSING` | export | На сервере не задан `EXPORT_SALT` |
| 500 | `INTERNAL` | все | Непредвиденная ошибка |

## Публичный рейтинг (`GET /api/rating`, страница `/rating`)

Для каждого вина: `avg100` (среднее сохранённых `normalized100`, один знак), `ratingsCount` и `tastingsCount`
(сколько дегустаций дали оценки). Место получают только вина, у которых не меньше `MIN_RATINGS_FOR_RATING`
оценок (константа в [`lib/constants.ts`](../lib/constants.ts), по умолчанию 3). Остальные идут в конце с `place: null`,
на странице у них плашка «Мало оценок». Вина с местом упорядочены по `avg100`. При равном балле вина делят одно место
(«1, 1, 3»), выше стоит вино с большим числом оценок. Демо-вина из seed отмечены `isDemo: true`, на странице
у них плашка «демо».

Сводка дегустации считает средний балл по сырым значениям и нормализует его один раз, а рейтинг усредняет
округлённые `normalized100`. Поэтому эти два числа могут расходиться не больше чем на 0,1.

## Ограничения и планы

- **Авторизации у импорта нет**: эндпоинт принимает любой корректный экспорт. В продакшене нужен
  ключ источника или подпись тела (например, HMAC), иначе в рейтинг можно отправить подделку.
- Рейтинг и конструктор работают с одной БД, поэтому вино сопоставляется по `wineId`. Внешнему рейтингу
  понадобится сопоставление по названию, производителю и году.
- Если сменить `EXPORT_SALT`, у тех же гостей получатся другие `guestHash`. Повторный экспорт уже переданной
  дегустации тогда получит 409 `EXPORT_ID_CONFLICT`, поэтому соль задаётся один раз.
