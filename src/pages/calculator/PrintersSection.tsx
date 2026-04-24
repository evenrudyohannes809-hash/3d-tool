import { useState } from "react";
import type { CalcState, MyPrinter, Rates } from "../../lib/calc/types";
import { calcForPrinter } from "../../lib/calc/formulas";
import { formatMoney, rubToCurrent } from "../../lib/calc/currency";
import PrinterModal from "./PrinterModal";
import { ModalOverlay } from "./ui";

type Props = {
  printers: MyPrinter[];
  setPrinters: (next: MyPrinter[]) => void;
  state: CalcState;
  rates: Rates;
  onToast: (msg: string) => void;
};

const MAX_PRINTERS = 50;
const MAX_ACTIVE = 8;

export default function PrintersSection({
  printers,
  setPrinters,
  state,
  rates,
  onToast,
}: Props) {
  const [editing, setEditing] = useState<MyPrinter | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const active = printers.filter((p) => p.active);

  function toggleActive(id: string) {
    const target = printers.find((p) => p.id === id);
    if (!target) return;
    if (!target.active && active.length >= MAX_ACTIVE) {
      onToast("Максимум " + MAX_ACTIVE + " активных");
      return;
    }
    setPrinters(
      printers.map((p) =>
        p.id === id ? { ...p, active: !p.active } : p,
      ),
    );
  }

  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(p: MyPrinter) {
    setEditing(p);
    setModalOpen(true);
  }
  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  function handleSave(data: { name: string; power: number; wear: number }) {
    if (editing) {
      setPrinters(
        printers.map((p) =>
          p.id === editing.id
            ? { ...p, name: data.name, power: data.power, wear: data.wear }
            : p,
        ),
      );
    } else {
      if (printers.length >= MAX_PRINTERS) {
        onToast("Максимум " + MAX_PRINTERS + " принтеров");
        return;
      }
      setPrinters([
        ...printers,
        {
          id: String(Date.now()),
          name: data.name,
          power: data.power,
          wear: data.wear,
          active: false,
        },
      ]);
    }
    closeModal();
    onToast("Принтер сохранён ✓");
  }

  function handleDeleteConfirm() {
    if (!confirmDeleteId) return;
    setPrinters(printers.filter((p) => p.id !== confirmDeleteId));
    setConfirmDeleteId(null);
  }

  const empty = printers.length === 0;

  return (
    <div className="soft p-5 sm:p-6">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-extrabold text-ink">🖨 Мои принтеры</span>
        <span className="text-xs font-bold text-muted">
          {empty
            ? "не добавлены"
            : active.length + " актив" +
              (active.length === 1 ? "ный" : active.length < 5 ? "ных" : "ных")}
        </span>
      </div>

      {empty ? (
        <p className="text-sm text-muted mb-3 leading-relaxed">
          Добавь свой принтер (мощность + износ/час), чтобы учитывать
          амортизацию. Можно сравнивать себестоимость на нескольких принтерах
          одновременно.
        </p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3">
          {printers.map((p) => (
            <li key={p.id}>
              <div
                role="button"
                tabIndex={0}
                aria-pressed={p.active}
                onClick={() => toggleActive(p.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleActive(p.id);
                  }
                }}
                className={`w-full text-left rounded-2xl px-3.5 py-3 flex items-center gap-3 cursor-pointer transition bg-surface ${
                  p.active ? "shadow-soft-pressed" : "shadow-soft-sm"
                }`}
              >
                <span
                  aria-hidden
                  className={`h-2.5 w-2.5 rounded-full shrink-0 transition ${
                    p.active ? "bg-accent2" : "bg-muted/40"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-extrabold text-ink truncate">
                    {p.name}
                  </div>
                  <div className="text-[11px] font-bold text-muted">
                    {p.power} Вт · {p.wear} ₽/ч
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEdit(p);
                  }}
                  aria-label={"Редактировать " + p.name}
                  title="Редактировать"
                  className="h-8 w-8 grid place-items-center rounded-full bg-surface shadow-soft-sm text-muted hover:text-ink"
                >
                  ⚙
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <button type="button" onClick={openAdd} className="btn w-full">
        + Добавить свой принтер
      </button>

      {active.length >= 2 ? (
        <MultiCompare
          active={active}
          state={state}
          rates={rates}
        />
      ) : null}

      {modalOpen ? (
        <PrinterModal
          editing={editing}
          onCancel={closeModal}
          onSave={handleSave}
          onDelete={
            editing
              ? () => {
                  setModalOpen(false);
                  setConfirmDeleteId(editing.id);
                }
              : undefined
          }
          onError={(m) => onToast(m)}
        />
      ) : null}

      {confirmDeleteId ? (
        <ModalOverlay
          onClose={() => setConfirmDeleteId(null)}
          variant="center"
        >
          <div className="text-center">
            <div className="text-4xl mb-2">🗑️</div>
            <h4 className="text-base font-extrabold text-ink mb-1.5">
              Удалить принтер?
            </h4>
            <p className="text-xs text-muted mb-5">
              "
              {printers.find((p) => p.id === confirmDeleteId)?.name}" будет
              удалён
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="btn flex-1 text-muted"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="btn flex-1 text-pink"
              >
                Удалить
              </button>
            </div>
          </div>
        </ModalOverlay>
      ) : null}
    </div>
  );
}

function MultiCompare({
  active,
  state,
  rates,
}: {
  active: MyPrinter[];
  state: CalcState;
  rates: Rates;
}) {
  // Расчёт идёт в "текущей валюте" на поле цены пластика и эл-ва;
  // wear хранится в рублях — переводим в текущую валюту, чтобы калькуляция
  // совпадала с тем, что видит юзер в других полях.
  const results = active.map((p) => {
    const pInCurCurrency: MyPrinter = {
      ...p,
      wear: rubToCurrent(p.wear, state.currency, rates),
    };
    return { p, cost: calcForPrinter(state, pInCurCurrency) };
  });
  if (!results.length) return null;
  const minCost = Math.min(...results.map((r) => r.cost));
  const sum = results.reduce((a, r) => a + r.cost, 0);

  return (
    <div className="mt-5 rounded-2xl p-4 bg-surface shadow-soft-inset">
      <div className="text-sm font-extrabold text-ink mb-3 text-center">
        📊 Сравнение принтеров
      </div>
      <ul className="space-y-2">
        {results.map(({ p, cost }) => {
          const cheap = Math.abs(cost - minCost) < 0.01;
          return (
            <li
              key={p.id}
              className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 ${
                cheap
                  ? "bg-accent2/15 ring-1 ring-accent2/40"
                  : "bg-surface shadow-soft-sm"
              }`}
            >
              <span
                className={`text-xs font-bold truncate ${
                  cheap ? "text-accent2" : "text-muted"
                }`}
              >
                {p.name}
                {cheap ? " ✓" : ""}
              </span>
              <span
                className={`text-sm font-extrabold shrink-0 ${
                  cheap ? "text-accent2" : "text-ink"
                }`}
              >
                {formatMoney(cost, state.currency)}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="border-t border-ink/10 mt-3 pt-2.5 flex justify-between items-center">
        <span className="text-xs font-extrabold text-muted">
          Итого (все активные)
        </span>
        <span className="text-lg font-extrabold text-ink">
          {formatMoney(sum, state.currency)}
        </span>
      </div>
    </div>
  );
}
