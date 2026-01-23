import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { 
  Upload, 
  FileText, 
  Puzzle, 
  Settings, 
  LogOut,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  Wallet
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { tokenStorage, userStorage } from "@/shared/lib/storage";
import { APP_CONFIG } from "@/core/config/app.config";
import logoIcon from "@/assets/logo/logo.png";
import logoName from "@/assets/logo/logo_name.png";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Wallet, label: "Investimentos Ads", path: "/dashboard/investimentos" },
  { icon: Upload, label: "Upload CSV", path: "/dashboard/upload" },
  { icon: FileText, label: "Relatórios", path: "/dashboard/reports" },
  { icon: Puzzle, label: "Módulos", path: "/dashboard/modules" },
  { icon: Settings, label: "Configurações", path: "/dashboard/settings" },
];

const DashboardSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isDemo = location.pathname.startsWith("/demo");
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    // Remover token e dados do usuário
    tokenStorage.remove();
    userStorage.remove();
    // Navegar para a página inicial
    navigate(APP_CONFIG.ROUTES.HOME);
  };

  return (
    <aside 
      className={cn(
        "bg-sidebar flex flex-col transition-all duration-300 border-sidebar-border",
        "w-full md:h-screen md:border-r border-b md:border-b-0",
        collapsed ? "md:w-20" : "md:w-64"
      )}
    >
      {/* Header */}
      <div className={cn(
        "h-16 flex items-center border-b border-sidebar-border px-4",
        collapsed ? "justify-center" : "justify-between"
      )}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <img
              src={logoIcon}
              alt="Logo MarketDash"
              className="w-9 h-9 rounded-lg object-contain p-1.5 brand-logo-mark"
            />
            <img
              src={logoName}
              alt="MarketDash"
              className="h-7 w-auto brand-logo-name"
            />
          </div>
        )}
        {collapsed && (
          <img
            src={logoIcon}
            alt="Logo MarketDash"
            className="w-9 h-9 rounded-lg object-contain p-1.5 brand-logo-mark"
          />
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 md:py-6 px-3">
        <ul className="flex md:flex-col gap-2 md:gap-1 overflow-x-auto md:overflow-visible">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path && !isDemo;
            const classes = cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
              "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
              isActive && "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary",
              collapsed && "justify-center px-0",
              "min-w-max"
            );
            return (
              <li key={item.path}>
                {isDemo ? (
                  <button
                    type="button"
                    className={classes}
                    onClick={(e) => e.preventDefault()}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {!collapsed && <span className="font-medium">{item.label}</span>}
                  </button>
                ) : (
                  <NavLink to={item.path} className={classes}>
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {!collapsed && <span className="font-medium">{item.label}</span>}
                  </NavLink>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Collapse Toggle */}
      <div className="px-3 pb-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "w-full text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
            collapsed && "px-0 justify-center"
          )}
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

      {/* Logout */}
      <div className="border-t border-sidebar-border p-3">
        {isDemo ? (
          <button
            type="button"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
              "text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10",
              collapsed && "justify-center px-0"
            )}
            onClick={(e) => e.preventDefault()}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="font-medium">Sair</span>}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleLogout}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 w-full",
              "text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10",
              collapsed && "justify-center px-0"
            )}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="font-medium">Sair</span>}
          </button>
        )}
      </div>
    </aside>
  );
};

export default DashboardSidebar;
