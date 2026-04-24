import { DEFAULT_STATE, type CalcState, type Currency, type MyPrinter, type SavedProject } from "./types";

// Ключи localStorage — совместимы с легаси public/calculator.html,
// чтобы у существующих пользователей не пропали сохранённые принтеры,
// курс валюты и текущее состояние.
export const STATE_KEY = "calc_state_v5";
export const CURRENCY_KEY = "calc_currency";
export const PRINTERS_KEY = "my_printers_v2";
export const PROJECTS_KEY = "projects_v1";

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(key: string, val: string): void {
  try {
    localStorage.setItem(key, val);
  } catch {
    /* ignore (Safari private mode, file://) */
  }
}

export function loadCurrency(): Currency {
  const s = safeGet(CURRENCY_KEY);
  if (s === "₽" || s === "$" || s === "€" || s === "₸" || s === "Br") return s;
  // Легаси не записывал ₸/Br — сбрасываем на ₽ если значение не распознано.
  return "₽";
}

export function saveCurrency(c: Currency): void {
  safeSet(CURRENCY_KEY, c);
}

export function loadState(): CalcState {
  const raw = safeGet(STATE_KEY);
  if (!raw) return { ...DEFAULT_STATE, currency: loadCurrency() };
  try {
    const s = JSON.parse(raw) as Partial<CalcState> & Record<string, unknown>;
    const cur: Currency =
      s.currency === "₽" ||
      s.currency === "$" ||
      s.currency === "€" ||
      s.currency === "₸" ||
      s.currency === "Br"
        ? s.currency
        : loadCurrency();
    return {
      ...DEFAULT_STATE,
      ...s,
      currency: cur,
      // Защита от мусора в массиве филаментов
      filaments: Array.isArray(s.filaments) ? s.filaments : [],
      wasteWeightManual: false, // Ручной режим — поле в памяти, не в LS
    } as CalcState;
  } catch {
    return { ...DEFAULT_STATE, currency: loadCurrency() };
  }
}

export function saveState(s: CalcState): void {
  safeSet(STATE_KEY, JSON.stringify(s));
}

// ── Мои принтеры ──
export function loadPrinters(): MyPrinter[] {
  const raw = safeGet(PRINTERS_KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    // В легаси при загрузке active всегда сбрасывается в false (пользователь
    // сам активирует нужный). Делаем так же.
    return (arr as MyPrinter[]).map((p) => ({ ...p, active: false }));
  } catch {
    return [];
  }
}

export function savePrinters(list: MyPrinter[]): void {
  safeSet(PRINTERS_KEY, JSON.stringify(list));
}

// ── Сохранённые проекты ──
export function loadProjects(): SavedProject[] {
  const raw = safeGet(PROJECTS_KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as SavedProject[]) : [];
  } catch {
    return [];
  }
}

export function saveProjects(list: SavedProject[]): void {
  safeSet(PROJECTS_KEY, JSON.stringify(list));
}
