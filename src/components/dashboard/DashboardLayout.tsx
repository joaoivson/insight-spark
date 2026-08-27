import { ReactNode } from "react";
import DashboardSidebar from "./DashboardSidebar";
import DashboardHeader from "./DashboardHeader";
import MobileBottomNav from "./MobileBottomNav";

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  subtitleSize?: "sm" | "xs";
  action?: ReactNode;
}

const DashboardLayout = ({ children, title, subtitle, subtitleSize, action }: DashboardLayoutProps) => {
  // E (rodada 5): SEM overlay de bloqueio no login. Com a persistência, os dados já estão no
  // banco — abre direto com a última sync e o sync roda em background (cron/botão Atualizar).
  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Sidebar — só desktop; no mobile a navegação é a bottom nav */}
      <DashboardSidebar />

      {/* min-w-0: filho de flex não encolhe abaixo do conteúdo por padrão. Sem
          isso o container fica mais largo que a tela, os `overflow-x-auto`
          internos nunca ativam e o `overflow-hidden` daqui corta a tabela em
          silêncio — era assim que o painel admin sumia com metade das colunas
          no celular. */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <DashboardHeader
          title={title}
          subtitle={subtitle}
          subtitleSize={subtitleSize}
          action={action}
        />
        <main
          className="flex-1 overflow-y-auto px-3 pt-3 pb-[calc(5rem+env(safe-area-inset-bottom))] md:p-6 md:pb-6"
          role="main"
          aria-label="Conteúdo principal"
        >
          {children}
        </main>
      </div>

      {/* Navegação inferior estilo app — apenas mobile */}
      <MobileBottomNav />
    </div>
  );
};

export default DashboardLayout;
