import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useDatasetRows, invalidateDatasetRowsCache, AdSpend } from "@/shared/hooks/useDatasetRows";
import { getApiUrl } from "@/core/config/api.config";
import { userStorage } from "@/shared/lib/storage";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import {
  Wallet,
  UploadCloud,
  Download,
  Edit3,
  Trash2,
  RefreshCw,
  ArrowLeft,
  PlusCircle,
} from "lucide-react";

const currency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const normalizeAmount = (value: any) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    let cleaned = value.replace(/R\$/gi, "").replace(/\s+/g, "");
    const hasComma = cleaned.includes(",");
    if (hasComma) cleaned = cleaned.replace(/\./g, "").replace(/,/g, ".");
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : null;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const normalizeDate = (value: string | Date | null | undefined) => {
  if (!value) return null;
  if (value instanceof Date && !isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    // dd/MM/yyyy
    const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (match) {
      const [, d, m, y] = match;
      return `${y}-${m}-${d}`;
    }
  }
  const d = new Date(value as any);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};

const AdSpends = () => {
  const { rows, adSpends, refresh } = useDatasetRows();
  const { toast } = useToast();

  const [amount, setAmount] = useState("");
  const [subId, setSubId] = useState<string>("__all__");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [editingId, setEditingId] = useState<number | null>(null);
  const [importing, setImporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(5);

  const subIds = useMemo(
    () => Array.from(new Set(rows.map((r) => r.sub_id1).filter(Boolean))).sort(),
    [rows]
  );

  const sortedAdSpends = useMemo(() => {
    return [...adSpends].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  }, [adSpends]);

  const totalPages = Math.max(1, Math.ceil(sortedAdSpends.length / pageSize));
  const currentPage = Math.min(page, totalPages - 1);
  const paginated = sortedAdSpends.slice(currentPage * pageSize, currentPage * pageSize + pageSize);

  const resetForm = () => {
    setAmount("");
    setSubId("__all__");
    setDate(new Date().toISOString().slice(0, 10));
    setEditingId(null);
  };

  const refreshData = async () => {
    invalidateDatasetRowsCache();
    try {
      setRefreshing(true);
      await refresh({});
    } finally {
      setRefreshing(false);
    }
  };

  const handleSave = async () => {
    const parsedAmount = normalizeAmount(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      toast({ title: "Valor inválido", description: "Informe um valor maior que zero.", variant: "destructive" });
      return;
    }
    const parsedDate = normalizeDate(date);
    if (!parsedDate) {
      toast({ title: "Data inválida", description: "Use o formato dd/mm/aaaa ou yyyy-mm-dd.", variant: "destructive" });
      return;
    }

    try {
      setSaving(true);
      const storedUser = userStorage.get() as { id?: string } | null;
      const userIdParam = storedUser?.id ? `?user_id=${storedUser.id}` : "";
      const payload = {
        amount: parsedAmount,
        sub_id: subId === "__all__" ? "" : subId,
        date: parsedDate,
      };

      const url = editingId
        ? getApiUrl(`/api/ad_spends/${editingId}${userIdParam}`)
        : getApiUrl(`/api/ad_spends${userIdParam}`);

      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Falha ao salvar");

      toast({
        title: editingId ? "Investimento atualizado" : "Investimento registrado",
        description: `${currency(parsedAmount)} em ${subId === "__all__" ? "Geral" : subId} na data ${format(
          new Date(parsedDate),
          "dd/MM/yyyy"
        )}.`,
      });
      resetForm();
      await refreshData();
    } catch (err) {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: AdSpend) => {
    setEditingId(item.id);
    setAmount(String(item.amount));
    setSubId(item.sub_id ?? "__all__");
    setDate(normalizeDate(item.date) ?? new Date().toISOString().slice(0, 10));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: number) => {
    try {
      const storedUser = userStorage.get() as { id?: string } | null;
      const userIdParam = storedUser?.id ? `?user_id=${storedUser.id}` : "";
      const res = await fetch(getApiUrl(`/api/ad_spends/${id}${userIdParam}`), { method: "DELETE" });
      if (!res.ok) throw new Error("Falha ao excluir");
      toast({ title: "Investimento removido" });
      await refreshData();
    } catch (err) {
      toast({ title: "Erro ao remover", variant: "destructive" });
    }
  };

  const handleDownloadTemplate = () => {
    const today = new Date().toISOString().slice(0, 10);
    const data = [
      ["data", "sub_id", "valor"],
      [today, "CanalA", "120,50"],
      [today, "", "300,00"],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modelo");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "modelo-investimentos.xlsx";
    link.click();
    URL.revokeObjectURL(url);
  };

  const parseCsvFile = (file: File) =>
    new Promise<Papa.ParseResult<any>>((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => resolve(results),
        error: (err) => reject(err),
      });
    });

  const parseXlsxFile = async (file: File) => {
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws);
  };

  const handleImport = async (file: File) => {
    setImporting(true);
    try {
      const ext = file.name.toLowerCase();
      let rowsData: any[] = [];

      if (ext.endsWith(".xlsx") || ext.endsWith(".xls")) {
        rowsData = await parseXlsxFile(file);
      } else {
        const result = await parseCsvFile(file);
        rowsData = Array.isArray(result.data) ? result.data : [];
      }

      const payloads = rowsData
        .map((row: any) => {
          const amt = normalizeAmount(
            row.valor ??
              row["valor"] ??
              row.amount ??
              row["amount"] ??
              row.valor_gasto ??
              row.valor_gasto_anuncios
          );
          const dt = normalizeDate(row.data ?? row["data"] ?? row.date ?? row["date"]);
          const sid = row.sub_id ?? row["sub_id"] ?? row.subid ?? row["sub id"] ?? "";
          if (!amt || !dt) return null;
          return { amount: amt, date: dt, sub_id: sid || "" };
        })
        .filter(Boolean) as { amount: number; date: string; sub_id: string }[];

      if (!payloads.length) {
        toast({ title: "Planilha vazia ou inválida", variant: "destructive" });
        return;
      }

      const storedUser = userStorage.get() as { id?: string } | null;
      const userIdParam = storedUser?.id ? `?user_id=${storedUser.id}` : "";
      let success = 0;
      for (const payload of payloads) {
        const res = await fetch(getApiUrl(`/api/ad_spends${userIdParam}`), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) success += 1;
      }

      toast({
        title: "Importação concluída",
        description: `${success} registros inseridos`,
        variant: success ? "default" : "destructive",
      });
      await refreshData();
    } catch (err) {
      toast({ title: "Erro ao importar planilha", variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  return (
    <DashboardLayout
      title="Investimentos em Ads"
      subtitle="Cadastre manualmente ou importe via planilha para alimentar os KPIs e ROAS."
      action={
        <Button variant="outline" asChild>
          <Link to="/dashboard">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Dashboard
          </Link>
        </Button>
      }
    >
      <div className="grid gap-4">
        <Card className="bg-gradient-to-r from-primary/15 via-primary/10 to-background border-primary/20 p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-primary text-xs font-semibold">
                <Wallet className="w-4 h-4" />
                Hub de investimentos ousado
              </div>
              <h2 className="text-2xl font-bold text-foreground">Registre, importe e edite gastos em um só lugar</h2>
              <p className="text-muted-foreground">
                Opção 1: preencha os campos abaixo para um lançamento rápido. <br />
                Opção 2: baixe o modelo, preencha no Excel/Sheets e faça o upload para múltiplos lançamentos.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleDownloadTemplate} disabled={saving || importing || refreshing}>
                <Download className="w-4 h-4 mr-2" />
                Baixar modelo (.xlsx)
              </Button>
              <Button variant="ghost" onClick={refreshData} disabled={saving || importing || refreshing}>
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "Atualizando..." : "Atualizar dados"}
              </Button>
            </div>
          </div>
        </Card>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Opção 1</p>
                <h3 className="text-lg font-semibold text-foreground">Lançamento manual</h3>
              </div>
              {editingId && (
                <div className="text-xs bg-secondary px-3 py-1 rounded-full text-muted-foreground">
                  Editando #{editingId}
                </div>
              )}
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="amount">Valor gasto (R$)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subid">Canal / Sub ID</Label>
                <Select value={subId} onValueChange={setSubId}>
                  <SelectTrigger className="text-foreground">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent className="text-foreground">
                    <SelectItem value="__all__">Geral (rateio entre todos)</SelectItem>
                    {subIds.map((s) => (
                      <SelectItem key={s as string} value={s as string}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Data do gasto</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="text-foreground"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <Button onClick={handleSave} disabled={saving || importing || refreshing}>
                <PlusCircle className="w-4 h-4 mr-2" />
                {saving ? "Salvando..." : editingId ? "Salvar alteração" : "Registrar investimento"}
              </Button>
              {editingId && (
                <Button variant="ghost" onClick={resetForm}>
                  Cancelar edição
                </Button>
              )}
            </div>
          </Card>

          <Card className="p-5">
            <p className="text-sm text-muted-foreground mb-1">Opção 2</p>
            <h3 className="text-lg font-semibold text-foreground mb-3">Importar planilha</h3>
            <div className="border border-dashed border-border rounded-xl p-4 text-center bg-secondary/30">
              <UploadCloud className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                Use o modelo para garantir as colunas corretas: <strong>data</strong>, <strong>sub_id</strong>,{" "}
                <strong>valor</strong> (R$). Suporta Excel (.xlsx/.xls) ou CSV.
              </p>
              <Input
                type="file"
                accept=".csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                onChange={(e) => e.target.files && e.target.files[0] && handleImport(e.target.files[0])}
                disabled={importing}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Datas em yyyy-mm-dd ou dd/mm/aaaa. Valores com vírgula ou ponto.
              </p>
            </div>
          </Card>
        </div>

        <Card className="p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Histórico</p>
              <h3 className="text-lg font-semibold text-foreground">Investimentos cadastrados</h3>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Linhas por página</Label>
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(0); }}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 10, 25, 50, 100].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto relative">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Sub ID</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead className="w-28 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(refreshing || importing || saving) && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-4">
                      <div className="inline-flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Carregando...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {!refreshing && !importing && !saving && paginated.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                      Nenhum investimento registrado ainda.
                    </TableCell>
                  </TableRow>
                )}
                {paginated.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{format(new Date(item.date), "dd/MM/yyyy")}</TableCell>
                    <TableCell>{item.sub_id || "Geral"}</TableCell>
                    <TableCell>{currency(item.amount)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEdit(item)}>
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDelete(item.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {refreshing && (
              <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center rounded-lg border border-border">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Carregando dados...</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-4 flex-wrap gap-3">
            <div className="text-sm text-muted-foreground">
              Página {currentPage + 1} de {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={currentPage === 0}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage >= totalPages - 1}
              >
                Próxima
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdSpends;
