import { useEffect, useMemo, useState, useRef } from "react";
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
  PlusCircle,
  Eye,
  X,
  AlertTriangle,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useDatasetStore } from "@/stores/datasetStore";
import { useAdSpendsStore } from "@/stores/adSpendsStore";
import { bulkCreateAdSpends, createAdSpend, deleteAllAdSpends, type AdSpendPayload } from "@/services/adspends.service";
import { userStorage } from "@/shared/lib/storage";
import type { AdSpend } from "@/shared/types/adspend";

const currency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const parseDateOnly = (dateStr: string) => {
  if (!dateStr) return null;
  if (dateStr instanceof Date && !isNaN(dateStr.getTime())) return dateStr;
  if (typeof dateStr !== "string") return null;
  const trimmed = dateStr.trim();
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const y = Number(iso[1]);
    const m = Number(iso[2]) - 1;
    const d = Number(iso[3]);
    const local = new Date(y, m, d);
    return isNaN(local.getTime()) ? null : local;
  }
  const parsed = new Date(trimmed);
  return isNaN(parsed.getTime()) ? null : parsed;
};

const formatDateSafe = (dateStr: string) => {
  const d = parseDateOnly(dateStr);
  if (!d) return "Data inválida";
  return format(d, "dd/MM/yyyy");
};

const excelSerialFromDate = (date: Date) => {
  const excelEpoch = new Date(1899, 11, 30);
  return (date.getTime() - excelEpoch.getTime()) / 86400000;
};

const normalizeAmount = (value: any) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  if (value instanceof Date && !isNaN(value.getTime())) {
    const serial = excelSerialFromDate(value);
    return Number.isFinite(serial) ? serial : null;
  }
  if (typeof value === "string") {
    let cleaned = value.replace(/R\$/gi, "").replace(/\s+/g, "");
    // Quando o Excel formata o valor como data (ex: "1900-02-01")
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
      const d = new Date(`${cleaned}T00:00:00`);
      if (!isNaN(d.getTime())) {
        const serial = excelSerialFromDate(d);
        return Number.isFinite(serial) ? serial : null;
      }
    }
    const hasComma = cleaned.includes(",");
    if (hasComma) cleaned = cleaned.replace(/\./g, "").replace(/,/g, ".");
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : null;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const normalizeDate = (value: string | Date | number | null | undefined) => {
  if (!value && value !== 0) return null;

  // Se for objeto Date válido
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  // Se for número (serial number do Excel: dias desde 1900-01-01)
  if (typeof value === "number") {
    // Excel epoch: 1900-01-01 (mas Excel tem bug: trata 1900 como ano bissexto)
    // Então começamos de 1899-12-30
    const excelEpoch = new Date(1899, 11, 30); // 30 de dezembro de 1899
    const date = new Date(excelEpoch.getTime() + value * 86400000);
    if (!isNaN(date.getTime())) {
      return date.toISOString().slice(0, 10);
    }
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    // yyyy-mm-dd (ISO)
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

    // dd/MM/yyyy ou dd/MM/yy
    const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (match) {
      const [, dRaw, mRaw, yRaw] = match;
      const d = parseInt(dRaw, 10);
      const m = parseInt(mRaw, 10) - 1; // meses são 0-indexed
      const y = yRaw.length === 2 ? parseInt(`20${yRaw}`, 10) : parseInt(yRaw, 10);

      // Validação básica
      if (d < 1 || d > 31 || m < 0 || m > 11 || y < 1900 || y > 2100) return null;

      const date = new Date(y, m, d);
      if (!isNaN(date.getTime()) && date.getDate() === d && date.getMonth() === m && date.getFullYear() === y) {
        return date.toISOString().slice(0, 10);
      }
    }
  }

  // Última tentativa: constructor padrão do Date
  const d = new Date(value as any);
  if (!isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }

  return null;
};

const AdSpends = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { rows, fetchRows } = useDatasetStore();
  const { adSpends, loading: adLoading, fetchAdSpends, create, update, remove, invalidate } = useAdSpendsStore();
  const { toast } = useToast();

  const [amount, setAmount] = useState("");
  const [subId, setSubId] = useState<string>("__all__");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [editingId, setEditingId] = useState<number | null>(null);
  const [importing, setImporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [previewData, setPreviewData] = useState<{ headers: string[]; rows: any[] } | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const blocking = saving || importing || refreshing || adLoading || isDeletingAll;

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
    setRefreshing(true);
    await Promise.all([fetchRows({ force: true }), fetchAdSpends({ force: true })]);
    setRefreshing(false);
  };

  const handleDeleteAll = async () => {
    setIsDeletingAll(true);
    try {
      await deleteAllAdSpends();
      invalidate(); // Limpar localStorage
      await refreshData();
      toast({
        title: "Investimentos excluídos",
        description: "Todos os investimentos foram removidos com sucesso.",
      });
    } catch (err) {
      toast({
        title: "Erro ao excluir",
        description: err instanceof Error ? err.message : "Não foi possível excluir os investimentos.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingAll(false);
    }
  };

  useEffect(() => {
    fetchRows({});
    fetchAdSpends({});
  }, []);

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
      const payload: AdSpendPayload = {
        amount: parsedAmount,
        sub_id: subId === "__all__" ? "" : subId,
        date: parsedDate,
      };

      if (editingId) {
        await update(editingId, payload);
      } else {
        await create(payload);
      }

      toast({
        title: editingId ? "Investimento atualizado" : "Investimento registrado",
        description: `${currency(parsedAmount)} em ${subId === "__all__" ? "Geral" : subId} na data ${format(
          parseDateOnly(parsedDate) ?? new Date(parsedDate),
          "dd/MM/yyyy"
        )}.`,
      });
      resetForm();
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
      await remove(id);
      toast({ title: "Investimento removido" });
    } catch (err) {
      toast({ title: "Erro ao remover", variant: "destructive" });
    }
  };

  const handleDownloadTemplate = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    try {
      const today = new Date().toISOString().slice(0, 10);
      // Estrutura: Data, SubId, ValorGasto (vírgula para decimais)
      const data = [
        ["Data", "SubId", "ValorGasto"],
        [today, "ASPRADOR02", "120,50"],
        [today, "", "300,00"],
      ];

      const ws = XLSX.utils.aoa_to_sheet(data);

      // Ajustar largura das colunas para melhor visualização
      ws['!cols'] = [
        { wch: 12 }, // Data
        { wch: 15 }, // SubId
        { wch: 12 }, // ValorGasto
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Modelo");

      // Usar XLSX.writeFile diretamente - método nativo da biblioteca
      const fileName = "modelo-investimentos.xlsx";
      XLSX.writeFile(wb, fileName);

      toast({
        title: "Download iniciado",
        description: "Modelo de investimentos baixado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao baixar modelo",
        description: error instanceof Error ? error.message : "Não foi possível gerar o arquivo. Tente novamente.",
        variant: "destructive",
      });
    }
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
    const wb = XLSX.read(data, { type: "array", cellDates: false, raw: true });
    const ws = wb.Sheets[wb.SheetNames[0]];

    // Obter range de células
    const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
    const headers: string[] = [];

    // Ler header (primeira linha)
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
      const cell = ws[cellAddress];
      headers[C] = cell ? (cell.w || cell.v || "").toString() : "";
    }

    // Processar linhas de dados
    const rows: any[] = [];
    for (let R = 1; R <= range.e.r; ++R) {
      const row: any = {};
      let hasData = false;
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = ws[cellAddress];
        if (!cell) continue;

        const header = headers[C];
        if (!header) continue;

        hasData = true;
        const keyLower = header.toLowerCase();
        let value: any = cell.v;

        // Para coluna Data: converter serial numbers do Excel
        if (keyLower === "data" || keyLower === "date") {
          if (typeof value === "number" && value > 1 && value < 100000) {
            const excelEpoch = new Date(1899, 11, 30);
            const date = new Date(excelEpoch.getTime() + value * 86400000);
            if (!isNaN(date.getTime()) && date.getFullYear() >= 1900 && date.getFullYear() <= 2100) {
              value = date.toISOString().slice(0, 10);
            }
          }
        }
        // Para coluna ValorGasto: usar valor raw (número) se disponível
        // cell.v é o valor raw, cell.w é o valor formatado
        else if (keyLower === "valorgasto" || keyLower === "valor gasto" || keyLower === "valor") {
          // Se cell.v for número, usar diretamente (valor raw)
          // Se for string, pode ser valor formatado com vírgula
          value = cell.v; // sempre usar valor raw
        }

        row[header] = value;
      }
      if (hasData) rows.push(row);
    }

    return rows;
  };

  const handleFilePreview = async (file: File) => {
    try {
      const ext = file.name.toLowerCase();
      let rowsData: any[] = [];

      if (ext.endsWith(".xlsx") || ext.endsWith(".xls")) {
        rowsData = await parseXlsxFile(file);
      } else {
        const result = await parseCsvFile(file);
        rowsData = Array.isArray(result.data) ? result.data : [];
      }

      if (rowsData.length > 0) {
        const headers = Object.keys(rowsData[0]);
        const previewRows = rowsData.slice(0, 10);
        setPreviewData({ headers, rows: previewRows });
        setPreviewFile(file);
      }
    } catch (err) {
      toast({
        title: "Erro ao processar arquivo",
        description: "Não foi possível visualizar a prévia do arquivo.",
        variant: "destructive",
      });
    }
  };

  const handleImport = async (file?: File) => {
    const fileToImport = file || previewFile;
    if (!fileToImport) return;

    setImporting(true);
    try {
      const ext = fileToImport.name.toLowerCase();
      let rowsData: any[] = [];

      if (ext.endsWith(".xlsx") || ext.endsWith(".xls")) {
        rowsData = await parseXlsxFile(fileToImport);
      } else {
        const result = await parseCsvFile(fileToImport);
        rowsData = Array.isArray(result.data) ? result.data : [];
      }


      // Detectar nomes das colunas automaticamente (case-insensitive)
      const findColumn = (row: any, patterns: string[]): any => {
        const keys = Object.keys(row);
        const lowerRow: any = {};
        keys.forEach((k) => {
          lowerRow[k.toLowerCase().trim()] = row[k];
        });
        for (const pattern of patterns) {
          const lowerPattern = pattern.toLowerCase().trim();
          if (lowerRow[lowerPattern] !== undefined) {
            return lowerRow[lowerPattern];
          }
          // Busca parcial
          const matchingKey = keys.find((k) => k.toLowerCase().trim() === lowerPattern);
          if (matchingKey) return row[matchingKey];
        }
        return undefined;
      };

      let invalidCount = 0;
      const payloads = rowsData
        .map((row: any, idx: number) => {
          // Busca flexível por coluna de valor
          const rawAmount = findColumn(row, [
            "valorgasto",
            "valor gasto",
            "valor",
            "amount",
            "valor_gasto",
            "valor_gasto_anuncios",
          ]);
          const amt = normalizeAmount(rawAmount);

          // Busca flexível por coluna de data
          const rawDate = findColumn(row, ["data", "date"]);
          const dt = normalizeDate(rawDate);

          // Busca flexível por coluna de sub_id (case-insensitive)
          const rawSubId = findColumn(row, ["subid", "sub_id", "sub id", "canal", "channel"]);
          const sid = rawSubId ? String(rawSubId).trim() : "";

          // Normalize sub_id to lowercase for comparison with existing sub_ids
          const normalizedSubId = sid.toLowerCase();

          if (!amt || !dt) {
            invalidCount++;
            return null;
          }
          // Use normalized sub_id for storage, but keep original for display if needed
          return { amount: amt, date: dt, sub_id: normalizedSubId || "" };
        })
        .filter(Boolean) as { amount: number; date: string; sub_id: string }[];

      if (!payloads.length) {
        toast({ title: "Planilha vazia ou inválida", variant: "destructive" });
        return;
      }

      let success = 0;
      try {
        const result = await bulkCreateAdSpends(
          payloads.map((p) => ({ ...p, sub_id: p.sub_id || "" }))
        );
        success = result?.length || payloads.length;
      } catch (err: any) {
        // fallback: tentar individual sem forçar refresh a cada item
        for (const payload of payloads) {
          try {
            await createAdSpend({
              amount: payload.amount,
              date: payload.date,
              sub_id: payload.sub_id || "",
            });
            success += 1;
          } catch (e) {
            // Erro silencioso ao criar item individual
          }
        }
      }

      toast({
        title: "Importação concluída",
        description: `${success} de ${payloads.length} registros inseridos`,
        variant: success === payloads.length ? "default" : "destructive",
      });
      await refreshData();
      setPreviewData(null);
      setPreviewFile(null);
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
      subtitleSize="xs"
      action={
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={blocking}>
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir Todos
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação irá excluir permanentemente todos os investimentos.
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAll}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={isDeletingAll}
              >
                {isDeletingAll ? "Excluindo..." : "Confirmar Exclusão"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      }
    >
      <div className="grid gap-4">

        <Card className="p-5">
          <h3 className="text-lg font-semibold text-foreground mb-3">Importar planilha</h3>
          <div
            className="border border-dashed border-border rounded-xl p-6 text-center bg-secondary/30 transition-colors min-h-[200px] flex flex-col items-center justify-center"
            onDragEnter={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!blocking) {
                e.currentTarget.classList.add('border-primary', 'bg-primary/5');
              }
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.currentTarget.classList.remove('border-primary', 'bg-primary/5');
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.currentTarget.classList.remove('border-primary', 'bg-primary/5');
              if (!blocking && e.dataTransfer.files && e.dataTransfer.files[0]) {
                const file = e.dataTransfer.files[0];
                const ext = file.name.toLowerCase();
                if (ext.endsWith('.csv') || ext.endsWith('.xlsx') || ext.endsWith('.xls')) {
                  handleFilePreview(file);
                } else {
                  toast({
                    title: "Formato inválido",
                    description: "Por favor, use arquivos .csv, .xlsx ou .xls",
                    variant: "destructive",
                  });
                }
              }
            }}
          >
            <UploadCloud className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-sm font-medium text-foreground mb-2">
              Arraste e solte sua planilha aqui
            </p>
            <p className="text-xs text-muted-foreground mb-4 max-w-xs">
              Use o modelo para garantir as colunas corretas: <strong>Data</strong>, <strong>SubId</strong>,{" "}
              <strong>ValorGasto</strong> (R$). Suporta Excel (.xlsx/.xls) ou CSV.
            </p>

            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleDownloadTemplate} disabled={blocking}>
                <Download className="w-4 h-4 mr-2" />
                Baixar modelo (.xlsx)
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!blocking) {
                    fileInputRef.current?.click();
                  }
                }}
                disabled={blocking}
                className="mt-2 mb-4"
              >
                <UploadCloud className="w-4 h-4 mr-2" />
                Selecionar arquivo
              </Button>
            </div>

            <input
              ref={fileInputRef}
              id="adspends-file-input"
              type="file"
              accept=".csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              onChange={(e) => {
                if (e.target.files && e.target.files[0] && !blocking) {
                  handleFilePreview(e.target.files[0]);
                  // Reset input para permitir selecionar o mesmo arquivo novamente
                  e.target.value = '';
                }
              }}
              disabled={blocking}
              style={{ display: 'none' }}
              aria-label="Selecionar arquivo de investimentos"
            />
            <p className="text-xs text-muted-foreground">
              Datas em yyyy-mm-dd ou dd/mm/aaaa. Valores com vírgula ou ponto.
            </p>
          </div>

          {/* Preview Section */}
          {previewData && previewFile && (
            <div className="mt-4 bg-card border border-border rounded-xl overflow-hidden">
              <div className="p-4 border-b border-border bg-secondary/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-muted-foreground" />
                  <span className="font-semibold text-sm">Visualização (10 primeiras linhas)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground px-2 py-1 bg-background rounded-md border border-border">
                    {previewData.headers.length} colunas detectadas
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setPreviewData(null);
                      setPreviewFile(null);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="overflow-x-auto max-h-[400px]">
                <div className="min-w-full inline-block">
                  <Table>
                    <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
                      <TableRow>
                        {previewData.headers.map((h, i) => (
                          <TableHead key={i} className="whitespace-nowrap font-bold text-xs uppercase tracking-wider bg-card">
                            {h}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.rows.map((row, i) => (
                        <TableRow key={i} className="hover:bg-secondary/30">
                          {previewData.headers.map((header, j) => (
                            <TableCell key={j} className="whitespace-nowrap text-sm text-muted-foreground">
                              {row[header] ?? ""}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
              <div className="p-4 border-t border-border flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setPreviewData(null);
                    setPreviewFile(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => handleImport()}
                  disabled={blocking}
                >
                  Confirmar Importação
                </Button>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between mb-4 mt-8">
            <div>
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
            <Button onClick={handleSave} disabled={blocking}>
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
                {(refreshing || importing || saving || adLoading) && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-4">
                      <div className="inline-flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Carregando...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {!refreshing && !importing && !saving && !adLoading && paginated.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                      Nenhum investimento registrado ainda.
                    </TableCell>
                  </TableRow>
                )}
                {paginated.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{formatDateSafe(item.date)}</TableCell>
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
            {(refreshing || adLoading) && (
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
                onClick={() => setPage(0)}
                disabled={currentPage === 0}
              >
                Primeira
              </Button>
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(totalPages - 1)}
                disabled={currentPage >= totalPages - 1}
              >
                Última
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdSpends;
