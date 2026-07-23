import { Link, Outlet, useLocation } from "react-router-dom";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { MonthYearPicker } from "@/features/admin/components/MonthYearPicker";
import { cn } from "@/shared/lib/utils";

const TABS = [
  { to: "/admin", label: "Dashboard", exact: true },
  { to: "/admin/clientes", label: "Clientes" },
  { to: "/admin/uso", label: "Uso" },
  { to: "/admin/despesas", label: "Despesas" },
  { to: "/admin/dre", label: "DRE" },
] as const;

export function AdminLayout() {
  const { pathname } = useLocation();
  const onPeriodScreen =
    pathname === "/admin" || pathname === "/admin/despesas" || pathname === "/admin/dre";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/40">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-4">
            <BrandLogo className="h-7 w-auto" />
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Painel interno</p>
              <h1 className="text-lg font-semibold">Admin MarketDash</h1>
            </div>
          </div>
          {onPeriodScreen && <MonthYearPicker />}
          <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            Voltar ao app
          </Link>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-3">
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
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
