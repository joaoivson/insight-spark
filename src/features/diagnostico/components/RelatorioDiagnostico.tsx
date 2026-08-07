// src/features/diagnostico/components/RelatorioDiagnostico.tsx
import { Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Diagnostico } from "@/services/ai-diagnostic.service";
// import de efeito colateral: injeta as regras @media print no bundle sem
// precisar de um <link> separado — o componente e o CSS de impressão
// viajam juntos.
import "../print.css";

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
        {itens.map((i) => (
          <div key={i.nome} className="border-b border-border/50 pb-2 last:border-0">
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

  const periodo = `${new Date(diagnostico.periodo_inicio).toLocaleDateString("pt-BR")} a ${new Date(
    diagnostico.periodo_fim,
  ).toLocaleDateString("pt-BR")}`;

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
        <Card className="bloco">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Resumo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="leading-relaxed">{r.resumo_executivo}</p>
          </CardContent>
        </Card>

        <Bloco
          titulo="Escalar"
          cor="bg-emerald-500"
          itens={r.escalar.map((i) => ({ nome: i.nome, texto: `${i.motivo} — ${i.acao}` }))}
        />
        <Bloco
          titulo="Pausar"
          cor="bg-destructive"
          itens={r.pausar.map((i) => ({ nome: i.nome, texto: `${i.motivo} — ${i.perda}` }))}
        />
        <Bloco
          titulo="Observar"
          cor="bg-amber-500"
          itens={r.observar.map((i) => ({ nome: i.nome, texto: i.motivo }))}
        />
        <Bloco
          titulo="Detalhamento"
          cor="bg-sky-500"
          itens={r.detalhamento.map((i) => ({
            nome: i.nome,
            texto: `${i.diagnostico} — ${i.custo}`,
          }))}
        />

        {/* mesmo racional dos blocos acima: sem destaque nem atenção, não
            há o que mostrar nesta seção. */}
        {(r.numeros?.destaque || r.numeros?.atencao) && (
          <Card className="bloco">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Números do período</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {r.numeros.destaque && <p>✓ {r.numeros.destaque}</p>}
              {r.numeros.atencao && <p>⚠ {r.numeros.atencao}</p>}
            </CardContent>
          </Card>
        )}

        {r.proximos_passos.length > 0 && (
          <Card className="bloco">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Próximos passos</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal space-y-1 pl-5 text-sm">
                {r.proximos_passos.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ol>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
