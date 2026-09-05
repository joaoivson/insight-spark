import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/shared/lib/utils";
import { mensagemAmigavel } from "@/services/http-error";
import {
  atualizarCampanha,
  atualizarLinkDaCampanha,
  obterLinkDaCampanha,
  type CampanhaGrupos,
  type EstrategiaEntrada,
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
  estrategia_entrada: EstrategiaEntrada;
  abertura_automatica: boolean;
  reabertura_automatica: boolean;
  /** String para o input aceitar vazio (= sem limite próprio). */
  limite_participantes: string;
};

/** É o que o PATCH persiste — então é o que define "tem alteração não salva". */
const assinatura = (f: Form, linkAtivo: boolean | null) =>
  [f.estrategia_entrada, f.abertura_automatica ? 1 : 0,
   f.reabertura_automatica ? 1 : 0, f.limite_participantes.trim(),
   linkAtivo === null ? "?" : linkAtivo ? 1 : 0].join("|");

const doDetalhe = (c: CampanhaGrupos): Form => ({
  estrategia_entrada: c.estrategia_entrada,
  abertura_automatica: c.abertura_automatica,
  reabertura_automatica: c.reabertura_automatica,
  limite_participantes: c.limite_participantes ? String(c.limite_participantes) : "",
});

/**
 * Configurações da campanha — ABA, não mais botão solto no topo.
 *
 * Era o único elemento de navegação da campanha fora da barra de abas. Aqui
 * fica só o que muda COMPORTAMENTO: status, estratégia de entrada, limite de
 * participantes, aberturas e o link ativo. Nome, duplicar e excluir são ações
 * sobre a campanha e foram para a listagem; Descrição saiu da UI (§1.1).
 */
export const ConfiguracoesDaCampanha = ({
  campanha,
  onSalvo,
}: {
  campanha: CampanhaGrupos;
  onSalvo: (atualizada: CampanhaGrupos) => void;
}) => {
  const { toast } = useToast();
  const [form, setForm] = useState<Form>(() => doDetalhe(campanha));
  const [salvando, setSalvando] = useState(false);
  // "Link ativo" mora em `campanha_links`, não em `campanhas`: veio da aba
  // Link de entrada, onde era a única configuração de comportamento no meio de
  // campos de conteúdo. `null` enquanto carrega — o switch não pode piscar
  // "desligado" antes de saber o valor real.
  const [linkAtivo, setLinkAtivo] = useState<boolean | null>(null);
  const [baseline, setBaseline] = useState<string | null>(null);

  // Como aba, o componente fica montado e o formulário precisa acompanhar a
  // campanha (antes ele ressincronizava só quando o modal abria).
  useEffect(() => {
    setForm(doDetalhe(campanha));
  }, [campanha]);

  useEffect(() => {
    let ativo = true;
    obterLinkDaCampanha(campanha.id)
      .then((link) => {
        if (!ativo) return;
        setLinkAtivo(link.ativo);
        // A baseline só existe DEPOIS do link: antes dele `linkAtivo` é `null`
        // e a assinatura mudaria sozinha quando ele chegasse, acendendo o
        // "Salvar" sem ninguém ter mexido em nada.
        setBaseline(assinatura(doDetalhe(campanha), link.ativo));
      })
      .catch(() => {
        // Falha aqui não pode derrubar a aba inteira: o resto das
        // configurações continua editável, e o switch fica escondido.
      });
    return () => {
      ativo = false;
    };
  }, [campanha]);

  // Salvar só acende quando algo mudou. Era o elemento mais pesado da tela,
  // azul de ponta a ponta e sempre aceso — sem dizer se havia o que salvar.
  const sujo = baseline !== null && assinatura(form, linkAtivo) !== baseline;

  const limiteNum = Number(form.limite_participantes);
  const limiteInvalido =
    form.limite_participantes !== "" &&
    (!Number.isInteger(limiteNum) || limiteNum < 1 || limiteNum > CAPACIDADE_WHATSAPP);

  const salvar = async () => {
    if (limiteInvalido) return;
    setSalvando(true);
    try {
      // O link PRIMEIRO: são dois PATCHes num botão só, e se o segundo falhar
      // é melhor que a campanha ainda não tenha sido salva — assim "Salvar"
      // continua significando "nada foi gravado".
      if (linkAtivo !== null) {
        await atualizarLinkDaCampanha(campanha.id, { ativo: linkAtivo });
      }
      const atualizada = await atualizarCampanha(campanha.id, {
        estrategia_entrada: form.estrategia_entrada,
        abertura_automatica: form.abertura_automatica,
        reabertura_automatica: form.reabertura_automatica,
        // Vazio apaga o limite: volta a valer a capacidade do grupo.
        limite_participantes: form.limite_participantes === "" ? null : limiteNum,
      });
      onSalvo(atualizada);
      setBaseline(assinatura(form, linkAtivo));
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
    // Dois blocos com título: era uma pilha de controles soltos onde "Link de
    // entrada ativo" tinha o mesmo peso visual de "Reabertura automática" — e
    // eles não são equivalentes: o primeiro liga e desliga a captação.
    //
    // Status saiu daqui (05/09): virou toggle no cabeçalho, ao lado do nome,
    // porque é a decisão mais frequente e estava enterrada numa aba.
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-5 p-5">
          <p className="text-sm font-medium text-foreground">Distribuição de entrada</p>

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
              descricao="Distribui entre os grupos abertos, em ordem aleatória"
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
              className="w-24 tabular-nums"
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

        {/* Os dois rótulos sozinhos não explicavam nada — e aqui há
            consequência real: são regras de ROTEAMENTO de entrada. A descrição
            é escrita pelo que o backend FAZ, não pelo nome do campo: "reabrir"
            sugere reabrir grupo fechado, e o que acontece é o grupo voltar à
            rotação quando a lotação cai. */}
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <Label htmlFor="cfg-abertura">Abertura automática</Label>
              <p className="text-xs text-muted-foreground">
                Quando o grupo atual lota, o próximo da lista entra na rotação sozinho.
              </p>
            </div>
            <Switch
              id="cfg-abertura"
              className="mt-0.5 flex-shrink-0"
              checked={form.abertura_automatica}
              onCheckedChange={(v) => setForm({ ...form, abertura_automatica: v })}
            />
          </div>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <Label htmlFor="cfg-reabertura">Reabertura automática</Label>
              <p className="text-xs text-muted-foreground">
                Grupo que estava cheio e perdeu gente volta a receber entradas.
              </p>
            </div>
            <Switch
              id="cfg-reabertura"
              className="mt-0.5 flex-shrink-0"
              checked={form.reabertura_automatica}
              onCheckedChange={(v) => setForm({ ...form, reabertura_automatica: v })}
            />
          </div>

        </div>
        </CardContent>
      </Card>

      {linkAtivo !== null && (
        <Card>
          <CardContent className="space-y-4 p-5">
            <p className="text-sm font-medium text-foreground">Link de entrada</p>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <Label htmlFor="cfg-link-ativo">Link ativo</Label>
                <p className="text-xs text-muted-foreground">
                  Desligado, quem clicar no link vê que ele não está disponível — o
                  anúncio continua veiculando.
                </p>
              </div>
              <Switch
                id="cfg-link-ativo"
                className="mt-0.5 flex-shrink-0"
                checked={linkAtivo}
                onCheckedChange={setLinkAtivo}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-5">

        <div className="flex flex-wrap items-center justify-end gap-3">
          {sujo && <span className="text-xs text-amber-500">Alterações não salvas</span>}
          <Button
            onClick={() => void salvar()}
            disabled={salvando || limiteInvalido || !sujo}
          >
            {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
