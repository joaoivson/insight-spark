import { ReactNode, useState, useEffect } from "react";
import { User, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandSymbol } from "@/components/brand/BrandLogo";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/shared/hooks/useTheme";
import { useDatasetStore } from "@/stores/datasetStore";
import { useAdSpendsStore } from "@/stores/adSpendsStore";
import { useNavigate, useLocation } from "react-router-dom";
import { APP_CONFIG } from "@/core/config/app.config";
import { userStorage } from "@/shared/lib/storage";
import { User as UserType } from "@/shared/types";

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  subtitleSize?: "sm" | "xs";
  action?: ReactNode;
}

const DashboardHeader = ({ title, subtitle, subtitleSize = "sm", action }: DashboardHeaderProps) => {
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const { fetchRows } = useDatasetStore();
  const { fetchAdSpends } = useAdSpendsStore();
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const navigate = useNavigate();
  const location = useLocation();
  const isDemo = location.pathname.startsWith("/demo");

  useEffect(() => {
    const user = userStorage.get() as (UserType & { name?: string }) | null;
    const rawName = user?.nome ?? user?.name ?? "";
    if (rawName && typeof rawName === "string") {
      const names = rawName.trim().split(/\s+/);
      const displayName = names.length > 1 ? `${names[0]} ${names[1]}` : names[0];
      setUserName(displayName);
    }
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await Promise.all([
        fetchRows({ force: true, includeRawData: true }),
        fetchAdSpends({ force: true }),
      ]);
      toast({
        title: "Dados atualizados",
        description: "Seus dados foram sincronizados com sucesso.",
      });
    } catch (err) {
      toast({
        title: "Falha ao atualizar",
        description: "Não foi possível sincronizar agora. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <header className="bg-card border-b border-border px-3 md:px-6 py-2 md:py-3 flex-shrink-0" role="banner">
      <div className="flex items-center justify-between gap-2 md:gap-3">
        <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
          <BrandSymbol className="md:hidden w-7 h-7 flex-shrink-0" />
          <div className="min-w-0">
            <h1 className="font-display font-bold text-base md:text-xl text-foreground leading-tight truncate">{title}</h1>
            {subtitle && (
              <p
                className={`truncate md:whitespace-normal md:line-clamp-2 leading-snug ${
                  subtitleSize === "xs"
                    ? "text-[10px] md:text-xs text-muted-foreground"
                    : "text-[11px] md:text-sm text-muted-foreground"
                }`}
              >
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-1.5 md:gap-3">
          {action && (
            <div className="flex items-center gap-1.5 md:gap-3 shrink-0 [&>*]:flex-none">
              {action}
              <div className="hidden md:block h-6 w-px bg-border mx-1" />
            </div>
          )}

          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Alternar tema" className="hidden md:inline-flex">
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>

          <div className="flex items-center gap-2 md:gap-3 pl-1.5 md:pl-2 border-l border-border/50">
            {userName && (
              <div className="hidden flex-col items-end lg:flex">
                <span className="text-xs font-semibold text-foreground leading-none">
                  {userName}
                </span>
                <span className="text-[10px] text-muted-foreground mt-0.5">
                  {getGreeting()}
                </span>
              </div>
            )}

            <Button
              variant="ghost"
              className="p-0 h-auto hover:bg-transparent"
              aria-label="Abrir configurações"
              onClick={() => !isDemo && navigate(APP_CONFIG.ROUTES.DASHBOARD_SETTINGS)}
              disabled={isDemo}
            >
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center transition-colors hover:bg-accent/20">
                <User className="w-4 h-4 md:w-5 md:h-5 text-accent" aria-hidden="true" />
              </div>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
