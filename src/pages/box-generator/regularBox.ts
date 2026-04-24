import * as THREE from "three";

// Обычная прямоугольная коробка (не Gridfinity): просто стенки + дно,
// со скруглёнными углами и опциональной простой крышкой (snap-on лип).
// Используется в режиме "Обычная коробка" генератора.

export type RegularBoxParams = {
  width: number; // X, внешний размер, мм
  depth: number; // Y, мм
  height: number; // Z, мм
  wallThickness: number; // мм
  bottomThickness: number; // мм
  cornerRadius: number; // мм (внешнее скругление углов)
  lid: "none" | "snap";
};

export const DEFAULT_BOX: RegularBoxParams = {
  width: 100,
  depth: 80,
  height: 40,
  wallThickness: 2,
  bottomThickness: 2,
  cornerRadius: 4,
  lid: "none",
};

function roundedRectShape(w: number, h: number, r: number): THREE.Shape {
  const rr = Math.max(0.01, Math.min(r, Math.min(w, h) / 2 - 0.01));
  const x0 = -w / 2,
    y0 = -h / 2;
  const x1 = w / 2,
    y1 = h / 2;
  const s = new THREE.Shape();
  s.moveTo(x0 + rr, y0);
  s.lineTo(x1 - rr, y0);
  s.absarc(x1 - rr, y0 + rr, rr, -Math.PI / 2, 0, false);
  s.lineTo(x1, y1 - rr);
  s.absarc(x1 - rr, y1 - rr, rr, 0, Math.PI / 2, false);
  s.lineTo(x0 + rr, y1);
  s.absarc(x0 + rr, y1 - rr, rr, Math.PI / 2, Math.PI, false);
  s.lineTo(x0, y0 + rr);
  s.absarc(x0 + rr, y0 + rr, rr, Math.PI, (3 * Math.PI) / 2, false);
  return s;
}

function rectPathWithRadius(w: number, h: number, r: number): THREE.Path {
  const rr = Math.max(0.01, Math.min(r, Math.min(w, h) / 2 - 0.01));
  const x0 = -w / 2,
    y0 = -h / 2;
  const x1 = w / 2,
    y1 = h / 2;
  const p = new THREE.Path();
  p.moveTo(x0 + rr, y0);
  p.lineTo(x1 - rr, y0);
  p.absarc(x1 - rr, y0 + rr, rr, -Math.PI / 2, 0, false);
  p.lineTo(x1, y1 - rr);
  p.absarc(x1 - rr, y1 - rr, rr, 0, Math.PI / 2, false);
  p.lineTo(x0 + rr, y1);
  p.absarc(x0 + rr, y1 - rr, rr, Math.PI / 2, Math.PI, false);
  p.lineTo(x0, y0 + rr);
  p.absarc(x0 + rr, y0 + rr, rr, Math.PI, (3 * Math.PI) / 2, false);
  return p;
}

export function buildRegularBox(p: RegularBoxParams = DEFAULT_BOX): THREE.Group {
  const {
    width,
    depth,
    height,
    wallThickness,
    bottomThickness,
    cornerRadius,
    lid,
  } = p;

  const parent = new THREE.Group();

  // Walls — extrude от -height/2 до +height/2, внутренняя дыра.
  const outerShape = roundedRectShape(width, depth, cornerRadius);
  const innerPath = rectPathWithRadius(
    width - wallThickness * 2,
    depth - wallThickness * 2,
    Math.max(0.5, cornerRadius - wallThickness),
  );
  outerShape.holes.push(innerPath);
  const wallsGeom = new THREE.ExtrudeGeometry(outerShape, {
    depth: height,
    bevelEnabled: false,
    steps: 1,
    curveSegments: 20,
  });
  wallsGeom.rotateX(-Math.PI / 2);
  const walls = new THREE.Mesh(wallsGeom);
  walls.position.y = 0;
  parent.add(walls);

  // Дно — thin extrude inside walls
  const floorShape = roundedRectShape(
    width - wallThickness * 2,
    depth - wallThickness * 2,
    Math.max(0.5, cornerRadius - wallThickness),
  );
  const floorGeom = new THREE.ExtrudeGeometry(floorShape, {
    depth: bottomThickness,
    bevelEnabled: false,
    steps: 1,
    curveSegments: 20,
  });
  floorGeom.rotateX(-Math.PI / 2);
  const floor = new THREE.Mesh(floorGeom);
  floor.position.y = bottomThickness;
  parent.add(floor);

  // Snap-lid: тонкий борт на высоте height, слегка уже стенок
  if (lid === "snap") {
    const lidLipW = width - wallThickness;
    const lidLipD = depth - wallThickness;
    const lidShape = roundedRectShape(
      lidLipW,
      lidLipD,
      Math.max(0.5, cornerRadius - wallThickness / 2),
    );
    const lidInner = rectPathWithRadius(
      width - wallThickness * 2 - 0.8,
      depth - wallThickness * 2 - 0.8,
      Math.max(0.5, cornerRadius - wallThickness - 0.8),
    );
    lidShape.holes.push(lidInner);
    const lidGeom = new THREE.ExtrudeGeometry(lidShape, {
      depth: 2.5,
      bevelEnabled: false,
      steps: 1,
      curveSegments: 20,
    });
    lidGeom.rotateX(-Math.PI / 2);
    const lidMesh = new THREE.Mesh(lidGeom);
    lidMesh.position.y = height + 2.5; // поверх стенок
    parent.add(lidMesh);
  }

  return parent;
}

export function regularBoxDimensions(p: RegularBoxParams): {
  w: number;
  d: number;
  h: number;
} {
  const extra = p.lid === "snap" ? 2.5 : 0;
  return { w: p.width, d: p.depth, h: p.height + extra };
}
