import type { Currency, Rates } from "./types";

// Конвертация "рубли → текущая валюта".
// В легаси-калькуляторе все поля формы хранят значения уже в текущей валюте,
// а курсы — rubPer{USD|EUR|KZT|BYN}. Переносим 1:1.
export function rubToCurrent(rub: number, cur: Currency, rates: Rates): number {
  if (cur === "$") return rub / rates.rubPerUsd;
  if (cur === "€") return rub / rates.rubPerEur;
  if (cur === "₸") return rub / rates.rubPerKzt;
  if (cur === "Br") return rub / rates.rubPerByr;
  return rub;
}

export function currentToRub(val: number, cur: Currency, rates: Rates): number {
  if (cur === "$") return val * rates.rubPerUsd;
  if (cur === "€") return val * rates.rubPerEur;
  if (cur === "₸") return val * rates.rubPerKzt;
  if (cur === "Br") return val * rates.rubPerByr;
  return val;
}

// При смене валюты поля формы пересчитываются через рубли.
export function convertAcross(
  val: number,
  from: Currency,
  to: Currency,
  rates: Rates,
): number {
  if (from === to) return val;
  const rub = currentToRub(val, from, rates);
  return rubToCurrent(rub, to, rates);
}

export function formatMoney(value: number, cur: Currency): string {
  const n = Number.isFinite(value) ? value : 0;
  if (cur === "₽")
    return (
      Number(n.toFixed(0)).toLocaleString("ru-RU") + "\u00A0₽"
    );
  if (cur === "₸")
    return (
      Number(n.toFixed(0)).toLocaleString("ru-RU") + "\u00A0₸"
    );
  if (cur === "Br") return n.toFixed(2) + "\u00A0Br";
  return n.toFixed(2) + "\u00A0" + cur;
}

// Живые курсы (ЦБ-агрегатор open.er-api.com). Fallback — DEFAULT_RATES.
export async function fetchRates(): Promise<Partial<Rates> | null> {
  try {
    const r = await fetch("https://open.er-api.com/v6/latest/RUB");
    const data = await r.json();
    if (!data || !data.rates) return null;
    const out: Partial<Rates> = {};
    if (data.rates.USD > 0) out.rubPerUsd = 1 / data.rates.USD;
    if (data.rates.EUR > 0) out.rubPerEur = 1 / data.rates.EUR;
    if (data.rates.KZT > 0) out.rubPerKzt = 1 / data.rates.KZT;
    if (data.rates.BYN > 0) out.rubPerByr = 1 / data.rates.BYN;
    return out;
  } catch {
    return null;
  }
}
