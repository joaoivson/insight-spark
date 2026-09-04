import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { ResponsiveModal } from "@/components/shared/ResponsiveModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/shared/lib/utils";
import { mensagemAmigavel } from "@/services/http-error";
import {
  atualizarCampanha,
  type CampanhaGrupos,
  type EstrategiaEntrada,
  type StatusCampanha,
} from "@/services/campanhas_grupos.service";

/** Capacidade máxima de um grupo de WhatsApp — teto absoluto do campo. */
const CAPACIDADE_WHATSAPP = 1024;

/** Opção de rádio como cartão clicável — mesmo padrão do AutomacaoEditor. */
const Opcao = ({
  titulo,
  descricao,
  ativo,
  onClick,
}: {
  titulo: string;
  descricao: string;
  ativo: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    role="radio"
    aria-checked={ativo}
    className={cn(
      "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors",
      ativo ? "border-primary bg-primary/5" : "border-border hover:bg-accent/40",
    )}
  >
    <span
      className={cn(
        "mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border-2",
        ativo ? "border-primary" : "border-muted-foreground/40",
      )}
    >
      {ativo && <span className="h-2 w-2 rounded-full bg-primary" />}
    </span>
    <span className="min-w-0">
      <span className="block text-sm font-medium text-foreground">{titulo}</span>
      <span className="block text-xs text-muted-foreground">{descricao}</span>
    </span>
  </button>
);

type Form = {
  nome: string;
  status: StatusCampanha;
  estrategia_entrada: EstrategiaEntrada;
  abertura_automatica: boolean;
  reabertura_automatica: boolean;
  /** String para o input aceitar vazio (= sem limite próprio). */
  limite_participantes: string;
};

const doDetalhe = (c: CampanhaGrupos): Form => ({
  nome: c.nome,
  status: c.status,
  estrategia_entrada: c.estrategia_entrada,
  abertura_automatica: c.abertura_automatica,
  reabertura_automatica: c.reabertura_automatica,
  limite_participantes: c.limite_participantes ? String(c.limite_participantes) : "",
});

/**
 * Configurações da campanha (spec §1.2).
 *
 * Recebeu o formulário que saía da Visão geral — que virou painel de leitura —
 * mais o limite de participantes (§3.4). Sem Descrição: ela saiu da UI (§1.1).
 */
export const ConfiguracoesDaCampanha = ({
  open,
  onOpenChange,
  campanha,
  onSalvo,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  campanha: CampanhaGrupos;
  onSalvo: (atualizada: CampanhaGrupos) => void;
}) => {
  const { toast } = useToast();
  const [form, setForm] = useState<Form>(() => doDetalhe(campanha));
  const [salvando, setSalvando] = useState(false);

  // Reabrir depois de salvar noutro lugar (ou trocar de campanha) não pode
  // mostrar o estado velho do formulário.
  useEffect(() => {
    if (open) setForm(doDetalhe(campanha));
  }, [open, campanha]);

  const limiteNum = Number(form.limite_participantes);
  const limiteInvalido =
    form.limite_participantes !== "" &&
    (!Number.isInteger(limiteNum) || limiteNum < 1 || limiteNum > CAPACIDADE_WHATSAPP);

  const salvar = async () => {
    if (!form.nome.trim() || limiteInvalido) return;
    setSalvando(true);
    try {
      const atualizada = await atualizarCampanha(campanha.id, {
        nome: form.nome.trim(),
        status: form.status,
        estrategia_entrada: form.estrategia_entrada,
        abertura_automatica: form.abertura_automatica,
        reabertura_automatica: form.reabertura_automatica,
        // Vazio apaga o limite: volta a valer a capacidade do grupo.
        limite_participantes: form.limite_participantes === "" ? null : limiteNum,
      });
      onSalvo(atualizada);
      onOpenChange(false);
      toast({ title: "Configurações salvas" });
    } catch (e) {
      toast({
        title: "Não foi possível salvar",
        description: mensagemAmigavel(e, "Tente novamente."),
        variant: "destructive",
      });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange} title="Configurações">
      <div className="space-y-5 pb-2">
        <div className="space-y-2">
          <Label htmlFor="cfg-nome">Nome</Label>
          <Input
            id="cfg-nome"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            maxLength={120}
          />
        </div>

        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={form.status}
            onValueChange={(v) => setForm({ ...form, status: v as StatusCampanha })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ativa">Ativa</SelectItem>
              <SelectItem value="pausada">Pausada</SelectItem>
              <SelectItem value="arquivada">Arquivada</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2" role="radiogroup" aria-label="Estratégia de entrada">
          <Label>Estratégia de entrada</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            <Opcao
              titulo="Sequencial"
              descricao="Enche o grupo 1; ao lotar, passa ao 2"
              ativo={form.estrategia_entrada === "sequencial"}
              onClick={() => setForm({ ...form, estrategia_entrada: "sequencial" })}
            />
            <Opcao
              titulo="Aleatória"
              descricao="Distribui entre os grupos abertos — compara conversão"
              ativo={form.estrategia_entrada === "aleatoria"}
              onClick={() => setForm({ ...form, estrategia_entrada: "aleatoria" })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cfg-limite">Encher os grupos até</Label>
          <div className="flex items-center gap-2">
            <Input
              id="cfg-limite"
              type="number"
              inputMode="numeric"
              min={1}
              max={CAPACIDADE_WHATSAPP}
              value={form.limite_participantes}
              onChange={(e) =>
                setForm({ ...form, limite_participantes: e.target.value })
              }
              placeholder={String(CAPACIDADE_WHATSAPP)}
              className="w-32 tabular-nums"
            />
            <span className="text-sm text-muted-foreground">participantes</span>
          </div>
          {limiteInvalido ? (
            <p className="text-xs text-destructive">
              Informe um número entre 1 e {CAPACIDADE_WHATSAPP}.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Ao atingir esse número, o grupo sai da rotação de entrada. Vazio usa a
              capacidade do WhatsApp ({CAPACIDADE_WHATSAPP}).
            </p>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="cfg-abertura">Abertura automática</Label>
            <Switch
              id="cfg-abertura"
              checked={form.abertura_automatica}
              onCheckedChange={(v) => setForm({ ...form, abertura_automatica: v })}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="cfg-reabertura">Reabertura automática</Label>
            <Switch
              id="cfg-reabertura"
              checked={form.reabertura_automatica}
              onCheckedChange={(v) => setForm({ ...form, reabertura_automatica: v })}
            />
          </div>
        </div>

        <Button
          className="w-full"
          onClick={() => void salvar()}
          disabled={salvando || !form.nome.trim() || limiteInvalido}
        >
          {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar
        </Button>
      </div>
    </ResponsiveModal>
  );
};
