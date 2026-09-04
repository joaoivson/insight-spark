import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { ResponsiveModal } from "@/components/shared/ResponsiveModal";
import { Button } from "@/components/ui/button";
import { CheckboxQuadrado } from "@/components/shared/CheckboxQuadrado";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { mensagemAmigavel } from "@/services/http-error";
import {
  definirSubIdsDaCampanha,
  listarSubIdsDaCampanha,
  type SubIdVinculavel,
} from "@/services/campanhas_grupos.service";
import { formatCurrency } from "@/shared/lib/chart-utils";
import { cn } from "@/shared/lib/utils";

const ERRO_CARGA = "Não foi possível carregar os Sub IDs. Tente novamente.";
const ERRO_SALVAR = "Não foi possível salvar os vínculos. Tente novamente.";

/** É o que o PUT persiste — então é o que define "tem alteração não salva". */
const assinatura = (ids: Set<string>) => [...ids].sort().join(",");

/**
 * Vincular Sub IDs à CAMPANHA de grupos.
 *
 * Espelha o "Vincular ao Sub ID" da tela de Anúncios, com duas diferenças que
 * vêm da natureza do vínculo:
 *
 * 1. **Aceita vários.** Em Anúncios é 1:1 por invariante de dinheiro (uma
 *    campanha do Meta tem um Sub ID); aqui a campanha reúne o que veio por
 *    fora dos grupos rastreados.
 * 2. **Só oferece o que não entra por outro caminho.** Sub ID de grupo desta
 *    campanha e Sub ID de campanha de tráfego direto vêm na lista bloqueados,
 *    com o motivo — esconder a opção faria a afiliada procurar o Sub ID que
 *    sabe que existe e concluir que a tela está quebrada.
 */
export const VincularSubIdsModal = ({
  open,
  onOpenChange,
  campanhaId,
  periodo,
  onSalvo,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  campanhaId: number;
  /** Mesmo período da tela: a lista mostra pedidos e comissão do que ela vê. */
  periodo: { inicio: string; fim: string };
  onSalvo: () => void;
}) => {
  const { toast } = useToast();
  const [opcoes, setOpcoes] = useState<SubIdVinculavel[]>([]);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [baseline, setBaseline] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const aplicar = (lista: SubIdVinculavel[]) => {
    setOpcoes(lista);
    const marcados = new Set(lista.filter((o) => o.vinculado).map((o) => o.sub_id));
    setSelecionados(marcados);
    setBaseline(assinatura(marcados));
  };

  // Guarda contra resposta obsoleta: fechar e reabrir rápido não pode fazer a
  // resposta antiga cair em cima da nova.
  useEffect(() => {
    if (!open) return;
    let ativo = true;
    setCarregando(true);
    setErro(null);
    listarSubIdsDaCampanha(campanhaId, periodo)
      .then((lista) => {
        if (!ativo) return;
        aplicar(lista);
      })
      .catch((e) => ativo && setErro(mensagemAmigavel(e, ERRO_CARGA)))
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [open, campanhaId, periodo.inicio, periodo.fim]);

  const sujo = assinatura(selecionados) !== baseline;

  const alternar = (subId: string) => {
    setSelecionados((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(subId)) proximo.delete(subId);
      else proximo.add(subId);
      return proximo;
    });
  };

  const salvar = async () => {
    setSalvando(true);
    try {
      aplicar(await definirSubIdsDaCampanha(campanhaId, [...selecionados], periodo));
      onSalvo();
      onOpenChange(false);
      toast({ title: "Sub IDs vinculados" });
    } catch (e) {
      // O 409 vem com o texto pronto do backend, nomeando o que trava cada Sub
      // ID. Texto genérico aqui esconderia exatamente o que destrava.
      toast({
        title: "Não foi possível salvar os vínculos",
        description: mensagemAmigavel(e, ERRO_SALVAR),
        variant: "destructive",
      });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Vincular Sub ID à campanha"
    >
      <div className="space-y-3 pb-2">
        <p className="text-xs text-muted-foreground">
          A comissão destes Sub IDs entra no total da campanha, somada à dos grupos.
        </p>

        {carregando ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : erro ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{erro}</p>
        ) : opcoes.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhum Sub ID com venda no período.
          </p>
        ) : (
          <div className="max-h-[45vh] space-y-1 overflow-y-auto">
            {opcoes.map((o) => {
              const bloqueado = !!o.bloqueado_por;
              return (
                <label
                  key={o.sub_id}
                  className={cn(
                    "flex min-h-[52px] items-center gap-3 rounded-lg px-2 py-2 transition-colors",
                    bloqueado ? "opacity-60" : "cursor-pointer hover:bg-accent/40",
                  )}
                >
                  <CheckboxQuadrado
                    checked={selecionados.has(o.sub_id)}
                    disabled={bloqueado || salvando}
                    onCheckedChange={() => alternar(o.sub_id)}
                    aria-label={`Vincular ${o.sub_id}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-sm text-foreground">
                      {o.sub_id}
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {bloqueado
                        ? o.bloqueado_por
                        : `${o.pedidos} ${o.pedidos === 1 ? "pedido" : "pedidos"} · ${formatCurrency(o.comissao_liquida)}`}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        )}

        <Button
          className="w-full"
          onClick={() => void salvar()}
          disabled={salvando || !sujo || carregando}
        >
          {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar vínculos
        </Button>
      </div>
    </ResponsiveModal>
  );
};
