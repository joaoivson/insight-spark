import { useState, useCallback, useRef } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, Check, AlertCircle, X, Eye, FileSpreadsheet, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import Papa from "papaparse";
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
import { getApiUrl, fetchWithAuth } from "@/core/config/api.config";
import { userStorage } from "@/shared/lib/storage";
import { Progress } from "@/components/ui/progress";
import { useDatasetStore } from "@/stores/datasetStore";
import { deleteAllDatasets } from "@/services/datasets.service";

interface CSVData {
  headers: string[];
  rows: string[][];
}

const UploadCSV = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<CSVData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const { fetchRows, persist, invalidate } = useDatasetStore();

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
    setUploadProgress(20); // Fake progress start

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Removido user_id - agora vem do token JWT

      // Simulate progress for UX
      const interval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 500);

      const res = await fetchWithAuth(getApiUrl(`/api/v1/datasets/upload`), {
        method: "POST",
        body: formData,
      });

      clearInterval(interval);
      setUploadProgress(100);

      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(result.detail || result.error || "Falha no servidor");
      }

      toast({
        title: "Processamento concluído!",
        description: "Seus dados foram importados com sucesso.",
        duration: 5000,
      });

      const updated = await fetchRows({ force: true, includeRawData: true });
      // reforça persistência em cache/localStorage
      if (Array.isArray(updated)) {
        persist(updated);
      }
      clearFile();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido no upload.");
      setUploadProgress(0);
    } finally {
      setIsProcessing(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setCsvData(null);
    setError(null);
    setUploadProgress(0);
  };

  const handleDeleteAll = async () => {
    setIsDeleting(true);
    try {
      await deleteAllDatasets();
      invalidate();
      toast({
        title: "Dados excluídos",
        description: "Todos os dados de vendas foram removidos com sucesso.",
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

  return (
    <DashboardLayout 
      title="Importar Dados" 
      subtitle="Carregue seus relatórios de vendas"
      action={
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={isDeleting}>
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir Todas as Vendas
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação irá excluir permanentemente todos os dados de vendas (todos os dados da tabela datasets vinculado ao user_id). 
                Esta ação não pode ser desfeita.
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
                className={`relative group cursor-pointer border-2 border-dashed rounded-3xl p-16 text-center transition-all duration-300 ease-out ${
                  dragActive
                    ? "border-primary bg-primary/5 scale-[1.02]"
                    : "border-border hover:border-primary/50 hover:bg-secondary/30"
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
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mx-auto mb-8 shadow-inner group-hover:scale-110 transition-transform duration-300">
                    <CloudUploadIcon className="w-10 h-10 text-primary" />
                  </div>
                  
                  <h3 className="font-display font-bold text-2xl text-foreground mb-3 group-hover:text-primary transition-colors">
                    Arraste e solte seu arquivo CSV aqui
                  </h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto leading-relaxed">
                    Solte o arquivo CSV nesta área para fazer o upload. Suporta Shopee, Amazon e e-commerce padrão.
                  </p>
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="mt-4"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Selecionar arquivo CSV
                  </Button>
                  
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-background/50 rounded-full border border-border text-xs font-medium text-muted-foreground mt-4">
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Suporta Shopee, Amazon, e-commerce padrão</span>
                  </div>
                </div>
              </div>

              {/* Instructions Grid */}
              <div className="mt-12 grid md:grid-cols-3 gap-6">
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
              <div className="bg-card border border-border rounded-2xl p-6 shadow-lg shadow-black/5">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <FileText className="w-7 h-7 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-foreground">{file.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB • Pronto para processamento
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={clearFile} disabled={isProcessing}>
                    <X className="w-5 h-5 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>

                {isProcessing && (
                  <div className="space-y-2 mb-6">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-primary">Processando...</span>
                      <span className="text-muted-foreground">{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                  </div>
                )}

                {!isProcessing && csvData && (
                  <div className="flex gap-3 justify-end">
                    <Button 
                      variant="outline" 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        clearFile();
                      }}
                      type="button"
                    >
                      Cancelar
                    </Button>
                    <Button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleUpload();
                      }}
                      className="bg-primary hover:bg-primary/90 min-w-[140px]"
                      type="button"
                    >
                      Confirmar Upload
                    </Button>
                  </div>
                )}
              </div>

              {/* Data Preview */}
              {csvData && (
                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                  <div className="p-4 border-b border-border bg-secondary/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-muted-foreground" />
                      <span className="font-semibold text-sm">Visualização (10 primeiras linhas)</span>
                    </div>
                    <span className="text-xs text-muted-foreground px-2 py-1 bg-background rounded-md border border-border">
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
            className="fixed bottom-8 right-8 z-50 bg-destructive text-destructive-foreground px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 max-w-md"
          >
            <AlertCircle className="w-6 h-6 flex-shrink-0" />
            <div>
              <h4 className="font-bold">Falha no processamento</h4>
              <p className="text-sm opacity-90">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="ml-auto">
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
