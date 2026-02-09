import { getApiUrl, fetchWithAuth } from "@/core/config/api.config";

export type JobType = "transaction" | "click";

export interface JobCreateResponse {
  job_id: string;
  dataset_id: number;
  upload_url: string;
  expires_in: number;
}

export interface JobStatusError {
  chunk_index?: number;
  error: string;
}

export interface JobStatusResponse {
  job_id: string;
  dataset_id?: number;
  status: "pending" | "processing" | "completed" | "error";
  total_chunks?: number;
  chunks_done?: number;
  created_at?: string;
  errors?: JobStatusError[];
  error_message?: string;
  row_count?: number;
}

export interface JobCommitResponse {
  job_id: string;
  status: string;
  message?: string;
}

export interface JobUploadResponse {
  job_id: string;
  dataset_id: number;
  status: string;
}

/**
 * Cria um job de upload. Para comissões/vendas use type "transaction", para cliques use "click".
 * Retorna job_id, upload_url (presigned) e dataset_id.
 */
export const createJob = async (
  filename: string,
  type: JobType
): Promise<JobCreateResponse> => {
  const url = getApiUrl("/api/v1/jobs");
  const res = await fetchWithAuth(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename, type }),
  });
  if (!res.ok) {
    const text = await res.text();
    let detail: string;
    try {
      const json = JSON.parse(text);
      detail = json.detail ?? json.error ?? text;
    } catch {
      detail = text;
    }
    throw new Error(detail || "Falha ao criar job");
  }
  return res.json();
};

/**
 * Envia o arquivo para a URL pré-assinada. Não usa Authorization (a URL já é assinada).
 */
export const uploadToPresignedUrl = async (
  file: File,
  uploadUrl: string
): Promise<Response> => {
  const body = await file.arrayBuffer();
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "text/csv" },
    body,
  });
  return res;
};

/**
 * Confirma o upload e inicia o processamento em background (após PUT na presigned URL).
 */
export const commitJob = async (jobId: string): Promise<JobCommitResponse> => {
  const url = getApiUrl(`/api/v1/jobs/${jobId}/commit`);
  const res = await fetchWithAuth(url, { method: "POST" });
  if (!res.ok) {
    const text = await res.text();
    let detail: string;
    try {
      const json = JSON.parse(text);
      detail = json.detail ?? json.error ?? text;
    } catch {
      detail = text;
    }
    throw new Error(detail || "Falha ao confirmar job");
  }
  return res.json();
};

/**
 * Consulta o status do job (polling). Retorna status, chunks_done, total_chunks, errors.
 */
export const getJobStatus = async (
  jobId: string
): Promise<JobStatusResponse> => {
  const url = getApiUrl(`/api/v1/jobs/${jobId}`);
  const res = await fetchWithAuth(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Falha ao consultar status do job");
  }
  return res.json();
};

/**
 * Upload direto via multipart (fallback quando presigned falha ou não é usado).
 */
export const uploadMultipart = async (
  file: File,
  type: JobType
): Promise<JobUploadResponse> => {
  const url = getApiUrl("/api/v1/jobs/upload");
  const formData = new FormData();
  formData.append("file", file);
  formData.append("type", type);

  const res = await fetchWithAuth(url, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const text = await res.text();
    let detail: string;
    try {
      const json = JSON.parse(text);
      detail = json.detail ?? json.error ?? text;
    } catch {
      detail = text;
    }
    throw new Error(detail || "Falha no upload");
  }
  const data = await res.json();
  return {
    job_id: data.job_id,
    dataset_id: data.dataset_id,
    status: data.status ?? "pending",
  };
};
