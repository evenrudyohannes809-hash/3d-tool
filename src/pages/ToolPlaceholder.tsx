import { Link, useParams } from "react-router-dom";
import { usePageMeta } from "../lib/usePageMeta";
import { TOOLS, NOT_FOUND_META } from "../lib/routes";
import type { RouteMeta, ToolRoute } from "../lib/routes";

// Статусы заглушек берём из центрального реестра TOOLS (routes.ts).
// Сам калькулятор здесь не рендерится — у него свой роут.
export default function ToolPlaceholder() {
  const { slug = "" } = useParams();
  const tool: ToolRoute | undefined = TOOLS.find((t) => t.slug === slug);
  const meta: RouteMeta = tool ?? NOT_FOUND_META;
  usePageMeta(meta);

  const title = tool ? tool.cardTitle : "Утилита";
  const description = tool
    ? tool.cardDescription
    : "Такой утилиты нет — посмотри список на главной.";
  const status = tool ? tool.tag : "Скоро";

  return (
    <section className="container-app py-10 sm:py-14">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-muted hover:text-ink font-bold transition mb-6"
      >
        <span aria-hidden>←</span> Все утилиты
      </Link>

      <div className="soft p-6 sm:p-10">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-8">
          <div className="icon-chip" style={{ width: 72, height: 72 }}>
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2 3 7v10l9 5 9-5V7l-9-5Z" />
              <path d="M3 7l9 5 9-5" />
              <path d="M12 12v10" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                {title}
              </h1>
              <span className="tag">{status}</span>
            </div>
            <p className="text-muted leading-relaxed">{description}</p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
          <div className="soft-inset !rounded-3xl p-10 min-h-[320px] grid place-items-center text-center">
            <div>
              <div className="text-5xl mb-3">🛠</div>
              <div className="font-extrabold text-lg">Страница-заглушка</div>
              <p className="text-muted text-sm mt-1.5 max-w-xs mx-auto">
                Здесь будет живой интерфейс утилиты: 3D-просмотр, параметры,
                кнопка скачать результат.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <PreviewRow icon="⚙️" label="Параметры" />
            <PreviewRow icon="📦" label="Результат" />
            <PreviewRow icon="⬇️" label="Скачать" />
            <PreviewRow icon="🔗" label="Поделиться" />
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link to="/" className="btn-primary">
            Вернуться на главную
          </Link>
          <a href="mailto:hello@example.com" className="btn">
            Напомнить когда готово
          </a>
        </div>
      </div>
    </section>
  );
}

function PreviewRow({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="soft-sm p-4 flex items-center gap-3">
      <div className="icon-chip !h-10 !w-10 text-lg">{icon}</div>
      <div className="font-bold">{label}</div>
      <div className="ml-auto soft-inset !rounded-full !py-1.5 !px-3 text-xs font-bold text-muted">
        скоро
      </div>
    </div>
  );
}
