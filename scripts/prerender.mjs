#!/usr/bin/env node
// Пост-билд скрипт: читает dist/index.html и для каждого известного роута
// создаёт отдельный HTML-файл с корректно подставленными <title>,
// <meta description>, Open Graph, canonical. Это "shallow prerender" — контент
// страниц собирается на клиенте, но мета-теги у каждой страницы свои, что
// нужно поисковикам, чтобы ранжировать по конкретному запросу и правильно
// превью-шерить ссылки в мессенджерах.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const DIST = join(ROOT, "dist");

// Источник правды — тот же, что и рантайм React-страниц.
// Используем tsx-loader (через node --import tsx) в package.json.
const routesModule = await import(join(ROOT, "src/lib/routes.ts"));
const { TOOLS, EXTRA_ROUTES, HOME_META, NOT_FOUND_META, SITE } = routesModule;

const SITE_URL = process.env.SITE_URL || SITE.url || "https://3d.tools";

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function injectMeta(template, meta) {
  const title = escapeHtml(meta.title);
  const desc = escapeHtml(meta.description);
  const url = SITE_URL.replace(/\/+$/, "") + meta.path;
  const ogImage = escapeHtml(meta.ogImage || SITE.defaultOgImage || "/og-default.png");

  let out = template;
  // <title>
  out = out.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
  // <meta name="description" content="...">
  out = out.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${desc}" />`,
  );
  // canonical
  out = out.replace(
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${escapeHtml(url)}" />`,
  );
  // og:title
  out = out.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:title" content="${title}" />`,
  );
  // og:description
  out = out.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:description" content="${desc}" />`,
  );
  // og:url
  out = out.replace(
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:url" content="${escapeHtml(url)}" />`,
  );
  // og:image
  out = out.replace(
    /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:image" content="${ogImage}" />`,
  );
  return out;
}

function writeRouteHtml(meta, template) {
  const html = injectMeta(template, meta);
  // Для path "/" → dist/index.html (уже есть, перезапишем).
  // Для path "/foo/bar" → dist/foo/bar/index.html (SPA-style pretty URLs).
  const rel = meta.path === "/" ? "" : meta.path.replace(/^\/+/, "");
  const outDir = rel ? join(DIST, rel) : DIST;
  const outFile = join(outDir, "index.html");
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  writeFileSync(outFile, html, "utf8");
  return outFile.replace(ROOT + "/", "");
}

// ─── Main ────────────────────────────────────────────────────────────

if (!existsSync(join(DIST, "index.html"))) {
  console.error("❌ dist/index.html не найден — запусти `vite build` сперва.");
  process.exit(1);
}
const template = readFileSync(join(DIST, "index.html"), "utf8");

const allMeta = [
  HOME_META,
  ...TOOLS,
  ...EXTRA_ROUTES,
  // 404 в конце: пишем отдельный файл 404.html рядом с dist/index.html.
  { ...NOT_FOUND_META, path: "/404.html" },
];

const written = [];
for (const meta of allMeta) {
  // 404 — особый случай: пишем в dist/404.html (не dist/404.html/index.html).
  if (meta.path === "/404.html") {
    const html = injectMeta(template, { ...meta, path: "/404" });
    writeFileSync(join(DIST, "404.html"), html, "utf8");
    written.push("dist/404.html");
    continue;
  }
  written.push(writeRouteHtml(meta, template));
}

console.log(`✓ Pre-rendered ${written.length} pages:`);
for (const w of written) console.log("  " + w);
