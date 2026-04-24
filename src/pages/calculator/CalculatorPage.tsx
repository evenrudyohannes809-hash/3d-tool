import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { usePageMeta } from "../../lib/usePageMeta";
import { getMetaByPath } from "../../lib/routes";
import type {
  CalcState,
  Currency,
  MyPrinter,
  ProjectPart,
  Rates,
} from "../../lib/calc/types";
import { DEFAULT_RATES } from "../../lib/calc/types";
import { convertAcross, fetchRates, formatMoney } from "../../lib/calc/currency";
import {
  getCostBreakdown,
  getPrice,
  calcForPrinter,
} from "../../lib/calc/formulas";
import {
  loadPrinters,
  loadState,
  saveCurrency,
  savePrinters,
  saveState,
} from "../../lib/calc/storage";
import { rubToCurrent } from "../../lib/calc/currency";
import { CurrencyPills, ModeTabs } from "./ui";
import { useToast } from "./useToast";
import CostPanel from "./CostPanel";
import PricePanel from "./PricePanel";
import FilePanel from "./FilePanel";
import PrintersSection from "./PrintersSection";
import ProjectSection from "./ProjectSection";

type Mode = "cost" | "price" | "file";

// Пересчёт "валютных" полей при смене валюты. Цветовые филаменты,
// стандартный принтер (customWear), цена пластика, тариф, упаковка, цена
// промышл. пресетов — всё в валюте формы и требует конвертации.
function convertStateCurrency(
  s: CalcState,
  next: Currency,
  rates: Rates,
): CalcState {
  const from = s.currency;
  if (from === next) return s;
  const conv = (v: number) => convertAcross(v, from, next, rates);
  return {
    ...s,
    plasticPrice: conv(s.plasticPrice),
    electricityRate: conv(s.electricityRate),
    packaging: conv(s.packaging),
    customWear: conv(s.customWear),
    filaments: s.filaments.map((f) => ({ ...f, priceInCur: conv(f.priceInCur) })),
    currency: next,
  };
}

export default function CalculatorPage() {
  usePageMeta(getMetaByPath("/tool/calculator"));
  const [state, setState] = useState<CalcState>(() => loadState());
  const [printers, setPrinters] = useState<MyPrinter[]>(() => loadPrinters());
  const [rates, setRates] = useState<Rates>(DEFAULT_RATES);
  const [mode, setMode] = useState<Mode>("cost");
  const [projectActive, setProjectActive] = useState(false);
  const [projectParts, setProjectParts] = useState<ProjectPart[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const { show: showToast, ToastView } = useToast();
  const initialMount = useRef(true);

  // Живые курсы (тихий fallback на дефолты).
  useEffect(() => {
    fetchRates().then((r) => {
      if (!r) return;
      setRates((prev) => ({ ...prev, ...r }));
    });
  }, []);

  // Сохраняем в localStorage
  useEffect(() => {
    if (initialMount.current) {
      initialMount.current = false;
      return;
    }
    saveState(state);
  }, [state]);
  useEffect(() => {
    savePrinters(printers);
  }, [printers]);
  useEffect(() => {
    saveCurrency(state.currency);
  }, [state.currency]);

  function patchState(patch: Partial<CalcState>) {
    setState((prev) => ({ ...prev, ...patch }));
  }

  function changeCurrency(c: Currency) {
    setState((prev) => convertStateCurrency(prev, c, rates));
  }

  const activePrinters = useMemo(
    () => printers.filter((p) => p.active),
    [printers],
  );
  const breakdown = useMemo(
    () => getCostBreakdown(state, activePrinters, rates),
    [state, activePrinters, rates],
  );
  const price = useMemo(
    () => getPrice(state, activePrinters, rates),
    [state, activePrinters, rates],
  );

  // В режиме Проект: итог по деталям (в рублях), для вкладки Цена
  const projectTotalRub = useMemo(
    () =>
      projectActive
        ? projectParts.reduce((a, p) => a + (p.costRub || 0), 0)
        : 0,
    [projectActive, projectParts],
  );
  const projectTotalInCur = useMemo(
    () => rubToCurrent(projectTotalRub, state.currency, rates),
    [projectTotalRub, state.currency, rates],
  );

  // Лейбл для вкладки "Цена"
  const priceLabel = useMemo(() => {
    if (projectActive) {
      // Имя проекта, если есть текущий id
      if (currentProjectId) {
        try {
          const list = JSON.parse(
            localStorage.getItem("projects_v1") || "[]",
          ) as Array<{ id: string; name: string }>;
          const p = list.find((x) => x.id === currentProjectId);
          if (p) return "🔧 " + p.name;
        } catch {
          /* ignore */
        }
      }
      return "🔧 Итого по проекту";
    }
    const one = activePrinters[0];
    if (one) return "🖨 " + one.name;
    return "Цена для клиента";
  }, [projectActive, currentProjectId, activePrinters]);

  async function copyPrice() {
    const total =
      projectActive
        ? projectTotalInCur * (1 + (state.markup || 0) / 100)
        : price;
    const txt = formatMoney(total, state.currency);
    try {
      await navigator.clipboard.writeText(txt);
      showToast("Скопировано: " + txt);
    } catch {
      showToast(txt);
    }
  }

  // Цена в сравнении по принтерам при активности нескольких (для предпросмотра)
  useEffect(() => {
    // Подавляем unused-warn, демонстрирует связь с activePrinters на одной сборке
    void calcForPrinter;
  }, []);

  return (
    <section className="container-app py-6 sm:py-10">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-muted hover:text-ink font-bold transition"
        >
          <span aria-hidden>←</span> Все утилиты
        </Link>
        <div className="flex items-center gap-2.5">
          <span className="tag">
            <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-accent2 inline-block" />
            Готово
          </span>
        </div>
      </div>

      <div className="mb-8 max-w-2xl mx-auto text-center">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          Калькулятор себестоимости 3D-печати
        </h1>
        <p className="text-muted mt-3 text-sm leading-relaxed font-semibold">
          Считает себестоимость по весу/часам/пластику/электричеству,
          анализирует <span className="text-ink">.3mf</span> и{" "}
          <span className="text-ink">.gcode</span>, поддерживает мультицвет
          AMS и все популярные принтеры.
        </p>
      </div>

      <div className="mx-auto max-w-3xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CurrencyPills value={state.currency} onChange={changeCurrency} />
          <ModeTabs
            value={mode}
            onChange={setMode}
            options={[
              { value: "cost", label: "Себестоимость" },
              { value: "price", label: "Цена" },
              { value: "file", label: "Файл" },
            ]}
          />
        </div>

        <PrintersSection
          printers={printers}
          setPrinters={setPrinters}
          state={state}
          rates={rates}
          onToast={showToast}
        />

        <ProjectSection
          active={projectActive}
          onToggle={() => setProjectActive((v) => !v)}
          state={state}
          setState={patchState}
          printers={printers}
          setPrinters={setPrinters}
          rates={rates}
          currency={state.currency}
          parts={projectParts}
          setParts={setProjectParts}
          currentProjectId={currentProjectId}
          setCurrentProjectId={setCurrentProjectId}
          onToast={showToast}
        />

        {mode === "cost" ? (
          <CostPanel
            state={state}
            setState={patchState}
            breakdown={breakdown}
            currency={state.currency}
          />
        ) : null}
        {mode === "price" ? (
          <PricePanel
            state={state}
            setState={patchState}
            price={price}
            currency={state.currency}
            printerLabel={priceLabel}
            projectTotal={projectActive ? projectTotalInCur : null}
            onCopy={copyPrice}
          />
        ) : null}
        {mode === "file" ? (
          <FilePanel
            state={state}
            setState={patchState}
            onToast={showToast}
          />
        ) : null}

        <button
          type="button"
          onClick={() => {
            if (!confirm("Сбросить все поля?")) return;
            setState((prev) => ({
              ...prev,
              weight: 0,
              plasticPrice: 0,
              multicolor: false,
              colorCount: 2,
              colorChangeLayers: 0,
              purgePerChange: 0.6,
              wasteWeightInput: 0,
              wasteWeightManual: false,
              primeTowerWeight: 0,
              time: 0,
              electricityRate: 0,
              packaging: 0,
              defect: 0,
              markup: 0,
              filaments: [],
            }));
            showToast("Поля очищены");
          }}
          className="btn w-full text-muted"
        >
          ✕ Сбросить все поля
        </button>
      </div>

      {ToastView}
    </section>
  );
}
