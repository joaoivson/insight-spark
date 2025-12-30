import DashboardLayout from "@/components/dashboard/DashboardLayout";
import KPICards from "@/components/dashboard/KPICards";
import DashboardCharts from "@/components/dashboard/DashboardCharts";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import DataTable from "@/components/dashboard/DataTable";
import { motion } from "framer-motion";

const Dashboard = () => {
  return (
    <DashboardLayout title="Dashboard" subtitle="Visão geral dos seus dados">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <DashboardFilters />
        <KPICards />
        <DashboardCharts />
        <DataTable />
      </motion.div>
    </DashboardLayout>
  );
};

export default Dashboard;

