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
  X
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { tokenStorage, userStorage } from "@/shared/lib/storage";
import { APP_CONFIG } from "@/core/config/app.config";
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
  { icon: Upload, label: "Upload CSV", path: "/dashboard/upload" },
  { icon: Wallet, label: "Investimentos Ads", path: "/dashboard/investimentos" },
  { icon: FileText, label: "Relatórios", path: "/dashboard/reports" },
  // { icon: Puzzle, label: "Módulos", path: "/dashboard/modules" }, // Temporarily hidden
];

interface DashboardSidebarProps {
  mobileMenuOpen?: boolean;
  onMobileMenuClose?: () => void;
}

const DashboardSidebar = ({ mobileMenuOpen = false, onMobileMenuClose }: DashboardSidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isDemo = location.pathname.startsWith("/demo");
  const [collapsed, setCollapsed] = useState(false);
  const isMobile = useIsMobile();

  const handleLogout = () => {
    // Remover token e dados do usuário
    tokenStorage.remove();
    userStorage.remove();
    // Navegar para a página inicial
    navigate(APP_CONFIG.ROUTES.HOME);
    onMobileMenuClose?.();
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
                    <item.icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                    {(!collapsed || isMobile) && <span className="font-medium truncate">{item.label}</span>}
                  </button>
                ) : (
                  <NavLink 
                    to={item.path} 
                    className={classes}
                    aria-label={item.label}
                    aria-current={isActive ? "page" : undefined}
                    onClick={handleNavClick}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                    {(!collapsed || isMobile) && <span className="font-medium truncate">{item.label}</span>}
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
      <div className="border-t border-sidebar-border p-3 flex-shrink-0">
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
