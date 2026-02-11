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

// ========== MULTIPART UPLOAD (S3) ==========

export interface MultipartUploadInitResponse {
  job_id: string;
  dataset_id: number;
  upload_id: string;
  storage_key: string;
}

export interface MultipartUploadPartResponse {
  part_number: number;
  upload_url: string;
  expires_in: number;
}

export interface UploadPart {
  PartNumber: number;
  ETag: string;
}

const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB per chunk
const MIN_MULTIPART_SIZE = 20 * 1024 * 1024; // 20MB threshold

/**
 * Initiate multipart upload for large files.
 */
export const initMultipartUpload = async (
  filename: string,
  type: JobType
): Promise<MultipartUploadInitResponse> => {
  const url = getApiUrl("/api/v1/jobs/multipart/init");
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
    throw new Error(detail || "Falha ao iniciar multipart upload");
  }
  return res.json();
};

/**
 * Get presigned URL for uploading a single part.
 */
export const getPartUploadUrl = async (
  jobId: string,
  uploadId: string,
  partNumber: number
): Promise<MultipartUploadPartResponse> => {
  const url = getApiUrl(`/api/v1/jobs/multipart/${jobId}/part?upload_id=${uploadId}`);
  const res = await fetchWithAuth(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ part_number: partNumber }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Falha ao obter URL para parte ${partNumber}`);
  }
  return res.json();
};

/**
 * Upload a single chunk to presigned URL.
 */
export const uploadChunk = async (
  uploadUrl: string,
  chunk: Blob
): Promise<string> => {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "text/csv" },
    body: chunk,
  });
  if (!res.ok) {
    throw new Error(`Falha no upload do chunk: ${res.status}`);
  }
  const etag = res.headers.get("ETag")?.replace(/"/g, "");
  if (!etag) {
    throw new Error("ETag não encontrado na resposta");
  }
  return etag;
};

/**
 * Complete multipart upload and start processing.
 */
export const completeMultipartUpload = async (
  jobId: string,
  uploadId: string,
  parts: UploadPart[]
): Promise<JobCommitResponse> => {
  const url = getApiUrl(`/api/v1/jobs/multipart/${jobId}/complete?upload_id=${uploadId}`);
  const res = await fetchWithAuth(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ parts }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Falha ao completar multipart upload");
  }
  return res.json();
};

/**
 * Abort multipart upload (cleanup).
 */
export const abortMultipartUpload = async (
  jobId: string,
  uploadId: string
): Promise<void> => {
  const url = getApiUrl(`/api/v1/jobs/multipart/${jobId}/abort?upload_id=${uploadId}`);
  await fetchWithAuth(url, { method: "POST" });
};

/**
 * Upload large file using multipart upload with progress tracking.
 */
export const uploadLargeFile = async (
  file: File,
  type: JobType,
  onProgress?: (progress: number) => void
): Promise<{ job_id: string; dataset_id: number }> => {
  // Initiate multipart upload
  const init = await initMultipartUpload(file.name, type);
  const { job_id, upload_id, dataset_id } = init;

  try {
    // Split file into chunks
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const parts: UploadPart[] = [];

    for (let partNumber = 1; partNumber <= totalChunks; partNumber++) {
      const start = (partNumber - 1) * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);

      // Get presigned URL for this part
      const partInfo = await getPartUploadUrl(job_id, upload_id, partNumber);

      // Upload chunk
      const etag = await uploadChunk(partInfo.upload_url, chunk);

      parts.push({
        PartNumber: partNumber,
        ETag: etag,
      });

      // Update progress
      const progress = (partNumber / totalChunks) * 100;
      onProgress?.(Math.round(progress));
    }

    // Complete multipart upload
    await completeMultipartUpload(job_id, upload_id, parts);

    return { job_id, dataset_id };
  } catch (error) {
    // Abort upload on error
    try {
      await abortMultipartUpload(job_id, upload_id);
    } catch {
      // Ignore abort errors
    }
    throw error;
  }
};

/**
 * Smart upload: uses multipart for large files (>20MB), single PUT for smaller files.
 */
export const smartUpload = async (
  file: File,
  type: JobType,
  onProgress?: (progress: number) => void
): Promise<{ job_id: string; dataset_id: number }> => {
  if (file.size > MIN_MULTIPART_SIZE) {
    // Use multipart upload for large files
    return uploadLargeFile(file, type, onProgress);
  } else {
    // Use single PUT for small files
    const create = await createJob(file.name, type);
    onProgress?.(50);
    const putRes = await uploadToPresignedUrl(file, create.upload_url);
    if (!putRes.ok) {
      throw new Error(`Upload falhou: ${putRes.status}`);
    }
    onProgress?.(90);
    await commitJob(create.job_id);
    onProgress?.(100);
    return {
      job_id: create.job_id,
      dataset_id: create.dataset_id,
    };
  }
};

/**
 * Retry a stuck or failed job.
 */
export const retryJob = async (jobId: string): Promise<JobCommitResponse> => {
  const url = getApiUrl(`/api/v1/jobs/${jobId}/retry`);
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
    throw new Error(detail || "Falha ao retentar job");
  }
  return res.json();
};

