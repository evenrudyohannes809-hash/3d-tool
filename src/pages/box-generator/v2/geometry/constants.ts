// Стандарт Gridfinity (все размеры в миллиметрах).
// Источники: официальная спека https://gridfinity.xyz/specification/,
// а также эталонные порты kennetek/gridfinity-rebuilt-openscad,
// michaelgale/cq-gridfinity. Эти значения — факты-константы
// стандарта и не являются чьим-то кодом.

// ── Шаг сетки ──
export const GRID = 42; // 42×42мм одна клетка
export const HEIGHT_UNIT = 7; // шаг высоты бокса

// ── База одной клетки (3-уровневый профиль) ──
// Каждая клетка сидит на сетке 42×42, но сама база меньше на 0.5мм
// (зазор между соседними бинами в baseplate).
export const BASE_TOP = 41.5; // ширина/глубина верха базы (там где стенки)
export const BASE_FOOT = 35.6; // ширина/глубина низа базы (контакт с полом)
export const BASE_OUTER_R = 4; // радиус скругления на уровне верха (42 − 8)/2 ≈ 4
export const BASE_FOOT_R = 1.6; // радиус скругления на уровне низа

// Точки профиля БАЗЫ в радиально-вертикальном сечении (x=наружу, y=вверх).
// См. gridfinity-спеку: низ 0.8мм скос → 1.8мм вертикаль → 2.15мм скос до верха.
export const BASE_PROFILE = [
  [0, 0],
  [0.8, 0.8],      // низ: скос наружу (0..0.8мм по высоте, 0..0.8мм наружу)
  [0.8, 2.6],      // вертикаль (0.8..2.6мм по высоте)
  [2.95, 4.75],    // верхний скос (2.6..4.75мм по высоте, 0.8..2.95мм наружу)
] as const;

// Полная высота базы (профиль + "мост" до 7мм).
export const BASE_PROFILE_H = 4.75;
export const BASE_HEIGHT = 7;
export const BASE_BRIDGE_H = BASE_HEIGHT - BASE_PROFILE_H; // 2.25

// Lite-база — тонкая плита без профиля и магнитов.
export const LITE_BASE_HEIGHT = 1.8;

// ── Stacking lip (стыковочный бортик) ──
// Точки профиля LIP в радиально-вертикальном сечении (x=внутрь от верха стенки, y=вверх).
// 5-точечный профиль — тот же что у gridfinitygenerator.com.
export const LIP_PROFILE = [
  [0, 0],
  [0, 4.4],        // вверх на 4.4мм
  [2.15, 2.25],    // наклон внутрь (4.4→2.25мм по высоте, 0→2.15мм внутрь)
  [2.15, 0.7],     // вертикаль внутри (2.25→0.7мм по высоте)
  [2.85, 0],       // скос наружу к основанию (0.7→0мм, 2.15→2.85мм внутрь)
] as const;

export const LIP_HEIGHT = 4.4;
export const LIP_THIN_HEIGHT = 1.6;

// ── Внутренняя геометрия ──
export const INNER_FILLET_R = 2.5; // скругление углов полости
export const DEFAULT_WALL_THICKNESS = 1.2;
export const DEFAULT_INNER_WALL_THICKNESS = 1.2;

// ── Магниты / винты ──
export const DEFAULT_MAGNET_DIAMETER = 6.5;
export const DEFAULT_MAGNET_DEPTH = 2.4;
export const SCREW_DIAMETER = 3;
export const HOLE_FROM_SIDE = 8; // центр отверстия от бока клетки

// ── Визуальное ──
export const EDGE_COLOR = "#0f1c2c";
export const EDGE_THRESHOLD_DEG = 20; // угол, начиная с которого рисуется edge
export const MATERIAL_COLOR_LIGHT = "#6da9d9"; // фирменный голубой
export const MATERIAL_COLOR_DARK = "#8fb8d9";

// ── Сегменты скруглений (тесселяция) ──
export const CORNER_SEGMENTS = 12; // сегментов на 90°-дугу угла
export const CIRCLE_SEGMENTS = 32; // для отверстий
