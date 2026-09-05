import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { mensagemAmigavel } from "@/services/http-error";
import {
  atualizarCampanha,
  type CampanhaGrupos,
} from "@/services/campanhas_grupos.service";
import { cn } from "@/shared/lib/utils";

/**
 * Ativa ↔ Pausada no cabeçalho da campanha.
 *
 * Saiu de Configurações porque era a decisão mais frequente enterrada numa
 * aba, enquanto o chip "Ativa" ficava no cabeçalho sendo só enfeite.
 *
 * **Duas posições, não três.** "Arquivada" é destino, não estado de operação:
 * some da listagem e mata o link público, então não pode estar a um clique de
 * distância no cabeçalho — ela vive no menu da listagem, com confirmação.
 *
 * O toggle salva na hora e faz rollback se o servidor recusar (desarquivar
 * pode tomar 403 por limite de plano). Sem o rollback, a tela ficaria
 * afirmando um estado que o banco não tem.
 */
export const StatusDaCampanhaToggle = ({
  campanha,
  onSalvo,
}: {
  campanha: CampanhaGrupos;
  onSalvo: (atualizada: CampanhaGrupos) => void;
}) => {
  const { toast } = useToast();
  const [salvando, setSalvando] = useState(false);

  const arquivada = campanha.status === "arquivada";
  const ativa = campanha.status === "ativa";

  const alternar = async (proximo: boolean) => {
    setSalvando(true);
    try {
      onSalvo(
        await atualizarCampanha(campanha.id, {
          status: proximo ? "ativa" : "pausada",
        }),
      );
      toast({
        title: proximo ? "Campanha ativa" : "Campanha pausada",
        description: proximo
          ? undefined
          : "O link para de receber e os roteiros não disparam.",
      });
    } catch (e) {
      // Rollback implícito: `onSalvo` não foi chamado, então `campanha` segue
      // com o valor do servidor e o Switch volta sozinho.
      toast({
        title: "Não foi possível mudar o status",
        description: mensagemAmigavel(e, "Tente novamente."),
        variant: "destructive",
      });
    } finally {
      setSalvando(false);
    }
  };

  if (arquivada) {
    // Arquivada não se desfaz daqui: desarquivar re-conta a vaga do plano e
    // pode tomar 403. O caminho é a listagem.
    return (
      <span className="text-xs text-muted-foreground">Arquivada</span>
    );
  }

  return (
    <label className="flex cursor-pointer items-center gap-2">
      {salvando ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : (
        <Switch
          checked={ativa}
          onCheckedChange={(v) => void alternar(v)}
          aria-label={ativa ? "Pausar campanha" : "Ativar campanha"}
        />
      )}
      <span
        className={cn(
          "text-sm font-medium",
          ativa ? "text-emerald-500" : "text-muted-foreground",
        )}
      >
        {ativa ? "Ativa" : "Pausada"}
      </span>
    </label>
  );
};
