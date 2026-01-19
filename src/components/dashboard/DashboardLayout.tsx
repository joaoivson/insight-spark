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
    <div className="min-h-screen bg-background flex">
      <div className="sticky top-0 h-screen flex-shrink-0">
        <DashboardSidebar />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader title={title} subtitle={subtitle} action={action} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
