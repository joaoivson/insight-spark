import { NavLink, useLocation } from "react-router-dom";
import { LogOut, ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { storage } from "@/shared/lib/storage";
import { APP_CONFIG } from "@/core/config/app.config";
import { supabase } from "@/shared/lib/supabase";
import { BrandLogo, BrandSymbol } from "@/components/brand/BrandLogo";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { usePlanStore } from "@/stores/planStore";
import { UpgradePlanoModal } from "@/features/subscription/components/UpgradePlanoModal";
import { menuVisivel } from "@/shared/config/dashboard-menu";
import { WhatsAppLogo } from "@/components/shared/BrandIcons";

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER;
const DashboardSidebar = () => {
  const location = useLocation();
  const isDemoRoute = location.pathname.startsWith("/demo");
  const [collapsed, setCollapsed] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  // Qual menu a pessoa tentou abrir — o modal precisa disso pra oferecer Pro ou Max.
  const [menuBloqueado, setMenuBloqueado] = useState<string | undefined>();
  const isMobile = useIsMobile();
  const { fetch: fetchPlan, allowsMenu } = usePlanStore();
  // Cadeado só depois do contexto real chegar (fallback do store = essencial);
  // a rota tem RequirePlan, então liberar o clique durante o fetch é seguro.
  const planReady = usePlanStore((s) => !!s.context);
  // Gate de ambiente (hmlOnly): item some do menu inteiro em produção, não
  // fica só com cadeado (o cadeado é gating por plano, que é outra coisa).
  const visibleMenu = menuVisivel();

  useEffect(() => {
    if (!isDemoRoute) void fetchPlan();
  }, [fetchPlan, isDemoRoute]);

  const cleanNumber = WHATSAPP_NUMBER && typeof WHATSAPP_NUMBER === "string" ? WHATSAPP_NUMBER.replace(/\D/g, "") : null;
  const waUrl = cleanNumber ? `https://wa.me/${cleanNumber}` : null;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    storage.clear();
    sessionStorage.clear();
    window.location.href = APP_CONFIG.ROUTES.HOME;
  };

  const sidebarContent = (
    <>
      <div className={cn(
        "h-16 flex items-center border-b border-sidebar-border px-4 flex-shrink-0",
        collapsed ? "justify-center" : "justify-between"
      )}>
        {!collapsed && (
          <div className="flex items-center flex-1 min-w-0">
            <BrandLogo className="w-auto flex-shrink-0 h-8" />
          </div>
        )}
        {collapsed && (
          <BrandSymbol className="w-9 h-9 flex-shrink-0" />
        )}
      </div>

      <nav className="flex-1 py-3 md:py-4 px-3 overflow-y-auto" aria-label="Navegação principal">
        <ul className="flex flex-col gap-1" role="list">
          {visibleMenu.map((item) => {
            const menuKey = item.menuKey;
            const locked = !isDemoRoute && planReady && !allowsMenu(menuKey);
            // Prefix-match (exceto /dashboard, que é o índice): rota aninhada
            // como /dashboard/automacoes/nova mantém o item pai destacado.
            // Nenhum path do menu é prefixo de outro — se um dia for, o item
            // mais específico e o pai acenderiam juntos.
            const isActive =
              !isDemoRoute &&
              (location.pathname === item.path ||
                (item.path !== "/dashboard" && location.pathname.startsWith(item.path + "/")));
            const classes = cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 border-l-[3px] border-l-transparent",
              locked
                ? "text-sidebar-foreground/40 opacity-70 cursor-pointer"
                : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
              isActive && !locked && "bg-[rgba(49,140,233,0.12)] border-l-[#318CE9] hover:bg-[rgba(49,140,233,0.12)]",
              collapsed && "justify-center px-0",
              "w-full"
            );
            const itemContent = (
              <>
                <item.icon className={cn("w-4 h-4 flex-shrink-0", item.iconClass, isActive && !locked && "text-[#318CE9]")} aria-hidden="true" />
                {!collapsed && (
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0 flex-1">
                    {/* whitespace-nowrap: "Automação Instagram" quebrava em duas
                        linhas e desalinhava o item do resto do menu. */}
                    <span className={cn("text-sm font-medium whitespace-nowrap", isActive && !locked && "text-white")}>{item.label}</span>
                    {item.isNew && !locked && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/20 text-primary flex-shrink-0">
                        Novo
                      </span>
                    )}
                  </div>
                )}
                {locked && !collapsed && (
                  <Lock className="w-4 h-4 flex-shrink-0 text-sidebar-foreground/50" aria-hidden />
                )}
              </>
            );
            return (
              <li key={item.path} className="w-full">
                {isDemoRoute ? (
                  <button
                    type="button"
                    className={classes}
                    onClick={(e) => e.preventDefault()}
                    aria-label={item.label}
                  >
                    {itemContent}
                  </button>
                ) : locked ? (
                  <button
                    type="button"
                    className={classes}
                    onClick={() => {
                      setMenuBloqueado(menuKey);
                      setUpgradeOpen(true);
                    }}
                    aria-label={`${item.label} (requer upgrade de plano)`}
                  >
                    {itemContent}
                  </button>
                ) : (
                  <NavLink
                    to={item.path}
                    className={classes}
                    aria-label={item.label}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {itemContent}
                  </NavLink>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="px-3 pb-2 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "w-full text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
              collapsed && "px-0 justify-center"
            )}
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            aria-expanded={!collapsed}
          >
            {collapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <>
                <ChevronLeft className="w-5 h-5" />
                <span>Recolher</span>
              </>
            )}
          </Button>
      </div>

      <div className="border-t border-sidebar-border p-3 flex-shrink-0 flex flex-col gap-1">
        {waUrl && !isDemoRoute && (
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 w-full",
              "text-sidebar-foreground/70 hover:text-[#25D366] hover:bg-[#25D366]/10",
              collapsed && "justify-center px-0"
            )}
            aria-label="Suporte via WhatsApp"
          >
            <WhatsAppLogo className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Suporte</span>}
          </a>
        )}
        {isDemoRoute ? (
          <button
            type="button"
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 w-full",
              "text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10",
              collapsed && "justify-center px-0"
            )}
            onClick={(e) => e.preventDefault()}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Sair</span>}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleLogout}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 w-full",
              "text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10",
              collapsed && "justify-center px-0"
            )}
            aria-label="Sair da conta"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            {!collapsed && <span className="text-sm font-medium">Sair</span>}
          </button>
        )}
      </div>
      <UpgradePlanoModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        menuKey={menuBloqueado}
      />
    </>
  );

  // No mobile quem navega é a MobileBottomNav. Este Sheet existia sem nenhum
  // gatilho que o abrisse (o header nunca renderizou o hambúrguer), então era
  // menu morto — e a regra do produto é navegação no rodapé, ao alcance do polegar.
  if (isMobile) return null;

  return (
    <aside
      className={cn(
        "bg-sidebar flex flex-col transition-all duration-300 border-sidebar-border",
        "hidden md:flex md:sticky md:top-0 md:h-screen md:border-r",
        // w-72 e não w-64: "Automação Instagram" + cadeado pede 168px de texto
        // e o item só tinha 144px — o rótulo invadia o ícone de cadeado.
        collapsed ? "md:w-20" : "md:w-72"
      )}
      role="complementary"
      aria-label="Menu lateral"
    >
      {sidebarContent}
    </aside>
  );
};

export default DashboardSidebar;
