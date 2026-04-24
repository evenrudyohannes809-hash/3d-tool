// Ленивая инициализация WASM-модуля manifold-3d. WASM-файл указываем
// явно через Vite `?url`-импорт, иначе Emscripten попробует загрузить
// manifold.wasm из корня, где его нет.

import Module from "manifold-3d";
import wasmUrl from "manifold-3d/manifold.wasm?url";

type Wasm = Awaited<ReturnType<typeof Module>>;

let cached: Promise<Wasm> | null = null;

export function getManifold(): Promise<Wasm> {
  if (!cached) {
    cached = (async () => {
      const wasm = await Module({ locateFile: () => wasmUrl });
      wasm.setup();
      return wasm;
    })();
  }
  return cached;
}
