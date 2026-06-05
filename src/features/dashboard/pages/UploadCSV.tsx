import { useState, useCallback, useRef, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { LoadingDataOverlay } from "@/components/dashboard/LoadingDataOverlay";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, Check, AlertCircle, X, Eye, FileSpreadsheet, Trash2, MousePointerClick, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import Papa from "papaparse";
import { useLocation } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Progress } from "@/components/ui/progress";
import { useDatasetStore } from "@/stores/datasetStore";
import { useClicksStore } from "@/stores/clicksStore";
import { deleteAllDatasets } from "@/services/datasets.service";
import { deleteAllClicks } from "@/services/clicks.service";
import {
  type JobType,
} from "@/services/jobs.service";

import { useQueryClient } from "@tanstack/react-query";

interface CSVData {
  headers: string[];
  rows: string[][];
}

const UploadCSV = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const location = useLocation();
  const isClicksMode = location.pathname.includes("upload-cliques");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<CSVData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [datasetId, setDatasetId] = useState<number | null>(null);
  const [showDatasetPolling, setShowDatasetPolling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const { fetchRows, invalidate: invalidateSales } = useDatasetStore();
  const { fetchClicks, invalidate: invalidateClicks } = useClicksStore();

  const jobType: JobType = isClicksMode ? "click" : "transaction";
  const config = {
    title: isClicksMode ? "Importar Cliques" : "Importar Dados",
    subtitle: isClicksMode ? "Carregue seus relatórios de cliques" : "Carregue seus relatórios de vendas",
    deleteAction: isClicksMode ? deleteAllClicks : deleteAllDatasets,
    invalidate: isClicksMode ? invalidateClicks : invalidateSales,
    fetchAction: isClicksMode ? fetchClicks : fetchRows,
    deleteLabel: isClicksMode ? "Excluir Todos os Cliques" : "Excluir Todas as Vendas",
    deleteDescription: isClicksMode
      ? "Esta ação irá excluir permanentemente todos os dados de cliques. Esta ação não pode ser desfeita."
      : "Esta ação irá excluir permanentemente todos os dados de vendas. Esta ação não pode ser desfeita.",
    successMessage: isClicksMode ? "Cliques importados com sucesso." : "Seus dados foram importados com sucesso.",
    icon: isClicksMode ? MousePointerClick : CloudUploadIcon,
  };

  const invalidateAllQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["dataset-rows"] }),
      queryClient.invalidateQueries({ queryKey: ["ad-spends"] }),
      queryClient.invalidateQueries({ queryKey: ["clicks"] }),
    ]);
  };

  // Limpar estado quando mudar de rota
  useEffect(() => {
    clearFile();
  }, [location.pathname]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const processFile = (file: File) => {
    setError(null);
    setIsProcessing(true);
    setUploadProgress(10); // Start progress
    setFile(file);

    Papa.parse(file, {
      complete: (results) => {
        const data = results.data as string[][];
        if (data.length > 0) {
          setCsvData({
            headers: data[0],
            rows: data.slice(1, 11),
          });
          setUploadProgress(100);
          toast({
            title: "Arquivo analisado",
            description: `${data.length - 1} linhas identificadas. Pronto para upload.`,
          });
        }
        setIsProcessing(false);
      },
      error: (error) => {
        setError(`Erro ao ler arquivo: ${error.message}`);
        setIsProcessing(false);
        setUploadProgress(0);
      },
    });
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === "text/csv" || droppedFile.name.endsWith(".csv")) {
        processFile(droppedFile);
      } else {
        setError("Formato inválido. Por favor, envie apenas arquivos .csv");
      }
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Import smartUpload
      const { smartUpload } = await import("@/services/jobs.service");

      // Use smart upload (auto-selects multipart for files >20MB)
      const result = await smartUpload(file, jobType, (progress) => {
        setUploadProgress(progress);
      });

      // Start dataset polling overlay immediately
      setDatasetId(result.dataset_id);
      setShowDatasetPolling(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido no upload.";
      setError(message);
      toast({
        title: "Erro no upload",
        description: message,
        variant: "destructive",
      });
      setIsProcessing(false);
      setUploadProgress(0);
    }
  };

  const handleDatasetComplete = async () => {
    setShowDatasetPolling(false);
    setDatasetId(null);
    await finalizeUpload(config.successMessage);
  };

  const handleDatasetError = (errorMessage: string) => {
    setShowDatasetPolling(false);
    setDatasetId(null);
    toast({
      title: "Erro ao processar dados",
      description: errorMessage,
      variant: "destructive"
    });
  };

  const finalizeUpload = async (msg: string) => {
    try {
      config.invalidate();
      await invalidateAllQueries();
      await config.fetchAction({ force: true });
    } finally {
      setIsProcessing(false);
      setUploadProgress(100);
    }

    toast({
      title: "✅ Processamento concluído!",
      description: msg,
      duration: 7000,
    });

    clearFile();
  };

  const clearFile = () => {
    setFile(null);
    setCsvData(null);
    setError(null);
    setUploadProgress(0);
    setDatasetId(null);
    setShowDatasetPolling(false);
  };

  const handleDeleteAll = async () => {
    setIsDeleting(true);
    try {
      await config.deleteAction();
      config.invalidate();
      await invalidateAllQueries();
      toast({
        title: "Dados excluídos",
        description: isClicksMode ? "Todos os dados de cliques foram removidos." : "Todos os dados de vendas foram removidos.",
      });
    } catch (err) {
      toast({
        title: "Erro ao excluir",
        description: err instanceof Error ? err.message : "Não foi possível excluir os dados.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const IconComponent = config.icon;

  return (
    <DashboardLayout
      title={config.title}
      subtitle={config.subtitle}
      action={
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={isDeleting} className="w-full sm:w-auto">
              <Trash2 className="w-4 h-4 mr-2" />
              <span className="truncate">{config.deleteLabel}</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                {config.deleteDescription}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAll}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={isDeleting}
              >
                {isDeleting ? "Excluindo..." : "Confirmar Exclusão"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      }
    >
      <AnimatePresence>
        {showDatasetPolling && datasetId && (
          <LoadingDataOverlay
            datasetId={datasetId}
            onComplete={handleDatasetComplete}
            onError={handleDatasetError}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isDeleting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md"
            role="status"
            aria-live="polite"
            aria-label="Excluindo dados"
          >
            <div className="max-w-md w-full px-6 text-center space-y-6">
              <div className="relative flex flex-col items-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-destructive/20 p-0.5 shadow-xl flex items-center justify-center">
                  <div className="w-full h-full bg-background rounded-[14px] flex items-center justify-center">
                    <Loader2 className="w-10 h-10 text-destructive animate-spin" aria-hidden="true" />
                  </div>
                </div>
                <h2 className="mt-6 text-xl font-display font-bold text-foreground">
                  Excluindo dados
                </h2>
                <p className="text-muted-foreground">
                  Os dados estão sendo apagados do banco de dados.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto"
      >
        <AnimatePresence mode="wait">
          {!file ? (
            <motion.div
              key="upload-zone"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div
                className={`relative group border-2 border-dashed rounded-2xl md:rounded-3xl p-6 sm:p-10 md:p-16 text-center transition-colors duration-200 ease-out ${dragActive
                  ? "border-primary bg-primary/5"
                  : "border-border md:hover:border-primary/50 md:hover:bg-secondary/30"
                  }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleChange}
                  style={{ display: 'none' }}
                  id="csv-upload-input"
                  aria-label="Selecionar arquivo CSV"
                />

                <div className="relative z-0">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-3xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mx-auto mb-5 md:mb-8 shadow-inner md:group-hover:scale-110 transition-transform duration-200">
                    <IconComponent className="w-8 h-8 md:w-10 md:h-10 text-primary" />
                  </div>

                  <h3 className="font-display font-bold text-lg md:text-2xl text-foreground mb-2 md:mb-3 md:group-hover:text-primary transition-colors">
                    <span className="hidden md:inline">Arraste e solte seu arquivo CSV aqui</span>
                    <span className="md:hidden">Importe seu arquivo CSV</span>
                  </h3>
                  <p className="text-sm md:text-base text-muted-foreground mb-6 max-w-md mx-auto leading-relaxed">
                    <span className="hidden md:inline">Solte o arquivo CSV nesta área para fazer o upload. </span>
                    {isClicksMode ? "Relatório de cliques." : "Relatório de vendas."}
                  </p>

                  <Button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="w-full sm:w-auto"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Selecionar arquivo CSV
                  </Button>
                </div>
              </div>

              {/* Instructions Grid */}
              <div className="mt-8 md:mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
                {[
                  { title: "Prepare", desc: "Exporte seus dados em CSV UTF-8" },
                  { title: "Carregue", desc: "Arraste o arquivo para a área acima" },
                  { title: "Analise", desc: "Visualize insights instantâneos" },
                ].map((step, i) => (
                  <div key={i} className="flex flex-col items-center text-center p-4">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-sm font-bold text-muted-foreground mb-3">
                      {i + 1}
                    </div>
                    <h4 className="font-semibold text-foreground">{step.title}</h4>
                    <p className="text-sm text-muted-foreground">{step.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="file-preview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* File Status Card */}
              <div className="bg-card border border-border rounded-2xl p-4 md:p-6">
                <div className="flex items-start justify-between gap-3 mb-5 md:mb-6">
                  <div className="flex items-center gap-3 md:gap-4 min-w-0">
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6 md:w-7 md:h-7 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-base md:text-lg text-foreground truncate">{file.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB • Pronto para processamento
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="flex-shrink-0" onClick={clearFile} disabled={isProcessing || showDatasetPolling} aria-label="Remover arquivo">
                    <X className="w-5 h-5 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>

                {isProcessing && !showDatasetPolling && (
                  <div className="space-y-2 mb-6">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-primary">Enviando arquivo…</span>
                      <span className="text-muted-foreground">{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                  </div>
                )}

                {!isProcessing && csvData && (
                  <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
                    <Button
                      variant="outline"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        clearFile();
                      }}
                      type="button"
                      className="w-full md:w-auto"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleUpload();
                      }}
                      className="w-full md:w-auto md:min-w-[140px]"
                      type="button"
                      disabled={isProcessing || showDatasetPolling}
                    >
                      Confirmar Upload
                    </Button>
                  </div>
                )}
              </div>

              {/* Data Preview */}
              {csvData && (
                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                  <div className="p-4 border-b border-border bg-secondary/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="font-semibold text-sm">Visualização (10 primeiras linhas)</span>
                    </div>
                    <span className="text-xs text-muted-foreground px-2 py-1 bg-background rounded-md border border-border self-start sm:self-auto">
                      {csvData.headers.length} colunas detectadas
                    </span>
                  </div>
                  <div className="overflow-x-auto max-h-[400px]">
                    <div className="min-w-full inline-block">
                      <Table>
                        <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
                          <TableRow>
                            {csvData.headers.map((h, i) => (
                              <TableHead key={i} className="whitespace-nowrap font-bold text-xs uppercase tracking-wider bg-card">
                                {h}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {csvData.rows.map((row, i) => (
                            <TableRow key={i} className="hover:bg-secondary/30">
                              {row.map((cell, j) => (
                                <TableCell key={j} className="whitespace-nowrap text-sm text-muted-foreground">
                                  {cell}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Toast Wrapper */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 flex items-center gap-4 rounded-xl bg-destructive px-5 py-4 text-destructive-foreground shadow-lg md:inset-x-auto md:bottom-8 md:right-8 md:max-w-md"
          >
            <AlertCircle className="w-6 h-6 flex-shrink-0" />
            <div className="min-w-0">
              <h4 className="font-bold">Falha no processamento</h4>
              <p className="text-sm opacity-90 break-words">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="ml-auto flex-shrink-0" aria-label="Fechar erro">
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </motion.div>
    </DashboardLayout>
  );
};

// Helper Icon
function CloudUploadIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
      <path d="M12 12v9" />
      <path d="m16 16-4-4-4 4" />
    </svg>
  );
}

export default UploadCSV;
