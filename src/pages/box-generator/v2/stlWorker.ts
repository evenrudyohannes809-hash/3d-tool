// Web Worker для STL-экспорта Gridfinity-бина.
//
// Почему worker:
//   - manifold-3d WASM + CSG — тяжёлая математика, на main-thread
//     замораживает UI на 300-800мс при сложных бинах (магниты+винты+N×M отсеков).
//   - В worker'е мы гоняем все CSG-операции параллельно, UI остаётся отзывчивым,
//     можно показывать прогрессбар.
//
// Протокол:
//   → main posts { params: GridfinityBinParams }
//   ← worker posts { ok: true, buffer: ArrayBuffer } или { ok: false, error: string }

import { buildGridfinityBin, type GridfinityBinParams } from "../gridfinity";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";

type InMsg = { params: GridfinityBinParams };
type OutMsg =
  | { ok: true; buffer: ArrayBuffer }
  | { ok: false; error: string };

self.onmessage = async (e: MessageEvent<InMsg>) => {
  const { params } = e.data;
  try {
    const group = await buildGridfinityBin(params);
    const exporter = new STLExporter();
    const result = exporter.parse(group, { binary: true });
    // STLExporter возвращает DataView при binary:true или строку при binary:false.
    const buffer: ArrayBuffer =
      result instanceof DataView
        ? (result.buffer as ArrayBuffer).slice(
            result.byteOffset,
            result.byteOffset + result.byteLength,
          )
        : new TextEncoder().encode(result as unknown as string).buffer;

    const out: OutMsg = { ok: true, buffer };
    // Transferable — передаём без копирования.
    (self as unknown as Worker).postMessage(out, [buffer]);
  } catch (err) {
    const out: OutMsg = {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
    (self as unknown as Worker).postMessage(out);
  }
};

// Нужен export чтобы TS трактовал как модуль
export {};
