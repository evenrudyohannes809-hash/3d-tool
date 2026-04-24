import { Suspense, useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  Grid,
  PerspectiveCamera,
  Bounds,
  useBounds,
} from "@react-three/drei";
import * as THREE from "three";
import {
  Bin,
  type BinParams,
  binOuterDimensions,
} from "./geometry/bin";
import {
  MATERIAL_COLOR_DARK,
  MATERIAL_COLOR_LIGHT,
} from "./geometry/constants";

type ViewerProps = {
  params: BinParams;
  theme: "light" | "dark";
  fitKey: string; // меняется когда надо перецентровать
};

export function ViewerV2({ params, theme, fitKey }: ViewerProps) {
  const color = theme === "dark" ? MATERIAL_COLOR_DARK : MATERIAL_COLOR_LIGHT;
  const dims = binOuterDimensions(params);
  const maxDim = Math.max(dims.w, dims.d, dims.h);

  return (
    <div
      className="w-full h-full min-h-[360px] rounded-3xl bg-surface shadow-soft-inset overflow-hidden relative"
      style={{ touchAction: "none" }}
    >
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
          preserveDrawingBuffer: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
        }}
        onCreated={({ gl, scene }) => {
          gl.setClearColor(0x000000, 0);
          scene.background = null;
        }}
      >
        <PerspectiveCamera
          makeDefault
          position={[maxDim * 1.2, maxDim * 1.4, maxDim * 1.8]}
          fov={35}
          near={0.5}
          far={5000}
        />
        {/* Lighting: ambient + HDR environment для бликов + один directional для теней */}
        <ambientLight intensity={0.35} />
        <directionalLight
          position={[maxDim * 2, maxDim * 3, maxDim * 1.5]}
          intensity={0.9}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-left={-maxDim * 2}
          shadow-camera-right={maxDim * 2}
          shadow-camera-top={maxDim * 2}
          shadow-camera-bottom={-maxDim * 2}
          shadow-camera-near={0.1}
          shadow-camera-far={maxDim * 6}
        />

        <Suspense fallback={null}>
          <Environment preset="city" />
        </Suspense>

        {/* Сетка 42×42мм на полу */}
        <Grid
          args={[maxDim * 4, maxDim * 4]}
          cellSize={42}
          cellColor="#9ca3af"
          cellThickness={0.5}
          sectionSize={42 * 4}
          sectionColor="#6b7280"
          sectionThickness={1}
          fadeDistance={maxDim * 3}
          fadeStrength={1.5}
          position={[0, 0, -0.01]}
          rotation={[-Math.PI / 2, 0, 0]}
          infiniteGrid
        />

        <Bounds fit clip observe margin={1.3}>
          <FitOnChange fitKey={fitKey}>
            {/* rotate -90° by X so Z (up in our geometry) becomes Y (up in three.js view) */}
            <group rotation={[-Math.PI / 2, 0, 0]}>
              <Bin params={params} color={color} />
            </group>
          </FitOnChange>
        </Bounds>

        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.08}
          minDistance={maxDim * 0.5}
          maxDistance={maxDim * 6}
        />
      </Canvas>

      {/* Мини-оси внизу-справа */}
      <div className="absolute bottom-3 right-3 pointer-events-none">
        <AxesBadge />
      </div>
    </div>
  );
}

function FitOnChange({
  children,
  fitKey,
}: {
  children: React.ReactNode;
  fitKey: string;
}) {
  const bounds = useBounds();
  const last = useRef<string | null>(null);
  useEffect(() => {
    if (last.current !== fitKey) {
      last.current = fitKey;
      bounds.refresh().fit();
    }
  }, [fitKey, bounds]);
  return <>{children}</>;
}

function AxesBadge() {
  return (
    <svg width="64" height="64" viewBox="-32 -32 64 64" className="opacity-70">
      <line x1="0" y1="0" x2="22" y2="0" stroke="#ef4444" strokeWidth="2" />
      <line x1="0" y1="0" x2="0" y2="-22" stroke="#10b981" strokeWidth="2" />
      <line x1="0" y1="0" x2="-16" y2="14" stroke="#3b82f6" strokeWidth="2" />
      <text x="24" y="4" fontSize="10" fill="#ef4444">X</text>
      <text x="-5" y="-24" fontSize="10" fill="#10b981">Y</text>
      <text x="-26" y="20" fontSize="10" fill="#3b82f6">Z</text>
    </svg>
  );
}
