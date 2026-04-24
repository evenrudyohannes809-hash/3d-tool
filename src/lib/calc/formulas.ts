import type { CalcState, CostBreakdown, MyPrinter, Rates } from "./types";
import { rubToCurrent } from "./currency";

// Чистые формулы расчёта себестоимости и цены.
// Портированы 1:1 из public/calculator.html (функции getCostBreakdown,
// getPrice, getPlasticCost, getWasteWeight, getAmortizationPerHour,
// getPrinterPowerAndAmortization). Никаких изменений формул.

export function num(v: unknown): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Math.max(0, Number.isFinite(n) ? n : 0);
}

export function int(v: unknown): number {
  const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
  return Math.max(0, Number.isFinite(n) ? n : 0);
}

// Активный принтер, определяющий мощность и износ.
// Если у юзера есть "мои принтеры" с активным флагом — берём первый из них.
// Иначе используем "стандартный" fallback (customPower / customWear).
// Износ стандартного принтера задаётся напрямую в валюте формы (customWear),
// износ "моих принтеров" хранится в рублях и переводится в текущую валюту.
export function getPrinterPowerAndAmortization(
  state: CalcState,
  activePrinters: MyPrinter[],
  rates: Rates,
): { power: number; amortizationPerHour: number } {
  const myActive = activePrinters[0];
  if (myActive) {
    return {
      power: myActive.power,
      amortizationPerHour: rubToCurrent(myActive.wear, state.currency, rates),
    };
  }
  return {
    power: num(state.customPower),
    amortizationPerHour: num(state.customWear),
  };
}

// Каждый доп. цвет добавляет +30% к базовому износу (1 цвет = ×1.0, 2 = ×1.3, ...)
export function getAmortizationPerHour(
  state: CalcState,
  activePrinters: MyPrinter[],
  rates: Rates,
): number {
  const info = getPrinterPowerAndAmortization(state, activePrinters, rates);
  let mult = 1.0;
  if (state.multicolor) {
    const colors = int(state.colorCount);
    mult = 1.0 + 0.3 * (colors - 1);
  }
  return info.amortizationPerHour * mult;
}

export function getCalculatedWasteWeight(state: CalcState): number {
  const colors = int(state.colorCount);
  const layers = int(state.colorChangeLayers);
  const purge = num(state.purgePerChange);
  return Math.max(0, (colors - 1) * layers) * purge;
}

export function getWasteWeight(state: CalcState): number {
  if (!state.multicolor) return 0;
  if (state.wasteWeightManual) return num(state.wasteWeightInput);
  return getCalculatedWasteWeight(state);
}

export function getPlasticCost(
  state: CalcState,
  effectiveWeight: number,
): number {
  if (state.multicolor && state.filaments.length > 1) {
    const avgPrice =
      state.filaments.reduce((a, f) => a + f.priceInCur, 0) /
      state.filaments.length;
    let cost = 0;
    state.filaments.forEach((f) => {
      cost += (f.weightG / 1000) * f.priceInCur;
    });
    const w = num(state.weight);
    const waste = getWasteWeight(state);
    const tower = state.multicolor ? num(state.primeTowerWeight) : 0;
    // Остаток — чтобы учесть любой "лишний" вес, не раскиданный по цветам.
    // Плюс отходы и башня чистки по средней цене.
    // Легаси прибавляет только (waste+tower)*avgPrice, оставшееся из weight
    // (если weight > sum(filaments.weightG)) не учитывается — воспроизводим как есть.
    void w; // Для параллели с легаси-кодом, где w читается, но не участвует.
    cost += ((waste + tower) / 1000) * avgPrice;
    return cost;
  }
  return (effectiveWeight / 1000) * num(state.plasticPrice);
}

export function getCostBreakdown(
  state: CalcState,
  activePrinters: MyPrinter[],
  rates: Rates,
): CostBreakdown {
  const w = num(state.weight);
  const waste = getWasteWeight(state);
  const tower = state.multicolor ? num(state.primeTowerWeight) : 0;
  const effectiveW = w + waste + tower;

  const t = num(state.time);
  const rate = num(state.electricityRate);
  const pack = num(state.packaging);
  const defectPct = int(state.defect);
  const power = getPrinterPowerAndAmortization(state, activePrinters, rates)
    .power;

  const plastic = getPlasticCost(state, effectiveW);
  const electricity = t * (power / 1000) * rate;
  const amortization = t * getAmortizationPerHour(state, activePrinters, rates);

  const resourceCosts = plastic + electricity + amortization;
  const sumBeforeDefect = resourceCosts;
  const defectCost = sumBeforeDefect * (defectPct / 100);
  const totalCost = sumBeforeDefect + defectCost + pack;
  return { resourceCosts, sumBeforeDefect, defectCost, totalCost, defectPct };
}

export function getPrice(
  state: CalcState,
  activePrinters: MyPrinter[],
  rates: Rates,
): number {
  const total = getCostBreakdown(state, activePrinters, rates).totalCost;
  return total * (1 + num(state.markup) / 100);
}

// Расчёт для одного "моего принтера" из списка — используется в блоке
// сравнения и в режиме Проект. Формула портирована 1:1 из calcFor() в легаси.
export function calcForPrinter(state: CalcState, p: MyPrinter): number {
  const w = num(state.weight);
  const t = num(state.time);
  const rate = num(state.electricityRate);
  const pack = num(state.packaging);
  const def = int(state.defect);
  const plastic = num(state.plasticPrice);
  const mult = state.multicolor
    ? Math.max(1, 1 + 0.3 * (int(state.colorCount) - 1))
    : 1;
  const cost =
    (w / 1000) * plastic + t * (p.power / 1000) * rate + t * p.wear * mult;
  return cost + cost * (def / 100) + pack;
}
