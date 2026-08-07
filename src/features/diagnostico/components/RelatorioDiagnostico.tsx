// src/features/diagnostico/components/RelatorioDiagnostico.tsx
import { Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Diagnostico, RelatorioIA } from "@/services/ai-diagnostic.service";
import { parseDateOnly } from "@/shared/lib/date";
// import de efeito colateral: injeta as regras @media print no bundle sem
// precisar de um <link> separado — o componente e o CSS de impressão
// viajam juntos.
import "../print.css";

// O relatório vem de um LLM: o backend só faz json.loads cru, sem validar
// shape (o prompt apenas PEDE o formato). Campos que o tipo declara como
// array obrigatório podem chegar ausentes, null, ou em outro tipo quando o
// modelo "esquece" uma seção vazia — sem essa blindagem o componente inteiro
// quebra com TypeError ao dar .map() em undefined.
function paraArray<T>(valor: unknown): T[] {
  return Array.isArray(valor) ? (valor as T[]) : [];
}


/**
 * Campos como "perda" e "custo" vêm da IA: o formato pedido é texto, mas o
 * modelo às vezes devolve número cru, que renderizava como "0.0" na tela.
 * Número vira moeda; string passa direto; vazio some junto com o travessão.
 */
function valorLegivel(v: unknown): string {
  if (v === null || v === undefined || v === "") return "";
  const emReais = (n: number) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  if (typeof v === "number") return Number.isFinite(v) ? emReais(v) : "";
  const texto = String(v).trim();
  // "0.0" também chega como string. Só converte quando o campo INTEIRO é um
  // número; texto que apenas contém dígitos ("R$ 120,00 em anúncios") passa direto.
  if (/^-?\d+(\.\d+)?$/.test(texto)) return emReais(Number(texto));
  return texto;
}

const SEM_CONTEUDO = new Set([
  "nenhuma", "nenhum", "nenhuma.", "nenhum.", "n/a", "na", "-", "--",
  "sem destaque", "sem alerta", "sem alertas", "nada a destacar",
  // A IA já devolveu o texto da própria instrução como se fosse conteúdo
  // ("string vazia"). O prompt foi corrigido; isto é a rede embaixo.
  "string vazia", "vazio", "vazia", "...",
]);

/** Texto que só ocupa espaço ("Nenhuma", "N/A") vale como campo vazio. */
function comConteudo(v: unknown): string {
  const texto = valorLegivel(v).trim();
  return SEM_CONTEUDO.has(texto.toLowerCase()) ? "" : texto;
}

/** Junta motivo e complemento sem deixar travessão órfão quando um deles falta. */
function juntar(...partes: unknown[]): string {
  return partes.map(valorLegivel).filter(Boolean).join(" — ");
}

function Bloco({
  titulo,
  cor,
  itens,
}: {
  titulo: string;
  cor: string;
  itens: { nome: string; texto: string }[];
}) {
  // a IA pode não ter achado nada para escalar/pausar/observar num período —
  // bloco vazio não deve aparecer nem na tela nem no PDF impresso.
  if (itens.length === 0) return null;
  return (
    <Card className="bloco">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${cor}`} />
          {titulo}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {itens.map((i, idx) => (
          // chave combina índice + nome: nome sozinho pode vir vazio ou
          // duplicado da IA, o que faria o React colidir chaves e sumir
          // com um item silenciosamente.
          <div key={`${idx}-${i.nome}`} className="border-b border-border/50 pb-2 last:border-0">
            <p className="font-medium">{i.nome}</p>
            <p className="text-sm text-muted-foreground">{i.texto}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function RelatorioDiagnostico({ diagnostico }: { diagnostico: Diagnostico }) {
  const r = diagnostico.relatorio;
  // relatório pode não existir ainda (diagnóstico "gerando" ou "erro") —
  // quem decide o que mostrar nesses estados é a tela que consome este
  // componente, não ele.
  if (!r) return null;

  // periodo_inicio/fim chegam como "YYYY-MM-DD" puro — `new Date(string)` do JS
  // interpreta isso como meia-noite UTC, e em Brasília (UTC-3) isso renderiza
  // como o dia ANTERIOR. parseDateOnly já resolve isso no projeto todo.
  const periodo = `${parseDateOnly(diagnostico.periodo_inicio)?.toLocaleDateString("pt-BR") ?? diagnostico.periodo_inicio} a ${
    parseDateOnly(diagnostico.periodo_fim)?.toLocaleDateString("pt-BR") ?? diagnostico.periodo_fim
  }`;

  // demais campos do relatório: mesma blindagem contra shape inesperado da IA.
  const resumoExecutivo = typeof r.resumo_executivo === "string" ? r.resumo_executivo : "";
  const escalar = paraArray<RelatorioIA["escalar"][number]>(r.escalar);
  const pausar = paraArray<RelatorioIA["pausar"][number]>(r.pausar);
  const observar = paraArray<RelatorioIA["observar"][number]>(r.observar);
  const detalhamento = paraArray<RelatorioIA["detalhamento"][number]>(r.detalhamento);
  const proximosPassos = paraArray<string>(r.proximos_passos);
  const numerosBrutos = r.numeros && typeof r.numeros === "object" ? r.numeros : {};
  // "Nenhuma", "N/A", "-": a IA preenche o campo em vez de deixá-lo vazio, e a
  // linha sai como "⚠ Nenhuma" — um alerta que alerta sobre nada.
  const numeros = {
    destaque: comConteudo(numerosBrutos.destaque),
    atencao: comConteudo(numerosBrutos.atencao),
  };

  return (
    <div className="space-y-4">
      {/* nao-imprimir: botão e badge de período só fazem sentido na tela —
          o print.css os esconde no PDF para não desperdiçar espaço com
          controles que não têm função em papel. */}
      <div className="flex items-center justify-between nao-imprimir">
        <Badge variant="outline">{periodo}</Badge>
        <Button size="sm" variant="outline" onClick={() => window.print()}>
          <Printer className="mr-1.5 h-4 w-4" />
          Salvar PDF
        </Button>
      </div>

      {/* id usado pelo print.css para isolar só este bloco na impressão */}
      <div id="relatorio-diagnostico" className="space-y-4">
        {/* sem resumo utilizável (ausente/null/tipo errado), não há bloco —
            mesmo racional dos demais blocos: seção sem conteúdo não aparece. */}
        {resumoExecutivo && (
          <Card className="bloco">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Resumo</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="leading-relaxed">{resumoExecutivo}</p>
            </CardContent>
          </Card>
        )}

        <Bloco
          titulo="Escalar"
          cor="bg-emerald-500"
          itens={escalar.map((i) => ({ nome: i?.nome ?? "", texto: juntar(i?.motivo, i?.acao) }))}
        />
        <Bloco
          titulo="Pausar"
          cor="bg-destructive"
          itens={pausar.map((i) => ({ nome: i?.nome ?? "", texto: juntar(i?.motivo, i?.perda) }))}
        />
        <Bloco
          titulo="Observar"
          cor="bg-amber-500"
          itens={observar.map((i) => ({ nome: i?.nome ?? "", texto: i?.motivo ?? "" }))}
        />
        <Bloco
          titulo="Detalhamento"
          cor="bg-sky-500"
          itens={detalhamento.map((i) => ({
            nome: i?.nome ?? "",
            texto: juntar(i?.diagnostico, i?.custo),
          }))}
        />

        {/* mesmo racional dos blocos acima: sem destaque nem atenção, não
            há o que mostrar nesta seção. */}
        {(numeros.destaque || numeros.atencao) && (
          <Card className="bloco">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Números do período</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {numeros.destaque && <p>✓ {numeros.destaque}</p>}
              {numeros.atencao && <p>⚠ {numeros.atencao}</p>}
            </CardContent>
          </Card>
        )}

        {proximosPassos.length > 0 && (
          <Card className="bloco">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Próximos passos</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal space-y-1 pl-5 text-sm">
                {proximosPassos.map((p, i) => (
                  <li key={`${i}-${p}`}>{p}</li>
                ))}
              </ol>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
