import { fetchWithAuth, getApiUrl } from "@/core/config/api.config";
import { erroDaResposta } from "@/services/http-error";

// getApiUrl resolve o host por ambiente — URL relativa só funciona no dev com proxy.
const base = () => getApiUrl("/api/v1/whatsapp");

export type StatusInstancia = "criada" | "conectada" | "desconectada";

export type InstanciaConexao = {
  id: number;
  nome_exibicao: string | null;
  numero_mascarado: string | null;
  status: StatusInstancia;
  /** Eixo SEPARADO de `status`: o chip pode estar conectado E pausado.
   *  `status` é a saúde da conexão (quem escreve é o webhook do WAHA);
   *  este é a intenção da afiliada. */
  envio_pausado: boolean;
  ultima_conexao_em: string | null;
  criado_em: string;
};

export type InstanciaAtualizacao = {
  nome_exibicao?: string;
  envio_pausado?: boolean;
};

export type QrInstancia = {
  /** "conectada" | "aguardando" | "erro: <motivo>" */
  estado: string;
  /** data-uri pronto para <img src>, ou null enquanto o QR não sai. */
  qrcode: string | null;
};

export type ResultadoSincronizacao = {
  vistos: number;
  novos: number;
  atualizados: number;
  desativados: number;
  /** Itens que o WhatsApp devolveu e o backend não reconheceu como grupo.
   *  Existe porque foi exatamente a métrica ausente que deixou o sync
   *  "com sucesso e zero grupos" por dias, em 26/08. */
  ignorados?: number;
  /** Links de convite resolvidos nesta rodada — o resto vem no próximo sync. */
  convites?: number;
};

export type GrupoWhatsapp = {
  id: number;
  jid: string;
  /** Nullable no backend: o sync grava `None` quando o WhatsApp não
   *  devolve `subject`/`name`. Ler sem fallback derruba a tela. */
  nome: string | null;
  foto_url: string | null;
  participantes: number;
  capacidade: number;
  sou_admin: boolean;
  permite_envio: boolean;
  link_convite: string | null;
  /** Lifecycle do SYNC: o grupo ainda existe no WhatsApp. Quem escreve é o sync. */
  ativo: boolean;
  /** Escolha da USUÁRIA (spec §6): o toggle "Ativo" da tela — eixo separado
   *  de `ativo`, é o que conta no limite do plano e liga o monitoramento. */
  ativado: boolean;
  sub_id: string | null;
  instancia_ids: number[];
};

const json = async <T>(res: Response, fallback: string): Promise<T> => {
  if (!res.ok) throw await erroDaResposta(res, fallback);
  return res.json() as Promise<T>;
};

/**
 * Status em que o backend escreve `detail` PARA A USUÁRIA.
 *
 * Fora deles o corpo é técnico (HTML do proxy, lista de erros do Pydantic,
 * stack do FastAPI) e `erroDaResposta` devolve o texto cru — que nunca pode
 * chegar à tela. Por isso o erro vira frase fixa antes de sair daqui.
 */
const DETALHE_PARA_A_USUARIA = new Set([403, 409, 422]);

const falha = async (res: Response, fallback: string): Promise<Error> =>
  DETALHE_PARA_A_USUARIA.has(res.status) ? erroDaResposta(res, fallback) : new Error(fallback);

export async function listarInstancias(): Promise<InstanciaConexao[]> {
  const res = await fetchWithAuth(`${base()}/instancias`);
  return json(res, "Não foi possível carregar os números.");
}

export async function criarInstancia(nomeExibicao?: string): Promise<InstanciaConexao> {
  const res = await fetchWithAuth(`${base()}/instancias`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(nomeExibicao ? { nome_exibicao: nomeExibicao } : {}),
  });
  return json(res, "Não foi possível criar o número.");
}

/** PATCH parcial: só o que vem é alterado. Não fala com o WAHA — pausar
 *  precisa funcionar justamente quando a conexão está ruim. */
export async function atualizarInstancia(
  id: number,
  dados: InstanciaAtualizacao,
): Promise<InstanciaConexao> {
  const res = await fetchWithAuth(`${base()}/instancias/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  return json(res, "Não foi possível atualizar o número.");
}

export async function qrDaInstancia(id: number): Promise<QrInstancia> {
  const res = await fetchWithAuth(`${base()}/instancias/${id}/qr`);
  return json(res, "Não foi possível gerar o QR code.");
}

export async function removerInstancia(id: number): Promise<void> {
  const res = await fetchWithAuth(`${base()}/instancias/${id}`, { method: "DELETE" });
  if (!res.ok) throw await erroDaResposta(res, "Não foi possível remover o número.");
}

export async function sincronizarGrupos(id: number): Promise<ResultadoSincronizacao> {
  const res = await fetchWithAuth(`${base()}/instancias/${id}/sincronizar-grupos`, {
    method: "POST",
  });
  return json(res, "Não foi possível sincronizar os grupos.");
}

export type ListarGruposParams = {
  instanciaId?: number;
  q?: string;
  incluirInativos?: boolean;
  /** Só grupos com o toggle "Ativo" ligado — o que os pickers de campanha pedem. */
  apenasAtivados?: boolean;
};

// ⚠️ Nunca usar `user_id` como query param aqui — fetchWithAuth injeta o dele.
export async function listarGrupos(params: ListarGruposParams = {}): Promise<GrupoWhatsapp[]> {
  const query = new URLSearchParams();
  if (params.instanciaId != null) query.set("filter_instancia_id", String(params.instanciaId));
  if (params.q) query.set("q", params.q);
  if (params.incluirInativos) query.set("incluir_inativos", "true");
  if (params.apenasAtivados) query.set("apenas_ativados", "true");
  const qs = query.toString();
  const sufixo = qs ? `?${qs}` : "";
  const res = await fetchWithAuth(`${base()}/grupos${sufixo}`);
  return json(res, "Não foi possível carregar os grupos.");
}

export type GrupoAtualizacao = {
  /** Só o toggle da usuária — nome/participantes/admin são do sync. */
  ativado: boolean;
};

/**
 * Toggle "Ativo" de um grupo (spec §6.3). Ativar pode falhar por limite do
 * plano: 403 com detail {code: "PLANO_INSUFICIENTE", message} — a mensagem já
 * vem pronta para a usuária. Desativar nunca apaga nada.
 */
export async function atualizarGrupo(
  id: number,
  dados: GrupoAtualizacao,
): Promise<GrupoWhatsapp> {
  const res = await fetchWithAuth(`${base()}/grupos/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  if (!res.ok) throw await falha(res, "Não foi possível alterar o grupo.");
  return res.json() as Promise<GrupoWhatsapp>;
}

// --- item 18: link de conexão externa ----------------------------------------

export type ConviteConexao = {
  id: number;
  /** Só existe nesta resposta — o banco guarda o hash. Perdeu, gera outro. */
  url: string;
  expira_em: string;
};

/** O que sobra depois: sem a `url`, porque nem o backend a remonta. */
export type ConviteAtivo = {
  id: number;
  expira_em: string;
  criado_em: string;
};

export async function listarConvites(instanciaId: number): Promise<ConviteAtivo[]> {
  const res = await fetchWithAuth(`${base()}/instancias/${instanciaId}/convites`);
  if (!res.ok) throw await falha(res, "Não foi possível verificar os links deste número.");
  return res.json() as Promise<ConviteAtivo[]>;
}

export async function criarConvite(instanciaId: number): Promise<ConviteConexao> {
  const res = await fetchWithAuth(`${base()}/instancias/${instanciaId}/convites`, {
    method: "POST",
  });
  if (!res.ok) throw await falha(res, "Não foi possível gerar o link.");
  return res.json() as Promise<ConviteConexao>;
}

export async function revogarConvite(conviteId: number): Promise<void> {
  const res = await fetchWithAuth(`${base()}/convites/${conviteId}`, { method: "DELETE" });
  if (!res.ok) throw await falha(res, "Não foi possível cancelar o link.");
}
