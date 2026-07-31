# 🧭 Меридианы — атлас великих экспедиций

> Интерактивная карта маршрутов великих мореплавателей, торговцев и исследователей — от заселения Сахула 50 000 лет до н.э. до одиночных переходов XXI века.

[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)](Dockerfile)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![Yandex Maps](https://img.shields.io/badge/Yandex%20Maps-2.1-FF0000?logo=yandex&logoColor=white)](https://yandex.ru/dev/maps/jsapi/)

---

## 📖 О проекте

«Меридианы» — это интерактивный атлас, на котором можно увидеть исторические маршруты путешественников разных эпох. От древнейших морских переходов первых людей в Австралию до одиночных весельных переходов через Тихий океан в XXI веке.

В базе данных — **29 путешественников** и **31 экспедиция** с **317 ключевыми точками** маршрутов:

| Эпоха | Экспедиции |
|-------|-----------|
| **Древность** (до 1000 г. н.э.) | Заселение Сахула, полинезийская экспансия, скифы, Пифей, Шёлковый путь, Ибн Фадлан, викинги |
| **Средние века** (1000–1400) | Чжэн Хэ (Флот Сокровищ) |
| **Век паруса** (1400–1850) | Диаш, Колумб, Васко да Гама, Кабрал, Магеллан, Кук (3 плавания), Лаперуз, Крузенштерн, Беллинсгаузен |
| **XIX–XX века** (1850–1950) | Амундсен, Льюис и Кларк, Гумбольдт, Ливингстон, Стэнли, Пржевальский, Свен Хедин, Нобиле, Хейердал, чайный путь |
| **Современность** (после 1950) | Конюхов (чилийско-австралийский переход на вёслах) |

---

## ✨ Возможности

- 🗺️ **Интерактивная карта Яндекс.Карт 2.1** — тайлы подгружаются с Яндекс CDN
- 📊 **Маршруты рисуются плавными кривыми** через все ключевые точки — используется центрипетальный сплайн Катмулла-Рома
- 🌐 **Корректное пересечение 180° меридиана** — линии не «прыгают» через весь земной шар (например, маршрут Кука из Новой Зеландии в Таити идёт через Тихий океан, а не через Атлантический)
- 🎯 **Выбор экспедиции фокусирует карту** — линии и точки остальных скрываются
- ⏳ **Хронологический таймлайн** внизу с эпохами и точками экспедиций (логарифмическая шкала от 50 000 до н.э. до наших дней)
- 🔍 **Фильтры** по эпохе (5 чипов) и по типу маршрута (морские / сухопутные / смешанные / воздушные)
- 🔎 **Поиск** по названию экспедиции или имени путешественника
- 📱 **Адаптивный дизайн** с drawer-меню на мобильных
- 📋 **Подробная карточка экспедиции** с описанием, расстоянием, ключевыми точками и датами
- 🧪 **ИИ-агент** для генерации новых маршрутов через LLM (API endpoint `/api/ai/generate-route`)

---

## 🛠️ Технологии

| Слой | Технология |
|------|-----------|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript 5 |
| **Стилизация** | Tailwind CSS 4 + shadcn/ui (New York style) |
| **Шрифты** | Playfair Display + IBM Plex Sans + IBM Plex Mono (через `next/font/google`) |
| **Карта** | Яндекс.Карты JavaScript API 2.1 |
| **База данных** | SQLite (через Prisma ORM 6) |
| **ИИ-агент** | z-ai-web-dev-sdk (LLM для генерации маршрутов) |
| **Контейнер** | Docker (multi-stage build) |

---

## 🚀 Быстрый старт

### Вариант 1: Docker (рекомендуется)

```bash
# Клонировать репозиторий
git clone https://github.com/<your-username>/meridiany.git
cd meridiany

# Запустить через docker-compose
docker compose up -d --build

# Открыть в браузере
open http://localhost:3000
```

При первом запуске Docker:
1. Создаст SQLite базу в volume `meridiany-db`
2. Применит схему Prisma (`prisma db push`)
3. **Не заполняет данными автоматически** — нужно запустить seed (см. ниже)

#### Заполнить БД историческими маршрутами:

```bash
# Войти в контейнер и запустить seed
docker compose exec app npx tsx scripts/seed.ts

# Или одной командой с хоста
docker compose exec app node -e "require('./scripts/seed.ts')"
```

#### Остановить:

```bash
docker compose down          # остановить контейнеры (данные сохранятся в volume)
docker compose down -v       # удалить контейнеры + volume с БД (полный сброс)
```

### Вариант 2: Локальная разработка

**Требования:** Node.js 18+ и один из пакетных менеджеров: `bun` (рекомендуется), `npm`, или `yarn`.

```bash
# 1. Установить зависимости
bun install                    # или: npm install --legacy-peer-deps

# 2. Настроить окружение
cp .env.example .env

# 3. Создать SQLite базу + применить схему
bun run db:push                # или: npx prisma db push

# 4. Заполнить историческими маршрутами
bun run scripts/seed.ts        # или: npx tsx scripts/seed.ts

# 5. Запустить dev-сервер
bun run dev                    # или: npm run dev
```

Открыть: **http://localhost:3000**

---

## 🐳 Команды Docker

| Команда | Что делает |
|---------|-----------|
| `docker compose up -d --build` | Собрать образ и запустить в фоне |
| `docker compose logs -f app` | Смотреть логи в реальном времени |
| `docker compose restart app` | Перезапустить контейнер |
| `docker compose down` | Остановить контейнеры (БД сохранится) |
| `docker compose down -v` | Остановить + удалить БД |
| `docker compose exec app sh` | Войти в shell контейнера |
| `docker compose exec app npx prisma studio` | Открыть Prisma Studio (GUI для БД) на http://localhost:5555 |

---

## 📦 Сборка production-версии вручную

```bash
# Установить зависимости
bun install

# Создать standalone production-сборку
bun run build

# Запустить production-сервер
bun run start
# или: NODE_ENV=production node .next/standalone/server.js
```

Standalone-сборка создаст самодостаточную папку `.next/standalone/` со всеми нужными зависимостями (≈150 МБ). Можно копировать на сервер и запускать как `node server.js`.

---

## 🗺️ Настройка Яндекс.Карт

API-ключ Яндекс.Карт по умолчанию зашит в коде в `src/components/map/YandexMapView.tsx`:

```typescript
const YANDEX_API_URL =
  'https://api-maps.yandex.ru/2.1/?lang=ru_RU&apikey=a49f8b63-e7ea-47e5-b86a-fd86d778d4dc';
```

### Получить собственный API-ключ (рекомендуется)

1. Зайдите в [Кабинет разработчика Яндекс.Карт](https://developer.tech.yandex.ru/services/)
2. Создайте JavaScript API + HTTP Геокодер
3. В поле «Доверенные домены» укажите ваш домен (например, `localhost`, `example.com`)
4. Скопируйте ключ и замените в `YandexMapView.tsx`

Без привязки к домену ключ выдаёт предупреждение «Invalid API key», но карта продолжает работать (тайлы подгружаются, проектор координат функционален). Полилинии рисуются через SVG-оверлей, поэтому не блокируются dev-режимом.

---

## 🧱 Архитектура проекта

```
src/
├── app/                              # Next.js App Router
│   ├── api/
│   │   ├── explorers/route.ts        # GET /api/explorers
│   │   ├── voyages/route.ts         # GET /api/voyages (с фильтрами)
│   │   ├── voyages/[id]/route.ts     # GET /api/voyages/:id
│   │   └── ai/generate-route/route.ts  # POST /api/ai/generate-route (ИИ-агент)
│   ├── layout.tsx                    # Корневой layout (шрифты, тёмная тема)
│   ├── page.tsx                      # Главная страница (хедер + сайдбар + карта + таймлайн)
│   └── globals.css                   # Стили + переопределения для Яндекс.Карт
│
├── components/
│   ├── map/
│   │   └── YandexMapView.tsx         # Карта Яндекс.Карт + SVG-оверлей для линий
│   └── explorers/
│       ├── Sidebar.tsx               # Сайдбар: фильтры, список, детали
│       ├── VoyageList.tsx            # Список экспедиций
│       ├── VoyageDetail.tsx          # Карточка выбранной экспедиции
│       ├── Timeline.tsx              # Хронологический таймлайн внизу
│       └── AIRouteDialog.tsx         # Диалог ИИ-генерации (не используется в UI)
│
├── lib/
│   ├── db.ts                         # Prisma client (singleton)
│   ├── types.ts                      # TypeScript типы + константы эпох
│   ├── geo.ts                        # Геометрия: сплайн Катмулла-Рома, 180° меридиан
│   └── ymaps.d.ts                    # TypeScript-описание Яндекс.Карт API
│
└── hooks/                            # React hooks (use-toast, use-mobile)

prisma/
└── schema.prisma                     # Схема: Explorer, Voyage, RoutePoint

scripts/
├── seed.ts                           # Главный seed-скрипт
├── seed-sea.ts                       # Морские маршруты
├── seed-land.ts                      # Сухопутные маршруты
└── seed-types.ts                     # Типы для seed-данных

public/                               # Статика (логотип, robots.txt)
```

### Ключевые алгоритмы

**`src/lib/geo.ts`** — вся геометрия маршрутов:

- **`unwrapLng(points)`** — разворачивает долготы в непрерывную ленту (точка после +179° становится +181°, не -179°), чтобы сплайн не «прыгал» через 180° меридиан.
- **`catmullRomPoint(p0, p1, p2, p3, t)`** — центрипетальный сплайн Катмулла-Рома (alpha=0.5), проходит плавно через все точки без забросов на сушу.
- **`smoothPath(points, per=22)`** — строит плотную кривую из точек, интерполируя по 22 точки между каждой парой.
- **`splitDense(path)`** — разрезает плотную кривую по линии перемены дат (180°) на отдельные сегменты для корректной отрисовки.
- **`haversineKm(a, b)`** — расстояние по большому кругу между двумя точками.
- **`buildSmoothedRoute(points)`** — главная функция: возвращает сегменты + общую длину маршрута в км.

### Особенности отрисовки

Яндекс.Карты 2.1 в dev-режиме (без привязки ключа к домену) **блокируют отрисовку `Polyline` на canvas**. Поэтому маршруты рисуются через **SVG-оверлей**:

1. На каждом движении карты (`actiontick`, `actionend`, `boundschange`, `zoomchange`) пересчитываются экранные координаты точек.
2. Координаты конвертируются правильно: `projection.toGlobalPixels([lat, lng], zoom)` → `map.converter.globalToPage(globalPixels)` → вычитаем смещение контейнера.
3. SVG-пути рисуются в `<svg>` слое поверх тайлов карты, но под HTML placemarks.

---

## 🗄️ Схема базы данных

```prisma
model Explorer {
  id          String   @id @default(cuid())
  name        String              // "Магеллан", "Льюис и Кларк"
  who         String?             // "испанская экспедиция", "народы лапита"
  birthYear   Int?
  deathYear   Int?
  nationality String?
  bio         String?
  voyages     Voyage[]
}

model Voyage {
  id          String   @id @default(cuid())
  explorerId  String
  explorer    Explorer @relation(...)
  title       String              // "Первое кругосветное плавание"
  description String?
  startYear   Int?
  endYear   Int?
  era         String              // "Древность", "Век паруса", ...
  type        String?             // "sea" | "land" | "mixed" | "air"
  category    String?             // "Кругосветное плавание", "Торговая", ...
  color       String?             // HEX-цвет линии "#F26B1D"
  routePoints RoutePoint[]
}

model RoutePoint {
  id          String   @id @default(cuid())
  voyageId    String
  voyage      Voyage   @relation(...)
  order       Int                 // 0, 1, 2, ...
  name        String              // "Санлукар-де-Баррамеда"
  description String?
  latitude    Float
  longitude   Float
  arrivalDate String?             // "20 сентября 1519 г."
}
```

---

## 🤖 ИИ-агент для генерации маршрутов

В проекте есть API endpoint `POST /api/ai/generate-route`, который через LLM генерирует структурированный JSON с маршрутом и сохраняет в БД.

**Пример запроса:**
```bash
curl -X POST http://localhost:3000/api/ai/generate-route \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Экспедиция Скотта к Южному полюсу 1911-1912"}'
```

UI-кнопка для ИИ-агента **скрыта** по решению пользователя — нужно сначала продумать ролевую модель. Сам endpoint доступен для будущего использования.

---

## 🔧 API эндпоинты

| Метод | Путь | Описание |
|-------|------|---------|
| `GET` | `/api/explorers` | Список всех путешественников |
| `GET` | `/api/voyages?era=...&type=...&explorerId=...` | Список плаваний с точками маршрутов |
| `GET` | `/api/voyages/:id` | Детали одного плавания |
| `POST` | `/api/ai/generate-route` | Сгенерировать новый маршрут через LLM |

Пример:
```bash
# Все морские маршруты эпохи Великих географических открытий
curl "http://localhost:3000/api/voyages?era=Век%20паруса&type=sea"
```

---

## 🎨 Дизайн-система

| Параметр | Значение |
|---------|---------|
| Фон | `#0B1420` (глубокий тёмно-синий) |
| Панель | `#0F1D2E` |
| Латунь (акцент) | `#D9A441` |
| Пергамент (текст) | `#EDE6D6` |
| Шрифт заголовков | Playfair Display (900) |
| Шрифт тела | IBM Plex Sans (400/500/600) |
| Моноширинный | IBM Plex Mono |

### Цвета маршрутов по эпохам

```javascript
'Древность'                         // '#A9744F' (терракота)
'Средние века'                      // '#4E86C6' (синева манускриптов)
'Век паруса'                        // '#F26B1D' (оранжевый парус)
'XIX–XX века'                       // '#8FA84B' (хаки исследователей)
'Современность'                     // '#E85C90' (неоновый розовый)
```

---

## 📊 Размеры и ресурсы

| Компонент | Размер |
|-----------|--------|
| Production build (standalone) | ~150 МБ |
| SQLite база данных | ~165 КБ |
| Исходный код (src) | ~480 КБ (8 200 строк TS) |
| Память в production | ~150-250 МБ RAM |

**Минимальные требования для деплоя:** VPS с 512 МБ RAM / 5 ГБ диск (или бесплатный tier на Fly.io / Railway).

---

## 🚢 Деплой

### VPS + Docker Compose (проще всего)

```bash
# На сервере:
git clone https://github.com/<your-username>/meridiany.git
cd meridiany
docker compose up -d --build

# Заполнить БД
docker compose exec app npx tsx scripts/seed.ts
```

Настроить nginx reverse-proxy на `http://localhost:3000` + SSL через Certbot.

### Fly.io

```bash
fly launch --no-deploy
fly volumes create meridiany_db --size 1
fly deploy
fly ssh console -C "npx tsx scripts/seed.ts"
```

### Vercel (с оговорками)

⚠️ Vercel использует read-only filesystem — SQLite не будет работать напрямую. Нужно либо:
- Переключиться на [Turso](https://turso.tech/) (SQLite-совместимая БД в облаке)
- Или использовать [Supabase](https://supabase.com/) (PostgreSQL) с изменением `prisma/schema.prisma` провайдера на `postgresql`

---

## 🗺️ Roadmap

- [ ] **Ручное редактирование маршрутов** (после проектирования ролевой модели)
- [ ] **Анимация прохождения маршрута** — бегущий маркер по линии
- [ ] **Экспорт/импорт GPX/KML** для использования во внешних приложениях
- [ ] **Изображения путешественников** (портреты) и кораблей
- [ ] **Многоязычность** (en/es/fr/zh)
- [ ] **Переключение слоёв карты** (спутник, топографический, исторический)

---

## 📜 Лицензия

MIT — свободно используйте, форкайте, модифицируйте.

## 🙏 Благодарности

- [Яндекс.Карты JavaScript API](https://yandex.ru/dev/maps/jsapi/) — движок карты
- [OpenStreetMap](https://www.openstreetmap.org/) — вдохновение для открытых гео-данных
- [Playfair Display](https://fonts.google.com/specimen/Playfair+Display) и [IBM Plex](https://www.ibm.com/plex/) — типографика
- [shadcn/ui](https://ui.shadcn.com/) — UI-компоненты
- Всем историкам и мореплавателям, чьи маршруты вдохновили этот проект

---

**Автор:** Meridiany project
**Год:** 2026
