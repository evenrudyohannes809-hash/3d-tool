# 3D.Tools

Сборник веб-утилит для 3D-печатников. Всё работает локально в браузере,
без регистрации и загрузки на сервер.

## Что есть

- **Калькулятор себестоимости 3D-печати** — считает цену и расход пластика,
  парсит `.3mf` и `.gcode` (Bambu, Orca, Prusa, Cura, Creality, Anycubic),
  мультицвет AMS, свои принтеры, режим "Проект".
- Страницы-заглушки для будущих утилит (STL Viewer, STL Repair, G-code
  Viewer, генератор коробок, литофан, база филаментов, матрица проблем
  печати, учёт катушек).

## Стек

- React 19 + TypeScript 6
- Vite 8
- Tailwind CSS 3 (soft-UI дизайн)
- React Router 7
- JSZip (парсинг `.3mf`)
- Shallow pre-render через `scripts/prerender.mjs` — каждый роут получает
  свой HTML с корректными `<title>` / `<meta description>` / Open Graph.

## Разработка

```bash
npm install
npm run dev      # dev-сервер на http://localhost:5173
npm run build    # tsc + vite build + prerender
npm run preview  # локальный просмотр собранного dist/
npm run lint     # eslint
```

## Как добавить новую утилиту

1. Добавить запись в `src/lib/routes.ts` (массив `TOOLS`) с уникальным
   `slug`, `path`, `title`, `description`. Это и карточка на главной, и
   мета-теги страницы.
2. Если для утилиты уже готов интерфейс — добавить `<Route>` в
   `src/main.tsx` и компонент-страницу в `src/pages/<utility>/`. Иначе
   она автоматически рендерится как placeholder через `ToolPlaceholder`.
3. Добавить иконку и цвет в массив `tools` в `src/pages/Home.tsx` (тут
   иконки — JSX, поэтому это отдельный список).
4. Запустить `npm run build` — prerender автоматически сгенерирует HTML
   для нового роута.

## SEO

- **Per-page мета-теги**: каждый роут получает свой HTML файл в сборке
  (`dist/tool/<slug>/index.html`) через `scripts/prerender.mjs`. При
  деплое настрой сервер (Vercel / Netlify / nginx) отдавать эти файлы
  по соответствующим путям, а `dist/404.html` — для неизвестных.
- **Верификация Google Search Console / Яндекс Вебмастер**: в
  `index.html` сейчас стоят placeholder'ы
  (`REPLACE_WITH_GOOGLE_VERIFICATION_CODE` и
  `REPLACE_WITH_YANDEX_VERIFICATION_CODE`). Замени их реальными кодами
  после подтверждения сайта в панелях.
- **Canonical URL**: prerender подставляет `https://3d.tools` как
  базовый URL. Если деплой на другой домен — выставь `SITE_URL` перед
  сборкой (`SITE_URL=https://example.com npm run build`) или обнови
  `SITE.url` в `src/lib/routes.ts`.

## Структура

```
src/
  lib/
    routes.ts        — единый реестр роутов (title, description, slug)
    usePageMeta.ts   — хук для client-side обновления <head>
    calc/            — логика калькулятора (формулы, парсер файлов, LS)
    theme.tsx        — тёмная/светлая тема
  pages/
    Home.tsx         — главная с карточками утилит
    NotFound.tsx
    ToolPlaceholder.tsx  — заглушка для утилит "в разработке"
    calculator/      — React-компоненты калькулятора
  components/
    Layout.tsx, Header.tsx, Footer.tsx
scripts/
  prerender.mjs      — пост-билд: HTML на каждый роут с мета-тегами
```
