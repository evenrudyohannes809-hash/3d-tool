import type {
  CalcState,
  CostBreakdown,
  Currency,
  Filament,
} from "../../lib/calc/types";
import { formatMoney } from "../../lib/calc/currency";
import { getCalculatedWasteWeight } from "../../lib/calc/formulas";
import { Label, NumberField, SoftToggle, TextField } from "./ui";

type Props = {
  state: CalcState;
  setState: (patch: Partial<CalcState>) => void;
  breakdown: CostBreakdown;
  currency: Currency;
};

export default function CostPanel({
  state,
  setState,
  breakdown,
  currency,
}: Props) {
  return (
    <div className="space-y-5">
      <div className="soft p-5 sm:p-6">
        <div className="text-sm font-extrabold text-ink mb-4">
          📦 Материал
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label>
            <Label>Вес изделия (г)</Label>
            <NumberField
              value={state.weight || ""}
              onChange={(v) => setState({ weight: parseFloat(v) || 0 })}
              placeholder="0"
              suffix="г"
              ariaLabel="Вес изделия в граммах"
            />
          </label>
          <label>
            <Label>Цена пластика (/кг)</Label>
            <NumberField
              value={state.plasticPrice || ""}
              onChange={(v) => setState({ plasticPrice: parseFloat(v) || 0 })}
              placeholder="0"
              suffix={currency + "/кг"}
              ariaLabel="Цена пластика за кг"
            />
          </label>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div>
            <span className="block text-sm font-extrabold text-ink">
              Многоцветная печать (AMS)
            </span>
            <span className="block text-[11px] text-muted mt-0.5">
              учитывает смену цветов и отходы
            </span>
          </div>
          <SoftToggle
            on={state.multicolor}
            onChange={(v) => setState({ multicolor: v })}
            ariaLabel="Включить режим AMS"
          />
        </div>
      </div>

      {state.multicolor ? <AmsPanel state={state} setState={setState} /> : null}

      <div className="soft p-5 sm:p-6">
        <div className="text-sm font-extrabold text-ink mb-4">⏱ Время + энергия</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label>
            <Label>Время печати (ч)</Label>
            <NumberField
              value={state.time || ""}
              onChange={(v) => setState({ time: parseFloat(v) || 0 })}
              placeholder="0"
              suffix="ч"
              ariaLabel="Время печати в часах"
            />
          </label>
          <label>
            <Label>Тариф электричества</Label>
            <NumberField
              value={state.electricityRate || ""}
              onChange={(v) =>
                setState({ electricityRate: parseFloat(v) || 0 })
              }
              placeholder="0"
              suffix={currency + "/кВт·ч"}
              ariaLabel="Тариф за киловатт-час"
            />
          </label>
        </div>
      </div>

      <div className="soft p-5 sm:p-6">
        <div className="text-sm font-extrabold text-ink mb-4">💼 Прочее</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label>
            <Label>Упаковка</Label>
            <NumberField
              value={state.packaging || ""}
              onChange={(v) => setState({ packaging: parseFloat(v) || 0 })}
              placeholder="0"
              suffix={currency}
              ariaLabel="Стоимость упаковки"
            />
          </label>
          <label>
            <Label>Брак (%)</Label>
            <NumberField
              value={state.defect || ""}
              onChange={(v) =>
                setState({ defect: Math.max(0, parseInt(v) || 0) })
              }
              min={0}
              max={100}
              step={1}
              placeholder="0"
              suffix="%"
              ariaLabel="Процент брака"
            />
          </label>
        </div>
      </div>

      <div className="soft p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div>
            <div className="text-sm font-extrabold text-ink">
              🖨 Стандартный принтер
            </div>
            <div className="text-[11px] text-muted mt-0.5 font-bold">
              используется, когда нет активных "своих"
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label>
            <Label>Мощность</Label>
            <NumberField
              value={state.customPower || ""}
              onChange={(v) => setState({ customPower: parseFloat(v) || 0 })}
              placeholder="100"
              suffix="Вт"
              ariaLabel="Мощность стандартного принтера"
            />
          </label>
          <label>
            <Label>Износ в час</Label>
            <NumberField
              value={state.customWear || ""}
              onChange={(v) => setState({ customWear: parseFloat(v) || 0 })}
              placeholder="25"
              suffix={currency + "/ч"}
              ariaLabel="Износ стандартного принтера"
            />
          </label>
        </div>
      </div>

      <ResultCard breakdown={breakdown} currency={currency} />
    </div>
  );
}

function AmsPanel({
  state,
  setState,
}: {
  state: CalcState;
  setState: (p: Partial<CalcState>) => void;
}) {
  const autoWaste = getCalculatedWasteWeight(state);
  return (
    <div className="soft p-5 sm:p-6 border-2 border-transparent">
      <div className="text-sm font-extrabold text-ink mb-4">
        🎨 Мультицвет / AMS
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label>
          <Label>Количество цветов</Label>
          <NumberField
            value={state.colorCount}
            onChange={(v) => {
              const n = Math.max(2, Math.min(16, parseInt(v) || 2));
              setState({ colorCount: n });
            }}
            min={2}
            max={16}
            step={1}
            placeholder="2"
            ariaLabel="Количество цветов"
          />
        </label>
        <label>
          <Label>Смены цвета / слоёв</Label>
          <NumberField
            value={state.colorChangeLayers || ""}
            onChange={(v) =>
              setState({ colorChangeLayers: Math.max(0, parseInt(v) || 0) })
            }
            min={0}
            step={1}
            placeholder="0"
            ariaLabel="Количество смен цвета"
          />
        </label>
        <label>
          <Label>Слив на 1 смену (г)</Label>
          <NumberField
            value={state.purgePerChange || ""}
            onChange={(v) => setState({ purgePerChange: parseFloat(v) || 0 })}
            min={0}
            step={0.1}
            placeholder="0.6"
            suffix="г"
            ariaLabel="Слив на одну смену в граммах"
          />
        </label>
        <label>
          <Label
            hint={
              state.wasteWeightManual
                ? "ручной ввод"
                : `автоматически: ${autoWaste.toFixed(1)} г`
            }
          >
            Вес отходов (г)
          </Label>
          <NumberField
            value={
              state.wasteWeightManual
                ? state.wasteWeightInput
                : autoWaste || ""
            }
            onChange={(v) =>
              setState({
                wasteWeightInput: parseFloat(v) || 0,
                wasteWeightManual: true,
              })
            }
            min={0}
            step={0.1}
            placeholder="0"
            suffix="г"
            ariaLabel="Вес отходов"
          />
        </label>
        <label>
          <Label>Вес prime-башни (г)</Label>
          <NumberField
            value={state.primeTowerWeight || ""}
            onChange={(v) =>
              setState({ primeTowerWeight: parseFloat(v) || 0 })
            }
            min={0}
            step={0.1}
            placeholder="0"
            suffix="г"
            ariaLabel="Вес башни очистки"
          />
        </label>
      </div>

      <FilamentsList
        filaments={state.filaments}
        onChange={(list) => setState({ filaments: list })}
      />
    </div>
  );
}

function FilamentsList({
  filaments,
  onChange,
}: {
  filaments: Filament[];
  onChange: (f: Filament[]) => void;
}) {
  if (!filaments.length) return null;
  function patch(i: number, next: Partial<Filament>) {
    onChange(filaments.map((f, idx) => (i === idx ? { ...f, ...next } : f)));
  }
  return (
    <div className="mt-5">
      <div className="text-xs font-extrabold text-muted mb-2">
        Филаменты из файла
      </div>
      <ul className="space-y-2">
        {filaments.map((f, i) => (
          <li
            key={i}
            className="flex items-center gap-3 rounded-2xl bg-surface shadow-soft-sm px-3 py-2"
          >
            <span
              aria-hidden
              className="h-6 w-6 rounded-full shrink-0 shadow-soft-sm"
              style={{ background: f.color }}
            />
            <div className="flex-1 min-w-0">
              <TextField
                value={f.name}
                onChange={(v) => patch(i, { name: v })}
                ariaLabel="Название филамента"
              />
              <div className="text-[11px] font-bold text-muted mt-1">
                {f.weightG.toFixed(1)} г
              </div>
            </div>
            <div className="w-28 shrink-0">
              <NumberField
                value={f.priceInCur || ""}
                onChange={(v) => patch(i, { priceInCur: parseFloat(v) || 0 })}
                min={0}
                step={1}
                placeholder="цена/кг"
                ariaLabel="Цена филамента за килограмм"
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ResultCard({
  breakdown,
  currency,
}: {
  breakdown: CostBreakdown;
  currency: Currency;
}) {
  const rows = [
    { label: "Ресурсы", value: breakdown.resourceCosts },
    { label: "До брака", value: breakdown.sumBeforeDefect },
    {
      label: `Брак (${breakdown.defectPct}%)`,
      value: breakdown.defectCost,
    },
  ];
  return (
    <div className="soft p-6">
      <div className="text-xs font-extrabold text-muted mb-3 text-center uppercase tracking-wide">
        Себестоимость
      </div>
      <ul className="mb-4 divide-y divide-ink/10">
        {rows.map((r) => (
          <li
            key={r.label}
            className="flex items-center justify-between py-2 text-sm"
          >
            <span className="font-bold text-muted">{r.label}</span>
            <span className="font-extrabold text-ink">
              {formatMoney(r.value, currency)}
            </span>
          </li>
        ))}
      </ul>
      <div className="rounded-2xl bg-surface shadow-soft-inset p-5 text-center">
        <div className="text-xs font-extrabold text-muted uppercase tracking-wide">
          Итого
        </div>
        <div className="text-3xl sm:text-4xl font-extrabold text-accent mt-1">
          {formatMoney(breakdown.totalCost, currency)}
        </div>
      </div>
    </div>
  );
}
