// Разделяемые типы для калькулятора себестоимости 3D-печати.
// Извлечены 1:1 из public/calculator.html — не изменять формат данных
// в localStorage, чтобы не ломать сохранённые состояния пользователей.

export type Currency = "₽" | "$" | "€" | "₸" | "Br";

export type Rates = {
  rubPerUsd: number;
  rubPerEur: number;
  rubPerKzt: number;
  rubPerByr: number;
};

export const DEFAULT_RATES: Rates = {
  rubPerUsd: 92,
  rubPerEur: 100,
  rubPerKzt: 0.155, // ~1 KZT = 0.155 RUB (1 RUB ≈ 6.44 KZT)
  rubPerByr: 28.5, // ~1 BYN = 28.5 RUB
};

// ── Мои принтеры (localStorage key: my_printers_v2) ──
export type MyPrinter = {
  id: string;
  name: string;
  power: number; // Вт
  wear: number; // ₽/час (износ)
  active: boolean;
};

// ── Филамент для мультицвета ──
export type Filament = {
  color: string; // hex #rrggbb
  name: string;
  weightG: number;
  priceInCur: number; // цена за 1кг в текущей валюте
};

// ── Слайсер при парсинге файла ──
export type Slicer =
  | "bambu"
  | "orca"
  | "prusa"
  | "cura"
  | "creality"
  | "anycubic"
  | "unknown";

export type ParsedFile = {
  timeSec: number;
  fils: Filament[];
  slicer: Slicer;
  toolChanges: number;
};

// ── Состояние расчёта (поля формы, в текущей валюте) ──
export type CalcState = {
  weight: number; // г
  plasticPrice: number; // за 1кг в текущей валюте
  multicolor: boolean;
  colorCount: number; // 2..8
  colorChangeLayers: number;
  purgePerChange: number; // г/смена
  wasteWeightInput: number; // г (ручной ввод; если 0 или не редактировался — считается автоматически)
  wasteWeightManual: boolean; // редактировалось ли пользователем вручную
  primeTowerWeight: number; // г
  time: number; // ч
  electricityRate: number; // валюта/кВт·ч
  packaging: number; // валюта
  defect: number; // %
  markup: number; // %
  // Запасной "стандартный" принтер (когда нет "моих принтеров"): power=100Вт, amortRub=25₽/ч
  customPower: number; // Вт, используется только когда нет активных "моих принтеров"
  customWear: number; // валюта/ч
  filaments: Filament[];
  currency: Currency;
};

export const DEFAULT_STATE: CalcState = {
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
  customPower: 100,
  customWear: 25,
  filaments: [],
  currency: "₽",
};

export type CostBreakdown = {
  resourceCosts: number;
  sumBeforeDefect: number;
  defectCost: number;
  totalCost: number;
  defectPct: number;
};

// ── Режим Проект ──
export type ProjectPart = {
  id: string;
  printerId: string;
  printerName: string;
  power: number;
  wear: number;
  weight: number;
  time: number;
  plastic: number;
  electricity: number;
  packaging: number;
  defect: number;
  ams: boolean;
  colorCount: number;
  cost: number; // в текущей валюте
  costRub: number; // в рублях (для отображения при смене валюты)
};

export type SavedProject = {
  id: string;
  name: string;
  parts: ProjectPart[];
  updated: number;
};
