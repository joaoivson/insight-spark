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

// ─────────────────────────────────────────────────────────────────────────────
// Roteiros (F4): editor de passos, prévia e agendamento.
// ─────────────────────────────────────────────────────────────────────────────

export type TipoTempo = "ancora" | "relativo";
export type TipoConteudo = "texto" | "midia" | "oferta" | "acao_grupo";
export type AcaoGrupo = "renomear_grupo" | "abrir_entrada" | "fechar_entrada";
export type GruposAlvo = "todos" | "selecao";
export type MarcarTodos = "nunca" | "sempre";
export type StatusRoteiro = "rascunho" | "pronto";

/** Passo como o backend aceita no PUT — a tela manda a lista COMPLETA na ordem. */
export type PassoIn = {
  id?: number;
  ordem: number;
  tipo_tempo: TipoTempo;
  /** "HH:MM" — obrigatório quando `tipo_tempo` é "ancora". */
  hora_fixa?: string | null;
  /** "YYYY-MM-DD" — âncora em data própria, em vez da data-âncora do agendamento. */
  data_fixa?: string | null;
  offset_minutos?: number | null;
  tipo_conteudo: TipoConteudo;
  texto?: string | null;
  midia_url?: string | null;
  oferta_url?: string | null;
  template_id?: number | null;
  acao?: AcaoGrupo | null;
  acao_parametro?: string | null;
  grupos_alvo: GruposAlvo;
  grupos_alvo_ids?: number[] | null;
  marcar_todos: MarcarTodos;
};

export type PassoOut = PassoIn & { id: number };

export type Roteiro = {
  id: number;
  nome: string;
  campanha_id: number | null;
  status: StatusRoteiro;
  origem: string;
  total_passos: number;
  criado_em: string;
};

export type RoteiroDetalhe = Roteiro & { passos: PassoOut[] };

export type PreviewPasso = {
  ordem: number;
  tipo_conteudo: TipoConteudo;
  /** ISO com fuso de Brasília. */
  quando: string;
  grupos: number;
};

export type PreviewRoteiro = {
  passos: PreviewPasso[];
  total_mensagens: number;
  duracao_estimada_s: number;
  avisos: string[];
};

/** Agendou, ou parou nos avisos e espera confirmação da usuária. */
export type ResultadoAgendamento =
  | { agendada: true; execucao: ExecucaoEnvio }
  | { agendada: false; avisos: string[] };

/** O backend serializa `time` como "HH:MM:SS" — a tela trabalha com "HH:MM". */
const normalizarPasso = (p: PassoOut): PassoOut => ({
  ...p,
  hora_fixa: p.hora_fixa ? p.hora_fixa.slice(0, 5) : p.hora_fixa,
});

const normalizarDetalhe = (r: RoteiroDetalhe): RoteiroDetalhe => ({
  ...r,
  passos: (r.passos ?? []).map(normalizarPasso),
});

export async function listarRoteiros(campanhaId?: number): Promise<Roteiro[]> {
  const url = campanhaId != null ? `${baseRoteiros()}?campanha_id=${campanhaId}` : baseRoteiros();
  const res = await fetchWithAuth(url);
  return json(res, "Não foi possível carregar os roteiros.");
}

export async function criarRoteiro(payload: {
  nome: string;
  campanha_id?: number;
  passos?: PassoIn[];
}): Promise<RoteiroDetalhe> {
  const res = await fetchWithAuth(baseRoteiros(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ passos: [], ...payload }),
  });
  return normalizarDetalhe(await json<RoteiroDetalhe>(res, "Não foi possível criar o roteiro."));
}

export async function obterRoteiro(id: number): Promise<RoteiroDetalhe> {
  const res = await fetchWithAuth(`${baseRoteiros()}/${id}`);
  return normalizarDetalhe(await json<RoteiroDetalhe>(res, "Não foi possível carregar o roteiro."));
}

/** Substitui os passos do roteiro (lista completa, na ordem final). */
export async function definirPassos(id: number, passos: PassoIn[]): Promise<RoteiroDetalhe> {
  const res = await fetchWithAuth(`${baseRoteiros()}/${id}/passos`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(passos),
  });
  return normalizarDetalhe(await json<RoteiroDetalhe>(res, "Não foi possível salvar os passos."));
}

export async function duplicarRoteiro(id: number): Promise<Roteiro> {
  const res = await fetchWithAuth(`${baseRoteiros()}/${id}/duplicar`, { method: "POST" });
  return json(res, "Não foi possível duplicar o roteiro.");
}

export async function previewRoteiro(id: number, dataAncora: string): Promise<PreviewRoteiro> {
  const res = await fetchWithAuth(`${baseRoteiros()}/${id}/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data_ancora: dataAncora }),
  });
  return json(res, "Não foi possível gerar a prévia do roteiro.");
}

export async function agendarRoteiro(
  id: number,
  dataAncora: string,
  ignorarAvisos = false,
): Promise<ResultadoAgendamento> {
  const res = await fetchWithAuth(`${baseRoteiros()}/${id}/agendar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data_ancora: dataAncora, ignorar_avisos: ignorarAvisos }),
  });
  if (!res.ok) {
    // 422 com `detail.avisos` não é erro: é o backend pedindo confirmação.
    if (res.status === 422) {
      try {
        const corpo = await res.clone().json();
        const avisos = corpo?.detail?.avisos;
        if (Array.isArray(avisos)) return { agendada: false, avisos: avisos as string[] };
      } catch {
        /* não era JSON — cai no erro comum */
      }
    }
    throw await erroDaResposta(res, "Não foi possível agendar o roteiro.");
  }
  return { agendada: true, execucao: (await res.json()) as ExecucaoEnvio };
}
