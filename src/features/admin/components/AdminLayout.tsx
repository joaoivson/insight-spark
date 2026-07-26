import { Link, Outlet, useLocation } from "react-router-dom";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { MonthYearPicker } from "@/features/admin/components/MonthYearPicker";
import { cn } from "@/shared/lib/utils";

const TABS = [
  { to: "/admin", label: "Dashboard", exact: true },
  { to: "/admin/clientes", label: "Clientes" },
  { to: "/admin/uso", label: "Uso" },
  { to: "/admin/sincronizacoes", label: "Sincronizações" },
  { to: "/admin/despesas", label: "Despesas" },
  { to: "/admin/dre", label: "DRE" },
] as const;

export function AdminLayout() {
  const { pathname } = useLocation();
  const onPeriodScreen =
    pathname === "/admin" || pathname === "/admin/despesas" || pathname === "/admin/dre";

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="hidden w-56 shrink-0 border-r border-border bg-card/40 md:flex md:flex-col">
        <div className="flex items-center gap-2 border-b border-border px-4 py-4">
          <BrandLogo className="h-7 w-auto" />
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Painel interno</p>
            <h1 className="text-sm font-semibold">Admin MarketDash</h1>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-2">
          {TABS.map((tab) => {
            const active = tab.exact
              ? pathname === tab.to
              : pathname === tab.to || pathname.startsWith(`${tab.to}/`);
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={cn(
                  "rounded-md border-l-2 border-transparent px-3 py-2 text-sm transition-colors",
                  active
                    ? "font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
                style={
                  active
                    ? {
                        background: "rgba(49,140,233,.12)",
                        borderColor: "rgba(49,140,233,.38)",
                        color: "#7CB8F2",
                      }
                    : undefined
                }
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-3">
          <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            ← Voltar ao app
          </Link>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="border-b border-border bg-card/40 px-4 py-3 md:hidden">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <BrandLogo className="h-6 w-auto" />
              <h1 className="text-sm font-semibold">Admin</h1>
            </div>
            <Link to="/dashboard" className="text-xs text-muted-foreground hover:text-foreground">
              Voltar ao app
            </Link>
          </div>
          <nav className="mt-3 flex gap-1 overflow-x-auto">
            {TABS.map((tab) => {
              const active = tab.exact
                ? pathname === tab.to
                : pathname === tab.to || pathname.startsWith(`${tab.to}/`);
              return (
                <Link
                  key={tab.to}
                  to={tab.to}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6">
          {onPeriodScreen && (
            <div className="mb-4">
              <MonthYearPicker />
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
