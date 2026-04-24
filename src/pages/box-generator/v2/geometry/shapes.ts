import * as THREE from "three";
import { CORNER_SEGMENTS } from "./constants";

// Утилиты для построения 2D-фигур и base-профиля Gridfinity.

/**
 * Строит 2D Shape "скруглённый прямоугольник" в плоскости XY с центром в (0,0).
 * Используется как footprint клетки базы, полости, внешней стенки.
 */
export function roundedRectShape(
  w: number,
  h: number,
  r: number,
  segments: number = CORNER_SEGMENTS,
): THREE.Shape {
  const hw = w / 2;
  const hh = h / 2;
  const rr = Math.min(r, Math.min(hw, hh));
  const s = new THREE.Shape();
  s.moveTo(-hw + rr, -hh);
  s.lineTo(hw - rr, -hh);
  s.absarc(hw - rr, -hh + rr, rr, -Math.PI / 2, 0, false);
  // Note: three.js absarc's aClockwise param: false = CCW.
  // We need clockwise sweeping arcs for outer corner. Using segments directly:
  // Instead construct via lineTo approximation to control segments.
  return roundedRectShapeManual(w, h, r, segments);
}

export function roundedRectShapeManual(
  w: number,
  h: number,
  r: number,
  segments: number = CORNER_SEGMENTS,
): THREE.Shape {
  const hw = w / 2;
  const hh = h / 2;
  const rr = Math.max(0, Math.min(r, Math.min(hw, hh) - 1e-4));
  const s = new THREE.Shape();

  if (rr < 1e-4) {
    s.moveTo(-hw, -hh);
    s.lineTo(hw, -hh);
    s.lineTo(hw, hh);
    s.lineTo(-hw, hh);
    s.closePath();
    return s;
  }

  // Нижний край → правый-нижний угол
  s.moveTo(-hw + rr, -hh);
  s.lineTo(hw - rr, -hh);
  addArc(s, hw - rr, -hh + rr, rr, -Math.PI / 2, 0, segments);
  s.lineTo(hw, hh - rr);
  addArc(s, hw - rr, hh - rr, rr, 0, Math.PI / 2, segments);
  s.lineTo(-hw + rr, hh);
  addArc(s, -hw + rr, hh - rr, rr, Math.PI / 2, Math.PI, segments);
  s.lineTo(-hw, -hh + rr);
  addArc(s, -hw + rr, -hh + rr, rr, Math.PI, 1.5 * Math.PI, segments);
  s.closePath();
  return s;
}

function addArc(
  s: THREE.Shape,
  cx: number,
  cy: number,
  r: number,
  a0: number,
  a1: number,
  segments: number,
) {
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const a = a0 + (a1 - a0) * t;
    s.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
}

/**
 * Строит Path из Shape — нужен для extrusion-along-path.
 */
export function shapeToClosedPath(shape: THREE.Shape): THREE.CurvePath<THREE.Vector2> {
  const points = shape.getPoints();
  const path = new THREE.CurvePath<THREE.Vector2>();
  for (let i = 0; i < points.length - 1; i++) {
    path.add(new THREE.LineCurve(points[i], points[i + 1]));
  }
  // Закрываем
  path.add(
    new THREE.LineCurve(points[points.length - 1], points[0]),
  );
  return path;
}

/**
 * Строит BufferGeometry "ленты" (band) — разность между двумя плоскими shape'ами,
 * экструдированная по Z. Используется для стенок бокса и бортика-lip.
 *
 * outer/inner — 2D Shape в XY, thickness — высота по Z (экструзия вверх).
 * Возвращает geometry с плоским верхом и низом + стенками.
 */
export function bandGeometry(
  outer: THREE.Shape,
  inner: THREE.Shape,
  height: number,
): THREE.ExtrudeGeometry {
  const shape = outer.clone();
  shape.holes.push(new THREE.Path(inner.getPoints()));
  return new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: false,
    steps: 1,
    curveSegments: CORNER_SEGMENTS,
  });
}

/**
 * Строит BufferGeometry "коробки" — плоскую фигуру extrude по Z.
 */
export function extrudeShape(
  shape: THREE.Shape,
  height: number,
): THREE.ExtrudeGeometry {
  return new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: false,
    steps: 1,
    curveSegments: CORNER_SEGMENTS,
  });
}
