import { ReactNode, useState } from "react";
import { Bell, RefreshCw, User, Sun, Moon, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/shared/hooks/useTheme";
import { useDatasetStore } from "@/stores/datasetStore";
import { useAdSpendsStore } from "@/stores/adSpendsStore";
import { useIsMobile } from "@/shared/hooks/use-mobile";

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  subtitleSize?: "sm" | "xs";
  action?: ReactNode;
  onMobileMenuToggle?: () => void;
}

const DashboardHeader = ({ title, subtitle, subtitleSize = "sm", action, onMobileMenuToggle }: DashboardHeaderProps) => {
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const { fetchRows } = useDatasetStore();
  const { fetchAdSpends } = useAdSpendsStore();
  const [refreshing, setRefreshing] = useState(false);

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

  const isMobile = useIsMobile();

  return (
    <header className="bg-card border-b border-border px-4 md:px-6 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3 flex-shrink-0" role="banner">
      <div className="flex items-center gap-3">
        {isMobile && onMobileMenuToggle && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMobileMenuToggle}
            className="md:hidden"
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5" />
          </Button>
        )}
        <div>
          <h1 className="font-display font-bold text-xl text-foreground">{title}</h1>
          {subtitle && <p className={subtitleSize === "xs" ? "text-xs text-muted-foreground" : "text-sm text-muted-foreground"}>{subtitle}</p>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {action && (
          <>
            {action}
            <div className="h-6 w-px bg-border mx-2" />
          </>
        )}
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh} 
          loading={refreshing}
          loadingText="Atualizando..."
          aria-label="Atualizar dados do dashboard"
        >
          Atualizar Dados
        </Button>

        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Alternar tema">
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>

        <Button 
          variant="ghost" 
          size="icon" 
          className="relative"
          aria-label="Notificações"
          aria-describedby="notification-badge"
        >
          <Bell className="w-5 h-5" aria-hidden="true" />
          <span 
            id="notification-badge"
            className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full" 
            aria-label="Você tem notificações"
          />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Menu do usuário">
              <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                <User className="w-4 h-4 text-accent" aria-hidden="true" />
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Perfil</DropdownMenuItem>
            <DropdownMenuItem>Configurações</DropdownMenuItem>
            <DropdownMenuItem>Assinatura</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">Sair</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default DashboardHeader;
