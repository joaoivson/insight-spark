import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const recentData = [
  { id: 1, date: "2024-01-15", product: "Produto A", revenue: 2500, cost: 800, commission: 250, profit: 1450 },
  { id: 2, date: "2024-01-14", product: "Produto B", revenue: 1800, cost: 600, commission: 180, profit: 1020 },
  { id: 3, date: "2024-01-13", product: "Produto A", revenue: 3200, cost: 1050, commission: 320, profit: 1830 },
  { id: 4, date: "2024-01-12", product: "Produto C", revenue: 1500, cost: 480, commission: 150, profit: 870 },
  { id: 5, date: "2024-01-11", product: "Produto D", revenue: 2100, cost: 680, commission: 210, profit: 1210 },
  { id: 6, date: "2024-01-10", product: "Produto B", revenue: 2800, cost: 920, commission: 280, profit: 1600 },
];

const DataTable = () => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  return (
    <div className="bg-card rounded-xl border border-border mt-6 overflow-hidden">
      <div className="p-6 border-b border-border">
        <h3 className="font-display font-semibold text-lg text-foreground">Dados Recentes</h3>
        <p className="text-sm text-muted-foreground">Últimas transações registradas</p>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Data</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead className="text-right">Receita</TableHead>
              <TableHead className="text-right">Custo</TableHead>
              <TableHead className="text-right">Comissão</TableHead>
              <TableHead className="text-right">Lucro</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentData.map((row) => (
              <TableRow key={row.id} className="hover:bg-muted/30 transition-colors">
                <TableCell className="font-medium">{formatDate(row.date)}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{row.product}</Badge>
                </TableCell>
                <TableCell className="text-right text-success font-medium">
                  {formatCurrency(row.revenue)}
                </TableCell>
                <TableCell className="text-right text-warning font-medium">
                  {formatCurrency(row.cost)}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {formatCurrency(row.commission)}
                </TableCell>
                <TableCell className="text-right text-accent font-semibold">
                  {formatCurrency(row.profit)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default DataTable;
