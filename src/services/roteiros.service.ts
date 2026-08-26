import { fetchWithAuth, getApiUrl } from "@/core/config/api.config";
import { erroDaResposta } from "@/services/http-error";

// getApiUrl resolve o host por ambiente — URL relativa só funciona no dev com proxy.
const baseRoteiros = () => getApiUrl("/api/v1/roteiros");
const baseWhatsapp = () => getApiUrl("/api/v1/whatsapp");

export type StatusExecucao =
  | "agendada"
  | "enviando"
  | "pausada"
  | "concluida"
  | "cancelada"
  | "falhou";

export type ExecucaoEnvio = {
  id: number;
  roteiro_id: number;
  data_ancora: string;
  status: StatusExecucao;
  total: number;
  enviados: number;
  erros: number;
  pulados: number;
  proxima_execucao_em: string | null;
  iniciado_em: string | null;
  concluido_em: string | null;
  duracao_estimada_s: number;
  avisos: string[];
};

export type EnvioRapidoPayload = {
  texto?: string;
  midia_url?: string;
  oferta_url?: string;
  grupo_ids: number[];
  campanha_id?: number;
  /** ISO datetime para agendar; omitir = dispara agora. */
  agendar_para?: string;
};

/** Janela de um dia da semana — chaves "0"=segunda … "6"=domingo. */
export type JanelaDia = {
  ativo: boolean;
  /** "HH:MM" (o backend pode devolver "HH:MM:SS"). */
  inicio: string;
  fim: string;
  pausa_inicio?: string | null;
  pausa_fim?: string | null;
};

export type ConfigEnvio = {
  ativo: boolean;
  /** Pode vir vazio = padrão 08:00–22:00 todos os dias. */
  dias: Record<string, JanelaDia>;
};

const json = async <T>(res: Response, fallback: string): Promise<T> => {
  if (!res.ok) throw await erroDaResposta(res, fallback);
  return res.json() as Promise<T>;
};

export async function envioRapido(payload: EnvioRapidoPayload): Promise<ExecucaoEnvio> {
  const res = await fetchWithAuth(`${baseRoteiros()}/envio-rapido`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return json(res, "Não foi possível iniciar o envio.");
}

export async function progresso(execucaoId: number): Promise<ExecucaoEnvio> {
  const res = await fetchWithAuth(`${baseRoteiros()}/execucoes/${execucaoId}/progresso`);
  return json(res, "Não foi possível consultar o progresso do envio.");
}

export async function pausar(execucaoId: number): Promise<ExecucaoEnvio> {
  const res = await fetchWithAuth(`${baseRoteiros()}/execucoes/${execucaoId}/pausar`, {
    method: "POST",
  });
  return json(res, "Não foi possível pausar o envio.");
}

export async function retomar(execucaoId: number): Promise<ExecucaoEnvio> {
  const res = await fetchWithAuth(`${baseRoteiros()}/execucoes/${execucaoId}/retomar`, {
    method: "POST",
  });
  return json(res, "Não foi possível retomar o envio.");
}

export async function cancelar(execucaoId: number): Promise<ExecucaoEnvio> {
  const res = await fetchWithAuth(`${baseRoteiros()}/execucoes/${execucaoId}/cancelar`, {
    method: "POST",
  });
  return json(res, "Não foi possível cancelar o envio.");
}

export async function obterConfigEnvio(): Promise<ConfigEnvio> {
  const res = await fetchWithAuth(`${baseWhatsapp()}/config-envio`);
  return json(res, "Não foi possível carregar a janela de envio.");
}

export async function salvarConfigEnvio(config: ConfigEnvio): Promise<ConfigEnvio> {
  const res = await fetchWithAuth(`${baseWhatsapp()}/config-envio`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  return json(res, "Não foi possível salvar a janela de envio.");
}
