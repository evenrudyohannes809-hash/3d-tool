import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// Three.js 3D-вьюер, стилизованный под сайт. Живёт в canvas-контейнере,
// автоматически ресайзится, показывает модель с OrbitControls, лёгкой
// инфинит-сеткой-"столом" и мягким ambient+directional светом.
// Снаружи передают `mesh` (THREE.Mesh/THREE.Group) — вьюер чистит старую
// модель, ставит новую, подгоняет камеру "Fit to view".

export function Viewer({
  mesh,
  theme,
}: {
  mesh: THREE.Group | null;
  theme: "light" | "dark";
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);

  // Инициализация сцены — один раз при mount
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      40,
      container.clientWidth / container.clientHeight,
      0.1,
      5000,
    );
    camera.position.set(200, 180, 240);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(150, 250, 100);
    scene.add(dir);
    const dir2 = new THREE.DirectionalLight(0xffffff, 0.45);
    dir2.position.set(-200, 100, -150);
    scene.add(dir2);

    // "Пол" — широкая сетка с лёгким фейдом
    const grid = new THREE.GridHelper(800, 40);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.12;
    grid.position.y = 0;
    scene.add(grid);

    // Оси-ориентир в правом нижнем углу (мини RGB-оси)
    const axes = new THREE.AxesHelper(24);
    axes.position.set(0, 0.01, 0);
    scene.add(axes);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 20, 0);
    controls.minDistance = 30;
    controls.maxDistance = 2000;

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    controlsRef.current = controls;

    const onResize = () => {
      if (!container || !cameraRef.current || !rendererRef.current) return;
      cameraRef.current.aspect =
        container.clientWidth / container.clientHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(container.clientWidth, container.clientHeight);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(container);

    let raf = 0;
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else if (mat) mat.dispose();
      });
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      controlsRef.current = null;
    };
  }, []);

  // Обновление цвета сцены при смене темы
  useEffect(() => {
    const scene = sceneRef.current;
    const renderer = rendererRef.current;
    if (!scene || !renderer) return;
    // Прозрачный фон — берём цвет из обёртки через CSS.
    renderer.setClearColor(0x000000, 0);
  }, [theme]);

  // Замена модели
  useEffect(() => {
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!scene || !camera || !controls) return;

    // Убираем предыдущую
    if (modelRef.current) {
      scene.remove(modelRef.current);
      modelRef.current.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
      });
    }
    if (!mesh) return;

    // Для Three.js Mesh без своей геометрии (у нас это "контейнер"): ставим
    // материал для каждого дочернего. Материал — soft-UI-style: приятный
    // светло-синий с небольшим блеском.
    const mat = new THREE.MeshStandardMaterial({
      color: theme === "dark" ? 0x7aa6d7 : 0x5b9bd5,
      roughness: 0.5,
      metalness: 0.05,
      flatShading: false,
    });
    mesh.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (m.isMesh) m.material = mat;
    });

    scene.add(mesh);
    modelRef.current = mesh;

    // Fit to view — вычисляем bbox, подгоняем камеру
    const box = new THREE.Box3().setFromObject(mesh);
    if (!box.isEmpty()) {
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = (camera.fov * Math.PI) / 180;
      const dist = Math.abs(maxDim / Math.sin(fov / 2)) * 0.8;
      camera.position.set(
        center.x + dist * 0.75,
        center.y + dist * 0.65,
        center.z + dist * 0.95,
      );
      controls.target.copy(center);
      camera.lookAt(center);
      controls.update();
    }
  }, [mesh, theme]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[360px] rounded-3xl bg-surface shadow-soft-inset overflow-hidden"
      style={{ touchAction: "none" }}
    />
  );
}
