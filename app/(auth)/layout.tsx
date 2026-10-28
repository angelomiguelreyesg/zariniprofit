export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <div className="hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-emerald-500 p-10 text-white lg:flex">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 7 13.5 15.5 8.5 10.5 2 17" />
              <path d="M16 7h6v6" />
            </svg>
          </div>
          <span className="text-xl font-bold">ZariniProfit</span>
        </div>

        <div className="space-y-6">
          <h1 className="text-4xl font-bold leading-tight">
            Tu negocio, <br />
            bajo control.
          </h1>
          <p className="max-w-md text-emerald-50/90">
            Inventario, ventas, gastos y ganancias en un solo lugar. Simple y
            moderno, desde tu teléfono o tu computador.
          </p>
          <ul className="space-y-3 text-sm text-emerald-50/90">
            {[
              "Ganancias en tiempo real",
              "Control total de inventario",
              "Reportes exportables a CSV",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-3 w-3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-emerald-100/70">
          © {new Date().getFullYear()} ZariniProfit
        </p>
      </div>

      <div className="flex w-full items-center justify-center px-6 py-10 lg:w-1/2">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
