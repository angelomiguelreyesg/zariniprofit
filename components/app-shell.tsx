"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Wallet,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { AppContext } from "@/components/app-context";
import Logo from "@/components/logo";
import ThemeToggle from "@/components/theme-toggle";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/productos", label: "Productos", icon: Package },
  { href: "/ventas", label: "Ventas", icon: ShoppingCart },
  { href: "/gastos", label: "Gastos", icon: Wallet },
  { href: "/reportes", label: "Reportes", icon: BarChart3 },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useProfile();
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const businessName = profile?.nombre_negocio || "Mi negocio";

  return (
    <AppContext.Provider value={{ user, profile, loading }}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        {/* Sidebar escritorio */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-16 items-center border-b border-slate-100 px-6 dark:border-slate-800">
            <Logo />
          </div>
          <nav className="flex-1 space-y-1 px-3 py-4">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active =
                pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-slate-100 p-3 dark:border-slate-800">
            <Link
              href="/ajustes"
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                pathname.startsWith("/ajustes")
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              }`}
            >
              <Settings className="h-5 w-5" />
              Ajustes
            </Link>
            <div className="mt-3 flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white">
                {(profile?.nombre?.[0] || user?.email?.[0] || "?").toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                  {profile?.nombre || "Usuario"}
                </p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {businessName}
                </p>
              </div>
              <ThemeToggle />
              <button
                onClick={handleLogout}
                title="Cerrar sesión"
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* Contenido */}
        <div className="lg:pl-64">
          {/* Topbar móvil */}
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-900/90">
            <Logo size="sm" />
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <Link
                href="/ajustes"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <Settings className="h-5 w-5" />
              </Link>
              <button
                onClick={handleLogout}
                className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-500/10"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </header>

          <main className="mx-auto w-full max-w-6xl px-4 py-6 pb-24 lg:px-8 lg:py-8 lg:pb-10">
            {children}
          </main>
        </div>

        {/* Nav inferior móvil */}
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-900/95">
          <div className="mx-auto flex max-w-md items-center justify-around px-2 py-1.5">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active =
                pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-medium transition ${
                    active
                      ? "text-brand-600 dark:text-brand-400"
                      : "text-slate-400 dark:text-slate-500"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 ${active ? "fill-brand-50 dark:fill-transparent" : ""}`}
                    strokeWidth={active ? 2.4 : 2}
                  />
                  {label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </AppContext.Provider>
  );
}
