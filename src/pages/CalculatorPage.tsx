import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

/**
 * Нативное встраивание калькулятора. Забираем /calculator.html, вынимаем
 * <style>/<link>/<script> в <head>, вставляем body прямо в нашу страницу
 * (общий DOM, никакой iframe) и заново запускаем inline-скрипты — ид-шники и
 * логика юзера полностью сохранены, но визуально это часть сайта.
 */
export default function CalculatorPage() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const added: HTMLElement[] = [];

    async function load() {
      try {
        const res = await fetch("/calculator.html", { cache: "no-cache" });
        if (!res.ok) throw new Error("HTTP " + res.status);
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, "text/html");

        // 1) <link> и <style> из <head> — переносим в наш document.head
        doc.head.querySelectorAll("link").forEach((link) => {
          if (
            link.rel === "preconnect" ||
            link.rel === "stylesheet" ||
            link.rel === "preload"
          ) {
            const cloned = link.cloneNode(true) as HTMLLinkElement;
            cloned.dataset.calcInjected = "1";
            document.head.appendChild(cloned);
            added.push(cloned);
          }
        });
        doc.head.querySelectorAll("style").forEach((style) => {
          const s = document.createElement("style");
          s.textContent = style.textContent || "";
          if (style.id) s.id = style.id;
          s.dataset.calcInjected = "1";
          document.head.appendChild(s);
          added.push(s);
        });

        // 2) Внешние <script src> из <head> — грузим последовательно и ждём
        const externals = Array.from(doc.head.querySelectorAll("script[src]"))
          .map((s) => (s as HTMLScriptElement).src)
          .filter(Boolean);
        for (const src of externals) {
          await new Promise<void>((resolve) => {
            if (document.querySelector(`script[src="${src}"]`)) return resolve();
            const s = document.createElement("script");
            s.src = src;
            s.async = false;
            s.dataset.calcInjected = "1";
            s.onload = () => resolve();
            s.onerror = () => resolve();
            document.head.appendChild(s);
            added.push(s);
          });
        }

        if (cancelled || !hostRef.current) return;

        // 3) Body content — прямо в наш контейнер
        hostRef.current.innerHTML = doc.body.innerHTML;

        // 4) Inline-скрипты не исполняются при innerHTML — пересоздаём
        const scripts = hostRef.current.querySelectorAll("script");
        for (const old of Array.from(scripts)) {
          const neu = document.createElement("script");
          if (old.src) {
            neu.src = old.src;
          } else {
            neu.textContent = old.textContent || "";
          }
          neu.async = false;
          // Выполняем в том же порядке, заменяя узел
          old.replaceWith(neu);
          // Для inline-скрипта execute синхронный; внешний — async, но нам
          // такие сюда не попадают (все external ушли через externals выше).
        }

        setReady(true);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setErr(msg);
      }
    }
    load();

    return () => {
      cancelled = true;
      added.forEach((el) => el.remove());
      if (hostRef.current) hostRef.current.innerHTML = "";
    };
  }, []);

  return (
    <section className="container-app py-6 sm:py-10">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-muted hover:text-ink font-bold transition"
        >
          <span aria-hidden>←</span> Все утилиты
        </Link>
        <div className="flex items-center gap-2.5">
          <span className="tag">
            <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-accent2 inline-block" />
            Готово
          </span>
          <span className="tag hidden sm:inline-flex">
            Себестоимость · Цена · .3mf · .gcode
          </span>
        </div>
      </div>

      <div className="mb-8 max-w-2xl mx-auto text-center">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          Калькулятор себестоимости 3D-печати
        </h1>
        <p className="text-muted mt-3 text-sm leading-relaxed font-semibold">
          Считает себестоимость по весу/часам/пластику/электричеству,
          анализирует <span className="text-ink">.3mf</span> и{" "}
          <span className="text-ink">.gcode</span>, поддерживает мультицвет
          AMS и все популярные принтеры (Bambu, Creality, Anycubic).
        </p>
      </div>

      {err ? (
        <div className="soft p-6 text-center text-pink font-bold">
          Не удалось загрузить калькулятор: {err}
        </div>
      ) : null}

      {!ready && !err ? (
        <div className="text-center text-muted font-semibold py-16">
          Загружаем калькулятор…
        </div>
      ) : null}

      <div ref={hostRef} className="calc-host" aria-live="polite" />

      <p className="text-xs text-muted text-center mt-10 font-semibold">
        Работает локально в твоём браузере. Данные и принтеры сохраняются
        только у тебя.
      </p>
    </section>
  );
}
