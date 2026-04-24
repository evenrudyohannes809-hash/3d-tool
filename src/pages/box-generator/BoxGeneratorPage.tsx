import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import * as THREE from "three";
import { usePageMeta } from "../../lib/usePageMeta";
import { getMetaByPath } from "../../lib/routes";
import { useTheme } from "../../lib/theme";
import { Label, NumberField, ModeTabs, Pill, SoftToggle } from "../calculator/ui";
import { Viewer } from "./Viewer";
import { ViewerV2 } from "./v2/Viewer";
import type { BinParams } from "./v2/geometry/bin";
import { binOuterDimensions as binOuterDimensionsV2 } from "./v2/geometry/bin";
import {
  DEFAULT_BIN,
  type GridfinityBinParams,
  type LipStyle,
  type BaseHoles,
  type BaseStyle,
} from "./gridfinity";
import {
  buildRegularBox,
  regularBoxDimensions,
  DEFAULT_BOX,
  type RegularBoxParams,
} from "./regularBox";
import { exportSTL } from "./stlExport";
import { exportGridfinitySTLviaWorker } from "./v2/exportV2";

type Mode = "gridfinity" | "regular";

export default function BoxGeneratorPage() {
  usePageMeta(getMetaByPath("/tool/box-generator"));
  const { theme } = useTheme();

  const [mode, setMode] = useState<Mode>("gridfinity");
  const [grid, setGrid] = useState<GridfinityBinParams>(DEFAULT_BIN);
  const [box, setBox] = useState<RegularBoxParams>(DEFAULT_BOX);

  // Режим "обычная коробка" рендерится из THREE.Group, который строится
  // синхронно (без CSG). Для Gridfinity-режима превью теперь идёт через
  // r3f-компонент <Bin> (см. ViewerV2) — CSG в превью не нужен.
  const [regularMesh, setRegularMesh] = useState<THREE.Group | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (mode !== "regular") return;
    try {
      setRegularMesh(buildRegularBox(box));
    } catch (e) {
      console.error("Regular box build error:", e);
      setRegularMesh(null);
    }
  }, [mode, box]);

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
      screwHeatsetInsert: grid.screwHeatsetInsert,
    }),
    [grid],
  );

  const dims =
    mode === "gridfinity"
      ? binOuterDimensionsV2(binParamsV2)
      : regularBoxDimensions(box);

  const onExport = async () => {
    if (mode === "gridfinity") {
      // Gridfinity-экспорт считает CSG в worker-потоке (магниты/винты + полость).
      const name = `gridfinity-${grid.xUnits}x${grid.yUnits}x${grid.zUnits}`;
      setExporting(true);
      try {
        await exportGridfinitySTLviaWorker(grid, name);
      } catch (e) {
        console.error("STL export error:", e);
        alert(
          "Не удалось построить STL: " +
            (e instanceof Error ? e.message : String(e)),
        );
      } finally {
        setExporting(false);
      }
    } else {
      if (!regularMesh) return;
      const name = `box-${Math.round(box.width)}x${Math.round(box.depth)}x${Math.round(box.height)}`;
      exportSTL(regularMesh, name);
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
            disabled={exporting || (mode === "regular" && !regularMesh)}
            className="btn-primary w-full"
          >
            {exporting ? "Собираю STL…" : "Скачать STL"}
          </button>
        </div>

        {/* 3D-вьюер */}
        <div className="soft p-2 sm:p-3 min-h-[420px] lg:min-h-[560px] relative">
          {mode === "gridfinity" ? (
            <ViewerV2 params={binParamsV2} theme={theme} fitKey={mode} />
          ) : (
            <Viewer mesh={regularMesh} theme={theme} fitKey={mode} />
          )}
          {exporting ? (
            <div className="absolute right-4 top-4 tag text-xs">
              Собираю STL…
            </div>
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
        <Label hint="Стандартная база — 3-уровневая с магнитами, как у Gridfinity-спеки. Lite — плоская тонкая плита (экономит пластик, но в baseplate не защёлкивается и без магнитов).">
          Тип базы
        </Label>
        <div className="flex gap-2 flex-wrap">
          {(["standard", "lite"] as BaseStyle[]).map((b) => (
            <Pill
              key={b}
              active={value.baseStyle === b}
              onClick={() => set("baseStyle", b)}
            >
              {b === "standard" ? "Стандартная" : "Lite (тонкая)"}
            </Pill>
          ))}
        </div>
      </div>

      <div>
        <Label hint="Разбить внутреннее пространство на отсеки перегородками. 1×1 — без перегородок.">
          Перегородки (отсеки)
        </Label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>По ширине</Label>
            <NumberField
              value={value.compartmentsX}
              onChange={(v) =>
                set("compartmentsX", Math.max(1, Math.min(10, Math.round(Number(v) || 1))))
              }
              min={1}
              max={10}
              step={1}
            />
          </div>
          <div>
            <Label>По глубине</Label>
            <NumberField
              value={value.compartmentsY}
              onChange={(v) =>
                set("compartmentsY", Math.max(1, Math.min(10, Math.round(Number(v) || 1))))
              }
              min={1}
              max={10}
              step={1}
            />
          </div>
        </div>
      </div>

      <div>
        <Label hint="Скос у задней стенки отсека — удобнее доставать мелочь пальцем. 0 — выключено.">
          Scoop (наклонный пол)
        </Label>
        <NumberField
          value={value.scoopRadius}
          onChange={(v) => set("scoopRadius", Math.max(0, Math.min(20, Number(v) || 0)))}
          suffix="мм"
          min={0}
          max={20}
          step={0.5}
        />
      </div>

      <div>
        <Label hint="Горизонтальная полочка спереди отсека под стикер / ярлык. 0 — выключено.">
          Label (полка под ярлык)
        </Label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Ширина</Label>
            <NumberField
              value={value.labelLedgeWidth}
              onChange={(v) =>
                set("labelLedgeWidth", Math.max(0, Math.min(30, Number(v) || 0)))
              }
              suffix="мм"
              min={0}
              max={30}
              step={0.5}
            />
          </div>
          <div>
            <Label>Толщина</Label>
            <NumberField
              value={value.labelLedgeHeight}
              onChange={(v) =>
                set("labelLedgeHeight", Math.max(0.4, Math.min(5, Number(v) || 1.2)))
              }
              suffix="мм"
              min={0.4}
              max={5}
              step={0.1}
            />
          </div>
        </div>
      </div>

      <div>
        <Label hint="Круглые пазы снизу базы под дисковые неодимовые магниты. По стандарту Gridfinity — D6×2мм (диаметр 6мм, высота 2мм). Печатный слот делается чуть больше: Ø6.5×2.4мм. Магнит вклеивается суперклеем. Нужно только если будешь использовать магнитный baseplate для фиксации бина. На модели снизу видно тёмно-серые круги — это и есть пазы.">
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
        <Label hint="Сквозные отверстия Ø3мм под винт M3 — чтобы прикрутить коробку снизу к ящику, полке, столу. Без резьбы (резьба в пластике слабая). Обычно используют саморез M3 (сам режет пластик) либо — надёжнее — заранее вплавляют паяльником латунную втулку heat-set M3 (см. чекбокс ниже), и уже в неё закручивают металлический винт. На модели снизу видно оранжевые точки — это и есть отверстия.">
          Отверстия под винты
        </Label>
        <div className="flex gap-2 flex-wrap mb-2">
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
        {value.screwHoles !== "none" ? (
          <div className="flex items-start gap-3 mt-2">
            <SoftToggle
              on={value.screwHeatsetInsert}
              onChange={(v) => set("screwHeatsetInsert", v)}
              ariaLabel="Heat-set M3 insert"
            />
            <div className="text-sm">
              <div className="font-semibold">
                Под латунную втулку heat-set M3
              </div>
              <div className="text-muted text-xs mt-0.5">
                Ø5×5мм глухое отверстие (иначе сквозное Ø3мм). Втулка даёт
                прочную металлическую резьбу — можно много раз откручивать,
                не сорвёт.
              </div>
            </div>
          </div>
        ) : null}
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
