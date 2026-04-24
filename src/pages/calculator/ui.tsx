import { useEffect } from "react";
import type { Currency } from "../../lib/calc/types";

// ─── Small reusable pieces tied to the soft-UI style of the site. ────

export function Label({
  children,
  hint,
}: {
  children: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <span className="text-sm font-bold text-muted mb-1.5 block">
      {children}
      {hint ? (
        <span className="block text-[11px] font-semibold text-muted/80 mt-0.5">
          {hint}
        </span>
      ) : null}
    </span>
  );
}

export function NumberField(props: {
  value: number | string;
  onChange: (v: string) => void;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number | string;
  suffix?: React.ReactNode;
  ariaLabel?: string;
}) {
  return (
    <div className="flex items-center gap-2 bg-surface shadow-soft-inset rounded-2xl px-4 py-3">
      <input
        type="number"
        value={props.value}
        min={props.min}
        max={props.max}
        step={props.step ?? "any"}
        placeholder={props.placeholder ?? "0"}
        aria-label={props.ariaLabel}
        onChange={(e) => props.onChange(e.target.value)}
        className="flex-1 bg-transparent outline-none text-ink placeholder:text-muted font-bold text-[15px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      {props.suffix ? (
        <span className="text-muted text-xs font-bold shrink-0">
          {props.suffix}
        </span>
      ) : null}
    </div>
  );
}

export function TextField(props: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  autoFocus?: boolean;
  ariaLabel?: string;
}) {
  return (
    <input
      type="text"
      value={props.value}
      placeholder={props.placeholder}
      maxLength={props.maxLength}
      autoFocus={props.autoFocus}
      aria-label={props.ariaLabel}
      onChange={(e) => props.onChange(e.target.value)}
      className="w-full bg-surface shadow-soft-inset rounded-2xl px-4 py-3 outline-none text-ink placeholder:text-muted font-bold text-[15px]"
    />
  );
}

export function SelectField<T extends string | number>(props: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string }>;
  ariaLabel?: string;
}) {
  return (
    <div className="bg-surface shadow-soft-inset rounded-2xl px-3 py-2.5">
      <select
        value={String(props.value)}
        onChange={(e) => {
          const raw = e.target.value;
          const sample = props.options[0]?.value;
          const parsed: T =
            typeof sample === "number" ? ((Number(raw) as unknown) as T) : ((raw as unknown) as T);
          props.onChange(parsed);
        }}
        aria-label={props.ariaLabel}
        className="w-full bg-transparent outline-none text-ink font-bold text-[15px]"
      >
        {props.options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function SoftToggle({
  on,
  onChange,
  ariaLabel,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={ariaLabel}
      onClick={() => onChange(!on)}
      className="toggle"
      data-on={on}
    >
      <span className="toggle-dot" />
    </button>
  );
}

export function Pill({
  active,
  onClick,
  children,
  tone = "neutral",
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  tone?: "neutral" | "accent";
}) {
  const base =
    "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition outline-none select-none";
  if (active) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${base} shadow-soft-pressed ${
          tone === "accent" ? "text-accent" : "text-ink"
        }`}
      >
        {children}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${base} bg-surface shadow-soft-sm text-muted hover:text-ink`}
    >
      {children}
    </button>
  );
}

export function CurrencyPills({
  value,
  onChange,
}: {
  value: Currency;
  onChange: (c: Currency) => void;
}) {
  const arr: Currency[] = ["₽", "$", "€", "₸", "Br"];
  return (
    <div className="inline-flex gap-1.5 p-1.5 bg-surface shadow-soft-inset rounded-full">
      {arr.map((c) => {
        const active = c === value;
        return (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            aria-pressed={active}
            className={`min-w-[44px] px-3 py-1.5 rounded-full text-sm font-extrabold transition ${
              active
                ? "bg-surface shadow-soft-sm text-accent"
                : "text-muted hover:text-ink"
            }`}
          >
            {c}
          </button>
        );
      })}
    </div>
  );
}

export function ModeTabs<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <div className="flex gap-1.5 p-1.5 bg-surface shadow-soft-inset rounded-full">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            onClick={() => onChange(o.value)}
            className={`flex-1 rounded-full px-3 py-2 text-sm font-bold transition ${
              active
                ? "bg-surface shadow-soft-sm text-accent"
                : "text-muted hover:text-ink"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// Модальный overlay — общий для модалок принтера, редактирования детали,
// сохранения и удаления проекта, подтверждения удаления принтера.
export function ModalOverlay({
  onClose,
  children,
  variant = "bottom",
}: {
  onClose: () => void;
  children: React.ReactNode;
  variant?: "bottom" | "center";
}) {
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEsc);
    const { style } = document.body;
    const prev = style.overflow;
    style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onEsc);
      style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className={`fixed inset-0 z-[120] bg-black/50 backdrop-blur-sm flex ${
        variant === "bottom"
          ? "items-end sm:items-center justify-center"
          : "items-center justify-center"
      } p-0 sm:p-5`}
    >
      <div
        className={`soft bg-surface w-full sm:max-w-md sm:w-auto sm:min-w-[360px] p-5 sm:p-6 ${
          variant === "bottom" ? "rounded-t-3xl sm:rounded-3xl" : ""
        }`}
        style={{ animation: "softSlideUp 0.22s ease" }}
      >
        {children}
      </div>
    </div>
  );
}


