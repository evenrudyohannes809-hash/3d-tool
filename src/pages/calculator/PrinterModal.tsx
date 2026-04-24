import { useMemo, useState } from "react";
import type { MyPrinter } from "../../lib/calc/types";
import { PRINTER_PRESETS } from "../../lib/calc/presets";
import { Label, ModalOverlay, NumberField, TextField } from "./ui";

type Props = {
  editing: MyPrinter | null;
  onCancel: () => void;
  onSave: (p: { name: string; power: number; wear: number }) => void;
  onDelete?: () => void;
  onError?: (msg: string) => void;
};

export default function PrinterModal({
  editing,
  onCancel,
  onSave,
  onDelete,
  onError,
}: Props) {
  const [name, setName] = useState(editing?.name ?? "");
  const [power, setPower] = useState(
    editing ? String(editing.power) : "",
  );
  const [wear, setWear] = useState(
    editing ? String(editing.wear) : "",
  );

  const isNew = !editing;

  const presetOptions = useMemo(
    () =>
      PRINTER_PRESETS.map((p) => ({
        value: `${p.power}|${p.wear}|${p.name}`,
        label: `${p.name} (${p.power}Вт · ${p.wear}₽/ч)`,
      })),
    [],
  );

  function onPresetChange(v: string) {
    if (!v) return;
    const parts = v.split("|");
    if (parts.length < 3) return;
    setPower(parts[0]);
    setWear(parts[1]);
    setName(parts[2]);
  }

  function handleSave() {
    const trimmed = name.trim();
    const p = parseFloat(power) || 0;
    const w = parseFloat(wear) || 0;
    if (!trimmed) {
      onError?.("Введите название");
      return;
    }
    if (p < 1) {
      onError?.("Введите мощность");
      return;
    }
    onSave({ name: trimmed, power: p, wear: w });
  }

  return (
    <ModalOverlay onClose={onCancel} variant="bottom">
      <h3 className="text-base font-extrabold text-ink mb-4">
        {isNew ? "Новый принтер" : "Редактировать"}
      </h3>

      {isNew ? (
        <label className="block mb-3">
          <Label>Выбрать из списка</Label>
          <div className="bg-surface shadow-soft-inset rounded-2xl px-3 py-2.5">
            <select
              defaultValue=""
              onChange={(e) => onPresetChange(e.target.value)}
              className="w-full bg-transparent outline-none text-ink font-bold text-[15px]"
            >
              <option value="">— выбрать из списка —</option>
              {presetOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </label>
      ) : null}

      <label className="block mb-3">
        <Label>Название</Label>
        <TextField
          value={name}
          onChange={setName}
          placeholder="Мой принтер"
          maxLength={40}
          autoFocus
          ariaLabel="Название принтера"
        />
      </label>

      <label className="block mb-3">
        <Label>Мощность (Вт)</Label>
        <NumberField
          value={power}
          onChange={setPower}
          min={1}
          max={9999}
          placeholder="100"
          suffix="Вт"
          ariaLabel="Мощность в ваттах"
        />
      </label>

      <label className="block mb-5">
        <Label>Износ в час (₽)</Label>
        <NumberField
          value={wear}
          onChange={setWear}
          min={0}
          max={9999}
          placeholder="25"
          suffix="₽/ч"
          ariaLabel="Износ в рублях в час"
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
        {!isNew && onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            className="btn text-pink"
            aria-label="Удалить"
            title="Удалить"
          >
            🗑
          </button>
        ) : null}
        <button
          type="button"
          onClick={handleSave}
          className="btn-primary flex-1"
        >
          💾 Сохранить
        </button>
      </div>
    </ModalOverlay>
  );
}
