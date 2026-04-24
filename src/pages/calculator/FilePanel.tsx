import { useRef, useState } from "react";
import type { CalcState, ParsedFile } from "../../lib/calc/types";
import { parseFile } from "../../lib/calc/fileParser";
import { SLICER_INFO } from "../../lib/calc/fileParser";
import { rubToCurrent } from "../../lib/calc/currency";

type Props = {
  state: CalcState;
  setState: (p: Partial<CalcState>) => void;
  onToast: (msg: string) => void;
};

export default function FilePanel({ state, setState, onToast }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [filename, setFilename] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  async function handleFile(file: File) {
    setError(null);
    setBusy(true);
    try {
      const defaultPrice = rubToCurrent(1000, state.currency, {
        rubPerUsd: 92,
        rubPerEur: 100,
        rubPerKzt: 0.155,
        rubPerByr: 28.5,
      });
      const res = await parseFile(file, defaultPrice);
      setFilename(file.name);
      setParsed(res);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }

  function applyToForm() {
    if (!parsed) return;
    const hours = parsed.timeSec / 3600;
    const totalG = parsed.fils.reduce((a, f) => a + f.weightG, 0);
    const patch: Partial<CalcState> = { time: +hours.toFixed(3) };
    if (totalG > 0) patch.weight = +totalG.toFixed(1);
    if (parsed.fils.length >= 2) {
      patch.multicolor = true;
      patch.colorCount = Math.min(16, Math.max(2, parsed.fils.length));
      patch.filaments = parsed.fils.map((f) => ({ ...f }));
      // Если есть явные смены инструмента — используем, иначе оставляем как было
      if (parsed.toolChanges > 0) {
        patch.colorChangeLayers = parsed.toolChanges;
      }
    } else if (parsed.fils.length === 1) {
      patch.multicolor = false;
      patch.filaments = [];
      patch.plasticPrice = parsed.fils[0].priceInCur;
    }
    setState(patch);
    onToast("Данные из файла применены ✓");
  }

  return (
    <div className="space-y-5">
      <div className="soft p-5 sm:p-6">
        <div className="text-sm font-extrabold text-ink mb-4">
          📄 Загрузить .3mf или .gcode
        </div>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`rounded-3xl p-6 sm:p-8 text-center cursor-pointer transition bg-surface ${
            dragging ? "shadow-soft-pressed" : "shadow-soft-inset"
          }`}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
          }}
          aria-label="Выберите или перетащите файл"
        >
          <div className="text-3xl mb-2">📦</div>
          <div className="text-sm font-extrabold text-ink mb-1">
            {busy
              ? "Разбираю файл…"
              : filename
                ? filename
                : "Перетащи .3mf / .gcode сюда"}
          </div>
          <div className="text-[11px] font-bold text-muted">
            или нажми, чтобы выбрать
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".3mf,.gcode,.bgcode,.g,.gc"
            className="hidden"
            onChange={onPick}
          />
        </div>
        {error ? (
          <div className="mt-3 text-sm font-bold text-pink">
            Ошибка: {error}
          </div>
        ) : null}
      </div>

      {parsed ? (
        <div className="soft p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="chip">
              {SLICER_INFO[parsed.slicer].icon} {SLICER_INFO[parsed.slicer].label}
            </span>
            {parsed.toolChanges > 0 ? (
              <span className="chip">🔀 {parsed.toolChanges} смен</span>
            ) : null}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat
              label="Время"
              value={formatSec(parsed.timeSec)}
              sub={parsed.timeSec ? (parsed.timeSec / 3600).toFixed(2) + " ч" : "—"}
            />
            <Stat
              label="Филаменты"
              value={String(parsed.fils.length || "—")}
              sub={parsed.fils.length > 1 ? "мультицвет" : ""}
            />
            <Stat
              label="Вес, всего"
              value={
                parsed.fils.reduce((a, f) => a + f.weightG, 0).toFixed(1) +
                " г"
              }
            />
            <Stat
              label="Смен инстр."
              value={String(parsed.toolChanges || "—")}
            />
          </div>

          {parsed.fils.length > 0 ? (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {parsed.fils.map((f, i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 rounded-2xl bg-surface shadow-soft-sm px-3 py-2"
                >
                  <span
                    className="h-5 w-5 rounded-full shrink-0 shadow-soft-sm"
                    style={{ background: f.color }}
                    aria-hidden
                  />
                  <div className="flex-1 text-xs">
                    <div className="font-extrabold text-ink truncate">
                      {f.name}
                    </div>
                    <div className="text-muted font-bold">
                      {f.weightG.toFixed(1)} г
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}

          <button
            type="button"
            onClick={applyToForm}
            className="btn-primary w-full"
          >
            Применить к расчёту
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl bg-surface shadow-soft-inset p-3 text-center">
      <div className="text-[10px] font-extrabold text-muted uppercase tracking-wide">
        {label}
      </div>
      <div className="text-base font-extrabold text-ink mt-1">{value}</div>
      {sub ? (
        <div className="text-[10px] font-bold text-muted mt-0.5">{sub}</div>
      ) : null}
    </div>
  );
}

function formatSec(sec: number): string {
  if (!sec) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}ч ${m}м`;
  if (m > 0) return `${m}м ${s}с`;
  return `${s}с`;
}
