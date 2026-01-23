import { getApiUrl, fetchWithAuth } from "@/core/config/api.config";
import type { AdSpend } from "@/shared/types/adspend";

export type AdSpendPayload = {
  date: string;
  amount: number;
  sub_id?: string | null;
};

export const bulkCreateAdSpends = async (items: AdSpendPayload[]): Promise<AdSpend[]> => {
  const url = getApiUrl(`/api/v1/ad_spends/bulk`);
  const res = await fetchWithAuth(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Falha ao importar investimentos");
  }
  return (await res.json()) as AdSpend[];
};

export const listAdSpends = async (opts: { startDate?: string; endDate?: string } = {}): Promise<AdSpend[]> => {
  const params = new URLSearchParams();
  // Removido user_id da query - agora vem do token
  if (opts.startDate) params.set("start_date", opts.startDate);
  if (opts.endDate) params.set("end_date", opts.endDate);

  const url = getApiUrl(`/api/v1/ad_spends?${params.toString()}`);
  const res = await fetchWithAuth(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Falha ao carregar investimentos");
  }
  return (await res.json()) as AdSpend[];
};

export const createAdSpend = async (payload: AdSpendPayload): Promise<AdSpend> => {
  const url = getApiUrl(`/api/v1/ad_spends`);
  const res = await fetchWithAuth(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Falha ao criar investimento");
  }
  return (await res.json()) as AdSpend;
};

export const updateAdSpend = async (id: number, payload: Partial<AdSpendPayload>): Promise<AdSpend> => {
  const url = getApiUrl(`/api/v1/ad_spends/${id}`);
  const res = await fetchWithAuth(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Falha ao atualizar investimento");
  }
  return (await res.json()) as AdSpend;
};

export const deleteAdSpend = async (id: number): Promise<void> => {
  const url = getApiUrl(`/api/v1/ad_spends/${id}`);
  const res = await fetchWithAuth(url, { method: "DELETE" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Falha ao remover investimento");
  }
};

export const downloadTemplate = async (): Promise<void> => {
  const url = getApiUrl(`/api/v1/ad_spends/template`);
  
  try {
    const res = await fetchWithAuth(url);
    
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Falha ao baixar template");
    }
    
    // Extrair o nome do arquivo do header Content-Disposition ANTES de obter o blob
    const contentDisposition = res.headers.get("Content-Disposition") || res.headers.get("content-disposition");
    let filename = "modelo-investimentos.xlsx";
    
    if (contentDisposition) {
      // Tentar formato padrão: filename="arquivo.xlsx"
      let filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      
      // Se não encontrar, tentar formato com encoding: filename*=UTF-8''arquivo.xlsx
      if (!filenameMatch) {
        filenameMatch = contentDisposition.match(/filename\*=UTF-8''([^;\n]+)/);
      }
      
      // Se ainda não encontrar, tentar sem aspas
      if (!filenameMatch) {
        filenameMatch = contentDisposition.match(/filename=([^;\n]+)/);
      }
      
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1].replace(/['"]/g, "").trim();
        // Decodificar se necessário (para formato filename*=UTF-8'')
        try {
          filename = decodeURIComponent(filename);
        } catch {
          // Se falhar, usar o valor original
        }
      }
    }
    
    // Garantir que o nome do arquivo está correto
    if (!filename || filename === "" || filename.includes("undefined")) {
      filename = "modelo-investimentos.xlsx";
    }
    
    // Obter o blob do arquivo
    const blob = await res.blob();
    
    // Garantir que o blob tem o tipo MIME correto
    const typedBlob = blob.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
      ? blob 
      : new Blob([blob], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    
    // Detectar navegador para escolher a melhor estratégia
    const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
    const isEdge = /Edg/.test(navigator.userAgent);
    
    // Para Chrome, usar iframe oculto que aponta diretamente para o backend
    // Isso faz o Chrome respeitar o Content-Disposition header do servidor
    if (isChrome && !isEdge) {
      // Criar iframe oculto que fará o download direto do servidor
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.style.visibility = "hidden";
      iframe.style.position = "fixed";
      iframe.style.top = "-9999px";
      iframe.style.left = "-9999px";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "none";
      
      // Adicionar ao DOM
      document.body.appendChild(iframe);
      
      // Definir src para a URL do backend - Chrome respeitará o Content-Disposition
      iframe.src = url;
      
      // Limpar iframe após download (Chrome inicia o download imediatamente)
      setTimeout(() => {
        if (iframe.parentNode) {
          document.body.removeChild(iframe);
        }
      }, 5000);
      
      return; // Retornar aqui para Chrome
    }
    
    // Para outros navegadores (Edge, Firefox, Safari), usar método blob
    const downloadUrl = window.URL.createObjectURL(typedBlob);
    const link = document.createElement("a");
    
    // Definir o nome do arquivo - CRÍTICO
    link.download = filename;
    link.setAttribute("download", filename);
    link.href = downloadUrl;
    
    // Estilos para ocultar mas manter funcional
    link.style.display = "none";
    link.style.visibility = "hidden";
    link.style.position = "fixed";
    link.style.top = "-9999px";
    link.style.left = "-9999px";
    
    // Adicionar ao DOM
    document.body.appendChild(link);
    
    // Aguardar frames para garantir que o DOM foi atualizado
    await new Promise(resolve => {
      requestAnimationFrame(() => {
        requestAnimationFrame(resolve);
      });
    });
    
    // Click simples funciona bem para Edge/Firefox/Safari
    link.click();
    
    // Limpar após delay
    setTimeout(() => {
      if (link.parentNode) {
        document.body.removeChild(link);
      }
      window.URL.revokeObjectURL(downloadUrl);
    }, 2000);
  } catch (error) {
    throw error;
  }
};