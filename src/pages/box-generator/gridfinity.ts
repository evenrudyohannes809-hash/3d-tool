import * as THREE from "three";
import { getManifold } from "./manifold";

// ─── Gridfinity спецификация ─────────────────────────────────────────
// По эталонной реализации kennetek/gridfinity-rebuilt-openscad и
// официальной спеке https://gridfinity.xyz/specification/.
// Все числа — миллиметры.

export const GRID = 42; // шаг клетки сетки

// База (юбка) одной клетки. Её "профиль" в сечении: нижний скос -> средняя часть -> верхний скос.
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

// Полный набор параметров Gridfinity-бина. Часть полей (compartments,
// scoop, ledge, lite-base) используется только новым V2-вьюером для
// превью; STL-экспорт пока строит по manifold-геометрии без них.
export type GridfinityBinParams = {
  xUnits: number;
  yUnits: number;
  zUnits: number;
  gridSize?: number;
  outerWallThickness: number;
  lipStyle: LipStyle;

  // Тип базы: стандартная (с профилем и магнитами) или lite (тонкая плита)
  baseStyle: BaseStyle;
  magnets: BaseHoles;
  magnetDiameter: number;
  magnetDepth: number;
  screwHoles: BaseHoles;

  // Перегородки (разбивка на отсеки)
  compartmentsX: number;
  compartmentsY: number;

  // Фичи отсеков
  scoopRadius: number;
  labelLedgeWidth: number;
  labelLedgeHeight: number;
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
//
// Коробка собирается как единое булево-тело:
//   (базы клеток) ∪ (мост) ∪ (стенки − полость) ∪ (lip − внутренний конус)
//   − (отверстия под магниты / винты)
// Получается водонепроницаемое тело без "двух дон" и висящих слоёв.

export async function buildGridfinityBin(
  p: GridfinityBinParams,
): Promise<THREE.Group> {
  const wasm = await getManifold();
  const { CrossSection } = wasm;

  const {
    xUnits,
    yUnits,
    zUnits,
    gridSize = GRID,
    outerWallThickness: WALL,
    lipStyle,
    magnets,
    magnetDiameter,
    magnetDepth,
    screwHoles,
  } = p;
  const MAGNET_R = Math.max(0.5, magnetDiameter / 2);
  const MAGNET_DEPTH = Math.max(0.4, magnetDepth);

  const totalH = zUnits * HEIGHT_UNIT;
  const bodyH = totalH - BASE_HEIGHT;
  if (bodyH < 0) {
    throw new Error("zUnits слишком маленький (минимум 1).");
  }

  const outerW = xUnits * gridSize - 0.5;
  const outerD = yUnits * gridSize - 0.5;

  // Всё, что построим через WASM — надо потом явно освободить.
  type HasDelete = { delete: () => void };
  const bag: HasDelete[] = [];
  const track = <T extends HasDelete>(x: T): T => {
    bag.push(x);
    return x;
  };

  // Rounded-rect CrossSection (центрированный).
  const rrect = (w: number, h: number, r: number) => {
    const coreW = Math.max(0.01, w - 2 * r);
    const coreH = Math.max(0.01, h - 2 * r);
    const core = track(
      (CrossSection as unknown as {
        square: (size: [number, number], center: boolean) => unknown;
      }).square([coreW, coreH], true) as HasDelete,
    );
    // offset(r, "Round") — расширяет по периметру на r с округлением углов.
    const rounded = (core as unknown as {
      offset: (delta: number, joinType: string) => unknown;
    }).offset(r, "Round") as HasDelete;
    return track(rounded);
  };

  // ── База одной клетки (в начале координат) ──
  const buildBaseCell = (): unknown => {
    // Нижний скос: 35.6×35.6 → 37.2×37.2 за 0.8мм.
    const bot = rrect(CELL_BASE_BOT, CELL_BASE_BOT, BASE_BOT_R) as unknown as {
      extrude: (
        h: number,
        nDiv: number,
        twist: number,
        scaleTop: [number, number],
      ) => unknown;
    };
    const bot3d = track(
      bot.extrude(BOT_CHAMFER_H, 0, 0, [
        CELL_BASE_MID / CELL_BASE_BOT,
        CELL_BASE_MID / CELL_BASE_BOT,
      ]) as HasDelete,
    );

    // Средняя часть: 37.2×37.2 вертикально 1.8мм, подняться на 0.8.
    const mid = rrect(CELL_BASE_MID, CELL_BASE_MID, BASE_MID_R) as unknown as {
      extrude: (h: number) => unknown;
    };
    const mid3dRaw = track(mid.extrude(MID_H) as HasDelete);
    const mid3d = track(
      (mid3dRaw as unknown as {
        translate: (v: [number, number, number]) => unknown;
      }).translate([0, 0, BOT_CHAMFER_H]) as HasDelete,
    );

    // Верхний скос: 37.2×37.2 → 41.5×41.5 за 2.15мм, подняться на 2.6.
    const top = rrect(CELL_BASE_MID, CELL_BASE_MID, BASE_MID_R) as unknown as {
      extrude: (
        h: number,
        nDiv: number,
        twist: number,
        scaleTop: [number, number],
      ) => unknown;
    };
    const top3dRaw = track(
      top.extrude(TOP_CHAMFER_H, 0, 0, [
        CELL_BASE_TOP / CELL_BASE_MID,
        CELL_BASE_TOP / CELL_BASE_MID,
      ]) as HasDelete,
    );
    const top3d = track(
      (top3dRaw as unknown as {
        translate: (v: [number, number, number]) => unknown;
      }).translate([0, 0, BOT_CHAMFER_H + MID_H]) as HasDelete,
    );

    const u1 = track(
      (bot3d as unknown as { add: (o: unknown) => unknown }).add(
        mid3d,
      ) as HasDelete,
    );
    const u2 = track(
      (u1 as unknown as { add: (o: unknown) => unknown }).add(
        top3d,
      ) as HasDelete,
    );
    return u2;
  };

  // ── Все клетки (база + опц. магниты/винты) в позициях сетки ──
  let bases: unknown = null;
  for (let j = 0; j < yUnits; j++) {
    for (let i = 0; i < xUnits; i++) {
      const cx = (i - (xUnits - 1) / 2) * gridSize;
      const cy = (j - (yUnits - 1) / 2) * gridSize;

      let cell = buildBaseCell();
      cell = track(
        (cell as unknown as {
          translate: (v: [number, number, number]) => unknown;
        }).translate([cx, cy, 0]) as HasDelete,
      );

      // Отверстия в ЭТОЙ клетке (если нужно).
      const isCornerCell =
        (i === 0 || i === xUnits - 1) && (j === 0 || j === yUnits - 1);
      const addMagnets =
        magnets === "full" || (magnets === "corner" && isCornerCell);
      const addScrews =
        screwHoles === "full" || (screwHoles === "corner" && isCornerCell);

      const hx = CELL_BASE_TOP / 2 - HOLE_FROM_SIDE;
      const cornerOffsets: [number, number][] = [
        [1, 1],
        [-1, 1],
        [1, -1],
        [-1, -1],
      ];

      if (addMagnets) {
        for (const [sx, sy] of cornerOffsets) {
          const magCS = track(
            (CrossSection as unknown as {
              circle: (r: number, n: number) => unknown;
            }).circle(MAGNET_R, 32) as HasDelete,
          );
          const mag = track(
            (magCS as unknown as { extrude: (h: number) => unknown }).extrude(
              MAGNET_DEPTH + 0.02,
            ) as HasDelete,
          );
          // Сдвигаем чуть ниже z=0, чтобы не было тонкой "плёнки" на подошве.
          const magPos = track(
            (mag as unknown as {
              translate: (v: [number, number, number]) => unknown;
            }).translate([cx + sx * hx, cy + sy * hx, -0.01]) as HasDelete,
          );
          cell = track(
            (cell as unknown as { subtract: (o: unknown) => unknown }).subtract(
              magPos,
            ) as HasDelete,
          );
        }
      }
      if (addScrews) {
        for (const [sx, sy] of cornerOffsets) {
          const scrCS = track(
            (CrossSection as unknown as {
              circle: (r: number, n: number) => unknown;
            }).circle(SCREW_R, 24) as HasDelete,
          );
          const scr = track(
            (scrCS as unknown as { extrude: (h: number) => unknown }).extrude(
              BASE_HEIGHT + 0.04,
            ) as HasDelete,
          );
          const scrPos = track(
            (scr as unknown as {
              translate: (v: [number, number, number]) => unknown;
            }).translate([cx + sx * hx, cy + sy * hx, -0.02]) as HasDelete,
          );
          cell = track(
            (cell as unknown as { subtract: (o: unknown) => unknown }).subtract(
              scrPos,
            ) as HasDelete,
          );
        }
      }

      bases = bases
        ? track(
            (bases as unknown as { add: (o: unknown) => unknown }).add(
              cell,
            ) as HasDelete,
          )
        : cell;
    }
  }

  // ── Мост поверх профиля: z=4.75..7 в полном габарите ──
  const bridgeCS = rrect(outerW, outerD, BASE_TOP_R);
  const bridgeRaw = track(
    (bridgeCS as unknown as { extrude: (h: number) => unknown }).extrude(
      BASE_BRIDGE_H,
    ) as HasDelete,
  );
  const bridge = track(
    (bridgeRaw as unknown as {
      translate: (v: [number, number, number]) => unknown;
    }).translate([0, 0, BASE_PROFILE_H]) as HasDelete,
  );

  // ── Стенки: z=7..zUnits*7, минус полость ──
  const wallOuterCS = rrect(outerW, outerD, BASE_TOP_R);
  const wallOuterRaw = track(
    (wallOuterCS as unknown as { extrude: (h: number) => unknown }).extrude(
      bodyH,
    ) as HasDelete,
  );
  const wallOuter = track(
    (wallOuterRaw as unknown as {
      translate: (v: [number, number, number]) => unknown;
    }).translate([0, 0, BASE_HEIGHT]) as HasDelete,
  );

  const lipOn = lipStyle !== "none";
  // Полость ВСЕГДА идёт на полную высоту стенок (bodyH). Раньше при
  // включённом lip я укорачивал её на STACKING_LIP_SUPPORT_H — из-за
  // этого на верх стенки налипала сплошная "крышка" толщиной 1.2мм, и
  // пользователь видел именно её, а не настоящее дно коробки (отсюда
  // эффект "дно поднимается"). Lip сам по себе конструктивно опирается
  // на верх стенки — никакая "подушка" внутри не нужна.
  const cavityH = bodyH + 0.02;
  const cavityInnerW = Math.max(1, outerW - 2 * WALL);
  const cavityInnerD = Math.max(1, outerD - 2 * WALL);
  const cavityCS = rrect(cavityInnerW, cavityInnerD, INNER_FILLET_R);
  const cavityRaw = track(
    (cavityCS as unknown as { extrude: (h: number) => unknown }).extrude(
      cavityH,
    ) as HasDelete,
  );
  const cavity = track(
    (cavityRaw as unknown as {
      translate: (v: [number, number, number]) => unknown;
    }).translate([0, 0, BASE_HEIGHT]) as HasDelete,
  );

  const walls = track(
    (wallOuter as unknown as { subtract: (o: unknown) => unknown }).subtract(
      cavity,
    ) as HasDelete,
  );

  // ── Stacking lip (опц.) ──
  let lip: unknown = null;
  if (lipOn) {
    const lipH = lipStyle === "default" ? STACKING_LIP_H : 1.6;
    const lipDepth = lipStyle === "default" ? STACKING_LIP_DEPTH : 0.9;

    const lipOuterCS = rrect(outerW, outerD, BASE_TOP_R);
    const lipOuterRaw = track(
      (lipOuterCS as unknown as { extrude: (h: number) => unknown }).extrude(
        lipH,
      ) as HasDelete,
    );
    const lipOuter = track(
      (lipOuterRaw as unknown as {
        translate: (v: [number, number, number]) => unknown;
      }).translate([0, 0, totalH]) as HasDelete,
    );

    // Внутренний конус: суживается кверху (эмуляция 45°-скоса lip'а)
    const innerBotW = cavityInnerW;
    const innerBotD = cavityInnerD;
    const innerTopW = Math.max(0.1, innerBotW - 2 * lipDepth);
    const innerTopD = Math.max(0.1, innerBotD - 2 * lipDepth);
    const lipInnerCS = rrect(innerBotW, innerBotD, INNER_FILLET_R);
    const lipInnerRaw = track(
      (lipInnerCS as unknown as {
        extrude: (
          h: number,
          nDiv: number,
          twist: number,
          scaleTop: [number, number],
        ) => unknown;
      }).extrude(lipH + 0.04, 0, 0, [
        innerTopW / innerBotW,
        innerTopD / innerBotD,
      ]) as HasDelete,
    );
    const lipInner = track(
      (lipInnerRaw as unknown as {
        translate: (v: [number, number, number]) => unknown;
      }).translate([0, 0, totalH - 0.02]) as HasDelete,
    );

    lip = track(
      (lipOuter as unknown as { subtract: (o: unknown) => unknown }).subtract(
        lipInner,
      ) as HasDelete,
    );
  }

  // ── Собираем бин ──
  let bin = track(
    (bases as unknown as { add: (o: unknown) => unknown }).add(
      bridge,
    ) as HasDelete,
  );
  bin = track(
    (bin as unknown as { add: (o: unknown) => unknown }).add(
      walls,
    ) as HasDelete,
  );
  if (lip) {
    bin = track(
      (bin as unknown as { add: (o: unknown) => unknown }).add(lip) as HasDelete,
    );
  }

  // ── Экспортируем в THREE.BufferGeometry ──
  const mesh = (bin as unknown as {
    getMesh: () => {
      numProp: number;
      vertProperties: Float32Array;
      triVerts: Uint32Array;
    };
  }).getMesh();

  // vertProperties — interleaved: [x,y,z,(extra props)] × numVert.
  // Если numProp > 3, вытаскиваем xyz в отдельный массив.
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

  // Manifold собирает в Z-up (z = высота), наш Viewer — Y-up. Разворачиваем.
  geom.rotateX(-Math.PI / 2);

  // Освобождаем все WASM-объекты.
  for (const obj of bag) {
    try {
      obj.delete();
    } catch {
      /* noop */
    }
  }

  // Возвращаем Group с одним Mesh — сохраняем совместимый API с Viewer.
  const threeMesh = new THREE.Mesh(geom);
  const group = new THREE.Group();
  group.add(threeMesh);
  return group;
}

// ─── Размеры для вывода в UI ──────────────────────────────────────────
export function binOuterDimensions(p: GridfinityBinParams) {
  const g = p.gridSize ?? GRID;
  const w = p.xUnits * g - 0.5;
  const d = p.yUnits * g - 0.5;
  let h = p.zUnits * HEIGHT_UNIT;
  if (p.lipStyle === "default") h += STACKING_LIP_H;
  else if (p.lipStyle === "thin") h += 1.6;
  return { w, d, h };
}
