import { ReactNode, useState } from "react";
import DashboardSidebar from "./DashboardSidebar";
import DashboardHeader from "./DashboardHeader";
import { useGlobalDataLoading } from "@/shared/hooks/useGlobalDataLoading";
import { LoadingDataOverlay } from "./LoadingDataOverlay";
import { AnimatePresence } from "framer-motion";

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  subtitleSize?: "sm" | "xs";
  action?: ReactNode;
}

const DashboardLayout = ({ children, title, subtitle, subtitleSize, action }: DashboardLayoutProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { showInitialOverlay } = useGlobalDataLoading();

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <AnimatePresence>
        {showInitialOverlay && <LoadingDataOverlay />}
      </AnimatePresence>

      {/* Sidebar - Renders as aside on desktop, Sheet on mobile */}
      <DashboardSidebar mobileMenuOpen={mobileMenuOpen} onMobileMenuClose={() => setMobileMenuOpen(false)} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader 
          title={title} 
          subtitle={subtitle}
          subtitleSize={subtitleSize}
          action={action}
          onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6" role="main" aria-label="Conteúdo principal">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
