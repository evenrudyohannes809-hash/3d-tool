import { Link } from "react-router-dom";
import { useState } from "react";

type Tag = "Готово" | "Скоро" | "В разработке";

type Tool = {
  slug: string;
  title: string;
  description: string;
  tag: Tag;
  category: string;
  tint: "blue" | "teal" | "pink" | "orange";
  icon: React.ReactNode;
};

const tools: Tool[] = [
  {
    slug: "calculator",
    title: "Калькулятор себестоимости",
    description:
      "Считает себестоимость и цену печати, анализирует .3mf и .gcode, мультицвет AMS, все популярные принтеры.",
    tag: "Готово",
    category: "Бизнес",
    tint: "blue",
    icon: <IconCalc />,
  },
  {
    slug: "box-generator",
    title: "Генератор коробок",
    description:
      "Параметрический STL: размеры, ячейки, крышка, скругление — готовый файл для печати.",
    tag: "В разработке",
    category: "Генераторы",
    tint: "teal",
    icon: <IconBox />,
  },
  {
    slug: "stl-viewer",
    title: "STL Viewer + Info",
    description:
      "Объём, вес под пластик, габариты, центр масс, количество треугольников — всё в браузере.",
    tag: "Скоро",
    category: "Анализ",
    tint: "teal",
    icon: <IconCube />,
  },
  {
    slug: "stl-repair",
    title: "STL Repair",
    description:
      "Закрываем дыры в меше, переворачиваем нормали, чистим мусор. Без подписок.",
    tag: "Скоро",
    category: "Анализ",
    tint: "orange",
    icon: <IconWrench />,
  },
  {
    slug: "gcode-viewer",
    title: "G-code Viewer",
    description:
      "Просмотр слоёв, график скорости, расход филамента. Без слайсера.",
    tag: "Скоро",
    category: "G-code",
    tint: "pink",
    icon: <IconLayers />,
  },
  {
    slug: "tower-generator",
    title: "Tower генератор",
    description:
      "Temp/retract/flow tower под твой принтер и сопло. Готовый .gcode за секунды.",
    tag: "Скоро",
    category: "Калибровка",
    tint: "blue",
    icon: <IconTower />,
  },
  {
    slug: "lithophane",
    title: "Литофан",
    description:
      "Фото → STL-пластинка. Светишь сзади — получается светящееся изображение.",
    tag: "Скоро",
    category: "Генераторы",
    tint: "orange",
    icon: <IconSun />,
  },
  {
    slug: "filaments",
    title: "База филаментов",
    description:
      "Температуры, усадка, плотность, цена по брендам: PLA, PETG, ABS, TPU, ASA, PC.",
    tag: "Скоро",
    category: "Справочник",
    tint: "teal",
    icon: <IconDatabase />,
  },
  {
    slug: "problems",
    title: "Матрица проблем",
    description:
      "Стрингинг, сдвиг слоёв, отклеилось, недоэкструзия — интерактивный разбор причин.",
    tag: "Скоро",
    category: "Справочник",
    tint: "pink",
    icon: <IconAlert />,
  },
  {
    slug: "spool-tracker",
    title: "Учёт катушек",
    description:
      "Добавил катушку — заказы списывают граммы. Остаток, себестоимость, когда кончится.",
    tag: "Скоро",
    category: "Бизнес",
    tint: "blue",
    icon: <IconSpool />,
  },
];

const categories = [
  "Все",
  "Генераторы",
  "Анализ",
  "G-code",
  "Калибровка",
  "Справочник",
  "Бизнес",
];

export default function Home() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("Все");

  const filtered = tools.filter((t) => {
    if (cat !== "Все" && t.category !== cat) return false;
    if (!q.trim()) return true;
    const needle = q.toLowerCase();
    return (
      t.title.toLowerCase().includes(needle) ||
      t.description.toLowerCase().includes(needle) ||
      t.category.toLowerCase().includes(needle)
    );
  });

  return (
    <>
      <Hero query={q} onQuery={setQ} />
      <Categories value={cat} onChange={setCat} />
      <Tools list={filtered} />
      <Why />
      <CTA />
    </>
  );
}

function Hero({
  query,
  onQuery,
}: {
  query: string;
  onQuery: (s: string) => void;
}) {
  return (
    <section className="container-app pt-10 sm:pt-14 pb-6">
      <div className="grid sm:grid-cols-[1fr_auto] items-end gap-6">
        <div className="flex flex-col gap-5 max-w-2xl">
          <span className="tag w-fit">
            <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-accent inline-block" />
            Бета · новые утилиты каждую неделю
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.05]">
            Утилиты для{" "}
            <span className="text-accent">3D-печатников</span>
            <br />
            <span className="text-muted font-bold">
              без слайсера, в браузере.
            </span>
          </h1>
          <p className="text-muted text-base max-w-xl leading-relaxed">
            Анализ STL, генераторы моделей, калибровочные g-code, справочники
            по филаментам и принтерам. Бесплатно, без регистрации.
          </p>
        </div>

        <div className="soft p-4 sm:p-5 hidden sm:block">
          <HeroPreview />
        </div>
      </div>

      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        <label className="search flex-1">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Найти утилиту: литофан, калибровка, филамент…"
            className="flex-1 bg-transparent outline-none font-semibold"
          />
          {query && (
            <button
              onClick={() => onQuery("")}
              className="text-muted hover:text-ink transition"
              aria-label="Очистить"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </label>
        <a href="#tools" className="btn-primary shrink-0">
          Открыть утилиты
          <span aria-hidden>→</span>
        </a>
      </div>
    </section>
  );
}

function HeroPreview() {
  return (
    <div className="flex items-center gap-5">
      <div className="icon-chip" style={{ width: 64, height: 64 }}>
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
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-accent shadow-soft-sm" />
          <div className="h-3 w-3 rounded-full bg-accent2 shadow-soft-sm" />
          <div className="h-3 w-3 rounded-full bg-pink shadow-soft-sm" />
        </div>
        <div className="text-sm font-bold">Локально в браузере</div>
        <div className="text-xs text-muted">файлы не уходят на сервер</div>
      </div>
    </div>
  );
}

function Categories({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <section className="container-app pt-4">
      <div className="flex flex-wrap gap-2">
        {categories.map((c) => {
          const active = c === value;
          return (
            <button
              key={c}
              onClick={() => onChange(c)}
              className={`px-4 py-2 rounded-full font-bold text-sm transition bg-surface ${
                active
                  ? "text-accent shadow-soft-pressed"
                  : "text-muted shadow-soft-sm hover:text-ink"
              }`}
            >
              {c}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function Tools({ list }: { list: Tool[] }) {
  return (
    <section id="tools" className="container-app py-8 scroll-mt-20">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Утилиты
          </h2>
          <p className="text-muted mt-1 text-sm font-semibold">
            Открывай, пользуйся, делись ссылкой — всё бесплатно.
          </p>
        </div>
        <span className="tag">{list.length} шт.</span>
      </div>

      {list.length === 0 ? (
        <div className="soft p-10 text-center">
          <div className="text-lg font-bold mb-1">Ничего не найдено</div>
          <p className="text-muted text-sm">
            Попробуй другой запрос или выбери другую категорию.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {list.map((t) => (
            <ToolCard key={t.slug} tool={t} />
          ))}
        </div>
      )}
    </section>
  );
}

function ToolCard({ tool }: { tool: Tool }) {
  const tintClass =
    tool.tint === "blue"
      ? "text-accent"
      : tool.tint === "teal"
        ? "text-accent2"
        : tool.tint === "pink"
          ? "text-pink"
          : "text-[color:rgb(255_140_40)]";

  return (
    <Link
      to={`/tool/${tool.slug}`}
      className="soft p-6 flex flex-col gap-4 group transition hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`icon-chip ${tintClass}`}>{tool.icon}</div>
        <span
          className={`tag ${
            tool.tag === "Готово"
              ? "!text-accent2"
              : tool.tag === "В разработке"
                ? "!text-accent"
                : ""
          }`}
        >
          {tool.tag === "Готово" && (
            <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-accent2 inline-block" />
          )}
          {tool.tag}
        </span>
      </div>
      <div>
        <h3 className="text-lg font-extrabold tracking-tight">{tool.title}</h3>
        <p className="text-sm text-muted mt-1.5 leading-relaxed">
          {tool.description}
        </p>
      </div>
      <div className="flex items-center justify-between pt-2 mt-auto">
        <span className="text-[11px] uppercase tracking-wider text-muted font-extrabold">
          {tool.category}
        </span>
        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-accent">
          Открыть
          <span
            aria-hidden
            className="transition group-hover:translate-x-0.5 inline-block"
          >
            →
          </span>
        </span>
      </div>
    </Link>
  );
}

function Why() {
  const items = [
    {
      title: "Локально в браузере",
      text: "STL, G-code, фото для литофана не уходят на сервер. Всё считается у тебя во вкладке.",
      icon: <IconLock />,
      tint: "text-accent",
    },
    {
      title: "Без регистрации",
      text: "Открыл, сделал, скачал. Никаких аккаунтов, email-подтверждений и лимитов.",
      icon: <IconKey />,
      tint: "text-accent2",
    },
    {
      title: "Заточено под РФ",
      text: "Бренды филаментов из российских магазинов, цены в рублях, справочники на русском.",
      icon: <IconFlag />,
      tint: "text-pink",
    },
    {
      title: "Удобно на телефоне",
      text: "Калибровка, справочники, учёт катушек пригодятся когда ты у принтера, а не у компа.",
      icon: <IconPhone />,
      tint: "text-accent",
    },
  ];
  return (
    <section id="why" className="container-app py-10 scroll-mt-20">
      <div className="mb-6">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          Почему здесь
        </h2>
        <p className="text-muted mt-1 text-sm font-semibold">
          Собрано так, как хотелось бы иметь самому.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {items.map((it) => (
          <div key={it.title} className="soft p-5 flex gap-4">
            <div className={`icon-chip shrink-0 ${it.tint}`}>{it.icon}</div>
            <div>
              <h3 className="font-extrabold text-lg">{it.title}</h3>
              <p className="text-sm text-muted mt-1 leading-relaxed">
                {it.text}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="container-app pb-14">
      <div className="soft p-6 sm:p-10 overflow-hidden relative">
        <div
          className="absolute -top-20 -right-20 h-64 w-64 rounded-full opacity-40 blur-3xl pointer-events-none"
          style={{ background: "rgb(var(--accent))" }}
        />
        <div
          className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full opacity-30 blur-3xl pointer-events-none"
          style={{ background: "rgb(var(--accent2))" }}
        />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-10 justify-between">
          <div className="max-w-xl">
            <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              Чего тебе не хватает?
            </h3>
            <p className="text-muted mt-2 text-sm leading-relaxed font-semibold">
              Предложи утилиту, которая реально экономит время у принтера.
              Добавим в очередь разработки и напишем когда будет готова.
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <a href="mailto:hello@example.com" className="btn-primary">
              Предложить идею
            </a>
            <a href="#tools" className="btn">
              К утилитам
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ----------------- icons ----------------- */

function IconCalc() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="3" width="16" height="18" rx="2.5" />
      <path d="M8 7h8" />
      <path d="M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01" />
    </svg>
  );
}

function IconBox() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" />
      <path d="M3 8l9 5 9-5" />
      <path d="M12 13v8" />
    </svg>
  );
}
function IconCube() {
  return (
    <svg
      width="22"
      height="22"
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
  );
}
function IconWrench() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.7 6.3a4 4 0 0 0 5 5L22 14l-6 6-10-10L4 8a4 4 0 0 0 5-5l2.7 2.7" />
    </svg>
  );
}
function IconLayers() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 2 10 5-10 5L2 7l10-5Z" />
      <path d="m2 12 10 5 10-5" />
      <path d="m2 17 10 5 10-5" />
    </svg>
  );
}
function IconTower() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 21V7l5-4 5 4v14" />
      <path d="M7 10h10" />
      <path d="M7 14h10" />
      <path d="M7 18h10" />
    </svg>
  );
}
function IconSun() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}
function IconDatabase() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v6c0 1.7 4 3 9 3s9-1.3 9-3V5" />
      <path d="M3 11v6c0 1.7 4 3 9 3s9-1.3 9-3v-6" />
    </svg>
  );
}
function IconAlert() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}
function IconSpool() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
    </svg>
  );
}
function IconLock() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}
function IconKey() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="7.5" cy="15.5" r="4.5" />
      <path d="m10.5 12.5 10-10M18 5l3 3M15 8l2 2" />
    </svg>
  );
}
function IconFlag() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 22V4" />
      <path d="M4 4h12l-2 4 2 4H4" />
    </svg>
  );
}
function IconPhone() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="6" y="2" width="12" height="20" rx="2.5" />
      <path d="M11 18h2" />
    </svg>
  );
}
