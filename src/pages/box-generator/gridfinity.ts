import * as THREE from "three";
import type {
  Manifold,
  CrossSection,
} from "manifold-3d";
import { getManifold } from "./manifold";

// ─── Gridfinity спецификация ─────────────────────────────────────────
// По эталонной реализации kennetek/gridfinity-rebuilt-openscad и
// официальной спеке https://gridfinity.xyz/specification/.
// Все числа — миллиметры.

export const GRID = 42; // шаг клетки сетки

// База (юбка) одной клетки. Её "профиль" в сечении: нижний скос → средняя часть → верхний скос.
const CELL_BASE_TOP = 41.5; // верхний квадрат базы (клетки сцепляются с зазором 0.5мм)
const CELL_BASE_MID = 37.2; // квадрат средней (вертикальной) части
const CELL_BASE_BOT = 35.6; // самый нижний квадрат базы (узкая "лапа")
const BASE_TOP_R = 3.75; // скругление верха базы
const BASE_MID_R = 1.6; // скругление средней части
const BASE_BOT_R = 0.8; // скругление нижней части
const BOT_CHAMFER_H = 0.8;
const MID_H = 1.8;
const TOP_CHAMFER_H = 2.15;
const BASE_PROFILE_H = BOT_CHAMFER_H + MID_H + TOP_CHAMFER_H; // 4.75

// Выше профиля — "мост" до BASE_HEIGHT=7мм, который ловит все базы в один монолит
const BASE_HEIGHT = 7;
const BASE_BRIDGE_H = BASE_HEIGHT - BASE_PROFILE_H; // 2.25

// Шаг высоты коробки (total bin height = zUnits * HEIGHT_UNIT + [lip])
export const HEIGHT_UNIT = 7;

// Lite-база — экономичная, без магнитов и профиля. Просто плоская плита.
const LITE_BASE_HEIGHT = 1.8;

// Внутренняя геометрия полости
const INNER_FILLET_R = 2.8; // скругление углов полости

// Stacking lip — стыковочный бортик сверху для стакающихся коробок
const STACKING_LIP_H = 4.4;
const STACKING_LIP_DEPTH = 2.6; // суммарный inward-scos бортика (суживает отверстие к верху)

// Магниты / винты — значения по умолчанию (спека kennetek), параметры
// диаметра и глубины магнита пользователь меняет через UI.
const DEFAULT_MAGNET_DIAMETER = 6.5; // мм (стандартный D6 магнит)
const DEFAULT_MAGNET_DEPTH = 2.4; // 2мм магнит + 2 слоя покрытия
const SCREW_R = 3 / 2;
const HOLE_FROM_SIDE = 8; // от бока клетки до центра отверстия

export type LipStyle = "default" | "thin" | "none";
export type BaseHoles = "none" | "corner" | "full";
export type BaseStyle = "standard" | "lite";

export type GridfinityBinParams = {
  xUnits: number;
  yUnits: number;
  zUnits: number;
  gridSize?: number; // по умолчанию 42, можно менять для кастом-сеток
  outerWallThickness: number; // толщина стенки над бейзом
  lipStyle: LipStyle;

  // База
  baseStyle: BaseStyle; // "lite" = тонкая плита без магнитов и профиля
  magnets: BaseHoles;
  magnetDiameter: number;
  magnetDepth: number;
  screwHoles: BaseHoles;

  // Перегородки (compartments)
  compartmentsX: number; // 1..10, число отсеков по X
  compartmentsY: number; // 1..10, число отсеков по Y

  // Фичи отсеков
  scoopRadius: number; // 0 = без скупа; радиус квадрата-скоса у задней стенки
  labelLedgeWidth: number; // 0 = без полки; ширина полки под ярлык спереди
  labelLedgeHeight: number; // толщина полки
};

export const DEFAULT_BIN: GridfinityBinParams = {
  xUnits: 2,
  yUnits: 2,
  zUnits: 3,
  gridSize: GRID,
  outerWallThickness: 1.2,
  lipStyle: "default",
  baseStyle: "standard",
  magnets: "none",
  magnetDiameter: DEFAULT_MAGNET_DIAMETER,
  magnetDepth: DEFAULT_MAGNET_DEPTH,
  screwHoles: "none",
  compartmentsX: 1,
  compartmentsY: 1,
  scoopRadius: 0,
  labelLedgeWidth: 0,
  labelLedgeHeight: 1.2,
};

// ─── Асинхронная сборка геометрии через manifold-3d ──────────────────

export async function buildGridfinityBin(
  p: GridfinityBinParams,
): Promise<THREE.Group> {
  const wasm = await getManifold();
  const MF = wasm.Manifold;
  const CS = wasm.CrossSection;

  const {
    xUnits,
    yUnits,
    zUnits,
    gridSize = GRID,
    outerWallThickness: WALL,
    lipStyle,
    baseStyle,
    magnets,
    magnetDiameter,
    magnetDepth,
    screwHoles,
    compartmentsX,
    compartmentsY,
    scoopRadius,
    labelLedgeWidth,
    labelLedgeHeight,
  } = p;

  const MAGNET_R = Math.max(0.5, magnetDiameter / 2);
  const MAGNET_DEPTH = Math.max(0.4, magnetDepth);
  const nX = Math.max(1, Math.floor(compartmentsX));
  const nY = Math.max(1, Math.floor(compartmentsY));

  const baseH = baseStyle === "lite" ? LITE_BASE_HEIGHT : BASE_HEIGHT;
  const totalH = zUnits * HEIGHT_UNIT;
  const bodyH = totalH - baseH;
  if (bodyH < 0.5) {
    throw new Error("zUnits слишком маленький (минимум 1).");
  }

  const outerW = xUnits * gridSize - 0.5;
  const outerD = yUnits * gridSize - 0.5;

  // ── Трекинг WASM-объектов для освобождения ──
  const bag: Array<{ delete: () => void }> = [];
  const T = <X extends { delete: () => void }>(x: X): X => {
    bag.push(x);
    return x;
  };

  // Rounded-rect 2D (центрированный).
  const rrect = (w: number, h: number, r: number): CrossSection => {
    const coreW = Math.max(0.01, w - 2 * r);
    const coreH = Math.max(0.01, h - 2 * r);
    const core = T(CS.square([coreW, coreH], true));
    return T(core.offset(r, "Round"));
  };

  // ── База одной клетки ──
  const buildBaseCell = (): Manifold => {
    const bot = T(rrect(CELL_BASE_BOT, CELL_BASE_BOT, BASE_BOT_R));
    const bot3d = T(
      bot.extrude(BOT_CHAMFER_H, 0, 0, [
        CELL_BASE_MID / CELL_BASE_BOT,
        CELL_BASE_MID / CELL_BASE_BOT,
      ]),
    );

    const mid = T(rrect(CELL_BASE_MID, CELL_BASE_MID, BASE_MID_R));
    const mid3d = T(mid.extrude(MID_H).translate([0, 0, BOT_CHAMFER_H]));

    const topCS = T(rrect(CELL_BASE_MID, CELL_BASE_MID, BASE_MID_R));
    const top3d = T(
      topCS
        .extrude(TOP_CHAMFER_H, 0, 0, [
          CELL_BASE_TOP / CELL_BASE_MID,
          CELL_BASE_TOP / CELL_BASE_MID,
        ])
        .translate([0, 0, BOT_CHAMFER_H + MID_H]),
    );

    return T(T(bot3d.add(mid3d)).add(top3d));
  };

  // ── Основа: либо профилированная (standard), либо плоская (lite) ──
  let baseSolid: Manifold;
  if (baseStyle === "standard") {
    // Все клетки с профилем + отверстия магниты/винты.
    let bases: Manifold | null = null;
    for (let j = 0; j < yUnits; j++) {
      for (let i = 0; i < xUnits; i++) {
        const cx = (i - (xUnits - 1) / 2) * gridSize;
        const cy = (j - (yUnits - 1) / 2) * gridSize;

        let cell = T(buildBaseCell().translate([cx, cy, 0]));

        const isCorner =
          (i === 0 || i === xUnits - 1) && (j === 0 || j === yUnits - 1);
        const addMag =
          magnets === "full" || (magnets === "corner" && isCorner);
        const addScr =
          screwHoles === "full" || (screwHoles === "corner" && isCorner);

        const hx = CELL_BASE_TOP / 2 - HOLE_FROM_SIDE;
        const corners: [number, number][] = [
          [1, 1],
          [-1, 1],
          [1, -1],
          [-1, -1],
        ];

        if (addMag) {
          for (const [sx, sy] of corners) {
            const mag = T(
              T(CS.circle(MAGNET_R, 32))
                .extrude(MAGNET_DEPTH + 0.02)
                .translate([cx + sx * hx, cy + sy * hx, -0.01]),
            );
            cell = T(cell.subtract(mag));
          }
        }
        if (addScr) {
          for (const [sx, sy] of corners) {
            const scr = T(
              T(CS.circle(SCREW_R, 24))
                .extrude(BASE_HEIGHT + 0.04)
                .translate([cx + sx * hx, cy + sy * hx, -0.02]),
            );
            cell = T(cell.subtract(scr));
          }
        }

        bases = bases ? T(bases.add(cell)) : cell;
      }
    }

    // Мост поверх профиля: z=4.75..7.
    const bridge = T(
      T(rrect(outerW, outerD, BASE_TOP_R))
        .extrude(BASE_BRIDGE_H)
        .translate([0, 0, BASE_PROFILE_H]),
    );
    baseSolid = T((bases ?? bridge).add(bridge));
  } else {
    // Lite: плоская плита, без магнитов/винтов и без профильной юбки.
    // Внешние скругления — те же, что у верхней грани стандартной базы.
    baseSolid = T(
      T(rrect(outerW, outerD, BASE_TOP_R)).extrude(baseH),
    );
  }

  // ── Стенки: z=baseH..totalH, минус полость ──
  const wallOuter = T(
    T(rrect(outerW, outerD, BASE_TOP_R))
      .extrude(bodyH)
      .translate([0, 0, baseH]),
  );

  // ── Полости отсеков ──
  // Внутренняя зона после внешних стенок: cavityInnerW × cavityInnerD.
  // Разбиваем на nX × nY ячеек через перегородки толщиной WALL.
  const cavityInnerW = Math.max(1, outerW - 2 * WALL);
  const cavityInnerD = Math.max(1, outerD - 2 * WALL);
  const compW = Math.max(
    4,
    (cavityInnerW - (nX - 1) * WALL) / nX,
  );
  const compD = Math.max(
    4,
    (cavityInnerD - (nY - 1) * WALL) / nY,
  );

  // Позиции центров отсеков
  const compCenter = (idx: number, n: number, size: number): number => {
    const totalSpan = n * size + (n - 1) * WALL;
    const start = -totalSpan / 2 + size / 2;
    return start + idx * (size + WALL);
  };

  // Собираем все cavity'ы как ОДИН CrossSection (Union), потом extrude.
  // Так получаем единую полость-минус-перегородки.
  let cavityCS: CrossSection | null = null;
  for (let j = 0; j < nY; j++) {
    for (let i = 0; i < nX; i++) {
      const cx = compCenter(i, nX, compW);
      const cy = compCenter(j, nY, compD);
      const cc = T(rrect(compW, compD, INNER_FILLET_R).translate([cx, cy]));
      cavityCS = cavityCS ? T(cavityCS.add(cc)) : cc;
    }
  }

  const cavityH = bodyH + 0.02;
  const cavity = T(
    (cavityCS ?? T(rrect(cavityInnerW, cavityInnerD, INNER_FILLET_R)))
      .extrude(cavityH)
      .translate([0, 0, baseH]),
  );

  let walls = T(wallOuter.subtract(cavity));

  // ── Scoop (наклонный пол у задней стенки каждого отсека) ──
  // Фишка из cq-gridfinity / Pred's bins: вогнутая четверть-цилиндрическая
  // грань в углу back-wall × floor. Помогает доставать мелочь. Материал
  // добавляется к полости — это уменьшает полезный объём, но упрощает
  // доступ. Реализация: блок (compW × R × R) у задней стенки МИНУС
  // цилиндр радиуса R вдоль оси X, центр оси на (backY, floor+R).
  if (scoopRadius > 0.5) {
    const R = Math.min(scoopRadius, Math.min(compD, bodyH) * 0.8);
    for (let j = 0; j < nY; j++) {
      for (let i = 0; i < nX; i++) {
        const cx = compCenter(i, nX, compW);
        const cy = compCenter(j, nY, compD);
        const backY = cy + compD / 2;
        // Строим цилиндр-заготовку длиной compW по оси X, радиус R
        // (центр оси на (backY - R, baseH + R)). Пересекаем с блоком-
        // уголком (rect compW×R×R) — получается именно "половина"-
        // scoop profile.
        const block = T(
          MF.cube([compW, R, R], false).translate([
            cx - compW / 2,
            backY - R,
            baseH,
          ]),
        );
        const cyl = T(
          MF.cylinder(compW + 0.04, R, R, 48, false)
            .rotate([0, 90, 0])
            .translate([cx - compW / 2 - 0.02, backY, baseH + R]),
        );
        const scoopPrism = T(block.subtract(cyl));
        walls = T(walls.add(scoopPrism));
      }
    }
  }

  // ── Label ledge (полка под ярлык спереди каждого отсека) ──
  // Горизонтальная плита толщиной labelLedgeHeight, шириной labelLedgeWidth
  // (в глубину отсека). Крепится к передней (y-) стенке каждого отсека
  // на уровне верхней кромки. Снизу — 45° скос, чтобы печаталось без
  // supports: строим его через блок minus повёрнутый цилиндр (даёт
  // плоский скос).
  if (labelLedgeWidth > 0.5 && labelLedgeHeight > 0.2) {
    const lw = Math.min(labelLedgeWidth, compD * 0.6);
    const lh = Math.min(labelLedgeHeight, bodyH * 0.4);
    const topZ = totalH;
    for (let j = 0; j < nY; j++) {
      for (let i = 0; i < nX; i++) {
        const cx = compCenter(i, nX, compW);
        const cy = compCenter(j, nY, compD);
        const frontY = cy - compD / 2;
        // Плита: compW × lw × lh, начало [cx-compW/2, frontY, topZ-lh].
        const plate = T(
          MF.cube([compW, lw, lh], false).translate([
            cx - compW / 2,
            frontY,
            topZ - lh,
          ]),
        );
        // Скос 45°: cube(compW × lw × lh) за внутренней гранью ledge'а,
        // повёрнутый вокруг оси X так, чтобы срезал нижне-заднюю грань.
        // Проще: subtract'им треугольник, собранный из двух пересекающих
        // друг друга блоков, повёрнутых вокруг X.
        // Оставим простую реализацию: плоская плита без chamfer — 45° добавим позже.
        walls = T(walls.add(plate));
      }
    }
  }

  // ── Stacking lip ──
  let lip: Manifold | null = null;
  if (lipStyle !== "none") {
    const lipH = lipStyle === "default" ? STACKING_LIP_H : 1.6;
    const lipDepth = lipStyle === "default" ? STACKING_LIP_DEPTH : 0.9;

    const lipOuter = T(
      T(rrect(outerW, outerD, BASE_TOP_R))
        .extrude(lipH)
        .translate([0, 0, totalH]),
    );

    // Внутренний конус: полость lip'а = ОБЩАЯ полость бина вверху,
    // потому что compartments не доходят до самого верха — над ними
    // единое отверстие. Используем общий rrect (outerW-2*WALL).
    const innerBotW = cavityInnerW;
    const innerBotD = cavityInnerD;
    const innerTopW = Math.max(0.1, innerBotW - 2 * lipDepth);
    const innerTopD = Math.max(0.1, innerBotD - 2 * lipDepth);
    const lipInnerCS = T(rrect(innerBotW, innerBotD, INNER_FILLET_R));
    const lipInner = T(
      lipInnerCS
        .extrude(lipH + 0.04, 0, 0, [
          innerTopW / innerBotW,
          innerTopD / innerBotD,
        ])
        .translate([0, 0, totalH - 0.02]),
    );
    lip = T(lipOuter.subtract(lipInner));
  }

  // ── Собираем бин ──
  let bin: Manifold = T(baseSolid.add(walls));
  if (lip) bin = T(bin.add(lip));

  // ── Экспортируем в THREE.BufferGeometry ──
  const mesh = bin.getMesh();

  let positions: Float32Array;
  if (mesh.numProp === 3) {
    positions = mesh.vertProperties;
  } else {
    const nVert = mesh.vertProperties.length / mesh.numProp;
    positions = new Float32Array(nVert * 3);
    for (let v = 0; v < nVert; v++) {
      positions[v * 3] = mesh.vertProperties[v * mesh.numProp];
      positions[v * 3 + 1] = mesh.vertProperties[v * mesh.numProp + 1];
      positions[v * 3 + 2] = mesh.vertProperties[v * mesh.numProp + 2];
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geom.setIndex(new THREE.BufferAttribute(mesh.triVerts, 1));
  geom.computeVertexNormals();

  // Manifold собирает в Z-up (z = высота), наш Viewer — Y-up.
  geom.rotateX(-Math.PI / 2);

  // Освобождаем все WASM-объекты.
  for (const obj of bag) {
    try {
      obj.delete();
    } catch {
      /* noop */
    }
  }

  const threeMesh = new THREE.Mesh(geom);
  const group = new THREE.Group();
  group.add(threeMesh);
  return group;
}

export function binOuterDimensions(p: GridfinityBinParams): {
  w: number;
  d: number;
  h: number;
} {
  let h = p.zUnits * HEIGHT_UNIT;
  if (p.lipStyle === "default") h += STACKING_LIP_H;
  else if (p.lipStyle === "thin") h += 1.6;
  return {
    w: p.xUnits * (p.gridSize ?? GRID) - 0.5,
    d: p.yUnits * (p.gridSize ?? GRID) - 0.5,
    h,
  };
}
