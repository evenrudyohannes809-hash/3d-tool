import { useEffect } from "react";
import type { RouteMeta } from "./routes";
import { SITE } from "./routes";

// Маленький хук: при монтировании страницы (или изменении meta) обновляет
// <title>, <meta description>, Open Graph и <link rel="canonical">.
// На сервере (во время пререндера) не делает ничего — метатеги туда
// подставляются скриптом scripts/prerender.mjs.
export function usePageMeta(meta: RouteMeta): void {
  useEffect(() => {
    if (typeof document === "undefined") return;

    document.title = meta.title;
    setMeta("name", "description", meta.description);
    setMeta("property", "og:title", meta.title);
    setMeta("property", "og:description", meta.description);
    setMeta("property", "og:type", "website");
    setMeta("property", "og:site_name", SITE.name);
    setMeta(
      "property",
      "og:image",
      meta.ogImage ?? SITE.defaultOgImage,
    );
    setMeta("name", "twitter:card", "summary_large_image");

    const href =
      typeof window !== "undefined"
        ? window.location.origin + window.location.pathname
        : SITE.url + meta.path;
    setLink("canonical", href);
    setMeta("property", "og:url", href);
  }, [meta]);
}

function setMeta(attr: "name" | "property", key: string, value: string) {
  let el = document.head.querySelector<HTMLMetaElement>(
    `meta[${attr}="${key}"]`,
  );
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", value);
}

function setLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}
