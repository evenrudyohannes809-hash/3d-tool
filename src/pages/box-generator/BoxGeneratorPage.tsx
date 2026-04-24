import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import * as THREE from "three";
import { usePageMeta } from "../../lib/usePageMeta";
import { getMetaByPath } from "../../lib/routes";
import { useTheme } from "../../lib/theme";
import { Label, NumberField, ModeTabs, Pill } from "../calculator/ui";
import { Viewer } from "./Viewer";
import { ViewerV2 } from "./v2/Viewer";
import type { BinParams } from "./v2/geometry/bin";
import { binOuterDimensions as binOuterDimensionsV2 } from "./v2/geometry/bin";
import {
  buildGridfinityBin,
  DEFAULT_BIN,
  type GridfinityBinParams,
  type LipStyle,
  type BaseHoles,
} from "./gridfinity";
import {
  buildRegularBox,
  regularBoxDimensions,
  DEFAULT_BOX,
  type RegularBoxParams,
} from "./regularBox";
import { exportSTL } from "./stlExport";

type Mode = "gridfinity" | "regular";

export default function BoxGeneratorPage() {
  usePageMeta(getMetaByPath("/tool/box-generator"));
  const { theme } = useTheme();

  const [mode, setMode] = useState<Mode>("gridfinity");
  const [grid, setGrid] = useState<GridfinityBinParams>(DEFAULT_BIN);
  const [box, setBox] = useState<RegularBoxParams>(DEFAULT_BOX);

  // Геометрию Gridfinity строит WASM-модуль manifold-3d асинхронно, поэтому
  // держим её в state и обновляем через useEffect с cancellation.
  const [mesh, setMesh] = useState<THREE.Group | null>(null);
  const [building, setBuilding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setBuilding(true);
    const build = async () => {
      try {
        const g =
          mode === "gridfinity"
            ? await buildGridfinityBin(grid)
            : buildRegularBox(box);
        if (!cancelled) setMesh(g);
      } catch (e) {
        console.error("Build error:", e);
        if (!cancelled) setMesh(null);
      } finally {
        if (!cancelled) setBuilding(false);
      }
    };
    build();
    return () => {
      cancelled = true;
    };
  }, [mode, grid, box]);

  // Маппинг старых параметров grid → новый BinParams для V2-вьюера
  const binParamsV2: BinParams = useMemo(
    () => ({
      xUnits: grid.xUnits,
      yUnits: grid.yUnits,
      zUnits: grid.zUnits,
      gridSize: grid.gridSize ?? 42,
      outerWallThickness: grid.outerWallThickness,
      lipStyle: grid.lipStyle,
      baseStyle: grid.baseStyle,
      compartmentsX: grid.compartmentsX,
      compartmentsY: grid.compartmentsY,
      innerWallThickness: 1.2,
      scoopRadius: grid.scoopRadius,
      labelLedgeWidth: grid.labelLedgeWidth,
      labelLedgeHeight: grid.labelLedgeHeight,
      magnets: grid.magnets,
      screwHoles: grid.screwHoles,
      magnetDiameter: grid.magnetDiameter,
      magnetDepth: grid.magnetDepth,
    }),
    [grid],
  );

  const dims =
    mode === "gridfinity"
      ? binOuterDimensionsV2(binParamsV2)
      : regularBoxDimensions(box);

  const onExport = () => {
    if (!mesh) return;
    if (mode === "gridfinity") {
      const name = `gridfinity-${grid.xUnits}x${grid.yUnits}x${grid.zUnits}`;
      exportSTL(mesh, name);
    } else {
      const name = `box-${Math.round(box.width)}x${Math.round(box.depth)}x${Math.round(box.height)}`;
      exportSTL(mesh, name);
    }
  };

  return (
    <section className="container-app py-8 sm:py-12">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-muted hover:text-ink font-bold transition mb-5"
      >
        <span aria-hidden>←</span> Все утилиты
      </Link>

      <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Генератор коробок
          </h1>
          <p className="text-muted mt-1.5 text-sm">
            Параметрический STL для 3D-печати: Gridfinity-bin (совместимый со
            стандартом) и обычные коробки со скругленными углами.
          </p>
        </div>
        <span className="tag">Beta</span>
      </div>

      {/* Переключатель режима */}
      <div className="max-w-sm mb-5">
        <ModeTabs
          value={mode}
          onChange={setMode}
          options={[
            { value: "gridfinity", label: "Gridfinity" },
            { value: "regular", label: "Обычная коробка" },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-5">
        {/* Левая панель параметров */}
        <div className="soft p-5 space-y-5">
          {mode === "gridfinity" ? (
            <GridfinityControls value={grid} onChange={setGrid} />
          ) : (
            <RegularBoxControls value={box} onChange={setBox} />
          )}

          {/* Сводка размеров */}
          <div className="soft-inset rounded-2xl p-4">
            <div className="text-xs font-bold text-muted mb-2 uppercase tracking-wider">
              Габариты модели
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <DimCell label="X" value={dims.w} />
              <DimCell label="Y" value={dims.d} />
              <DimCell label="Z" value={dims.h} />
            </div>
          </div>

          <button
            type="button"
            onClick={onExport}
            disabled={!mesh || building}
            className="btn-primary w-full"
          >
            {building && !mesh ? "Подготовка..." : "Скачать STL"}
          </button>
        </div>

        {/* 3D-вьюер */}
        <div className="soft p-2 sm:p-3 min-h-[420px] lg:min-h-[560px] relative">
          {mode === "gridfinity" ? (
            <ViewerV2 params={binParamsV2} theme={theme} fitKey={mode} />
          ) : (
            <Viewer mesh={mesh} theme={theme} fitKey={mode} />
          )}
          {building && mode === "regular" ? (
            <div className="absolute right-4 top-4 tag text-xs">Считаю…</div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

// ─── Параметры Gridfinity ────────────────────────────────────────────

function GridfinityControls({
  value,
  onChange,
}: {
  value: GridfinityBinParams;
  onChange: (v: GridfinityBinParams) => void;
}) {
  const set = <K extends keyof GridfinityBinParams>(
    k: K,
    v: GridfinityBinParams[K],
  ) => onChange({ ...value, [k]: v });

  // Ввод идёт в миллиметрах — так понятнее чем "U". Внутри храним
  // целое количество юнитов (шаг 42мм для XY, 7мм для Z).
  const g = value.gridSize ?? 42;
  const widthMm = value.xUnits * g;
  const depthMm = value.yUnits * g;
  const heightMm = value.zUnits * 7;

  const setWidthMm = (mm: number) => {
    const u = Math.max(1, Math.min(20, Math.round(mm / g)));
    set("xUnits", u);
  };
  const setDepthMm = (mm: number) => {
    const u = Math.max(1, Math.min(20, Math.round(mm / g)));
    set("yUnits", u);
  };
  const setHeightMm = (mm: number) => {
    const u = Math.max(1, Math.min(30, Math.round(mm / 7)));
    set("zUnits", u);
  };

  return (
    <>
      <div>
        <Label hint="Стандарт Gridfinity — 42 мм. Меняй только если знаешь зачем.">
          Размер клетки сетки
        </Label>
        <NumberField
          value={value.gridSize ?? 42}
          onChange={(v) => set("gridSize", Math.max(20, Number(v) || 42))}
          suffix="мм"
          min={20}
          max={100}
        />
      </div>

      <div>
        <div className="text-xs font-bold text-muted mb-2 uppercase tracking-wider">
          Размеры коробки
        </div>
        <div className="grid grid-cols-3 gap-3 items-end">
          <div>
            <Label>Ширина</Label>
            <NumberField
              value={widthMm}
              onChange={(v) => setWidthMm(Number(v) || g)}
              suffix="мм"
              min={g}
              max={g * 20}
              step={g}
            />
          </div>
          <div>
            <Label>Глубина</Label>
            <NumberField
              value={depthMm}
              onChange={(v) => setDepthMm(Number(v) || g)}
              suffix="мм"
              min={g}
              max={g * 20}
              step={g}
            />
          </div>
          <div>
            <Label>Высота</Label>
            <NumberField
              value={heightMm}
              onChange={(v) => setHeightMm(Number(v) || 7)}
              suffix="мм"
              min={7}
              max={7 * 30}
              step={7}
            />
          </div>
        </div>
        <div className="text-xs text-muted mt-2">
          Шаг по ширине и глубине — 42 мм (одна клетка Gridfinity), по высоте —
          7 мм. Итого в юнитах: {value.xUnits}×{value.yUnits}×{value.zUnits}.
        </div>
      </div>

      <div>
        <Label>Внешняя стенка</Label>
        <NumberField
          value={value.outerWallThickness}
          onChange={(v) =>
            set("outerWallThickness", Math.max(0.4, Number(v) || 1.2))
          }
          suffix="мм"
          min={0.4}
          max={3}
          step={0.1}
        />
      </div>

      <div>
        <Label hint="Это НЕ крышка. Это стыковочный бортик сверху, чтобы коробки защёлкивались друг на друга — фирменная фича стандарта Gridfinity. Без lip коробки не стакаются.">
          Стыковочный бортик (stacking lip)
        </Label>
        <div className="flex gap-2 flex-wrap">
          {(["default", "thin", "none"] as LipStyle[]).map((l) => (
            <Pill
              key={l}
              active={value.lipStyle === l}
              onClick={() => set("lipStyle", l)}
            >
              {l === "default"
                ? "Стандартный"
                : l === "thin"
                  ? "Тонкий"
                  : "Без бортика"}
            </Pill>
          ))}
        </div>
      </div>

      <div>
        <Label hint="Пазы снизу под неодимовые магниты, которыми коробка притягивается к металлической baseplate. Смотри снизу модели (поверни мышью).">
          Пазы для магнитов
        </Label>
        <div className="flex gap-2 flex-wrap mb-2">
          {(["none", "corner", "full"] as BaseHoles[]).map((l) => (
            <Pill
              key={l}
              active={value.magnets === l}
              onClick={() => set("magnets", l)}
            >
              {l === "none"
                ? "Нет"
                : l === "corner"
                  ? "Только углы коробки"
                  : "В каждой клетке"}
            </Pill>
          ))}
        </div>
        {value.magnets !== "none" ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Диаметр</Label>
              <NumberField
                value={value.magnetDiameter}
                onChange={(v) =>
                  set("magnetDiameter", Math.max(2, Math.min(12, Number(v) || 6.5)))
                }
                suffix="мм"
                min={2}
                max={12}
                step={0.1}
              />
            </div>
            <div>
              <Label>Глубина</Label>
              <NumberField
                value={value.magnetDepth}
                onChange={(v) =>
                  set("magnetDepth", Math.max(0.5, Math.min(6, Number(v) || 2.4)))
                }
                suffix="мм"
                min={0.5}
                max={6}
                step={0.1}
              />
            </div>
          </div>
        ) : null}
      </div>

      <div>
        <Label hint="Сквозные 3мм отверстия — коробку можно прикрутить к полке / столу.">
          Отверстия под винты
        </Label>
        <div className="flex gap-2 flex-wrap">
          {(["none", "corner", "full"] as BaseHoles[]).map((l) => (
            <Pill
              key={l}
              active={value.screwHoles === l}
              onClick={() => set("screwHoles", l)}
            >
              {l === "none"
                ? "Нет"
                : l === "corner"
                  ? "Только углы коробки"
                  : "В каждой клетке"}
            </Pill>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── Параметры обычной коробки ──────────────────────────────────────

function RegularBoxControls({
  value,
  onChange,
}: {
  value: RegularBoxParams;
  onChange: (v: RegularBoxParams) => void;
}) {
  const set = <K extends keyof RegularBoxParams>(k: K, v: RegularBoxParams[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label>Ширина</Label>
          <NumberField
            value={value.width}
            onChange={(v) => set("width", Math.max(10, Number(v) || 100))}
            suffix="мм"
            min={10}
            max={500}
          />
        </div>
        <div>
          <Label>Глубина</Label>
          <NumberField
            value={value.depth}
            onChange={(v) => set("depth", Math.max(10, Number(v) || 80))}
            suffix="мм"
            min={10}
            max={500}
          />
        </div>
        <div>
          <Label>Высота</Label>
          <NumberField
            value={value.height}
            onChange={(v) => set("height", Math.max(5, Number(v) || 40))}
            suffix="мм"
            min={5}
            max={500}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Стенка</Label>
          <NumberField
            value={value.wallThickness}
            onChange={(v) =>
              set("wallThickness", Math.max(0.4, Number(v) || 2))
            }
            suffix="мм"
            min={0.4}
            max={10}
            step={0.1}
          />
        </div>
        <div>
          <Label>Дно</Label>
          <NumberField
            value={value.bottomThickness}
            onChange={(v) =>
              set("bottomThickness", Math.max(0.4, Number(v) || 2))
            }
            suffix="мм"
            min={0.4}
            max={10}
            step={0.1}
          />
        </div>
      </div>

      <div>
        <Label>Скругление углов</Label>
        <NumberField
          value={value.cornerRadius}
          onChange={(v) => set("cornerRadius", Math.max(0.1, Number(v) || 4))}
          suffix="мм"
          min={0.1}
          max={50}
          step={0.5}
        />
      </div>

      <div>
        <Label hint="Отдельная крышка-защёлка печатается отдельным прогоном">
          Крышка
        </Label>
        <div className="flex gap-2 flex-wrap">
          {(["none", "snap"] as Array<"none" | "snap">).map((l) => (
            <Pill
              key={l}
              active={value.lid === l}
              onClick={() => set("lid", l)}
            >
              {l === "none" ? "Без крышки" : "Snap-крышка"}
            </Pill>
          ))}
        </div>
      </div>

      <div className="soft-inset rounded-2xl p-3 text-xs text-muted leading-relaxed">
        Совет: толщина стенки ≥ 2×диаметр сопла. Для сопла 0.4мм — стенка
        от 0.8мм, лучше 1.2–2 мм.
      </div>
    </>
  );
}

function DimCell({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-[10px] font-extrabold text-muted">{label}</div>
      <div className="text-base font-extrabold text-ink">
        {value.toFixed(1)} <span className="text-muted text-xs">мм</span>
      </div>
    </div>
  );
}
