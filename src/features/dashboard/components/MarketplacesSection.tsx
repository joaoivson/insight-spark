import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2, Plus, ShoppingBag, Store, Trash2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { ResponsiveModal } from "@/components/shared/ResponsiveModal";
import { ShopeeIntegrationSettings } from "@/features/dashboard/components/ShopeeIntegrationSettings";
import { useToast } from "@/hooks/use-toast";
import {
  alternarIntegracao,
  criarIntegracao,
  listarIntegracoes,
  removerIntegracao,
  type Integracao,
  type ProvedorMarketplace,
} from "@/services/ofertas.service";

/** Só marketplace com API de afiliado assinada entra habilitado (espelha PROVEDORES do backend). */
const MARKETPLACES: { valor: string; rotulo: string; disponivel: boolean }[] = [
  { valor: "shopee", rotulo: "Shopee", disponivel: true },
  { valor: "mercado_livre", rotulo: "Mercado Livre", disponivel: false },
  { valor: "amazon", rotulo: "Amazon", disponivel: false },
  { valor: "magalu", rotulo: "Magalu", disponivel: false },
];

const rotuloProvedor = (provedor: string) =>
  MARKETPLACES.find((m) => m.valor === provedor)?.rotulo ?? provedor;

const schema = z.object({
  label: z
    .string()
    .trim()
    .max(64, "No máximo 64 caracteres")
    .optional(),
  app_id: z
    .string()
    .trim()
    .min(1, "App ID é obrigatório")
    .regex(/^\d+$/, "Use o App ID numérico da Shopee (ex.: 18191340007), não o e-mail."),
  senha: z.string().min(1, "Senha é obrigatória"),
});

type FormData = z.infer<typeof schema>;

export const MarketplacesSection = () => {
  const { toast } = useToast();

  const [contas, setContas] = useState<Integracao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [alternando, setAlternando] = useState<number | null>(null);
  const [paraRemover, setParaRemover] = useState<Integracao | null>(null);
  const [removendo, setRemovendo] = useState(false);

  const [modalAberto, setModalAberto] = useState(false);
  const [provedor, setProvedor] = useState<ProvedorMarketplace>("shopee");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setContas(await listarIntegracoes());
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const abrirModal = (aberto: boolean) => {
    setModalAberto(aberto);
    if (!aberto) {
      reset();
      setMostrarSenha(false);
      setProvedor("shopee");
    }
  };

  /** "principal" na primeira conta; "conta 2", "conta 3"… nas seguintes. */
  const sugestaoDeLabel = () => {
    const doProvedor = contas.filter((c) => c.provedor === provedor);
    if (doProvedor.length === 0) return "principal";
    let n = doProvedor.length + 1;
    const nomes = new Set(doProvedor.map((c) => c.label.toLowerCase()));
    while (nomes.has(`conta ${n}`)) n += 1;
    return `conta ${n}`;
  };

  const onSubmit = async (data: FormData) => {
    setSalvando(true);
    try {
      const label = data.label?.trim() || sugestaoDeLabel();
      const jaExiste = contas.some(
        (c) => c.provedor === provedor && c.label.toLowerCase() === label.toLowerCase()
      );
      if (jaExiste) {
        // O backend faz upsert por (usuária, marketplace, nome): salvar com um
        // nome que já existe TROCA a credencial daquela conta, sem avisar.
        const trocar = window.confirm(
          `Já existe uma conta ${rotuloProvedor(provedor)} chamada "${label}". ` +
          "Salvar vai substituir as credenciais dela. Continuar?"
        );
        if (!trocar) {
          setSalvando(false);
          return;
        }
      }
      const nova = await criarIntegracao({
        provedor,
        label,
        app_id: data.app_id.trim(),
        senha: data.senha,
      });
      setContas((atual) => {
        const semDuplicada = atual.filter((c) => c.id !== nova.id);
        return [...semDuplicada, nova];
      });
      abrirModal(false);
      toast({ title: "Conta conectada", description: `${rotuloProvedor(nova.provedor)} · ${nova.label}` });
    } catch (e) {
      toast({
        title: "Não foi possível salvar",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setSalvando(false);
    }
  };

  const alternar = async (conta: Integracao, ativa: boolean) => {
    setAlternando(conta.id);
    try {
      const atualizada = await alternarIntegracao(conta.id, ativa);
      setContas((atual) => atual.map((c) => (c.id === atualizada.id ? atualizada : c)));
    } catch (e) {
      toast({
        title: "Não foi possível alterar a conta",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setAlternando(null);
    }
  };

  const remover = async () => {
    if (!paraRemover) return;
    setRemovendo(true);
    try {
      await removerIntegracao(paraRemover.id);
      setContas((atual) => atual.filter((c) => c.id !== paraRemover.id));
      toast({ title: "Conta removida" });
      setParaRemover(null);
    } catch (e) {
      toast({
        title: "Não foi possível remover",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setRemovendo(false);
    }
  };

  return (
    <>
      <div className="bg-card border border-border rounded-2xl p-5 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-5">
          <div className="flex items-start gap-3 md:gap-4 min-w-0">
            <div className="w-11 h-11 md:w-12 md:h-12 rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0">
              <Store className="w-6 h-6 text-orange-500" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-foreground">Contas de marketplace</h3>
              <p className="text-sm text-muted-foreground">
                A busca de ofertas e a conversão de links assinam com a <strong>sua</strong>{" "}
                credencial — é ela que garante a comissão na sua conta.
              </p>
            </div>
          </div>
          <Button className="min-h-10 w-full sm:w-auto flex-shrink-0" onClick={() => abrirModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar conta
          </Button>
        </div>

        {carregando ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : erro ? (
          <div className="rounded-xl border border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Não conseguimos carregar suas contas agora.
            </p>
            <Button variant="outline" className="mt-3 min-h-10" onClick={() => void carregar()}>
              Tentar de novo
            </Button>
          </div>
        ) : contas.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center">
            <ShoppingBag className="mx-auto h-7 w-7 text-muted-foreground" aria-hidden />
            <p className="mt-2 text-sm text-muted-foreground">
              Nenhuma conta conectada. Adicione a sua conta Shopee para buscar ofertas.
            </p>
            <Button variant="outline" className="mt-3 min-h-10" onClick={() => abrirModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar conta
            </Button>
          </div>
        ) : (
          <ul className="space-y-3" role="list">
            {contas.map((conta) => (
              <li
                key={conta.id}
                className="flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-4 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">
                      {rotuloProvedor(conta.provedor)}
                    </span>
                    <Badge variant="secondary">{conta.label}</Badge>
                    {!conta.ativa && (
                      <Badge variant="outline" className="text-muted-foreground">
                        inativa
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    App ID <span className="font-mono text-foreground">{conta.app_id_mascarado}</span>
                  </p>
                </div>

                <div className="flex items-center gap-4 sm:gap-3 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    {alternando === conta.id && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    )}
                    <Switch
                      checked={conta.ativa}
                      disabled={alternando === conta.id}
                      onCheckedChange={(v) => void alternar(conta, v)}
                      aria-label={`${conta.ativa ? "Desativar" : "Ativar"} a conta ${conta.label}`}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    className="min-h-10 w-10 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setParaRemover(conta)}
                    aria-label={`Remover a conta ${conta.label}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Sincronização de comissões continua aqui: é a tela que tem o status da
          última sync e o "Sincronizar agora". A credencial acima e a de baixo
          apontam para a mesma conta Shopee — o backend grava nas duas durante a
          migração de tabelas. */}
      <div className="bg-card border border-border rounded-2xl p-5 md:p-6">
        <div className="flex items-start gap-3 md:gap-4 mb-5">
          <div className="w-11 h-11 md:w-12 md:h-12 rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0">
            <ShoppingBag className="w-6 h-6 text-orange-500" />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-foreground">Shopee Afiliados — sincronização</h3>
            <p className="text-sm text-muted-foreground">
              Sincroniza automaticamente suas <strong>comissões</strong> de hora em hora (últimos 7
              dias) e um reconcile completo na madrugada. Dados de cliques devem ser importados via
              Upload Cliques.
            </p>
          </div>
        </div>
        <ShopeeIntegrationSettings />
      </div>

      {/* Adicionar conta */}
      <ResponsiveModal
        open={modalAberto}
        onOpenChange={abrirModal}
        title="Adicionar conta"
        description="As credenciais ficam cifradas e só são usadas para assinar suas próprias buscas e links."
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pb-2">
          <div className="space-y-2">
            <Label htmlFor="marketplace">Marketplace</Label>
            <Select value={provedor} onValueChange={(v) => setProvedor(v as ProvedorMarketplace)}>
              <SelectTrigger id="marketplace">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MARKETPLACES.map((m) => (
                  <SelectItem key={m.valor} value={m.valor} disabled={!m.disponivel}>
                    {m.rotulo}
                    {!m.disponivel && " · em breve"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="conta-label">Nome da conta</Label>
            <Input
              id="conta-label"
              placeholder={sugestaoDeLabel()}
              maxLength={64}
              {...register("label")}
            />
            <p className="text-xs text-muted-foreground">
              É por esse nome que você escolhe a conta quando tem mais de uma.
            </p>
            {errors.label && <p className="text-sm text-destructive">{errors.label.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="conta-app-id">App ID</Label>
            <Input
              id="conta-app-id"
              inputMode="numeric"
              placeholder="Ex.: 18191340007"
              {...register("app_id")}
            />
            {errors.app_id && <p className="text-sm text-destructive">{errors.app_id.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="conta-senha">Senha / Secret</Label>
            <div className="relative">
              <Input
                id="conta-senha"
                type={mostrarSenha ? "text" : "password"}
                placeholder="Senha da API"
                className="pr-10"
                {...register("senha")}
              />
              <button
                type="button"
                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                onClick={() => setMostrarSenha((v) => !v)}
                aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
              >
                {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.senha && <p className="text-sm text-destructive">{errors.senha.message}</p>}
          </div>

          <Button type="submit" className="w-full min-h-10" disabled={salvando}>
            {salvando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar conta
          </Button>
        </form>
      </ResponsiveModal>

      <AlertDialog open={paraRemover !== null} onOpenChange={(o) => !o && setParaRemover(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover a conta {paraRemover?.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              As credenciais salvas são apagadas. Buscas e conversões de link que dependem dessa
              conta param de funcionar até você conectar de novo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removendo}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={removendo}
              onClick={(e) => {
                e.preventDefault();
                if (removendo) return;
                void remover();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removendo && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
