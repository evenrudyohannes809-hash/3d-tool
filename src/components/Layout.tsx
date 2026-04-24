import { Link, NavLink, Outlet } from "react-router-dom";
import { useTheme } from "../lib/theme";

export default function Layout() {
  return (
    <div className="min-h-full flex flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="container-app pt-6">
      <div className="soft-sm flex items-center gap-2 sm:gap-4 px-3 sm:px-4 py-2.5">
        <Link to="/" className="flex items-center gap-2.5 pl-1.5">
          <LogoMark />
          <span className="font-extrabold tracking-tight text-lg">
            3D<span className="text-accent">.</span>Tools
          </span>
          <span className="tag hidden sm:inline-flex ml-1">beta</span>
        </Link>

        <nav className="ml-auto hidden md:flex items-center gap-1 text-sm">
          <NavItem to="/">Утилиты</NavItem>
          <NavItem to="/tool/filaments">Филаменты</NavItem>
          <NavItem to="/tool/problems">Проблемы</NavItem>
          <NavItem to="/tool/blog">Блог</NavItem>
        </nav>

        <div className="ml-auto md:ml-0 flex items-center gap-2">
          <ThemeToggle />
          <Link
            to="/tool/favorites"
            className="hidden sm:inline-flex btn !py-2 !px-3"
            aria-label="Избранное"
            title="Избранное"
          >
            <IconHeart />
          </Link>
        </div>
      </div>
    </header>
  );
}

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        `px-3.5 py-1.5 rounded-full font-bold transition ${
          isActive
            ? "shadow-soft-pressed text-accent"
            : "text-muted hover:text-ink"
        }`
      }
    >
      {children}
    </NavLink>
  );
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const on = theme === "dark";
  return (
    <button
      onClick={toggle}
      className="toggle"
      data-on={on}
      aria-label={on ? "Переключить на светлый" : "Переключить на тёмный"}
      title={on ? "Светлая тема" : "Тёмная тема"}
    >
      <span className="toggle-dot grid place-items-center text-[10px]">
        {on ? (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
          </svg>
        ) : (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-accent"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </svg>
        )}
      </span>
    </button>
  );
}

function Footer() {
  return (
    <footer className="container-app pb-10 pt-8">
      <div className="soft-sm flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2 text-sm text-muted">
          <LogoMark small />
          <span className="font-bold text-ink">3D.Tools</span>
          <span>— утилиты для 3D-печатников</span>
        </div>
        <div className="text-xs text-muted flex items-center gap-1.5">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-accent2"
          >
            <rect x="4" y="11" width="16" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          Файлы обрабатываются локально в твоём браузере
        </div>
      </div>
    </footer>
  );
}

function LogoMark({ small = false }: { small?: boolean }) {
  const s = small ? 26 : 36;
  return (
    <span
      className="grid place-items-center rounded-2xl shadow-soft-sm bg-surface"
      style={{ width: s, height: s }}
    >
      <svg
        width={small ? 15 : 20}
        height={small ? 15 : 20}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-accent"
      >
        <path d="M12 2 3 7v10l9 5 9-5V7l-9-5Z" />
        <path d="M3 7l9 5 9-5" />
        <path d="M12 12v10" />
      </svg>
    </span>
  );
}

function IconHeart() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="text-pink"
    >
      <path d="M12 21s-7-4.5-9.3-9a5.5 5.5 0 0 1 9.3-5.7A5.5 5.5 0 0 1 21.3 12C19 16.5 12 21 12 21Z" />
    </svg>
  );
}
