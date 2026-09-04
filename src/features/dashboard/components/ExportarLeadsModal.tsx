import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Loader2 } from "lucide-react";

import { ResponsiveModal } from "@/components/shared/ResponsiveModal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { mensagemAmigavel } from "@/services/http-error";
import { exportarLeads } from "@/services/campanhas_grupos.service";
import { addDaysKey, todayKeyBR } from "@/shared/lib/date";

const ERRO_EXPORT = "Não foi possível exportar. Tente novamente.";

export type GrupoExportavel = { grupo_id: number; nome: string };

/**
 * Exportar leads com seleção de grupos (spec §3.6).
 *
 * O CSV traz o telefone de quem entrou. Quando o WhatsApp entrega LID — o id
 * opaco de quem está com privacidade ativa — a coluna sai vazia: é a verdade, e
 * é melhor do que um número que não disca.
 */
export const ExportarLeadsModal = ({
  open,
  onOpenChange,
  campanhaId,
  grupos,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  campanhaId: number;
  grupos: GrupoExportavel[];
}) => {
  const { toast } = useToast();
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [exportando, setExportando] = useState(false);

  // Abre com tudo marcado: exportar todos é o caso comum, e desmarcar o que
  // não quer é menos trabalho do que marcar um por um.
  //
  // A pré-seleção acontece na ABERTURA, não a cada render. O pai monta o array
  // `grupos` inline no JSX, então ele é uma referência nova a cada render dele
  // — com `grupos` nas deps, um toast expirando (ou o store de conexões
  // revalidando) remarcava tudo por baixo da afiliada, e ela exportava 10
  // grupos achando que exportava os 3 que deixou marcados.
  const jaAbriu = useRef(false);
  useEffect(() => {
    if (open && !jaAbriu.current) {
      jaAbriu.current = true;
      setSelecionados(new Set(grupos.map((g) => g.grupo_id)));
    } else if (!open) {
      jaAbriu.current = false;
    }
    // `grupos` fora das deps de propósito — ver acima.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const todos = selecionados.size === grupos.length && grupos.length > 0;

  const alternar = (id: number) => {
    setSelecionados((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });
  };

  const alternarTodos = () =>
    setSelecionados(todos ? new Set() : new Set(grupos.map((g) => g.grupo_id)));

  /**
   * Últimos 30 dias INCLUINDO hoje.
   *
   * Os atalhos de período do produto cortam no último dia FECHADO, porque
   * comparar um dia pela metade com dias inteiros distorce a métrica. Aqui é o
   * contrário: lead não é métrica comparável, é contato — e quem entrou no
   * grupo hoje de manhã é exatamente quem a afiliada quer chamar agora.
   * Cortar em ontem esconderia justamente os leads mais quentes.
   */
  const intervalo = useMemo(() => {
    const fim = todayKeyBR();
    return { inicio: addDaysKey(fim, -29), fim };
  }, []);

  const exportar = async () => {
    setExportando(true);
    try {
      // `undefined` quando é tudo: o backend trata ausência como "todos", e
      // assim o CSV não quebra se um grupo sair da campanha entre abrir e clicar.
      const { blob, nome } = await exportarLeads(
        campanhaId,
        intervalo,
        todos ? undefined : [...selecionados],
      );
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = nome;
      document.body.appendChild(link);
      link.click();
      link.remove();
      // Revogar no mesmo tick aborta o download no Safari do iOS — que é o
      // aparelho principal deste produto.
      window.setTimeout(() => URL.revokeObjectURL(href), 60_000);
      onOpenChange(false);
    } catch (e) {
      toast({
        title: "Não foi possível exportar",
        description: mensagemAmigavel(e, ERRO_EXPORT),
        variant: "destructive",
      });
    } finally {
      setExportando(false);
    }
  };

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange} title="Exportar leads">
      <div className="space-y-3 pb-2">
        <label className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2">
          <Checkbox
            checked={todos}
            onCheckedChange={alternarTodos}
            aria-label="Selecionar todos os grupos"
          />
          <span className="text-sm font-medium text-foreground">Todos os grupos</span>
        </label>

        <div className="max-h-[40vh] space-y-1 overflow-y-auto">
          {grupos.map((g) => (
            <label
              key={g.grupo_id}
              className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-accent/40"
            >
              <Checkbox
                checked={selecionados.has(g.grupo_id)}
                onCheckedChange={() => alternar(g.grupo_id)}
                aria-label={`Exportar ${g.nome}`}
              />
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                {g.nome}
              </span>
            </label>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          Últimos 30 dias, incluindo hoje. Quem entrou com o número oculto no WhatsApp
          sai sem telefone.
        </p>

        <Button
          className="w-full"
          onClick={() => void exportar()}
          disabled={exportando || selecionados.size === 0}
        >
          {exportando ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          {selecionados.size === grupos.length
            ? "Exportar todos"
            : `Exportar (${selecionados.size})`}
        </Button>
      </div>
    </ResponsiveModal>
  );
};
