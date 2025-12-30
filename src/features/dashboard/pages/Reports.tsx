import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { motion } from "framer-motion";
import { FileText, Download, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const reportData = [
  { month: "Janeiro 2024", revenue: 12400, cost: 4200, commission: 1240, profit: 6960, change: 12.5 },
  { month: "Fevereiro 2024", revenue: 15800, cost: 5100, commission: 1580, profit: 9120, change: 31.0 },
  { month: "Março 2024", revenue: 18200, cost: 5800, commission: 1820, profit: 10580, change: 16.0 },
  { month: "Abril 2024", revenue: 21000, cost: 6500, commission: 2100, profit: 12400, change: 17.2 },
  { month: "Maio 2024", revenue: 24500, cost: 7200, commission: 2450, profit: 14850, change: 19.8 },
  { month: "Junho 2024", revenue: 28800, cost: 8100, commission: 2880, profit: 17820, change: 20.0 },
];

const ReportsPage = () => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const totalRevenue = reportData.reduce((acc, row) => acc + row.revenue, 0);
  const totalProfit = reportData.reduce((acc, row) => acc + row.profit, 0);

  return (
    <DashboardLayout title="Relatórios" subtitle="Análise detalhada dos seus dados">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Filters */}
        <div className="bg-card rounded-xl border border-border p-4 mb-6 flex flex-wrap items-center gap-4">
          <Select defaultValue="2024">
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2023">2023</SelectItem>
            </SelectContent>
          </Select>

          <Select defaultValue="all">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os meses</SelectItem>
              <SelectItem value="q1">1º Trimestre</SelectItem>
              <SelectItem value="q2">2º Trimestre</SelectItem>
              <SelectItem value="q3">3º Trimestre</SelectItem>
              <SelectItem value="q4">4º Trimestre</SelectItem>
            </SelectContent>
          </Select>

          <div className="ml-auto">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-success" />
              </div>
              <span className="text-muted-foreground">Receita Total (período)</span>
            </div>
            <div className="font-display text-3xl font-bold text-foreground">
              {formatCurrency(totalRevenue)}
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-accent" />
              </div>
              <span className="text-muted-foreground">Lucro Total (período)</span>
            </div>
            <div className="font-display text-3xl font-bold text-foreground">
              {formatCurrency(totalProfit)}
            </div>
          </div>
        </div>

        {/* Report Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-6 border-b border-border flex items-center gap-3">
            <FileText className="w-5 h-5 text-muted-foreground" />
            <div>
              <h3 className="font-display font-semibold text-foreground">Relatório Mensal</h3>
              <p className="text-sm text-muted-foreground">Comparativo de performance por mês</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Mês</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                  <TableHead className="text-right">Custos</TableHead>
                  <TableHead className="text-right">Comissão</TableHead>
                  <TableHead className="text-right">Lucro</TableHead>
                  <TableHead className="text-right">Variação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.map((row) => (
                  <TableRow key={row.month} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium">{row.month}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.revenue)}</TableCell>
                    <TableCell className="text-right text-warning">{formatCurrency(row.cost)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatCurrency(row.commission)}</TableCell>
                    <TableCell className="text-right font-semibold text-accent">{formatCurrency(row.profit)}</TableCell>
                    <TableCell className="text-right">
                      <span className={`inline-flex items-center gap-1 ${row.change >= 0 ? "text-success" : "text-destructive"}`}>
                        {row.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {row.change >= 0 ? "+" : ""}{row.change}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
};

export default ReportsPage;

