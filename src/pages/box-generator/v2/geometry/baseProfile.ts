import * as THREE from "three";
import { CORNER_SEGMENTS } from "./constants";

/**
 * Строит меш-базу одной Gridfinity-клетки на основе 2D-профиля.
 *
 * Подход: генерируем "оболочку" как serie of quads между
 * горизонтальными кольцами. Каждое кольцо — это rounded-rect
 * footprint на своей высоте z, с соответствующим офсетом от
 * outline и радиусом скругления.
 *
 * Это даёт смысл профиля Gridfinity (нижний скос → вертикаль →
 * верхний скос) как гладкую фаску, а не "лесенку" из extrude'ов.
 *
 * Параметры:
 *   topW, topR — ширина верха (41.5) и радиус (3.95)
 *   profile   — массив [offset_inward_from_top, z_height]
 *               (0,0) = верх/top; положительный offset = inward (уже)
 *
 * Возвращает BufferGeometry, закрытую сверху и снизу (капы).
 */
export function buildBaseShellGeometry(
  topW: number,
  topR: number,
  profile: ReadonlyArray<readonly [number, number]>, // [inward_offset, z]
  cornerSegments: number = CORNER_SEGMENTS,
): THREE.BufferGeometry {
  // Генерируем rings: массив массивов Vector3 для каждого уровня профиля
  const rings: THREE.Vector3[][] = [];
  for (const [inward, z] of profile) {
    const w = topW - 2 * inward;
    const r = Math.max(0.05, topR - inward);
    rings.push(roundedRectRing3D(w, w, r, z, cornerSegments));
  }

  // Проверяем что все ring'и одной длины
  const n = rings[0].length;
  for (const r of rings) {
    if (r.length !== n) {
      throw new Error(`ring length mismatch: ${r.length} vs ${n}`);
    }
  }

  const positions: number[] = [];
  const indices: number[] = [];

  // Вершины: ring-за-ringом
  for (const ring of rings) {
    for (const v of ring) {
      positions.push(v.x, v.y, v.z);
    }
  }

  // Квады между соседними ring'ами
  for (let r = 0; r < rings.length - 1; r++) {
    for (let i = 0; i < n; i++) {
      const a = r * n + i;
      const b = r * n + ((i + 1) % n);
      const c = (r + 1) * n + ((i + 1) % n);
      const d = (r + 1) * n + i;
      indices.push(a, b, c, a, c, d);
    }
  }

  // Нижняя капа (ring 0) — триангулируем веером от центра
  const bottomCenterIdx = positions.length / 3;
  const bottomZ = profile[0][1];
  positions.push(0, 0, bottomZ);
  const bottomRingStart = 0;
  for (let i = 0; i < n; i++) {
    const a = bottomRingStart + i;
    const b = bottomRingStart + ((i + 1) % n);
    indices.push(bottomCenterIdx, b, a); // инвертированный порядок для правильной нормали вниз
  }

  // Верхняя капа (последний ring) — веер
  const topCenterIdx = positions.length / 3;
  const topZ = profile[profile.length - 1][1];
  positions.push(0, 0, topZ);
  const topRingStart = (rings.length - 1) * n;
  for (let i = 0; i < n; i++) {
    const a = topRingStart + i;
    const b = topRingStart + ((i + 1) % n);
    indices.push(topCenterIdx, a, b);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

/**
 * Точки rounded-rect в 3D на высоте z. Порядок — по часовой стрелке
 * если смотреть сверху (+Z).
 */
function roundedRectRing3D(
  w: number,
  h: number,
  r: number,
  z: number,
  segments: number,
): THREE.Vector3[] {
  const hw = w / 2;
  const hh = h / 2;
  const rr = Math.max(0, Math.min(r, Math.min(hw, hh) - 1e-4));
  const pts: THREE.Vector3[] = [];

  // 4 угла — правый-нижний, правый-верхний, левый-верхний, левый-нижний
  const corners: Array<[number, number, number]> = [
    [hw - rr, -hh + rr, -Math.PI / 2], // right-bottom, arc from 270° to 360° (i.e. -π/2 to 0)
    [hw - rr, hh - rr, 0], // right-top
    [-hw + rr, hh - rr, Math.PI / 2], // left-top
    [-hw + rr, -hh + rr, Math.PI], // left-bottom
  ];

  for (const [cx, cy, startAngle] of corners) {
    for (let i = 0; i < segments; i++) {
      const t = i / segments;
      const a = startAngle + (Math.PI / 2) * t;
      pts.push(new THREE.Vector3(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, z));
    }
  }
  return pts;
}
