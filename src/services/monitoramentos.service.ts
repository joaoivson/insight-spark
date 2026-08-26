import { fetchWithAuth, getApiUrl } from "@/core/config/api.config";
import { erroDaResposta, type ErroDeApi } from "@/services/http-error";

// getApiUrl resolve o host por ambiente — URL relativa só funciona no dev com proxy.
const base = () => getApiUrl("/api/v1/monitoramentos");

/**
 * Ciclo de vida de uma captura.
 *
 * `replicando` é o claim do worker (quem move `capturada` → `replicando` é o
 * único que envia). `erro` é recuperável: o backend reabre e reenfileira.
 */
export type StatusCaptura = "capturada" | "replicando" | "replicada" | "ignorada" | "erro";

export type Monitoramento = {
  id: number;
  nome: string;
  grupo_origem_id: number;
  /** Nome do grupo de origem. Vem `null` quando o grupo saiu do banco. */
  grupo_origem: string | null;
  instancia_id: number | null;
  destino_campanha_id: number | null;
  destino_grupo_ids: number[] | null;
  ativo: boolean;
  converter_links: boolean;
  somente_com_link: boolean;
  palavras_chave: string[] | null;
  replicar_automaticamente: boolean;
  total_capturas: number;
  criado_em: string;
};

export type Captura = {
  id: number;
  status: StatusCaptura;
  /** Só preenchido em `erro` — é o que a tela mostra antes de "Tentar de novo". */
  motivo: string | null;
  /** Texto como apareceu no grupo de origem. */
  texto_original: string | null;
  /** Texto que foi (ou seria) enviado, já com o link dela. */
  texto_final: string | null;
  link_original: string | null;
  link_convertido: string | null;
  roteiro_id: number | null;
  criado_em: string;
  replicado_em: string | null;
};

/**
 * `ativo` NÃO entra aqui: o backend cria todo monitoramento **desligado**
 * (`ativo` default false) e ligar é outra ação — ela fala com o WhatsApp e
 * pode ser recusada (409).
 */
export type MonitoramentoNovo = {
  nome: string;
  grupo_origem_id: number;
  destino_campanha_id: number;
  converter_links?: boolean;
  somente_com_link?: boolean;
  palavras_chave?: string[] | null;
  replicar_automaticamente?: boolean;
};

/**
 * Campos editáveis via PATCH — qualquer subconjunto.
 *
 * ⚠️ `grupo_origem_id` está fora de propósito: o backend não aceita trocar a
 * origem de um monitoramento existente. Para mudar de grupo, crie outro.
 */
export type MonitoramentoPatch = Partial<{
  nome: string;
  ativo: boolean;
  converter_links: boolean;
  somente_com_link: boolean;
  palavras_chave: string[] | null;
  replicar_automaticamente: boolean;
  destino_campanha_id: number | null;
  destino_grupo_ids: number[] | null;
}>;

/**
 * Erro da API com o status HTTP preservado.
 *
 * A tela precisa do status para decidir a mensagem: **403** (limite do plano),
 * **409** (não deu para religar a conexão agora) e **422** (nome vazio, grupo
 * não encontrado, origem no destino) trazem no `detail` um texto escrito para a
 * usuária. Nos demais o corpo pode ser validação do FastAPI ou HTML de proxy —
 * a tela usa a frase fixa em PT-BR.
 */
export type ErroDeMonitoramento = ErroDeApi & { status?: number };

const falhar = async (res: Response, fallback: string): Promise<never> => {
  const erro: ErroDeMonitoramento = await erroDaResposta(res, fallback);
  erro.status = res.status;
  throw erro;
};

const json = async <T>(res: Response, fallback: string): Promise<T> => {
  if (!res.ok) await falhar(res, fallback);
  return res.json() as Promise<T>;
};

/**
 * Lista os monitoramentos da usuária.
 *
 * O backend devolve todos; o recorte por campanha de destino é da tela — não
 * existe filtro no endpoint. Passe `destinoCampanhaId` para trazer só os que
 * replicam para aquela campanha.
 */
export async function listarMonitoramentos(destinoCampanhaId?: number): Promise<Monitoramento[]> {
  const res = await fetchWithAuth(base());
  const todos = await json<Monitoramento[]>(res, "Não foi possível carregar os monitoramentos.");
  if (destinoCampanhaId == null) return todos;
  return todos.filter((m) => m.destino_campanha_id === destinoCampanhaId);
}

export async function criarMonitoramento(dados: MonitoramentoNovo): Promise<Monitoramento> {
  const res = await fetchWithAuth(base(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  return json(res, "Não foi possível criar o monitoramento.");
}

/**
 * Salva um subconjunto dos campos.
 *
 * Com `ativo` no patch o backend também reconfigura a sessão do WhatsApp — e
 * pode devolver **409** (envio em andamento ou WhatsApp fora do ar). Nesse
 * caso ele já desfez a gravação, então a tela precisa reverter o toggle.
 */
export async function atualizarMonitoramento(
  id: number,
  patch: MonitoramentoPatch,
): Promise<Monitoramento> {
  const res = await fetchWithAuth(`${base()}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  return json(res, "Não foi possível salvar o monitoramento.");
}

export async function removerMonitoramento(id: number): Promise<void> {
  const res = await fetchWithAuth(`${base()}/${id}`, { method: "DELETE" });
  if (!res.ok) await falhar(res, "Não foi possível excluir o monitoramento.");
}

/** Até 50 capturas, da mais recente para a mais antiga. */
export async function listarCapturas(monitoramentoId: number): Promise<Captura[]> {
  const res = await fetchWithAuth(`${base()}/${monitoramentoId}/capturas`);
  const corpo = await json<{ capturas: Captura[] }>(
    res,
    "Não foi possível carregar as capturas.",
  );
  return corpo.capturas ?? [];
}

/**
 * Enfileira a replicação de uma captura.
 *
 * Captura em `erro` é reaberta pelo backend e volta para a fila — não é erro.
 * **409** quando já está `replicando`/`replicada`.
 */
export async function replicarCaptura(
  monitoramentoId: number,
  capturaId: number,
): Promise<void> {
  const res = await fetchWithAuth(
    `${base()}/${monitoramentoId}/capturas/${capturaId}/replicar`,
    { method: "POST" },
  );
  if (!res.ok) await falhar(res, "Não foi possível replicar esta oferta.");
}
