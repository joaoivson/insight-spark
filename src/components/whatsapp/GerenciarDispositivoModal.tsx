import { useEffect, useState } from "react";
import { Link2, Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveModal } from "@/components/shared/ResponsiveModal";
import { useToast } from "@/hooks/use-toast";
import { useWhatsappConexoesStore } from "@/stores/whatsappConexoesStore";
import type { InstanciaConexao } from "@/services/whatsapp_conexoes.service";
import { formatDateTime } from "@/shared/lib/utils";

const MAX_NOME = 60;

type Props = {
  /** Aberto quando há um número alvo. */
  instancia: InstanciaConexao | null;
  totalDeGrupos: number;
  onOpenChange: (aberto: boolean) => void;
  onConectarPorLink: (instancia: InstanciaConexao) => void;
  onRemover: (instancia: InstanciaConexao) => void;
};

const Linha = ({ rotulo, valor }: { rotulo: string; valor: string }) => (
  <div className="flex items-baseline justify-between gap-3 py-1.5">
    <span className="text-sm text-muted-foreground">{rotulo}</span>
    <span className="text-sm text-foreground text-right tabular-nums">{valor}</span>
  </div>
);

export function GerenciarDispositivoModal({
  instancia,
  totalDeGrupos,
  onOpenChange,
  onConectarPorLink,
  onRemover,
}: Props) {
  const { toast } = useToast();
  const { renomear } = useWhatsappConexoesStore();
  const [nome, setNome] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    setNome(instancia?.nome_exibicao || "");
  }, [instancia]);

  const nomeLimpo = nome.trim();
  const mudou = !!instancia && nomeLimpo !== (instancia.nome_exibicao || "");

  const salvar = async () => {
    if (!instancia || !nomeLimpo) return;
    setSalvando(true);
    try {
      await renomear(instancia.id, nomeLimpo);
      toast({ title: "Nome atualizado" });
      onOpenChange(false);
    } catch (e) {
      toast({
        title: e instanceof Error ? e.message : "Não foi possível renomear o número.",
        variant: "destructive",
      });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <ResponsiveModal
      open={!!instancia}
      onOpenChange={onOpenChange}
      title="Gerenciar número"
    >
      <div className="space-y-5 pb-2">
        <div className="space-y-2">
          <Label htmlFor="nome-dispositivo">Nome</Label>
          <Input
            id="nome-dispositivo"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: Principal"
            maxLength={MAX_NOME}
          />
        </div>

        <div className="rounded-xl border border-border px-4 py-2 divide-y divide-border">
          <Linha rotulo="Número" valor={instancia?.numero_mascarado || "—"} />
          <Linha rotulo="Grupos" valor={String(totalDeGrupos)} />
          <Linha rotulo="Conectado em" valor={formatDateTime(instancia?.ultima_conexao_em ?? null)} />
          <Linha rotulo="Criado em" valor={formatDateTime(instancia?.criado_em ?? null)} />
        </div>

        {/* Número conectado não tem QR para mostrar: o link nasceria morto — a
            página abriria, veria a sessão conectada e se invalidaria na
            primeira consulta. */}
        {instancia && instancia.status !== "conectada" && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => onConectarPorLink(instancia)}
          >
            <Link2 className="h-4 w-4 mr-1.5" />
            Conectar por link
          </Button>
        )}

        {/* Destrutivo isolado à esquerda, longe do botão que ela mais aperta. */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <Button
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => instancia && onRemover(instancia)}
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            Remover
          </Button>
          <Button onClick={() => void salvar()} disabled={!mudou || !nomeLimpo || salvando}>
            {salvando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  );
}
