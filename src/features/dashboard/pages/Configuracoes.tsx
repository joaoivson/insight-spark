import { useEffect, useState, type ComponentType } from "react";
import {
  Facebook,
  Instagram,
  Receipt,
  Save,
  Loader2,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Store,
} from "lucide-react";
import { WhatsAppLogo } from "@/components/shared/BrandIcons";
import { Link, useSearchParams } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/shared/lib/utils";
import { SecaoCard } from "@/components/shared/SecaoCard";
import { FacebookIntegrationSettings } from "@/features/dashboard/components/FacebookIntegrationSettings";
import { MarketplacesSection } from "@/features/dashboard/components/MarketplacesSection";
import { InstagramConnectionSettings } from "@/features/dashboard/components/InstagramConnectionSettings";
import { NumerosSection } from "@/components/whatsapp/NumerosSection";
import { EnvioSection } from "@/components/whatsapp/EnvioSection";
import { useTaxSettingsStore } from "@/stores/taxSettingsStore";
import { MODULO_GRUPOS_WHATSAPP, usePlanStore } from "@/stores/planStore";
import { isUnlimited } from "@/shared/lib/plans";
import { useIsMobile } from "@/shared/hooks/use-mobile";

// Sub-navegação vertical agrupada:
// Conta · Integrações (Marketplaces/Facebook/Instagram/WhatsApp) ·
// Operação (Parâmetros) · Cálculos (Impostos).
//
// "Envio" saiu de dentro do WhatsApp e virou **Parâmetros**, em Operação:
// janela de envio não é configuração de canal — vale para a operação inteira,
// e como aba de WhatsApp ela ficava invisível para quem entra por Campanhas.
// Com isso o WhatsApp fica só com Números, sem abas internas.
// "Dispositivos" e "Canais" não existem mais; Bloqueios e Resumo diário foram
// removidos do produto.
type SecaoId =
  | "marketplaces"
  | "facebook"
  | "instagram"
  | "whatsapp"
  | "parametros"
  | "impostos"
  | "assinatura";

// Aliases de deep-link: as abas antigas (?tab=shopee|canais|numeros|envio|...)
// continuam abrindo o lugar certo. A seção deriva da URL (não de useState):
// navegação interna com ?tab=... ressincroniza sozinha e o Back do celular
// volta à lista.
const resolveSecao = (params: URLSearchParams, moduloGrupos: boolean): SecaoId | null => {
  const t = params.get("tab");
  // Retorno do OAuth do Facebook (?code/?error) cai na seção Facebook Ads —
  // mas só enquanto não houver `?tab=` explícito. O componente do Facebook
  // limpa a URL com history.replaceState, que NÃO avisa o React Router: o
  // `code` continua nos searchParams em memória, e dar precedência a ele
  // travava a navegação lateral em "Facebook Ads" para o resto da visita.
  if (!t && (params.get("code") || params.get("error"))) return "facebook";
  if (t === "shopee" || t === "marketplaces") return "marketplaces";
  if (t === "facebook" || t === "canais") return "facebook";
  if (t === "instagram") return "instagram";
  // "Envio" era aba do WhatsApp e virou a seção Parâmetros — o deep-link
  // antigo tem que cair no lugar novo, não no WhatsApp sem abas.
  if (t === "envio" || t === "parametros") {
    return moduloGrupos ? "parametros" : null;
  }
  // Abas antigas de Dispositivos apontam todas para WhatsApp (gate do módulo
  // preservado — sem ele liberado a seção não existe).
  if (
    t === "whatsapp" ||
    t === "numeros" ||
    t === "bloqueios" ||
    t === "blacklist" ||
    t === "resumo"
  ) {
    return moduloGrupos ? "whatsapp" : null;
  }
  if (t === "impostos") return "impostos";
  if (t === "assinatura") return "assinatura";
  return null;
};

// Ícones de marca (WhatsAppLogo) não são LucideIcon — o tipo aceita qualquer
// componente que receba className.
type SecaoIcon = ComponentType<{ className?: string }>;
type Secao = { id: SecaoId; label: string; icon: SecaoIcon };
type Grupo = { label: string; secoes: Secao[] };

const GRUPOS: Grupo[] = [
  { label: "Conta", secoes: [{ id: "assinatura", label: "Assinatura", icon: CreditCard }] },
  {
    label: "Integrações",
    secoes: [
      { id: "marketplaces", label: "Marketplaces", icon: Store },
      { id: "facebook", label: "Facebook Ads", icon: Facebook },
      { id: "instagram", label: "Instagram", icon: Instagram },
      { id: "whatsapp", label: "WhatsApp", icon: WhatsAppLogo },
    ],
  },
  {
    label: "Operação",
    secoes: [{ id: "parametros", label: "Parâmetros", icon: SlidersHorizontal }],
  },
  { label: "Cálculos", secoes: [{ id: "impostos", label: "Impostos", icon: Receipt }] },
];

const Configuracoes = () => {
  const isMobile = useIsMobile();
  // Módulo de disparo em grupo: governa WhatsApp E Operação › Parâmetros
  // (Parâmetros só existe por causa do envio em grupo). Flag do backend, não
  // hostname — o gate por host era build-time e travava liberar em beta.
  const { moduloLiberado, fetch: fetchPlan } = usePlanStore();
  const showGrupos = moduloLiberado(MODULO_GRUPOS_WHATSAPP);
  // Instagram liberado em produção em 01/09/2026 (App Review aprovado +
  // migrations 052-056 aplicadas). O gate segue só no módulo de grupos.
  const showInstagram = true;

  useEffect(() => {
    void fetchPlan();
  }, [fetchPlan]);

  // null = lista (mobile). No desktop, null vira "marketplaces".
  const [searchParams, setSearchParams] = useSearchParams();
  const secao = resolveSecao(searchParams, showGrupos);

  // Push no mobile (Back volta pra lista); replace no desktop (Back sai da
  // página, como as Tabs antigas).
  const selecionar = (id: SecaoId) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", id);
    // O code/error do OAuth já foi consumido pelo componente do Facebook;
    // carregá-lo adiante só faz a URL mentir sobre o que a tela está fazendo.
    next.delete("code");
    next.delete("error");
    setSearchParams(next, { replace: !isMobile });
  };

  const voltarParaLista = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("tab");
    next.delete("code");
    next.delete("error");
    setSearchParams(next);
  };

  // Grupo que fica sem seção nenhuma some inteiro — cabeçalho "OPERAÇÃO"
  // sozinho, sem item embaixo, é ruído.
  const grupos = (showGrupos
    ? GRUPOS
    : GRUPOS.map((g) => ({
        ...g,
        secoes: g.secoes.filter((s) => s.id !== "whatsapp" && s.id !== "parametros"),
      }))
  ).filter((g) => g.secoes.length > 0);

  const ativa: SecaoId = secao ?? "marketplaces";

  const conteudo = (
    <div className="space-y-4 min-w-0">
      {ativa === "marketplaces" && <MarketplacesSection />}
      {ativa === "facebook" && <FacebookSecao />}
      {ativa === "instagram" && showInstagram && <InstagramSecao />}
      {ativa === "whatsapp" && showGrupos && <WhatsappSecao />}
      {ativa === "parametros" && showGrupos && <ParametrosSecao />}
      {ativa === "impostos" && <TaxSettingsCard />}
      {ativa === "assinatura" && <AssinaturaCard />}
    </div>
  );

  // Mobile: lista agrupada → subtela com voltar.
  if (isMobile) {
    if (secao === null) {
      return (
        <DashboardLayout title="Configurações">
          <div className="space-y-5">
            {grupos.map((grupo) => (
              <div key={grupo.label}>
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 px-1">
                  {grupo.label}
                </p>
                <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
                  {grupo.secoes.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => selecionar(s.id)}
                      className="flex w-full items-center gap-3 px-4 py-3.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                    >
                      <s.icon className="w-4 h-4 text-muted-foreground" aria-hidden />
                      <span className="flex-1 text-left">{s.label}</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" aria-hidden />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DashboardLayout>
      );
    }
    return (
      <DashboardLayout title="Configurações">
        <button
          type="button"
          onClick={voltarParaLista}
          className="mb-4 flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="w-4 h-4" aria-hidden />
          Configurações
        </button>
        {conteudo}
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Configurações">
      <div className="grid md:grid-cols-[200px_1fr] gap-6 max-w-5xl">
        <nav aria-label="Seções de configurações" className="md:sticky md:top-4 md:self-start">
          <div className="space-y-4">
            {grupos.map((grupo) => (
              <div key={grupo.label}>
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 px-3">
                  {grupo.label}
                </p>
                <ul className="flex flex-col gap-0.5" role="list">
                  {grupo.secoes.map((s) => {
                    const isActive = ativa === s.id;
                    return (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => selecionar(s.id)}
                          aria-current={isActive ? "true" : undefined}
                          className={cn(
                            "flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors border-l-[3px] border-l-transparent",
                            isActive
                              ? "bg-[rgba(49,140,233,0.12)] border-l-[#318CE9] text-[#7CB8F2]"
                              : "text-muted-foreground hover:text-foreground hover:bg-accent"
                          )}
                        >
                          <s.icon
                            className={cn("w-4 h-4 flex-shrink-0", isActive && "text-[#318CE9]")}
                            aria-hidden
                          />
                          {s.label}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </nav>
        {conteudo}
      </div>
    </DashboardLayout>
  );
};

const FacebookSecao = () => (
  <SecaoCard
    icon={<Facebook className="w-5 h-5 text-blue-500" />}
    iconBoxClassName="bg-blue-500/10"
    title="Facebook Ads"
    description="Traz o gasto dos seus anúncios pra dentro do MarketDash."
  >
    <FacebookIntegrationSettings />
  </SecaoCard>
);

const InstagramSecao = () => (
  <SecaoCard
    icon={<Instagram className="w-5 h-5 text-pink-500" />}
    iconBoxClassName="bg-pink-500/10"
    title="Instagram"
    description="Responde comentários no direct automaticamente."
  >
    <InstagramConnectionSettings />
  </SecaoCard>
);

// WhatsApp fica SÓ com Números: uma aba solitária ("Números") não é
// navegação, é decoração. "Envio" virou Operação › Parâmetros.
const WhatsappSecao = () => <NumerosSection />;

// Operação › Parâmetros — nasce com um bloco só (Janela de envio). Bloco vazio
// de "o que ainda vem" não entra: a tela ficaria prometendo o que não faz.
const ParametrosSecao = () => (
  <SecaoCard
    icon={<SlidersHorizontal className="w-5 h-5 text-cyan-500" />}
    iconBoxClassName="bg-cyan-500/10"
    title="Janela de envio"
    description="Vale para a operação inteira. Cada campanha pode ser mais restritiva, nunca mais ampla."
  >
    <EnvioSection />
  </SecaoCard>
);

// "Grupos ativos" NÃO entra: o Max vai ter teto, ele só não foi definido
// ainda. Publicar "Ilimitado" agora vira promessa que a gente teria de tirar
// depois — a linha volta junto com o número.
const USO_ROTULOS: { chave: string; rotulo: string }[] = [
  { chave: "links", rotulo: "Links rastreáveis" },
  { chave: "paginas_captura", rotulo: "Páginas de captura" },
  { chave: "whatsapp_numeros", rotulo: "Números" },
];

function AssinaturaCard() {
  const { context, fetch, loading } = usePlanStore();

  useEffect(() => {
    void fetch({ force: true });
  }, [fetch]);

  if (loading && !context) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-8">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
      </div>
    );
  }

  const vence = context?.assinatura_vence_em
    ? new Date(context.assinatura_vence_em).toLocaleDateString("pt-BR")
    : "—";

  const uso = context?.uso;
  const limites = context?.limites as Record<string, number> | undefined;
  const usoChave = (chave: string): number | undefined =>
    uso ? (uso as Record<string, number | undefined>)[chave] : undefined;

  return (
    <SecaoCard
      icon={<CreditCard className="w-5 h-5 text-primary" />}
      iconBoxClassName="bg-primary/10"
      title="Sua assinatura"
    >
      <div className="space-y-4">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Plano</dt>
            <dd className="font-medium">{context?.plano_label || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Período</dt>
            <dd className="font-medium capitalize">{context?.periodo || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Status</dt>
            <dd className="font-medium capitalize">{context?.assinatura_status || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Vence em</dt>
            <dd className="font-medium">{vence}</dd>
          </div>
        </dl>

        {uso && limites && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Uso do plano</p>
            <dl className="divide-y divide-border rounded-lg border border-border">
              {USO_ROTULOS.map((r) => {
                const limite = limites[r.chave];
                const consumo = usoChave(r.chave);
                if (limite === undefined) return null;
                // Sentinelas: -1 = ilimitado; 0 = o plano não tem o recurso
                // (mostra "—", nunca "0/0").
                //
                // Ilimitado exibe SÓ "Ilimitado": o "1 · Ilimitado" de antes
                // juntava consumo e teto num par que não significa nada — sem
                // teto, o consumo não mede coisa nenhuma.
                const valor =
                  limite === 0
                    ? "—"
                    : isUnlimited(limite)
                      ? "Ilimitado"
                      : `${consumo ?? 0}/${limite}`;
                return (
                  <div key={r.chave} className="flex items-center justify-between px-3 py-1.5 text-sm">
                    <dt className="text-muted-foreground">{r.rotulo}</dt>
                    <dd className="font-medium tabular-nums">{valor}</dd>
                  </div>
                );
              })}
            </dl>
          </div>
        )}

        <Button asChild variant="outline" size="sm">
          <Link to="/dashboard/planos">Ver planos</Link>
        </Button>
      </div>
    </SecaoCard>
  );
}

const TaxSettingsCard = () => {
  const { toast } = useToast();
  const adTaxRate = useTaxSettingsStore((s) => s.adTaxRate);
  const commissionTaxRate = useTaxSettingsStore((s) => s.commissionTaxRate);
  const loaded = useTaxSettingsStore((s) => s.loaded);
  const fetchTax = useTaxSettingsStore((s) => s.fetch);
  const saveTax = useTaxSettingsStore((s) => s.save);

  const [adRate, setAdRate] = useState("0");
  const [commRate, setCommRate] = useState("0");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTax().finally(() => setLoading(false));
  }, [fetchTax]);

  // Sincroniza os inputs quando as alíquotas chegam do backend
  useEffect(() => {
    if (loaded) {
      setAdRate(String(adTaxRate ?? 0));
      setCommRate(String(commissionTaxRate ?? 0));
    }
  }, [loaded, adTaxRate, commissionTaxRate]);

  const handleSave = async () => {
    const ad = parseFloat(adRate.replace(",", "."));
    const comm = parseFloat(commRate.replace(",", "."));
    if (isNaN(ad) || isNaN(comm) || ad < 0 || comm < 0) {
      toast({ title: "Informe alíquotas válidas", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await saveTax(ad, comm);
      toast({ title: "Impostos salvos", description: "Lucro e ROAS recalculam automaticamente em todos os dashboards." });
    } catch (e) {
      toast({ title: "Erro ao salvar", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SecaoCard
      icon={<Receipt className="w-5 h-5 text-purple-500" />}
      iconBoxClassName="bg-purple-500/10"
      title="Impostos"
      description="Aplicados no cálculo dos dashboards. O valor lançado em Custos de Anúncios continua sendo o que você pagou."
    >
      {loading ? (
        <div className="flex items-center text-muted-foreground py-6">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando…
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ad-rate">Imposto sobre anúncios — markup Meta (%)</Label>
              <Input id="ad-rate" type="number" min="0" step="0.01" value={adRate} onChange={(e) => setAdRate(e.target.value)} />
              <p className="text-xs text-muted-foreground">Gasto com imposto = gasto pago × (1 + %). Ex.: 17,65.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="comm-rate">Imposto sobre comissão (%)</Label>
              <Input id="comm-rate" type="number" min="0" step="0.01" value={commRate} onChange={(e) => setCommRate(e.target.value)} />
              <p className="text-xs text-muted-foreground">Comissão líquida = comissão × (1 − %). Ex.: 6.</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar
            </Button>
          </div>
        </div>
      )}
    </SecaoCard>
  );
};

export default Configuracoes;
