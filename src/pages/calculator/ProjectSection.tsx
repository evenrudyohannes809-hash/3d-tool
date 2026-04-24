import { useState } from "react";
import type {
  CalcState,
  Currency,
  MyPrinter,
  ProjectPart,
  Rates,
  SavedProject,
} from "../../lib/calc/types";
import { calcForPrinter } from "../../lib/calc/formulas";
import {
  currentToRub,
  formatMoney,
  rubToCurrent,
} from "../../lib/calc/currency";
import { loadProjects, saveProjects } from "../../lib/calc/storage";
import { ModalOverlay, TextField } from "./ui";

type Props = {
  active: boolean;
  onToggle: () => void;
  state: CalcState;
  setState: (patch: Partial<CalcState>) => void;
  printers: MyPrinter[];
  setPrinters: (next: MyPrinter[]) => void;
  rates: Rates;
  currency: Currency;
  parts: ProjectPart[];
  setParts: (next: ProjectPart[]) => void;
  currentProjectId: string | null;
  setCurrentProjectId: (id: string | null) => void;
  onToast: (msg: string) => void;
};

export default function ProjectSection(props: Props) {
  const {
    active,
    onToggle,
    state,
    setState,
    printers,
    setPrinters,
    rates,
    currency,
    parts,
    setParts,
    currentProjectId,
    setCurrentProjectId,
    onToast,
  } = props;

  const [editingPart, setEditingPart] = useState<ProjectPart | null>(null);
  const [showList, setShowList] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const activePrinter = printers.find((p) => p.active) || null;

  function deactivateAll() {
    if (printers.some((p) => p.active)) {
      setPrinters(printers.map((p) => ({ ...p, active: false })));
    }
  }

  function clearFields() {
    setState({
      weight: 0,
      time: 0,
      electricityRate: 0,
      packaging: 0,
      defect: 0,
      plasticPrice: 0,
      multicolor: false,
    });
  }

  function addPart() {
    if (!activePrinter) {
      onToast("Выбери принтер из списка");
      return;
    }
    const pInCur: MyPrinter = {
      ...activePrinter,
      wear: rubToCurrent(activePrinter.wear, currency, rates),
    };
    const cost = calcForPrinter(state, pInCur);
    const costRub = currentToRub(cost, currency, rates);
    const part: ProjectPart = {
      id: String(Date.now()),
      printerId: activePrinter.id,
      printerName: activePrinter.name,
      power: activePrinter.power,
      wear: activePrinter.wear,
      weight: state.weight,
      time: state.time,
      plastic: state.plasticPrice,
      electricity: state.electricityRate,
      packaging: state.packaging,
      defect: state.defect,
      ams: state.multicolor,
      colorCount: state.colorCount,
      cost,
      costRub,
    };
    setParts([...parts, part]);
    clearFields();
    deactivateAll();
    onToast("Деталь добавлена — выбери следующий принтер");
  }

  function removePart(id: string) {
    setParts(parts.filter((p) => p.id !== id));
  }

  function savePartEdits(edited: ProjectPart) {
    // Пересчитываем cost под новые поля
    const p = edited;
    const mult = p.ams ? Math.max(1, 1 + 0.3 * (p.colorCount - 1)) : 1;
    let cost =
      (p.weight / 1000) * p.plastic + p.time * (p.power / 1000) * p.electricity + p.time * p.wear * mult;
    cost = cost + cost * (p.defect / 100) + p.packaging;
    const updated: ProjectPart = {
      ...edited,
      cost,
      costRub: currentToRub(cost, currency, rates),
    };
    setParts(parts.map((x) => (x.id === updated.id ? updated : x)));
    setEditingPart(null);
  }

  function fmtCur(rubVal: number): string {
    return formatMoney(rubToCurrent(rubVal, currency, rates), currency);
  }

  const totalRub = parts.reduce((a, p) => a + (p.costRub || 0), 0);

  function enterProject() {
    setParts([]);
    setCurrentProjectId(null);
    deactivateAll();
    clearFields();
    onToggle();
  }

  function exitProject() {
    setCurrentProjectId(null);
    onToggle();
  }

  function openList() {
    setShowList(true);
  }

  function doDelete() {
    if (currentProjectId) {
      saveProjects(
        loadProjects().filter((p) => p.id !== currentProjectId),
      );
    }
    setParts([]);
    setCurrentProjectId(null);
    setConfirmDelete(false);
    onToast("Проект удалён");
    if (active) onToggle();
  }

  return (
    <>
      <div className="soft p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-sm font-extrabold text-ink">
              🔧 Режим Проект
            </div>
            <div className="text-[11px] text-muted mt-1 font-bold">
              Собери проект из нескольких деталей — каждую на своём принтере.
            </div>
          </div>
          {active ? (
            <button
              type="button"
              onClick={exitProject}
              className="btn text-muted"
            >
              Выйти
            </button>
          ) : (
            <button
              type="button"
              onClick={enterProject}
              className="btn-primary"
            >
              Включить
            </button>
          )}
        </div>

        {active ? (
          <>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={addPart}
                className="btn-primary"
              >
                + Добавить деталь
              </button>
              <button
                type="button"
                onClick={() => {
                  if (parts.length === 0) {
                    onToast("Нет деталей для сохранения");
                    return;
                  }
                  setSaveOpen(true);
                }}
                className="btn"
              >
                💾 Сохранить
              </button>
              <button
                type="button"
                onClick={openList}
                className="btn"
              >
                📂 Мои проекты
              </button>
            </div>

            {parts.length > 0 ? (
              <ul className="mt-5 space-y-2">
                {parts.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 rounded-2xl bg-surface shadow-soft-sm px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-extrabold text-ink truncate">
                        🖨 {p.printerName}
                      </div>
                      <div className="text-[11px] font-bold text-muted">
                        {p.weight}г · {p.time}ч · {p.plastic}
                        {currency}/кг{p.ams ? " · АМС" : ""}
                      </div>
                    </div>
                    <div className="text-sm font-extrabold text-ink shrink-0">
                      {fmtCur(p.costRub)}
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingPart(p)}
                      aria-label="Редактировать деталь"
                      className="h-8 w-8 grid place-items-center rounded-full bg-surface shadow-soft-sm text-muted hover:text-ink"
                    >
                      ✏️
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            {parts.length > 0 ? (
              <div className="mt-4 flex items-center justify-between rounded-2xl bg-surface shadow-soft-inset px-4 py-3">
                <span className="text-xs font-extrabold text-muted uppercase tracking-wide">
                  Итого
                </span>
                <span className="text-lg font-extrabold text-ink">
                  {fmtCur(totalRub)}
                </span>
              </div>
            ) : null}

            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="text-xs font-bold text-muted hover:text-pink transition"
              >
                🗑 Удалить текущий проект
              </button>
            </div>
          </>
        ) : null}
      </div>

      {editingPart ? (
        <PartEditModal
          part={editingPart}
          currency={currency}
          onCancel={() => setEditingPart(null)}
          onSave={savePartEdits}
          onDelete={() => {
            removePart(editingPart.id);
            setEditingPart(null);
          }}
        />
      ) : null}

      {saveOpen ? (
        <SaveProjectModal
          defaultName={
            currentProjectId
              ? loadProjects().find((x) => x.id === currentProjectId)?.name ||
                ""
              : ""
          }
          parts={parts}
          currentProjectId={currentProjectId}
          onCancel={() => setSaveOpen(false)}
          onSaved={(id, name) => {
            setCurrentProjectId(id);
            setSaveOpen(false);
            onToast(`Проект "${name}" сохранён ✓`);
          }}
        />
      ) : null}

      {showList ? (
        <ProjectListModal
          onClose={() => setShowList(false)}
          onOpen={(proj) => {
            if (!active) onToggle();
            setParts(proj.parts);
            setCurrentProjectId(proj.id);
            setShowList(false);
            onToast(`Проект "${proj.name}" загружен`);
          }}
          onDeleted={(id) => {
            if (currentProjectId === id) {
              setCurrentProjectId(null);
              setParts([]);
            }
          }}
        />
      ) : null}

      {confirmDelete ? (
        <ModalOverlay
          onClose={() => setConfirmDelete(false)}
          variant="center"
        >
          <div className="text-center">
            <div className="text-4xl mb-2">🗑️</div>
            <h4 className="text-base font-extrabold text-ink mb-1.5">
              Удалить текущий проект?
            </h4>
            <p className="text-xs text-muted mb-5">
              Все детали будут сброшены
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="btn flex-1 text-muted"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={doDelete}
                className="btn flex-1 text-pink"
              >
                Удалить
              </button>
            </div>
          </div>
        </ModalOverlay>
      ) : null}
    </>
  );
}

function PartEditModal({
  part,
  currency,
  onCancel,
  onSave,
  onDelete,
}: {
  part: ProjectPart;
  currency: Currency;
  onCancel: () => void;
  onSave: (p: ProjectPart) => void;
  onDelete: () => void;
}) {
  const [w, setW] = useState(String(part.weight));
  const [t, setT] = useState(String(part.time));
  const [pl, setPl] = useState(String(part.plastic));
  const [el, setEl] = useState(String(part.electricity));
  const [pk, setPk] = useState(String(part.packaging));
  const [df, setDf] = useState(String(part.defect));
  const [ams, setAms] = useState(part.ams);
  const [cc, setCc] = useState(String(part.colorCount));

  function save() {
    onSave({
      ...part,
      weight: parseFloat(w) || 0,
      time: parseFloat(t) || 0,
      plastic: parseFloat(pl) || 0,
      electricity: parseFloat(el) || 0,
      packaging: parseFloat(pk) || 0,
      defect: parseFloat(df) || 0,
      ams,
      colorCount: parseInt(cc) || 2,
    });
  }
  return (
    <ModalOverlay onClose={onCancel} variant="bottom">
      <h3 className="text-base font-extrabold text-ink mb-3 truncate">
        ✏️ {part.printerName}
      </h3>
      <div className="space-y-2.5">
        <SmallRow
          label="Вес (г)"
          value={w}
          onChange={setW}
          suffix="г"
        />
        <SmallRow
          label="Время (ч)"
          value={t}
          onChange={setT}
          suffix="ч"
        />
        <SmallRow
          label="Пластик"
          value={pl}
          onChange={setPl}
          suffix={currency + "/кг"}
        />
        <SmallRow
          label="Тариф э/э"
          value={el}
          onChange={setEl}
          suffix={currency + "/кВт·ч"}
        />
        <SmallRow
          label="Упаковка"
          value={pk}
          onChange={setPk}
          suffix={currency}
        />
        <SmallRow
          label="Брак (%)"
          value={df}
          onChange={setDf}
          suffix="%"
        />
        <div className="flex items-center justify-between gap-2 rounded-2xl bg-surface shadow-soft-inset px-4 py-3">
          <span className="text-sm font-bold text-muted">АМС</span>
          <input
            type="checkbox"
            checked={ams}
            onChange={(e) => setAms(e.target.checked)}
            className="h-5 w-5"
          />
        </div>
        {ams ? (
          <SmallRow
            label="Цветов"
            value={cc}
            onChange={setCc}
            suffix=""
          />
        ) : null}
      </div>
      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="btn flex-1 text-muted"
        >
          Отмена
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="btn text-pink"
          aria-label="Удалить"
        >
          🗑
        </button>
        <button
          type="button"
          onClick={save}
          className="btn-primary flex-1"
        >
          💾 Сохранить
        </button>
      </div>
    </ModalOverlay>
  );
}

function SmallRow({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-surface shadow-soft-inset px-4 py-2.5">
      <span className="text-xs font-bold text-muted w-24 shrink-0">
        {label}
      </span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-transparent outline-none text-ink font-bold text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      {suffix ? (
        <span className="text-xs font-bold text-muted shrink-0">{suffix}</span>
      ) : null}
    </div>
  );
}

function SaveProjectModal({
  defaultName,
  parts,
  currentProjectId,
  onCancel,
  onSaved,
}: {
  defaultName: string;
  parts: ProjectPart[];
  currentProjectId: string | null;
  onCancel: () => void;
  onSaved: (id: string, name: string) => void;
}) {
  const [name, setName] = useState(defaultName);
  function save() {
    const trimmed = name.trim() || "Проект";
    const list = loadProjects();
    let id = currentProjectId;
    if (id) {
      const idx = list.findIndex((x) => x.id === id);
      if (idx >= 0) {
        list[idx].name = trimmed;
        list[idx].parts = parts;
        list[idx].updated = Date.now();
      } else {
        list.push({ id, name: trimmed, parts, updated: Date.now() });
      }
    } else {
      id = String(Date.now());
      list.push({ id, name: trimmed, parts, updated: Date.now() });
    }
    saveProjects(list);
    onSaved(id, trimmed);
  }
  return (
    <ModalOverlay onClose={onCancel} variant="bottom">
      <h3 className="text-base font-extrabold text-ink mb-3">
        💾 Сохранить проект
      </h3>
      <label className="block mb-5">
        <span className="text-sm font-bold text-muted mb-1.5 block">
          Название проекта
        </span>
        <TextField
          value={name}
          onChange={setName}
          placeholder="Мой проект"
          autoFocus
          ariaLabel="Название проекта"
        />
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="btn flex-1 text-muted"
        >
          Отмена
        </button>
        <button
          type="button"
          onClick={save}
          className="btn-primary flex-1"
        >
          💾 Сохранить
        </button>
      </div>
    </ModalOverlay>
  );
}

function ProjectListModal({
  onClose,
  onOpen,
  onDeleted,
}: {
  onClose: () => void;
  onOpen: (p: SavedProject) => void;
  onDeleted: (id: string) => void;
}) {
  const [list, setList] = useState<SavedProject[]>(() => loadProjects());

  function del(id: string) {
    const proj = list.find((x) => x.id === id);
    if (!proj) return;
    if (!confirm(`Удалить проект "${proj.name}"?`)) return;
    const next = list.filter((x) => x.id !== id);
    setList(next);
    saveProjects(next);
    onDeleted(id);
  }

  return (
    <ModalOverlay onClose={onClose} variant="bottom">
      <h3 className="text-base font-extrabold text-ink mb-3">📂 Мои проекты</h3>
      {list.length ? (
        <ul className="space-y-2 max-h-[60vh] overflow-auto">
          {list.map((p) => {
            const total = p.parts.reduce((a, x) => a + x.cost, 0);
            const d = new Date(p.updated);
            const ds =
              d.getDate() + "." + (d.getMonth() + 1) + "." + d.getFullYear();
            return (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-2xl bg-surface shadow-soft-sm px-3 py-2"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-extrabold text-ink truncate">
                    {p.name}
                  </div>
                  <div className="text-[11px] font-bold text-muted">
                    {p.parts.length} дет. · {ds}
                  </div>
                </div>
                <div className="text-xs font-extrabold text-ink shrink-0">
                  {total.toFixed(0)} ₽
                </div>
                <button
                  type="button"
                  onClick={() => onOpen(p)}
                  aria-label="Открыть"
                  className="h-8 w-8 grid place-items-center rounded-full bg-surface shadow-soft-sm text-muted hover:text-ink"
                >
                  📂
                </button>
                <button
                  type="button"
                  onClick={() => del(p.id)}
                  aria-label="Удалить"
                  className="h-8 w-8 grid place-items-center rounded-full bg-surface shadow-soft-sm text-muted hover:text-pink"
                >
                  🗑
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted text-center py-6">
          Сохранённых проектов нет
        </p>
      )}
      <div className="mt-5">
        <button
          type="button"
          onClick={onClose}
          className="btn w-full text-muted"
        >
          Закрыть
        </button>
      </div>
    </ModalOverlay>
  );
}
