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

  // Snap-lid: ОТДЕЛЬНАЯ плоская крышка — плита размером с коробку сверху и
  // юбка-направляющая снизу, которая на ~0.4мм меньше внутренности бокса
  // (зазор, чтобы печаталась без натяга). Рендерим её с офсетом по +Y,
  // чтоб зритель сразу видел "коробка + её крышка".
  if (lid === "snap") {
    const LID_PLATE_T = 2; // мм — толщина верхней пластины крышки
    const LID_LIP_H = 4; // мм — высота юбки, которая входит в бокс
    const CLEARANCE = 0.4; // зазор между юбкой крышки и внутренней стенкой бокса
    const OFFSET_ABOVE_BOX = 15; // мм — чтоб крышка зрительно "парила" над боксом

    const lidGroup = new THREE.Group();

    // Верхняя пластина крышки
    const plateShape = roundedRectShape(width, depth, cornerRadius);
    const plateGeom = new THREE.ExtrudeGeometry(plateShape, {
      depth: LID_PLATE_T,
      bevelEnabled: false,
      steps: 1,
      curveSegments: 20,
    });
    plateGeom.rotateX(-Math.PI / 2);
    const plate = new THREE.Mesh(plateGeom);
    plate.position.y = LID_PLATE_T; // плита "над" юбкой
    lidGroup.add(plate);

    // Юбка-направляющая (вставляется внутрь коробки)
    const lipW = width - wallThickness * 2 - CLEARANCE * 2;
    const lipD = depth - wallThickness * 2 - CLEARANCE * 2;
    const lipR = Math.max(0.3, cornerRadius - wallThickness - CLEARANCE);
    const lipShape = roundedRectShape(lipW, lipD, lipR);
    // Юбка полая внутри, чтобы экономить пластик на печати.
    const lipInner = rectPathWithRadius(
      Math.max(1, lipW - 2),
      Math.max(1, lipD - 2),
      Math.max(0.3, lipR - 1),
    );
    lipShape.holes.push(lipInner);
    const lipGeom = new THREE.ExtrudeGeometry(lipShape, {
      depth: LID_LIP_H,
      bevelEnabled: false,
      steps: 1,
      curveSegments: 20,
    });
    lipGeom.rotateX(-Math.PI / 2);
    const lip = new THREE.Mesh(lipGeom);
    lip.position.y = LID_LIP_H; // юбка "под" плитой
    lidGroup.add(lip);

    // Общий офсет: крышка сверху и слегка над коробкой, чтоб зрительно отделялась
    lidGroup.position.y = height + bottomThickness + OFFSET_ABOVE_BOX;
    parent.add(lidGroup);
  }

  return parent;
}

export function regularBoxDimensions(p: RegularBoxParams): {
  w: number;
  d: number;
  h: number;
} {
  // Размеры — только у коробки (крышка отдельная модель; показываем её габарит,
  // если она нужна, отдельно — но для простоты в UI показываем только бокс).
  return { w: p.width, d: p.depth, h: p.height };
}
