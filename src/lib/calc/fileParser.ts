import JSZip from "jszip";
import type { Filament, ParsedFile, Slicer } from "./types";

// Парсер .3mf (zip из разных слайсеров) и .gcode.
// Портирован 1:1 из public/calculator.html (detectSlicer, parsetime,
// parseSliceInfo, parseGcodeText, parseFile). priceInCur наполняется
// из rubToCurrent(1000) — т.е. стандартной цены 1000₽/кг в текущей валюте.

const PAL = [
  "#e74c3c",
  "#3498db",
  "#f1c40f",
  "#2ecc71",
  "#9b59b6",
  "#e67e22",
  "#1abc9c",
  "#e91e63",
  "#ff5722",
  "#607d8b",
];

export const SLICER_INFO: Record<
  Slicer,
  { icon: string; label: string }
> = {
  bambu: { icon: "🟠", label: "Bambu Studio" },
  orca: { icon: "🟢", label: "OrcaSlicer" },
  prusa: { icon: "🔵", label: "PrusaSlicer" },
  cura: { icon: "🟣", label: "Cura" },
  creality: { icon: "🔴", label: "Creality Print" },
  anycubic: { icon: "🟡", label: "Anycubic Slicer" },
  unknown: { icon: "⬜", label: "Слайсер не определён" },
};

export function detectSlicer(text: string): Slicer {
  if (/bambu_studio|BambuStudio|X-BBL-Client/i.test(text)) return "bambu";
  if (/OrcaSlicer|orca_slicer|SoftFever/i.test(text)) return "orca";
  if (/PrusaSlicer|prusa_slicer|SuperSlicer/i.test(text)) return "prusa";
  if (/Cura_SteamEngine|Ultimaker Cura/i.test(text)) return "cura";
  if (/Creality Print|CXEngine|CRSLICE/i.test(text)) return "creality";
  if (/AnycubicSlicer|Anycubic_Slicer|anycubic.*slicer/i.test(text))
    return "anycubic";
  return "unknown";
}

function parseTimeStr(raw: string): number {
  const s = (raw || "").trim();
  if (/^\d+$/.test(s)) return +s;
  if (/\d+:\d+:\d+/.test(s)) {
    const p = s.match(/(\d+):(\d+):(\d+)/)!;
    return +p[1] * 3600 + +p[2] * 60 + +p[3];
  }
  let r = 0;
  const h = s.match(/(\d+)\s*h/i),
    m = s.match(/(\d+)\s*m(?!s)/i),
    sc = s.match(/(\d+)\s*s/i);
  if (h) r += +h[1] * 3600;
  if (m) r += +m[1] * 60;
  if (sc) r += +sc[1];
  return r;
}

function parseSliceInfo(
  txt: string,
  defaultFilPrice: number,
): { timeSec: number; fils: Filament[] } {
  let timeSec = 0;
  const fils: Filament[] = [];
  const tm =
    txt.match(/key="prediction"\s+value="(\d+)"/i) ||
    txt.match(/prediction[^>]*value="(\d+)"/);
  if (tm) timeSec = parseInt(tm[1]);
  const matches: string[] = [];
  const re = /<filament\b([^>]+)>/gi;
  let m;
  while ((m = re.exec(txt)) !== null) matches.push(m[1]);
  matches.forEach((a) => {
    const wM = a.match(/used_g="([\d.]+)"/i);
    if (!wM || +wM[1] <= 0) return;
    const colM = a.match(/color="(#[0-9a-fA-F]{6})"/i);
    const typM = a.match(/type="([^"]+)"/i);
    const idM = a.match(/\bid="(\d+)"/i);
    fils.push({
      color: colM ? colM[1] : PAL[fils.length % PAL.length],
      name: (typM ? typM[1] + " " : "") + "Цвет " + (idM ? idM[1] : fils.length + 1),
      weightG: +wM[1],
      priceInCur: defaultFilPrice,
    });
  });
  return { timeSec, fils };
}

function parseGcodeText(txt: string, defaultFilPrice: number): ParsedFile {
  let timeSec = 0;
  const fils: Filament[] = [];
  const slicer = detectSlicer(txt);

  const t1 = txt.match(
    /;\s*estimated printing time(?:\s*\(normal mode\))?\s*=\s*([^\r\n;]+)/i,
  );
  if (t1) timeSec = parseTimeStr(t1[1]);
  if (!timeSec) {
    const t2 = txt.match(/;\s*total estimated time[:\s]+([^\r\n;]+)/i);
    if (t2) timeSec = parseTimeStr(t2[1]);
  }
  if (!timeSec) {
    const t3 = txt.match(/;\s*model printing time[:\s]+([^;\r\n]+)/i);
    if (t3) timeSec = parseTimeStr(t3[1]);
  }
  if (!timeSec) {
    const t4 = txt.match(/^;TIME:(\d+)/m);
    if (t4) timeSec = +t4[1];
  }

  const cm = txt.match(/;\s*filament_colour\s*=\s*([^\r\n]+)/i);
  const tm2 = txt.match(/;\s*filament_type\s*=\s*([^\r\n]+)/i);
  const uidx = txt.match(/;\s*filament[:\s]+([\d,]+)\s*$/im);
  const allC = cm ? cm[1].split(/[;,]/).map((s) => s.trim()) : [];
  const allT = tm2 ? tm2[1].split(/[;,]/).map((s) => s.trim()) : [];
  const usedIdx = uidx ? uidx[1].split(",").map((n) => +n - 1) : null;

  const wm1 = txt.match(/;\s*filament used \[g\]\s*=\s*([^\r\n]+)/i);
  const wm2 = txt.match(
    /;\s*total filament weight\s*\[g\]\s*[:\s]+([\d.,\s]+)/i,
  );
  const wmRaw = wm1 ? wm1[1] : wm2 ? wm2[1] : null;
  if (wmRaw) {
    wmRaw
      .split(",")
      .map((p) => +p.trim())
      .filter((w) => w > 0 && !isNaN(w))
      .forEach((w, i) => {
        const ri = usedIdx ? usedIdx[i] : i;
        const raw = allC[ri] || allC[i] || "";
        const col = raw.match(/^#?[0-9a-f]{6}$/i)
          ? raw.startsWith("#")
            ? raw
            : "#" + raw
          : PAL[i % PAL.length];
        const typ = allT[ri] || allT[i] || "";
        fils.push({
          color: col,
          name: (typ ? typ + " " : "") + "Цвет " + (i + 1),
          weightG: w,
          priceInCur: defaultFilPrice,
        });
      });
  }
  if (!fils.length) {
    const wt = txt.match(
      /;\s*total filament weight\s*\[g\]\s*[:\s]+([\d.]+)/i,
    );
    if (wt)
      fils.push({
        color: PAL[0],
        name: allT[0] || "Цвет 1",
        weightG: +wt[1],
        priceInCur: defaultFilPrice,
      });
  }
  if (!fils.length) {
    const wg: RegExpExecArray[] = [];
    const rg = /;Filament used:\s*([\d.]+)\s*g/gi;
    let mg: RegExpExecArray | null;
    while ((mg = rg.exec(txt)) !== null) wg.push(mg);
    wg.forEach((mg2, i) => {
      fils.push({
        color: PAL[i % PAL.length],
        name: "Цвет " + (i + 1),
        weightG: +mg2[1],
        priceInCur: defaultFilPrice,
      });
    });
  }
  const toolChanges = (txt.match(/\nT(\d+)\n/g) || []).filter((t) => {
    const n = +t.trim().slice(1);
    return n >= 0 && n < 100;
  }).length;
  return { timeSec, fils, slicer, toolChanges };
}

export async function parseFile(
  file: File,
  defaultFilPrice: number,
): Promise<ParsedFile> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".3mf")) {
    const zip = await JSZip.loadAsync(file);
    const keys = Object.keys(zip.files);
    const texts: Record<string, string> = {};
    for (const k of keys) {
      const entry = zip.files[k];
      if (entry.dir || /\.(png|jpg|jpeg|webp|model)$/i.test(k)) continue;
      try {
        const t = await entry.async("string");
        if (t.length < 5e6) texts[k] = t;
      } catch {
        /* ignore */
      }
    }
    const allText = Object.values(texts).join("\n");
    const slicer = detectSlicer(allText);
    let timeSec = 0;
    let fils: Filament[] = [];
    let toolChanges = 0;

    // 1. slice_info.config — приоритет
    for (const [k, txt] of Object.entries(texts)) {
      if (!k.includes("slice_info")) continue;
      const r = parseSliceInfo(txt, defaultFilPrice);
      if (r.timeSec > 0) timeSec = r.timeSec;
      if (r.fils.length > 0) fils = r.fils;
      break;
    }
    // 2. gcode внутри архива — добирает время и количество смен инструмента
    for (const [k, txt] of Object.entries(texts)) {
      if (!k.endsWith(".gcode")) continue;
      const r2 = parseGcodeText(txt, defaultFilPrice);
      if (!timeSec && r2.timeSec) timeSec = r2.timeSec;
      if (!fils.length && r2.fils.length) fils = r2.fils;
      toolChanges = r2.toolChanges;
      break;
    }
    return { timeSec, fils, slicer, toolChanges };
  }
  // .gcode / .bgcode / .g / .gc — читаем как текст
  return new Promise<ParsedFile>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) =>
      resolve(parseGcodeText(String(e.target?.result || ""), defaultFilPrice));
    reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
    reader.readAsText(file);
  });
}
