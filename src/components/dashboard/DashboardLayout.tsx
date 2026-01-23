import { ReactNode } from "react";
import DashboardSidebar from "./DashboardSidebar";
import DashboardHeader from "./DashboardHeader";

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

const DashboardLayout = ({ children, title, subtitle, action }: DashboardLayoutProps) => {
  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <div className="md:sticky md:top-0 md:h-screen flex-shrink-0" role="complementary" aria-label="Menu lateral">
        <DashboardSidebar />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader title={title} subtitle={subtitle} action={action} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6" role="main" aria-label="Conteúdo principal">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
