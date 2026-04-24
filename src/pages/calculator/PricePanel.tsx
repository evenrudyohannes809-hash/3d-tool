import type { CalcState, Currency } from "../../lib/calc/types";
import { formatMoney } from "../../lib/calc/currency";
import { Label, NumberField } from "./ui";

type Props = {
  state: CalcState;
  setState: (p: Partial<CalcState>) => void;
  price: number;
  currency: Currency;
  printerLabel: string | null;
  projectTotal: number | null;
  onCopy: () => void;
};

export default function PricePanel({
  state,
  setState,
  price,
  currency,
  printerLabel,
  projectTotal,
  onCopy,
}: Props) {
  const effectivePrice =
    projectTotal !== null
      ? projectTotal * (1 + (state.markup || 0) / 100)
      : price;

  return (
    <div className="space-y-5">
      <div className="soft p-5 sm:p-6">
        <div className="text-sm font-extrabold text-ink mb-4">
          💰 Наценка
        </div>
        <label>
          <Label>Процент наценки (%)</Label>
          <NumberField
            value={state.markup || ""}
            onChange={(v) => setState({ markup: parseFloat(v) || 0 })}
            min={0}
            step={1}
            placeholder="0"
            suffix="%"
            ariaLabel="Процент наценки"
          />
        </label>
      </div>

      <div className="soft p-6">
        <div className="text-xs font-extrabold text-muted mb-2 text-center uppercase tracking-wide">
          {printerLabel ? printerLabel : "Цена для клиента"}
        </div>
        <div className="rounded-2xl bg-surface shadow-soft-inset p-5 text-center">
          <div className="text-3xl sm:text-4xl font-extrabold text-accent">
            {formatMoney(effectivePrice, currency)}
          </div>
        </div>
        <button
          type="button"
          onClick={onCopy}
          className="btn w-full mt-4"
        >
          📋 Скопировать цену
        </button>
      </div>
    </div>
  );
}
