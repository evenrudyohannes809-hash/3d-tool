// Единый источник правды о всех маршрутах сайта.
// Используется: Home.tsx (список карточек), ToolPlaceholder.tsx
// (заглушки), scripts/prerender.mjs (генерация статических HTML с мета-тегами).

export type Tag = "Готово" | "Скоро" | "В разработке";

export type RouteMeta = {
  path: string; // URL path, e.g. "/tool/calculator" или "/"
  title: string; // полный <title> в HTML (чтобы поисковик показал его в выдаче)
  description: string; // <meta name="description">
  ogImage?: string; // Open Graph — по умолчанию общая картинка сайта
};

export type ToolRoute = RouteMeta & {
  slug: string; // без ведущего /tool/
  cardTitle: string; // короткое название на карточке главной
  cardDescription: string; // текст под карточкой
  tag: Tag;
  category: string;
  tint: "blue" | "teal" | "pink" | "orange";
};

const SITE_NAME = "3D.Tools";
const SITE_TAGLINE = "утилиты для 3D-печатников";

export const SITE = {
  name: SITE_NAME,
  tagline: SITE_TAGLINE,
  url: "https://3d.tools",
  defaultOgImage: "/og-default.png",
};

export const HOME_META: RouteMeta = {
  path: "/",
  title: `${SITE_NAME} — ${SITE_TAGLINE}`,
  description:
    "Утилиты для 3D-печатников: калькулятор себестоимости, анализ STL, " +
    "генераторы моделей, калибровочные g-code, справочник по филаментам. " +
    "Всё работает локально в браузере, без регистрации.",
};

export const NOT_FOUND_META: RouteMeta = {
  path: "*",
  title: `404 — страница не найдена — ${SITE_NAME}`,
  description:
    "Такой страницы нет. Возможно, утилита ещё в разработке — посмотри список " +
    "на главной.",
};

export const TOOLS: ToolRoute[] = [
  {
    slug: "calculator",
    path: "/tool/calculator",
    title: "Калькулятор себестоимости 3D-печати — считает цену и расход пластика",
    description:
      "Считает себестоимость и цену 3D-печати: вес, пластик, электричество, " +
      "износ, брак, упаковка. Анализирует .3mf и .gcode (Bambu, Orca, Prusa, " +
      "Cura, Creality, Anycubic), поддерживает мультицвет AMS и свои принтеры.",
    cardTitle: "Калькулятор себестоимости",
    cardDescription:
      "Считает себестоимость и цену печати, анализирует .3mf и .gcode, " +
      "мультицвет AMS, все популярные принтеры.",
    tag: "Готово",
    category: "Бизнес",
    tint: "blue",
  },
  {
    slug: "box-generator",
    path: "/tool/box-generator",
    title: "Генератор коробок STL — Gridfinity-совместимые бины и обычные коробки",
    description:
      "Параметрический генератор коробок для 3D-печати: Gridfinity-bin по " +
      "стандарту 42мм и обычные коробки со скруглёнными углами. 3D-просмотр " +
      "в браузере и экспорт в STL одним кликом.",
    cardTitle: "Генератор коробок",
    cardDescription:
      "Gridfinity-совместимые bin'ы и обычные коробки со скруглением. " +
      "3D-просмотр и экспорт STL в браузере.",
    tag: "Готово",
    category: "Генераторы",
    tint: "teal",
  },
  {
    slug: "stl-viewer",
    path: "/tool/stl-viewer",
    title: "STL Viewer онлайн — просмотр, объём, вес модели",
    description:
      "Загружаешь STL, смотришь 3D-модель в браузере, узнаёшь объём, вес под " +
      "выбранный пластик, габариты, центр масс и количество треугольников.",
    cardTitle: "STL Viewer + Info",
    cardDescription:
      "Просмотр STL, объём, вес под пластик, габариты, центр масс, " +
      "количество треугольников.",
    tag: "Скоро",
    category: "Анализ",
    tint: "pink",
  },
  {
    slug: "stl-repair",
    path: "/tool/stl-repair",
    title: "STL Repair онлайн — починка дыр, нормалей и мусора в меше",
    description:
      "Автоматически закрываем дыры в 3D-модели, переворачиваем нормали " +
      "наружу, удаляем плавающий мусор. Скачиваешь починенный STL-файл.",
    cardTitle: "STL Repair",
    cardDescription:
      "Закрывает дыры в меше, переворачивает нормали, удаляет плавающий " +
      "мусор. Скачиваешь починенный файл.",
    tag: "Скоро",
    category: "Анализ",
    tint: "orange",
  },
  {
    slug: "gcode-viewer",
    path: "/tool/gcode-viewer",
    title: "G-code Viewer онлайн — покадровый просмотр слоёв и скоростей",
    description:
      "Покадровый просмотр слоёв G-code в браузере, график скоростей, " +
      "суммарное время печати и расход филамента — без установленного " +
      "слайсера.",
    cardTitle: "G-code Viewer",
    cardDescription:
      "Покадровый просмотр слоёв, скорости, суммарное время и расход " +
      "филамента. Без установленного слайсера.",
    tag: "Скоро",
    category: "Анализ",
    tint: "blue",
  },
  {
    slug: "tower-generator",
    path: "/tool/tower-generator",
    title: "Генератор калибровочных башен — temp / retract / flow tower",
    description:
      "Temp tower, retract tower, flow tower под твой 3D-принтер, сопло и " +
      "материал. Готовый .gcode одним кликом для калибровки печати.",
    cardTitle: "Tower генератор",
    cardDescription:
      "Temp tower, retract tower, flow tower под твой принтер и материал. " +
      "Готовый .gcode одним кликом.",
    tag: "Скоро",
    category: "Генераторы",
    tint: "teal",
  },
  {
    slug: "lithophane",
    path: "/tool/lithophane",
    title: "Литофан из фото — генератор STL пластинок для 3D-печати",
    description:
      "Загрузил фото, настроил толщину и контраст — получил STL-пластинку. " +
      "Светишь сзади — получается светящееся изображение.",
    cardTitle: "Литофан",
    cardDescription:
      "Из фото — STL-пластинка. Светишь сзади — светящееся изображение.",
    tag: "Скоро",
    category: "Генераторы",
    tint: "pink",
  },
  {
    slug: "filaments",
    path: "/tool/filaments",
    title: "База филаментов для 3D-печати — температуры, скорости, цены",
    description:
      "Температуры экструдера и стола, усадка, плотность, типовые скорости " +
      "и цены по брендам: PLA, PETG, ABS, TPU, ASA, PC.",
    cardTitle: "База филаментов",
    cardDescription:
      "Температуры, усадка, плотность, скорости и цены по брендам: PLA, " +
      "PETG, ABS, TPU, ASA, PC.",
    tag: "Скоро",
    category: "Справочники",
    tint: "orange",
  },
  {
    slug: "problems",
    path: "/tool/problems",
    title: "Матрица проблем 3D-печати — стрингинг, отклейка, сдвиг слоёв",
    description:
      "Интерактивный разбор типовых проблем 3D-печати: стрингинг, сдвиг " +
      "слоёв, отклейка, недоэкструзия, плохая адгезия. Нажал симптом — " +
      "получил чек-лист решений.",
    cardTitle: "Матрица проблем печати",
    cardDescription:
      "Интерактивный разбор: стрингинг, сдвиг слоёв, отклейка, " +
      "недоэкструзия. Нажал симптом — получил чек-лист.",
    tag: "Скоро",
    category: "Справочники",
    tint: "blue",
  },
  {
    slug: "spool-tracker",
    path: "/tool/spool-tracker",
    title: "Учёт катушек 3D-пластика — остатки, себестоимость, прогноз",
    description:
      "Добавил катушку — каждый 3D-заказ списывает граммы. Остаток, " +
      "себестоимость, прогноз когда кончится. Работает локально в браузере.",
    cardTitle: "Учёт катушек",
    cardDescription:
      "Учёт остатков пластика, списание по заказам, себестоимость, " +
      "прогноз расхода.",
    tag: "Скоро",
    category: "Бизнес",
    tint: "teal",
  },
];

export const EXTRA_ROUTES: RouteMeta[] = [
  {
    path: "/blog",
    title: "Блог 3D.Tools — статьи по 3D-печати",
    description:
      "Статьи по настройке 3D-принтеров, обзоры филаментов, разборы проектов " +
      "и полезные советы для печатников.",
  },
  {
    path: "/favorites",
    title: "Избранное — 3D.Tools",
    description:
      "Сохранённые утилиты, чтобы быстро возвращаться к нужным инструментам.",
  },
];

// Быстрый lookup по path (без ведущего/хвостового слеша).
export function getMetaByPath(p: string): RouteMeta {
  const norm = p.replace(/\/+$/, "") || "/";
  if (norm === "/") return HOME_META;
  for (const r of TOOLS) if (r.path === norm) return r;
  for (const r of EXTRA_ROUTES) if (r.path === norm) return r;
  return NOT_FOUND_META;
}
