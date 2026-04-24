import * as THREE from "three";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";

// Экспорт меша в бинарный STL. Принимает Object3D (Mesh или Group),
// возвращает Blob с MIME-типом model/stl; на клиенте сразу даёт скачать
// пользователю под заданным именем.

export function exportSTL(object: THREE.Object3D, fileName: string): void {
  const exporter = new STLExporter();
  // binary output — меньше по размеру и быстрее.
  const result = exporter.parse(object, { binary: true });
  const blob =
    result instanceof DataView
      ? new Blob([result.buffer as ArrayBuffer], { type: "model/stl" })
      : new Blob([result], { type: "model/stl" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName.endsWith(".stl") ? fileName : fileName + ".stl";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
