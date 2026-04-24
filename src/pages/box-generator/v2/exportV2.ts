// Клиент для stlWorker: запускает worker, шлёт параметры, ждёт STL,
// сохраняет на диск. Возвращает Promise<void>.

import type { GridfinityBinParams } from "../gridfinity";

type OutMsg =
  | { ok: true; buffer: ArrayBuffer }
  | { ok: false; error: string };

export async function exportGridfinitySTLviaWorker(
  params: GridfinityBinParams,
  fileName: string,
): Promise<void> {
  // Vite-совместимый способ объявления worker'а.
  const worker = new Worker(new URL("./stlWorker.ts", import.meta.url), {
    type: "module",
  });

  const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    worker.onmessage = (e: MessageEvent<OutMsg>) => {
      if (e.data.ok) {
        resolve(e.data.buffer);
      } else {
        reject(new Error(e.data.error));
      }
      worker.terminate();
    };
    worker.onerror = (e: ErrorEvent) => {
      worker.terminate();
      reject(e.error ?? new Error(e.message));
    };
    worker.postMessage({ params });
  });

  const blob = new Blob([buffer], { type: "model/stl" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName.endsWith(".stl") ? fileName : fileName + ".stl";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
