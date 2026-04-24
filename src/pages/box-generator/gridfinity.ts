import * as THREE from "three";

// ─── Gridfinity constants ────────────────────────────────────────────
// По стандарту Gridfinity (Zack Freedman):
//   - базовая клетка сетки 42×42мм
//   - высотный юнит 7мм
//   - у коробки (bin) снизу "юбка" из трёх уровней, чтобы фиксироваться
//     в базовой плите. Этот же профиль инвертирован наверху (lip), чтобы
//     коробки стыковались друг на друга.

export const GRID = 42; // мм — шаг клетки
export const HEIGHT_UNIT = 7; // мм — шаг высоты коробки (Z units = N → +N*7мм)
export const CLEARANCE = 0.5; // мм — зазор между коробкой и базой по периметру
export const BASE_OUTER_RADIUS = 4; // скругление внешнего контура
export const BASE_INNER_RADIUS = 1.6; // скругление юбки снизу

// Уровни юбки снизу (суммарно ~4.65мм):
export const SKIRT_H_BOTTOM_CHAMFER = 0.8; // нижний скос (сходится к узкой подошве)
export const SKIRT_H_MIDDLE = 1.8; // средняя "вертикальная" часть
export const SKIRT_H_TOP_CHAMFER = 2.15; // верхний скос (расширение к полной ширине)
export const SKIRT_H_TOTAL =
  SKIRT_H_BOTTOM_CHAMFER + SKIRT_H_MIDDLE + SKIRT_H_TOP_CHAMFER; // 4.75мм
export const SKIRT_INSET_TOTAL = 2.15; // на сколько узкая подошва меньше полной ширины

// Пазы для магнитов/винтов размещаются в 4 углах, отстоящих от края на:
export const CORNER_INSET = 8; // центр паза от угла коробки
export const MAGNET_DIAMETER = 6;
export const MAGNET_DEPTH = 2.4;
export const SCREW_HOLE_DIAMETER = 3;

// Верхний стыковочный бортик для стакающихся коробок (default):
export const LIP_HEIGHT_DEFAULT = 4.4;
export const LIP_HEIGHT_THIN = 1.2; // упрощённый низкий lip

export type LipStyle = "default" | "thin" | "none";
export type BaseHoles = "none" | "corner" | "full";

export type GridfinityBinParams = {
  // Размеры коробки в юнитах
  xUnits: number; // например 2
  yUnits: number; // например 2
  zUnits: number; // например 3 (высота = 3 × 7 + служебная высота)
  gridSize?: number; // default 42мм — для нестандартных сеток

  // Стенки
  outerWallThickness: number; // мм (внешняя стенка)
  // Дно у Gridfinity-bin — монолитная верхняя грань юбки (сплошная, по
  // спецификации), отдельно задавать его толщину не нужно.

  // Верхний стыковочный бортик
  lipStyle: LipStyle;

  // Магниты/винты в углах нижней юбки
  magnets: BaseHoles; // none / corner / full
  screwHoles: BaseHoles; // none / corner / full
};

export const DEFAULT_BIN: GridfinityBinParams = {
  xUnits: 2,
  yUnits: 2,
  zUnits: 3,
  gridSize: GRID,
  outerWallThickness: 1.2,
  lipStyle: "default",
  magnets: "none",
  screwHoles: "none",
};

// ─── Построение 2D-формы со скруглёнными углами ───────────────────────
//
// Gridfinity оперирует по x/y квадратами со скруглёнными углами. Эта
// функция возвращает THREE.Shape прямоугольника `w × h`, центрированного
// в начале координат, со скруглением `r`. Опционально добавляет список
// "дырок" (для магнитов / винтов).

type Hole = { cx: number; cy: number; radius: number };

function roundedRectShape(
  w: number,
  h: number,
  r: number,
  holes: Hole[] = [],
): THREE.Shape {
  const x0 = -w / 2;
  const y0 = -h / 2;
  const x1 = w / 2;
  const y1 = h / 2;
  const s = new THREE.Shape();
  s.moveTo(x0 + r, y0);
  s.lineTo(x1 - r, y0);
  s.absarc(x1 - r, y0 + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x1, y1 - r);
  s.absarc(x1 - r, y1 - r, r, 0, Math.PI / 2, false);
  s.lineTo(x0 + r, y1);
  s.absarc(x0 + r, y1 - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x0, y0 + r);
  s.absarc(x0 + r, y0 + r, r, Math.PI, (3 * Math.PI) / 2, false);

  for (const hole of holes) {
    const path = new THREE.Path();
    path.absarc(hole.cx, hole.cy, hole.radius, 0, Math.PI * 2, false);
    s.holes.push(path);
  }
  return s;
}

// ─── Построение меша коробки ──────────────────────────────────────────
//
// Собираем меш коробки стопкой extrude-геометрий:
//   1. Юбка (3 уровня, снизу вверх): chamfer / flat / chamfer.
//   2. Корпус (стенки) — пустой внутри, высота = zUnits × 7.
//   3. Верхний lip (если выбран).
//
// В дно юбки добавляем при необходимости пазы под магниты/винты.

export function buildGridfinityBin(
  params: GridfinityBinParams = DEFAULT_BIN,
): THREE.Group {
  const {
    xUnits,
    yUnits,
    zUnits,
    gridSize = GRID,
    outerWallThickness,
    lipStyle,
    magnets,
    screwHoles,
  } = params;

  const group = new THREE.Group();
  const outerW = xUnits * gridSize - CLEARANCE;
  const outerH = yUnits * gridSize - CLEARANCE;
  const baseW = outerW - SKIRT_INSET_TOTAL * 2; // ширина подошвы (низ юбки)
  const baseH = outerH - SKIRT_INSET_TOTAL * 2;

  // ── Юбка: 3 уровня, каждый — ExtrudeGeometry со скошенными bevel'ами ──

  // Для правильного chamfer используем bevelEnabled у каждого уровня, но
  // bevelSize = (full - base) / 2 и bevelThickness = height. Проще — собрать
  // уровни как отдельные блоки.
  //
  // Уровень 1 (bottom chamfer): от baseW до полной подошвы (чуть >baseW) —
  //   фактически коническая часть, которая расширяется от "узкого низа"
  //   до "среднего". Для простоты рендерим её как flat (без bevel) от
  //   baseW к baseW + chamfer*2 по низу, а расширение делаем через bevel.
  //
  // Для V1 собираем юбку из простых экструдов с bevelEnabled:

  const cornerHoles: Hole[] = [];
  if (magnets !== "none") {
    for (const p of cornerCenters(xUnits, yUnits, gridSize, magnets)) {
      cornerHoles.push({
        cx: p.x - outerW / 2,
        cy: p.y - outerH / 2,
        radius: MAGNET_DIAMETER / 2,
      });
    }
  }
  const screwHolesArr: Hole[] = [];
  if (screwHoles !== "none") {
    for (const p of cornerCenters(xUnits, yUnits, gridSize, screwHoles)) {
      screwHolesArr.push({
        cx: p.x - outerW / 2,
        cy: p.y - outerH / 2,
        radius: SCREW_HOLE_DIAMETER / 2,
      });
    }
  }

  // 1a) Нижний chamfer (от узкой подошвы к средней секции) —
  //     экструдим форму "подошвы" с bevelEnabled.
  const bottomChamfer = extrudeChamfer({
    bottomW: baseW,
    bottomH: baseH,
    topW: baseW + SKIRT_H_BOTTOM_CHAMFER * 2,
    topH: baseH + SKIRT_H_BOTTOM_CHAMFER * 2,
    height: SKIRT_H_BOTTOM_CHAMFER,
    bottomRadius: BASE_INNER_RADIUS,
    // На самом нижнем уровне вырезаем магниты (углы).
    holes: magnets !== "none" ? cornerHoles : [],
    screwHoles: screwHolesArr, // винты насквозь
  });
  bottomChamfer.position.y = 0;
  group.add(bottomChamfer);

  // 1b) Средняя вертикальная секция
  const midBottom = baseW + SKIRT_H_BOTTOM_CHAMFER * 2;
  const midBottomH = baseH + SKIRT_H_BOTTOM_CHAMFER * 2;
  const midShape = roundedRectShape(
    midBottom,
    midBottomH,
    BASE_INNER_RADIUS + SKIRT_H_BOTTOM_CHAMFER,
    screwHolesArr, // винты продолжаются
  );
  const midGeom = new THREE.ExtrudeGeometry(midShape, {
    depth: SKIRT_H_MIDDLE,
    bevelEnabled: false,
    steps: 1,
    curveSegments: 16,
  });
  midGeom.rotateX(-Math.PI / 2);
  const midMesh = new THREE.Mesh(midGeom);
  midMesh.position.y = SKIRT_H_BOTTOM_CHAMFER + SKIRT_H_MIDDLE;
  group.add(midMesh);

  // 1c) Верхний chamfer (расширение от средней к полной ширине коробки)
  const topChamfer = extrudeChamfer({
    bottomW: midBottom,
    bottomH: midBottomH,
    topW: outerW,
    topH: outerH,
    height: SKIRT_H_TOP_CHAMFER,
    bottomRadius: BASE_INNER_RADIUS + SKIRT_H_BOTTOM_CHAMFER,
    holes: [],
    screwHoles: screwHolesArr,
  });
  topChamfer.position.y =
    SKIRT_H_BOTTOM_CHAMFER + SKIRT_H_MIDDLE + SKIRT_H_TOP_CHAMFER;
  group.add(topChamfer);

  // ── 2) Корпус (walls + дно) ──
  // Внешний контур — полная ширина коробки, скругление BASE_OUTER_RADIUS.
  // Внутри делаем "дыру" со сдвигом на outerWallThickness для пустоты,
  // а дно добавляем отдельным тонким слоем (чтобы bin не был сквозным).

  const bodyHeight = zUnits * HEIGHT_UNIT;
  const innerW = outerW - outerWallThickness * 2;
  const innerH = outerH - outerWallThickness * 2;
  const outerShape = roundedRectShape(outerW, outerH, BASE_OUTER_RADIUS);
  const innerPath = rectPathWithRadius(
    innerW,
    innerH,
    Math.max(1, BASE_OUTER_RADIUS - outerWallThickness),
  );
  outerShape.holes.push(innerPath);
  const wallsGeom = new THREE.ExtrudeGeometry(outerShape, {
    depth: bodyHeight,
    bevelEnabled: false,
    steps: 1,
    curveSegments: 16,
  });
  wallsGeom.rotateX(-Math.PI / 2);
  const wallsMesh = new THREE.Mesh(wallsGeom);
  wallsMesh.position.y = SKIRT_H_TOTAL;
  group.add(wallsMesh);

  // Дно бина — это монолитная верхняя грань юбки (она сплошная по спеке),
  // отдельного "floor"-слоя не добавляем: иначе получается визуальное
  // "второе дно" чуть выше. bottomThickness для Gridfinity не используется,
  // оставлен в типе только для совместимости с UI, но скрыт из панели.

  // ── 3) Верхний lip (стыковочный бортик для стакающихся коробок) ──
  if (lipStyle !== "none") {
    const lipH = lipStyle === "default" ? LIP_HEIGHT_DEFAULT : LIP_HEIGHT_THIN;
    const lipShape = roundedRectShape(outerW, outerH, BASE_OUTER_RADIUS);
    const lipInnerW = outerW - outerWallThickness * 2;
    const lipInnerH = outerH - outerWallThickness * 2;
    const lipInner = rectPathWithRadius(
      lipInnerW,
      lipInnerH,
      Math.max(1, BASE_OUTER_RADIUS - outerWallThickness),
    );
    lipShape.holes.push(lipInner);
    const lipGeom = new THREE.ExtrudeGeometry(lipShape, {
      depth: lipH,
      bevelEnabled: lipStyle === "default",
      bevelSize: lipStyle === "default" ? 0.8 : 0,
      bevelThickness: lipStyle === "default" ? 0.8 : 0,
      bevelSegments: 4,
      steps: 1,
      curveSegments: 16,
    });
    lipGeom.rotateX(-Math.PI / 2);
    const lipMesh = new THREE.Mesh(lipGeom);
    lipMesh.position.y = SKIRT_H_TOTAL + bodyHeight + lipH;
    group.add(lipMesh);
  }

  return group;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function extrudeChamfer(opts: {
  bottomW: number;
  bottomH: number;
  topW: number;
  topH: number;
  height: number;
  bottomRadius: number;
  holes: Hole[];
  screwHoles: Hole[];
}): THREE.Mesh {
  // Простая аппроксимация chamfer: берём нижнюю форму, экструдим с bevel.
  const shape = roundedRectShape(
    opts.bottomW,
    opts.bottomH,
    opts.bottomRadius,
    [...opts.holes, ...opts.screwHoles],
  );
  const bevelSize = (opts.topW - opts.bottomW) / 2;
  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: opts.height - bevelSize,
    bevelEnabled: true,
    bevelSize,
    bevelThickness: bevelSize,
    bevelSegments: 4,
    steps: 1,
    curveSegments: 16,
  });
  geom.rotateX(-Math.PI / 2);
  return new THREE.Mesh(geom);
}

function rectPathWithRadius(w: number, h: number, r: number): THREE.Path {
  const x0 = -w / 2;
  const y0 = -h / 2;
  const x1 = w / 2;
  const y1 = h / 2;
  const p = new THREE.Path();
  p.moveTo(x0 + r, y0);
  p.lineTo(x1 - r, y0);
  p.absarc(x1 - r, y0 + r, r, -Math.PI / 2, 0, false);
  p.lineTo(x1, y1 - r);
  p.absarc(x1 - r, y1 - r, r, 0, Math.PI / 2, false);
  p.lineTo(x0 + r, y1);
  p.absarc(x0 + r, y1 - r, r, Math.PI / 2, Math.PI, false);
  p.lineTo(x0, y0 + r);
  p.absarc(x0 + r, y0 + r, r, Math.PI, (3 * Math.PI) / 2, false);
  return p;
}

function cornerCenters(
  xUnits: number,
  yUnits: number,
  gridSize: number,
  mode: BaseHoles,
): Array<{ x: number; y: number }> {
  // "corner" — только внешние 4 угла коробки
  // "full" — каждая клетка получает 4 "угловых" отверстия (как на спеке)
  const outerW = xUnits * gridSize - CLEARANCE;
  const outerH = yUnits * gridSize - CLEARANCE;
  const inset = 8; // расстояние от угла клетки до центра отверстия
  const arr: Array<{ x: number; y: number }> = [];
  if (mode === "corner") {
    arr.push({ x: inset, y: inset });
    arr.push({ x: outerW - inset, y: inset });
    arr.push({ x: inset, y: outerH - inset });
    arr.push({ x: outerW - inset, y: outerH - inset });
    return arr;
  }
  if (mode === "full") {
    for (let ix = 0; ix < xUnits; ix++) {
      for (let iy = 0; iy < yUnits; iy++) {
        const cx = ix * gridSize + gridSize / 2 - (xUnits * gridSize) / 2 + outerW / 2;
        const cy = iy * gridSize + gridSize / 2 - (yUnits * gridSize) / 2 + outerH / 2;
        arr.push({ x: cx - gridSize / 2 + inset, y: cy - gridSize / 2 + inset });
        arr.push({ x: cx + gridSize / 2 - inset, y: cy - gridSize / 2 + inset });
        arr.push({ x: cx - gridSize / 2 + inset, y: cy + gridSize / 2 - inset });
        arr.push({ x: cx + gridSize / 2 - inset, y: cy + gridSize / 2 - inset });
      }
    }
    return arr;
  }
  return arr;
}

// Полная высота коробки (для UI/измерений)
export function binOuterDimensions(p: GridfinityBinParams): {
  w: number;
  d: number;
  h: number;
} {
  const gridSize = p.gridSize ?? GRID;
  const w = p.xUnits * gridSize - CLEARANCE;
  const d = p.yUnits * gridSize - CLEARANCE;
  const bodyH = p.zUnits * HEIGHT_UNIT;
  const lipH =
    p.lipStyle === "default"
      ? LIP_HEIGHT_DEFAULT
      : p.lipStyle === "thin"
        ? LIP_HEIGHT_THIN
        : 0;
  return { w, d, h: SKIRT_H_TOTAL + bodyH + lipH };
}
