import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { MoreHorizontal, Sun, Moon, LogOut, Gift, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/shared/lib/utils";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { useTheme } from "@/shared/hooks/useTheme";
import { storage } from "@/shared/lib/storage";
import { APP_CONFIG } from "@/core/config/app.config";
import { supabase } from "@/shared/lib/supabase";
import { usePlanStore } from "@/stores/planStore";
import { UpgradePlanoModal } from "@/features/subscription/components/UpgradePlanoModal";
import {
  DASHBOARD_MENU,
  menuVisivel,
  type DashboardMenuItem,
} from "@/shared/config/dashboard-menu";

// 4 ações principais na barra inferior — derivadas da config compartilhada
// por menuKey; item novo na config cai automaticamente no drawer "Mais".
const PRIMARY_MENU_KEYS = ["dashboard", "campanhas", "upload_cliques", "meus_links"];

const primaryItems: DashboardMenuItem[] = PRIMARY_MENU_KEYS.flatMap((key) =>
  DASHBOARD_MENU.filter((item) => item.menuKey === key),
);

// Indique & Ganhe tem botão próprio em destaque no drawer, fora do grid.
const indiqueItem = DASHBOARD_MENU.find((item) => item.menuKey === "indique_ganhe");

const moreItems: DashboardMenuItem[] = DASHBOARD_MENU.filter(
  (item) => !PRIMARY_MENU_KEYS.includes(item.menuKey) && item.menuKey !== "indique_ganhe",
);

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER;
const WhatsAppLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const MobileBottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [moreOpen, setMoreOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [menuBloqueado, setMenuBloqueado] = useState<string | undefined>();
  const isDemo = location.pathname.startsWith("/demo");
  const { fetch: fetchPlan, allowsMenu } = usePlanStore();
  // Cadeado só depois do contexto real chegar: o fallback do store é
  // "essencial", e travar navegação de assinante pagante durante (ou após
  // falha de) o fetch é pior que liberar o clique — a rota tem RequirePlan.
  const planReady = usePlanStore((s) => !!s.context);

  useEffect(() => {
    if (!isDemo) void fetchPlan();
  }, [fetchPlan, isDemo]);

  // Mesma regra da sidebar: item hmlOnly some inteiro em produção (gate de
  // ambiente); o cadeado é gating por plano, que é outra coisa.
  // O gate de ambiente vale para as DUAS metades do nav — uma tab primária
  // com hmlOnly não pode vazar em produção enquanto some da sidebar.
  const visiblePrimaryItems = menuVisivel(primaryItems);
  const visibleMoreItems = menuVisivel(moreItems);

  const isLocked = (item: DashboardMenuItem) =>
    !isDemo && planReady && !allowsMenu(item.menuKey);

  const openUpgrade = (menuKey?: string) => {
    setMoreOpen(false);
    setMenuBloqueado(menuKey);
    setUpgradeOpen(true);
  };

  const cleanNumber =
    WHATSAPP_NUMBER && typeof WHATSAPP_NUMBER === "string"
      ? WHATSAPP_NUMBER.replace(/\D/g, "")
      : null;
  const waUrl = cleanNumber ? `https://wa.me/${cleanNumber}` : null;

  // Prefix-match igual à sidebar (exceto /dashboard, que é o índice): rota
  // aninhada mantém a tab do pai ativa também no mobile.
  const isPathActive = (path: string) =>
    !isDemo &&
    (location.pathname === path ||
      (path !== "/dashboard" && location.pathname.startsWith(path + "/")));

  const isMoreActive = visibleMoreItems.some((i) => isPathActive(i.path));

  const go = (item: DashboardMenuItem) => {
    if (isLocked(item)) {
      openUpgrade(item.menuKey);
      return;
    }
    setMoreOpen(false);
    if (!isDemo) navigate(item.path);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    storage.clear();
    sessionStorage.clear();
    window.location.href = APP_CONFIG.ROUTES.HOME;
  };

  const tabBase =
    "flex flex-1 flex-col items-center justify-center gap-1 min-h-[56px] text-[11px] font-medium transition-colors";

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card pb-[env(safe-area-inset-bottom)]"
        aria-label="Navegação inferior"
      >
        <div className="flex items-stretch">
          {visiblePrimaryItems.map((item) => {
            const isActive = isPathActive(item.path);
            const locked = isLocked(item);
            return (
              <NavLink
                key={item.path}
                to={isDemo || locked ? "#" : item.path}
                onClick={(e) => {
                  if (isDemo) e.preventDefault();
                  if (locked) {
                    e.preventDefault();
                    openUpgrade(item.menuKey);
                  }
                }}
                className={cn(
                  tabBase,
                  isActive
                    ? "text-[#7CB8F2]"
                    : locked
                      ? "text-muted-foreground/60"
                      : "text-muted-foreground hover:text-foreground"
                )}
                aria-label={locked ? `${item.label} (requer upgrade de plano)` : item.label}
                aria-current={isActive ? "page" : undefined}
              >
                <span className="relative">
                  <item.icon className="w-5 h-5" aria-hidden="true" />
                  {item.isNew && !locked && (
                    <span className="absolute -top-1 -right-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                  {locked && (
                    <Lock className="absolute -top-1 -right-1.5 w-2.5 h-2.5" aria-hidden />
                  )}
                </span>
                <span>{item.shortLabel ?? item.label}</span>
              </NavLink>
            );
          })}

          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={cn(
              tabBase,
              isMoreActive
                ? "text-[#7CB8F2]"
                : "text-muted-foreground hover:text-foreground"
            )}
            aria-label="Mais opções"
          >
            <MoreHorizontal className="w-5 h-5" aria-hidden="true" />
            <span>Mais</span>
          </button>
        </div>
      </nav>

      <Drawer open={moreOpen} onOpenChange={setMoreOpen}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>Mais opções</DrawerTitle>
            <DrawerDescription>Acesse todas as áreas do MarketDash</DrawerDescription>
          </DrawerHeader>

          <div className="overflow-y-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            {!isDemo && indiqueItem && (
              <button
                type="button"
                onClick={() => go(indiqueItem)}
                className="mb-3 flex w-full items-center gap-3 rounded-xl border border-[#F0A94A]/30 bg-[#F0A94A]/5 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-[#F0A94A]/10"
              >
                <Gift className="w-5 h-5 text-[#F0A94A]" />
                Indique &amp; Ganhe
              </button>
            )}
            <div className="grid grid-cols-3 gap-3">
              {visibleMoreItems.map((item) => {
                const isActive = isPathActive(item.path);
                const locked = isLocked(item);
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => go(item)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-2 rounded-xl border p-4 text-center transition-colors min-h-[88px] relative",
                      isActive
                        ? "border-[rgba(49,140,233,0.38)] bg-[rgba(49,140,233,0.12)] text-[#7CB8F2]"
                        : locked
                          ? "border-border bg-card text-muted-foreground/60"
                          : "border-border bg-card text-foreground hover:bg-accent"
                    )}
                    aria-label={locked ? `${item.label} (requer upgrade de plano)` : item.label}
                  >
                    {locked && (
                      <Lock className="absolute top-2 right-2 w-3.5 h-3.5" aria-hidden />
                    )}
                    <item.icon className="w-6 h-6" aria-hidden="true" />
                    <span className="text-xs font-medium leading-tight">{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => {
                  toggleTheme();
                }}
                className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                {theme === "dark" ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
                {theme === "dark" ? "Tema claro" : "Tema escuro"}
              </button>

              {waUrl && !isDemo && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition-colors hover:text-[#25D366] hover:border-[#25D366]/40"
                >
                  <WhatsAppLogo className="w-5 h-5" />
                  Suporte via WhatsApp
                </a>
              )}

              {!isDemo && (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                >
                  <LogOut className="w-5 h-5" />
                  Sair da conta
                </button>
              )}
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      <UpgradePlanoModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        menuKey={menuBloqueado}
      />
    </>
  );
};

export default MobileBottomNav;
