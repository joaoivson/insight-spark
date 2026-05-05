import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Upload,
  FileText,
  Puzzle,
  LogOut,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  Wallet,
  X,
  MousePointerClick,
  Globe,
  Link2,
  Plug,
  Receipt,
  Users,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { tokenStorage, userStorage, storage } from "@/shared/lib/storage";
import { APP_CONFIG } from "@/core/config/app.config";
import { supabase } from "@/shared/lib/supabase";
import logoIcon from "@/assets/logo/logo.png";
import logoName from "@/assets/logo/logo_name.png";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/shared/hooks/use-mobile";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Upload, label: "Upload Comissão", path: "/dashboard/upload" },
  { icon: MousePointerClick, label: "Upload Cliques", path: "/dashboard/upload-cliques" },
  { icon: Wallet, label: "Custos de Anúncios", path: "/dashboard/investimentos" },
  { icon: Globe, label: "Página de Captura", path: "/dashboard/captura" },
  { icon: Link2, label: "Meus Links", path: "/dashboard/links" },
  { icon: Plug, label: "Integração Shopee", path: "/dashboard/integracoes", isNew: true },
  { icon: Receipt, label: "Impostos", path: "/dashboard/impostos", isNew: true },
  { icon: Users, label: "Indique & Ganhe", path: "/dashboard/afiliados", isNew: true },
  // { icon: FileText, label: "Relatório Dinâmico", path: "/dashboard/reports" },
  // { icon: Puzzle, label: "Módulos", path: "/dashboard/modules" }, // Temporarily hidden
];

interface DashboardSidebarProps {
  mobileMenuOpen?: boolean;
  onMobileMenuClose?: () => void;
}

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER;
const WhatsAppLogo = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const DashboardSidebar = ({ mobileMenuOpen = false, onMobileMenuClose }: DashboardSidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isDemo = location.pathname.startsWith("/demo");
  const [collapsed, setCollapsed] = useState(false);
  const isMobile = useIsMobile();

  const cleanNumber = WHATSAPP_NUMBER && typeof WHATSAPP_NUMBER === "string" ? WHATSAPP_NUMBER.replace(/\D/g, "") : null;
  const waUrl = cleanNumber ? `https://wa.me/${cleanNumber}` : null;

  const handleLogout = async () => {
    // Invalidar sessão no servidor Supabase
    await supabase.auth.signOut();

    // Apagar absolutamente todos os dados do localStorage e sessionStorage
    storage.clear();
    sessionStorage.clear();

    onMobileMenuClose?.();

    // Forçar reload completo para destruir qualquer estado em memória (React Query, Zustand, etc)
    window.location.href = APP_CONFIG.ROUTES.HOME;
  };

  const handleNavClick = () => {
    if (isMobile) {
      onMobileMenuClose?.();
    }
  };

  const sidebarContent = (
    <>
      {/* Header */}
      <div className={cn(
        "h-16 flex items-center border-b border-sidebar-border px-4 flex-shrink-0",
        collapsed && !isMobile ? "justify-center" : "justify-between"
      )}>
        {(!collapsed || isMobile) && (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <img
              src={logoIcon}
              alt="Logo MarketDash"
              className="w-9 h-9 rounded-lg object-contain p-1.5 brand-logo-mark flex-shrink-0"
            />
            {!isMobile && (
              <img
                src={logoName}
                alt="MarketDash"
                className="h-7 w-auto brand-logo-name flex-shrink-0"
              />
            )}
            {isMobile && (
              <img
                src={logoName}
                alt="MarketDash"
                className="h-6 w-auto brand-logo-name flex-shrink-0"
              />
            )}
          </div>
        )}
        {collapsed && !isMobile && (
          <img
            src={logoIcon}
            alt="Logo MarketDash"
            className="w-9 h-9 rounded-lg object-contain p-1.5 brand-logo-mark flex-shrink-0"
          />
        )}
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onMobileMenuClose?.()}
            className="flex-shrink-0"
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 md:py-6 px-3 overflow-y-auto" aria-label="Navegação principal">
        <ul className="flex flex-col gap-1" role="list">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path && !isDemo;
            const classes = cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
              "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
              isActive && "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary",
              collapsed && !isMobile && "justify-center px-0",
              "w-full"
            );
            const itemContent = (
              <>
                <item.icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                {(!collapsed || isMobile) && (
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="font-medium truncate">{item.label}</span>
                    {item.isNew && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/20 text-primary flex-shrink-0">
                        Novo
                      </span>
                    )}
                  </div>
                )}
              </>
            );
            return (
              <li key={item.path} className="w-full">
                {isDemo ? (
                  <button
                    type="button"
                    className={classes}
                    onClick={(e) => e.preventDefault()}
                    aria-label={item.label}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {itemContent}
                  </button>
                ) : (
                  <NavLink
                    to={item.path}
                    className={classes}
                    aria-label={item.label}
                    aria-current={isActive ? "page" : undefined}
                    onClick={handleNavClick}
                  >
                    {itemContent}
                  </NavLink>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Collapse Toggle - Only on desktop */}
      {!isMobile && (
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
      )}

      {/* Logout */}
      <div className="border-t border-sidebar-border p-3 flex-shrink-0 flex flex-col gap-1">
        {waUrl && !isDemo && (
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 w-full",
              "text-sidebar-foreground/70 hover:text-[#25D366] hover:bg-[#25D366]/10",
              collapsed && !isMobile && "justify-center px-0"
            )}
            aria-label="Suporte via WhatsApp"
          >
            <WhatsAppLogo className="w-5 h-5 flex-shrink-0" />
            {(!collapsed || isMobile) && <span className="font-medium">Suporte</span>}
          </a>
        )}
        {isDemo ? (
          <button
            type="button"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 w-full",
              "text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10",
              collapsed && !isMobile && "justify-center px-0"
            )}
            onClick={(e) => e.preventDefault()}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {(!collapsed || isMobile) && <span className="font-medium">Sair</span>}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleLogout}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 w-full",
              "text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10",
              collapsed && !isMobile && "justify-center px-0"
            )}
            aria-label="Sair da conta"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
            {(!collapsed || isMobile) && <span className="font-medium">Sair</span>}
          </button>
        )}
      </div>
    </>
  );

  // Mobile: Use Sheet overlay
  if (isMobile) {
    return (
      <Sheet open={mobileMenuOpen} onOpenChange={(open) => !open && onMobileMenuClose?.()}>
        <SheetContent
          side="left"
          className="w-full sm:w-80 p-0 bg-sidebar border-sidebar-border [&>button]:hidden"
        >
          <aside className="bg-sidebar flex flex-col h-full w-full overflow-hidden">
            {sidebarContent}
          </aside>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Regular sidebar
  return (
    <aside
      className={cn(
        "bg-sidebar flex flex-col transition-all duration-300 border-sidebar-border",
        "hidden md:flex md:sticky md:top-0 md:h-screen md:border-r",
        collapsed ? "md:w-20" : "md:w-64"
      )}
      role="complementary"
      aria-label="Menu lateral"
    >
      {sidebarContent}
    </aside>
  );
};

export default DashboardSidebar;
