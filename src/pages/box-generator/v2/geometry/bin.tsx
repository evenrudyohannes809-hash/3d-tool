import { useMemo } from "react";
import * as THREE from "three";
import { Edges } from "@react-three/drei";
import {
  GRID,
  HEIGHT_UNIT,
  BASE_TOP,
  BASE_OUTER_R,
  BASE_PROFILE_H,
  BASE_HEIGHT,
  BASE_BRIDGE_H,
  LITE_BASE_HEIGHT,
  LIP_HEIGHT,
  LIP_THIN_HEIGHT,
  INNER_FILLET_R,
  DEFAULT_WALL_THICKNESS,
  EDGE_COLOR,
  EDGE_THRESHOLD_DEG,
  CORNER_SEGMENTS,
} from "./constants";
import {
  roundedRectShapeManual,
  extrudeShape,
  bandGeometry,
} from "./shapes";
import { buildBaseShellGeometry } from "./baseProfile";

export type LipStyle = "default" | "thin" | "none";
export type BaseStyle = "standard" | "lite";
export type HolePattern = "none" | "corner" | "full";

export type BinParams = {
  xUnits: number;
  yUnits: number;
  zUnits: number;
  gridSize: number; // обычно 42
  outerWallThickness: number;
  lipStyle: LipStyle;
  baseStyle: BaseStyle;

  // Перегородки (compartments N×M)
  compartmentsX: number;
  compartmentsY: number;
  innerWallThickness: number;

  // Scoop и label-ledge (упрощённые — на каждый compartment)
  scoopRadius: number; // 0 = off
  labelLedgeWidth: number; // 0 = off
  labelLedgeHeight: number;

  // Магниты — в preview только индикаторы-круги, реальные отверстия в STL
  magnets: HolePattern;
  screwHoles: HolePattern;
  magnetDiameter: number;
  magnetDepth: number;
  // Если true — в STL вычитается Ø5×5мм глухое отверстие под heat-set втулку.
  screwHeatsetInsert: boolean;
};

export function Bin({ params, color }: { params: BinParams; color: string }) {
  const {
    xUnits,
    yUnits,
    zUnits,
    gridSize,
    outerWallThickness: OW,
    lipStyle,
    baseStyle,
    compartmentsX,
    compartmentsY,
    innerWallThickness: IW,
    scoopRadius,
    labelLedgeWidth,
    labelLedgeHeight,
    magnets,
    screwHoles,
    magnetDiameter,
    screwHeatsetInsert,
  } = params;

  const baseH = baseStyle === "lite" ? LITE_BASE_HEIGHT : BASE_HEIGHT;
  const totalH = zUnits * HEIGHT_UNIT;
  const bodyH = Math.max(0.5, totalH - baseH);

  const outerW = xUnits * gridSize - 0.5;
  const outerD = yUnits * gridSize - 0.5;

  // ── BASE: одна из двух форм ──
  const baseGeometry = useMemo(() => {
    if (baseStyle === "lite") {
      const shape = roundedRectShapeManual(outerW, outerD, BASE_OUTER_R);
      return extrudeShape(shape, LITE_BASE_HEIGHT);
    }
    // Standard: мост-плита по XY + серия вычитаемых "колодцев" - но без CSG
    // просто рендерим bridge сверху, клетки снизу как отдельные меши
    return null;
  }, [baseStyle, outerW, outerD]);

  const cells = useMemo(() => {
    if (baseStyle === "lite") return [];
    // Профиль базы Gridfinity в формате [inward_offset, z_height]:
    // z=0 низ, z=4.75 верх. inward = насколько сечение уже BASE_TOP на этом уровне.
    // Низ: 35.6×35.6 → offset=(41.5-35.6)/2=2.95
    // Верх нижнего скоса (z=0.8): 37.2×37.2 → offset=(41.5-37.2)/2=2.15
    // Низ верхнего скоса (z=2.6): те же 37.2×37.2 → offset=2.15
    // Верх (z=4.75): 41.5×41.5 → offset=0
    const basePts: Array<[number, number]> = [
      [2.95, 0],
      [2.15, 0.8],
      [2.15, 2.6],
      [0, 4.75],
    ];

    const geom = buildBaseShellGeometry(
      BASE_TOP,
      BASE_OUTER_R,
      basePts,
      CORNER_SEGMENTS,
    );

    const list: Array<{
      geom: THREE.BufferGeometry;
      pos: [number, number, number];
      key: string;
    }> = [];
    for (let j = 0; j < yUnits; j++) {
      for (let i = 0; i < xUnits; i++) {
        const cx = (i - (xUnits - 1) / 2) * gridSize;
        const cy = (j - (yUnits - 1) / 2) * gridSize;
        list.push({ geom, pos: [cx, cy, 0], key: `c-${i}-${j}` });
      }
    }
    return list;
  }, [baseStyle, xUnits, yUnits, gridSize]);

  // Bridge — rounded-rect от верха профиля (z=4.75) до BASE_HEIGHT (z=7)
  const bridgeGeometry = useMemo(() => {
    if (baseStyle === "lite") return null;
    const shape = roundedRectShapeManual(outerW, outerD, BASE_OUTER_R);
    return extrudeShape(shape, BASE_BRIDGE_H);
  }, [baseStyle, outerW, outerD]);

  // ── WALLS: band от baseH до totalH с полостью внутри ──
  const wallsGeometry = useMemo(() => {
    const outer = roundedRectShapeManual(outerW, outerD, BASE_OUTER_R);
    const innerW = outerW - 2 * OW;
    const innerD = outerD - 2 * OW;
    const inner = roundedRectShapeManual(innerW, innerD, INNER_FILLET_R);
    return bandGeometry(outer, inner, bodyH);
  }, [outerW, outerD, OW, bodyH]);

  // ── STACKING LIP: band с профилем наклона (если есть) ──
  const lipGeometry = useMemo(() => {
    if (lipStyle === "none") return null;
    const h = lipStyle === "thin" ? LIP_THIN_HEIGHT : LIP_HEIGHT;

    // Внешний контур лип-бортика совпадает с наружным контуром стенки
    const outer = roundedRectShapeManual(outerW, outerD, BASE_OUTER_R);
    // Внутренний — начинается от внутренней стенки (innerW×innerD),
    // и при default-lip ещё сужается на lip_depth = 2.15 (из профиля).
    const innerW0 = outerW - 2 * OW;
    const innerD0 = outerD - 2 * OW;
    const lipInwardDepth = lipStyle === "default" ? 2.15 : 0;
    const innerW = innerW0 - 2 * lipInwardDepth;
    const innerD = innerD0 - 2 * lipInwardDepth;
    const inner = roundedRectShapeManual(
      Math.max(2, innerW),
      Math.max(2, innerD),
      INNER_FILLET_R,
    );
    return bandGeometry(outer, inner, h);
  }, [lipStyle, outerW, outerD, OW]);

  // ── Compartments: внутренние перегородки ──
  const dividerGeometries = useMemo(() => {
    const nX = Math.max(1, Math.floor(compartmentsX));
    const nY = Math.max(1, Math.floor(compartmentsY));
    if (nX <= 1 && nY <= 1) return [];

    const innerW = outerW - 2 * OW;
    const innerD = outerD - 2 * OW;
    const list: Array<{
      geom: THREE.BufferGeometry;
      pos: [number, number, number];
      key: string;
    }> = [];

    // Вертикальные (по Y) — разделители отсеков по X
    for (let i = 1; i < nX; i++) {
      const px = -innerW / 2 + (i * innerW) / nX;
      const s = roundedRectShapeManual(IW, innerD, 0);
      list.push({
        geom: extrudeShape(s, bodyH),
        pos: [px, 0, baseH],
        key: `divX-${i}`,
      });
    }
    // Горизонтальные (по X) — разделители отсеков по Y
    for (let j = 1; j < nY; j++) {
      const py = -innerD / 2 + (j * innerD) / nY;
      const s = roundedRectShapeManual(innerW, IW, 0);
      list.push({
        geom: extrudeShape(s, bodyH),
        pos: [0, py, baseH],
        key: `divY-${j}`,
      });
    }
    return list;
  }, [compartmentsX, compartmentsY, outerW, outerD, OW, IW, bodyH, baseH]);

  // ── Scoops: четверть-цилиндр у задней стенки каждого отсека ──
  const scoopGeometries = useMemo(() => {
    if (scoopRadius <= 0.5) return [];
    const nX = Math.max(1, Math.floor(compartmentsX));
    const nY = Math.max(1, Math.floor(compartmentsY));
    const innerW = outerW - 2 * OW;
    const innerD = outerD - 2 * OW;
    const cellW = (innerW - (nX - 1) * IW) / nX;
    const cellD = (innerD - (nY - 1) * IW) / nY;
    const R = Math.min(scoopRadius, cellD - 1, bodyH - 1);
    if (R < 0.5) return [];

    const list: Array<{
      geom: THREE.BufferGeometry;
      pos: [number, number, number];
      key: string;
    }> = [];

    // Профиль scoop: четверть-окружность в плоскости YZ (радиус R),
    // вогнутая к заднему-верхнему углу отсека. Extrude по X на ширину отсека.
    // Строим как 2D shape в XY (будет использован как поперечное сечение).
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    const seg = CORNER_SEGMENTS;
    for (let i = 0; i <= seg; i++) {
      const t = i / seg;
      const a = (Math.PI / 2) * t;
      shape.lineTo(R - R * Math.cos(a), R - R * Math.sin(a));
    }
    shape.lineTo(R, 0);
    shape.closePath();

    const baseZ = baseH;

    for (let jy = 0; jy < nY; jy++) {
      for (let ix = 0; ix < nX; ix++) {
        const cx = -innerW / 2 + ix * (cellW + IW) + cellW / 2;
        const cy = -innerD / 2 + jy * (cellD + IW) + cellD / 2;
        // scoop сидит у задней стенки отсека (положительный Y)
        const backY = cy + cellD / 2 - R;
        const g = extrudeShape(shape, cellW);
        // Сейчас shape в XY, depth по Z. Нам нужно: сечение в YZ, ось extrude = X.
        // Поэтому поворачиваем geometry: rot Y by -90°, затем учитываем позицию.
        g.rotateY(-Math.PI / 2);
        g.rotateX(-Math.PI / 2);
        list.push({
          geom: g,
          pos: [cx - cellW / 2, backY, baseZ],
          key: `scoop-${ix}-${jy}`,
        });
      }
    }
    return list;
  }, [scoopRadius, compartmentsX, compartmentsY, outerW, outerD, OW, IW, bodyH, baseH]);

  // ── Label ledge: горизонтальная полка спереди каждого отсека ──
  const ledgeGeometries = useMemo(() => {
    if (labelLedgeWidth <= 0.5) return [];
    const nX = Math.max(1, Math.floor(compartmentsX));
    const nY = Math.max(1, Math.floor(compartmentsY));
    const innerW = outerW - 2 * OW;
    const innerD = outerD - 2 * OW;
    const cellW = (innerW - (nX - 1) * IW) / nX;
    const cellD = (innerD - (nY - 1) * IW) / nY;
    const W = Math.min(labelLedgeWidth, cellD - 1);
    const H = Math.min(labelLedgeHeight, 5);

    const list: Array<{
      geom: THREE.BufferGeometry;
      pos: [number, number, number];
      key: string;
    }> = [];

    // Полка сидит у передней (−Y) стенки отсека, сверху.
    for (let jy = 0; jy < nY; jy++) {
      for (let ix = 0; ix < nX; ix++) {
        const cx = -innerW / 2 + ix * (cellW + IW) + cellW / 2;
        const cy = -innerD / 2 + jy * (cellD + IW) + cellD / 2;
        const frontY = cy - cellD / 2; // перед отсека
        // Полка — rounded-rect толщиной H, шириной cellW, глубиной W
        const s = roundedRectShapeManual(cellW, W, 0);
        list.push({
          geom: extrudeShape(s, H),
          pos: [cx, frontY + W / 2, baseH + bodyH - H],
          key: `ledge-${ix}-${jy}`,
        });
      }
    }
    return list;
  }, [
    labelLedgeWidth,
    labelLedgeHeight,
    compartmentsX,
    compartmentsY,
    outerW,
    outerD,
    OW,
    IW,
    bodyH,
    baseH,
  ]);

  // Edge threshold в радианах
  const edgeAngle = EDGE_THRESHOLD_DEG;

  return (
    <group>
      {/* BASE: стандартная — клетки + мост. Lite — плоская плита */}
      {baseStyle === "lite" && baseGeometry && (
        <mesh geometry={baseGeometry} castShadow receiveShadow>
          <meshStandardMaterial color={color} roughness={0.5} metalness={0.05} />
          <Edges color={EDGE_COLOR} threshold={edgeAngle} lineWidth={2} />
        </mesh>
      )}
      {baseStyle === "standard" &&
        cells.map((c) => (
          <mesh
            key={c.key}
            geometry={c.geom}
            position={c.pos}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial color={color} roughness={0.5} metalness={0.05} />
            <Edges color={EDGE_COLOR} threshold={edgeAngle} lineWidth={2} />
          </mesh>
        ))}
      {baseStyle === "standard" && bridgeGeometry && (
        <mesh
          geometry={bridgeGeometry}
          position={[0, 0, BASE_PROFILE_H]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color={color} roughness={0.5} metalness={0.05} />
          <Edges color={EDGE_COLOR} threshold={edgeAngle} lineWidth={2} />
        </mesh>
      )}

      {/* WALLS */}
      <mesh
        geometry={wallsGeometry}
        position={[0, 0, baseH]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.05} />
        <Edges color={EDGE_COLOR} threshold={edgeAngle} lineWidth={2} />
      </mesh>

      {/* STACKING LIP */}
      {lipGeometry && (
        <mesh
          geometry={lipGeometry}
          position={[0, 0, totalH]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color={color} roughness={0.5} metalness={0.05} />
          <Edges color={EDGE_COLOR} threshold={edgeAngle} lineWidth={2} />
        </mesh>
      )}

      {/* DIVIDERS */}
      {dividerGeometries.map((d) => (
        <mesh
          key={d.key}
          geometry={d.geom}
          position={d.pos}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color={color} roughness={0.5} metalness={0.05} />
          <Edges color={EDGE_COLOR} threshold={edgeAngle} lineWidth={2} />
        </mesh>
      ))}

      {/* SCOOPS */}
      {scoopGeometries.map((s) => (
        <mesh
          key={s.key}
          geometry={s.geom}
          position={s.pos}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color={color} roughness={0.5} metalness={0.05} />
          <Edges color={EDGE_COLOR} threshold={edgeAngle} lineWidth={2} />
        </mesh>
      ))}

      {/* HOLE INDICATORS: маркеры снизу базы, показывают где в STL будут
          вычтены дырки магнитов и винтов. В превью геометрия не режется
          (нет CSG), поэтому рисуем тонкие "наклейки" на нижней грани.

          Магнит — тёмно-серый диск Ø magnetDiameter.
          Винт — яркий оранжевый диск меньшего размера В ЦЕНТРЕ магнита
          (чтобы на тёмном фоне было чётко видно "вложенную дырку под винт"). */}
      {baseStyle === "standard" &&
        computeHolePositions({
          pattern: magnets,
          xUnits,
          yUnits,
          gridSize,
        }).map((p, i) => (
          <mesh
            key={`mag-${i}`}
            position={[p.x, p.y, -0.05]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry
              args={[magnetDiameter / 2, magnetDiameter / 2, 0.1, 24]}
            />
            <meshBasicMaterial color="#1a2028" />
          </mesh>
        ))}
      {baseStyle === "standard" &&
        computeHolePositions({
          pattern: screwHoles,
          xUnits,
          yUnits,
          gridSize,
        }).map((p, i) => (
          <mesh
            key={`scr-${i}`}
            position={[p.x, p.y, -0.15]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry
              args={[
                screwHeatsetInsert ? 2.5 : 1.5,
                screwHeatsetInsert ? 2.5 : 1.5,
                0.1,
                24,
              ]}
            />
            <meshBasicMaterial
              color={screwHeatsetInsert ? "#ffcc33" : "#ffa726"}
            />
          </mesh>
        ))}

      {/* LEDGES */}
      {ledgeGeometries.map((le) => (
        <mesh
          key={le.key}
          geometry={le.geom}
          position={le.pos}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color={color} roughness={0.5} metalness={0.05} />
          <Edges color={EDGE_COLOR} threshold={edgeAngle} lineWidth={2} />
        </mesh>
      ))}
    </group>
  );
}

// Позиции индикаторов магнитов/винтов в локальных координатах бина.
// Смещение от края клетки — 8мм (стандарт Gridfinity HOLE_FROM_SIDE).
function computeHolePositions({
  pattern,
  xUnits,
  yUnits,
  gridSize,
}: {
  pattern: HolePattern;
  xUnits: number;
  yUnits: number;
  gridSize: number;
}): Array<{ x: number; y: number }> {
  if (pattern === "none") return [];
  const HOLE_FROM_SIDE = 8;
  const outerW = xUnits * gridSize - 0.5;
  const outerD = yUnits * gridSize - 0.5;
  const res: Array<{ x: number; y: number }> = [];

  if (pattern === "corner") {
    // 4 в углах всей коробки
    const hw = outerW / 2;
    const hd = outerD / 2;
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        res.push({
          x: sx * (hw - HOLE_FROM_SIDE),
          y: sy * (hd - HOLE_FROM_SIDE),
        });
      }
    }
  } else {
    // full: по 4 в каждой клетке
    for (let ix = 0; ix < xUnits; ix++) {
      for (let iy = 0; iy < yUnits; iy++) {
        const cx = -outerW / 2 + 0.25 + ix * gridSize + gridSize / 2;
        const cy = -outerD / 2 + 0.25 + iy * gridSize + gridSize / 2;
        const half = gridSize / 2;
        for (const sx of [-1, 1]) {
          for (const sy of [-1, 1]) {
            res.push({
              x: cx + sx * (half - HOLE_FROM_SIDE),
              y: cy + sy * (half - HOLE_FROM_SIDE),
            });
          }
        }
      }
    }
  }
  return res;
}

// Public: outer dimensions (для UI-подписи "Габариты модели")
export function binOuterDimensions(
  p: BinParams,
): { w: number; d: number; h: number } {
  const outerW = p.xUnits * p.gridSize - 0.5;
  const outerD = p.yUnits * p.gridSize - 0.5;
  const totalH =
    p.zUnits * HEIGHT_UNIT +
    (p.lipStyle === "none"
      ? 0
      : p.lipStyle === "thin"
        ? LIP_THIN_HEIGHT
        : LIP_HEIGHT);
  return { w: outerW, d: outerD, h: totalH };
}

export const DEFAULT_BIN_PARAMS: BinParams = {
  xUnits: 2,
  yUnits: 2,
  zUnits: 3,
  gridSize: GRID,
  outerWallThickness: DEFAULT_WALL_THICKNESS,
  lipStyle: "default",
  baseStyle: "standard",
  compartmentsX: 1,
  compartmentsY: 1,
  innerWallThickness: DEFAULT_WALL_THICKNESS,
  scoopRadius: 0,
  labelLedgeWidth: 0,
  labelLedgeHeight: 1.2,
  magnets: "none",
  screwHoles: "none",
  magnetDiameter: 6.5,
  magnetDepth: 2.4,
  screwHeatsetInsert: false,
};
