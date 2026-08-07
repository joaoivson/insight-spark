import { fetchWithAuth } from "@/core/config/api.config";

const base = () => "/api/v1/ai-diagnostics";

async function json<T>(r: Response): Promise<T> {
  if (!r.ok) {
    const corpo = await r.json().catch(() => ({}));
    const erro = new Error(
      typeof corpo?.detail === "string" ? corpo.detail : "Erro na requisição",
    ) as Error & { status?: number; detail?: unknown };
    erro.status = r.status;
    erro.detail = corpo?.detail;
    throw erro;
  }
  return r.json() as Promise<T>;
}

export type SaldoIA = {
  saldo: number;
  cota: number;
  custo_geracao: number;
  custo_chat: number;
  disponivel: boolean;
};

export type MensagemIA = {
  id: number;
  papel: "user" | "assistant";
  conteudo: string;
  criado_em?: string | null;
};

export type RelatorioIA = {
  resumo_executivo: string;
  escalar: { nome: string; motivo: string; acao: string }[];
  pausar: { nome: string; motivo: string; perda: string }[];
  observar: { nome: string; motivo: string }[];
  detalhamento: { nome: string; diagnostico: string; custo: string }[];
  numeros: { destaque?: string; atencao?: string };
  proximos_passos: string[];
  perguntas_sugeridas: string[];
};

export type Diagnostico = {
  id: number;
  periodo_inicio: string;
  periodo_fim: string;
  status: "gerando" | "pronto" | "erro";
  erro_mensagem?: string | null;
  relatorio?: RelatorioIA | null;
  snapshot?: Record<string, unknown> | null;
  criado_em?: string | null;
  mensagens: MensagemIA[];
};

export type DiagnosticoResumo = Omit<Diagnostico, "relatorio" | "snapshot" | "mensagens">;

export async function fetchSaldoIA() {
  return json<SaldoIA>(await fetchWithAuth(`${base()}/saldo`));
}

export async function gerarDiagnostico(inicio: string, fim: string) {
  return json<Diagnostico>(
    await fetchWithAuth(base(), {
      method: "POST",
      body: JSON.stringify({ inicio, fim }),
    }),
  );
}

export async function listarDiagnosticos() {
  return json<DiagnosticoResumo[]>(await fetchWithAuth(base()));
}

export async function buscarDiagnostico(id: number) {
  return json<Diagnostico>(await fetchWithAuth(`${base()}/${id}`));
}

export async function enviarPergunta(id: number, pergunta: string) {
  return json<MensagemIA>(
    await fetchWithAuth(`${base()}/${id}/mensagens`, {
      method: "POST",
      body: JSON.stringify({ pergunta }),
    }),
  );
}
