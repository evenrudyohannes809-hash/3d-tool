import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <section className="container-app py-20">
      <div className="soft p-10 sm:p-16 text-center max-w-xl mx-auto">
        <div className="text-7xl font-extrabold tracking-tight text-accent mb-2">
          404
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight">
          Такой страницы нет
        </h1>
        <p className="text-muted mt-2 text-sm leading-relaxed">
          Возможно, утилита ещё в разработке. Вернись на главную и посмотри
          список.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/" className="btn-primary">
            На главную
          </Link>
        </div>
      </div>
    </section>
  );
}
