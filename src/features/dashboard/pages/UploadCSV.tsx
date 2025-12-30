import { useState, useCallback } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { motion } from "framer-motion";
import { Upload, FileText, Check, AlertCircle, X, Eye } from "lucide-react";
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

interface CSVData {
  headers: string[];
  rows: string[][];
}

const UploadCSV = () => {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<CSVData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

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
    setFile(file);

    Papa.parse(file, {
      complete: (results) => {
        const data = results.data as string[][];
        if (data.length > 0) {
          setCsvData({
            headers: data[0],
            rows: data.slice(1, 11), // Show first 10 rows as preview
          });
          toast({
            title: "Arquivo carregado",
            description: `${data.length - 1} linhas encontradas.`,
          });
        }
        setIsProcessing(false);
      },
      error: (error) => {
        setError(`Erro ao processar arquivo: ${error.message}`);
        setIsProcessing(false);
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
        setError("Por favor, envie apenas arquivos CSV.");
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
    if (!file || !csvData) return;
    
    setIsProcessing(true);
    
    // Simulate upload - will be replaced with actual Supabase storage
    setTimeout(() => {
      setIsProcessing(false);
      toast({
        title: "Upload concluído!",
        description: "Seus dados foram processados e estão disponíveis no dashboard.",
      });
    }, 2000);
  };

  const clearFile = () => {
    setFile(null);
    setCsvData(null);
    setError(null);
  };

  return (
    <DashboardLayout title="Upload CSV" subtitle="Importe seus dados de vendas">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Upload Zone */}
        <div
          className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
            dragActive
              ? "border-accent bg-accent/5"
              : "border-border hover:border-accent/50 hover:bg-accent/5"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept=".csv"
            onChange={handleChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          
          <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-6">
            <Upload className="w-8 h-8 text-accent" />
          </div>
          
          <h3 className="font-display font-semibold text-xl text-foreground mb-2">
            Arraste seu arquivo CSV aqui
          </h3>
          <p className="text-muted-foreground mb-4">
            ou clique para selecionar do seu computador
          </p>
          <p className="text-sm text-muted-foreground">
            Formato aceito: .csv • Tamanho máximo: 10MB
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 text-destructive" />
            <span className="text-destructive text-sm">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto">
              <X className="w-4 h-4 text-destructive" />
            </button>
          </motion.div>
        )}

        {/* File Info & Preview */}
        {file && csvData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8"
          >
            {/* File Card */}
            <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-success" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{file.name}</span>
                  <Check className="w-4 h-4 text-success" />
                </div>
                <span className="text-sm text-muted-foreground">
                  {(file.size / 1024).toFixed(2)} KB • {csvData.rows.length} linhas (preview)
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={clearFile}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Preview Table */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border flex items-center gap-2">
                <Eye className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium text-foreground">Preview dos dados</span>
                <span className="text-sm text-muted-foreground">(primeiras 10 linhas)</span>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      {csvData.headers.map((header, index) => (
                        <TableHead key={index}>{header}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {csvData.rows.map((row, rowIndex) => (
                      <TableRow key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <TableCell key={cellIndex}>{cell}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Upload Button */}
            <div className="mt-6 flex justify-end">
              <Button variant="hero" size="lg" onClick={handleUpload} disabled={isProcessing}>
                {isProcessing ? "Processando..." : "Processar Dados"}
              </Button>
            </div>
          </motion.div>
        )}

        {/* Instructions */}
        <div className="mt-8 p-6 bg-muted/30 rounded-xl">
          <h4 className="font-display font-semibold text-foreground mb-4">
            Formato esperado do CSV
          </h4>
          <p className="text-sm text-muted-foreground mb-4">
            Seu arquivo CSV deve conter as seguintes colunas:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {["Data", "Produto", "Receita", "Custo", "Comissão"].map((col) => (
              <div
                key={col}
                className="bg-card rounded-lg px-3 py-2 text-sm text-foreground border border-border"
              >
                {col}
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
};

export default UploadCSV;

