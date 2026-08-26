import { useEffect, useState } from "react";
import {
  ShoppingBag,
  Facebook,
  Instagram,
  Receipt,
  Save,
  Loader2,
  CreditCard,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Store,
  Megaphone,
  Smartphone,
  Clock,
  type LucideIcon,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/shared/lib/utils";
import { ShopeeIntegrationSettings } from "@/features/dashboard/components/ShopeeIntegrationSettings";
import { FacebookIntegrationSettings } from "@/features/dashboard/components/FacebookIntegrationSettings";
import { InstagramConnectionSettings } from "@/features/dashboard/components/InstagramConnectionSettings";
import { WhatsappResumoSettings } from "@/features/dashboard/components/WhatsappResumoSettings";
import { NumerosSection } from "@/components/whatsapp/NumerosSection";
import { EnvioSection } from "@/components/whatsapp/EnvioSection";
import { useTaxSettingsStore } from "@/stores/taxSettingsStore";
import { usePlanStore } from "@/stores/planStore";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { isProductionHost } from "@/core/config/api.config";

// Sub-navegação vertical agrupada (spec Grupos §3.3). Seções de features que
// ainda não existem simplesmente não aparecem — nada de "em breve".
type SecaoId =
  | "marketplaces"
  | "canais"
  | "numeros"
  | "envio"
  | "resumo"
  | "impostos"
  | "assinatura";

// Aliases de deep-link: as abas antigas (?tab=shopee|facebook|...) continuam
// abrindo o lugar certo. A seção deriva da URL (não de useState): navegação
// interna com ?tab=... ressincroniza sozinha e o Back do celular volta à lista.
const resolveSecao = (params: URLSearchParams): SecaoId | null => {
  // Retorno do OAuth do Facebook (?code/?error) cai em Canais.
  if (params.get("code") || params.get("error")) return "canais";
  const t = params.get("tab");
  if (t === "shopee" || t === "marketplaces") return "marketplaces";
  // ?tab=instagram abre Canais em qualquer ambiente; quem esconde o card do
  // Instagram em produção é o `showInstagram` dentro de CanaisSecao — se essa
  // guarda sair de lá, o resolver NÃO segura o vazamento sozinho.
  if (t === "facebook" || t === "canais" || t === "instagram") return "canais";
  if (t === "numeros") return isProductionHost() ? null : "numeros";
  if (t === "envio") return isProductionHost() ? null : "envio";
  if (t === "whatsapp" || t === "resumo") return isProductionHost() ? null : "resumo";
  if (t === "impostos") return "impostos";
  if (t === "assinatura") return "assinatura";
  return null;
};

type Secao = { id: SecaoId; label: string; icon: LucideIcon };
type Grupo = { label: string; secoes: Secao[] };

const GRUPOS: Grupo[] = [
  { label: "Conta", secoes: [{ id: "assinatura", label: "Assinatura", icon: CreditCard }] },
  {
    label: "Integrações",
    secoes: [
      { id: "marketplaces", label: "Marketplaces", icon: Store },
      { id: "canais", label: "Canais", icon: Megaphone },
    ],
  },
  {
    label: "WhatsApp",
    secoes: [
      { id: "numeros", label: "Números", icon: Smartphone },
      { id: "envio", label: "Envio", icon: Clock },
      { id: "resumo", label: "Resumo diário", icon: MessageCircle },
    ],
  },
  { label: "Cálculos", secoes: [{ id: "impostos", label: "Impostos", icon: Receipt }] },
];

const Configuracoes = () => {
  const isMobile = useIsMobile();
  const showWhatsapp = !isProductionHost();
  // Automação Instagram depende do App Review da Meta e das migrations 049-056,
  // que não estão em produção — a seção fica só em homologação até isso fechar.
  const showInstagram = !isProductionHost();

  // null = lista (mobile). No desktop, null vira "marketplaces".
  const [searchParams, setSearchParams] = useSearchParams();
  const secao = resolveSecao(searchParams);

  // Push no mobile (Back volta pra lista); replace no desktop (Back sai da
  // página, como as Tabs antigas).
  const selecionar = (id: SecaoId) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", id);
    setSearchParams(next, { replace: !isMobile });
  };

  const voltarParaLista = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("tab");
    next.delete("code");
    next.delete("error");
    setSearchParams(next);
  };

  const grupos = showWhatsapp ? GRUPOS : GRUPOS.filter((g) => g.label !== "WhatsApp");

  const ativa: SecaoId = secao ?? "marketplaces";

  const conteudo = (
    <div className="space-y-6 min-w-0">
      {ativa === "marketplaces" && <MarketplacesSecao />}
      {ativa === "canais" && <CanaisSecao showInstagram={showInstagram} />}
      {ativa === "numeros" && showWhatsapp && <NumerosSection />}
      {ativa === "envio" && showWhatsapp && <EnvioSection />}
      {ativa === "resumo" && showWhatsapp && <ResumoSecao />}
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
      <div className="grid md:grid-cols-[210px_1fr] gap-8 max-w-5xl">
        <nav aria-label="Seções de configurações" className="md:sticky md:top-4 md:self-start">
          <div className="space-y-5">
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
                            "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors border-l-[3px] border-l-transparent",
                            isActive
                              ? "bg-[rgba(49,140,233,0.12)] border-l-[#318CE9] text-[#7CB8F2]"
                              : "text-muted-foreground hover:text-foreground hover:bg-accent"
                          )}
                        >
                          <s.icon className={cn("w-4 h-4 flex-shrink-0", isActive && "text-[#318CE9]")} aria-hidden />
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

const MarketplacesSecao = () => (
  <div className="bg-card border border-border rounded-2xl p-5 md:p-6">
    <div className="flex items-start gap-3 md:gap-4 mb-5">
      <div className="w-11 h-11 md:w-12 md:h-12 rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0">
        <ShoppingBag className="w-6 h-6 text-orange-500" />
      </div>
      <div className="min-w-0">
        <h3 className="text-lg font-bold text-foreground">Shopee Afiliados</h3>
        <p className="text-sm text-muted-foreground">
          Sincroniza automaticamente suas <strong>comissões</strong> de hora em hora (últimos 7 dias) e um
          reconcile completo na madrugada. Dados de cliques devem ser importados via Upload Cliques.
        </p>
      </div>
    </div>
    <ShopeeIntegrationSettings />
  </div>
);

const CanaisSecao = ({ showInstagram }: { showInstagram: boolean }) => (
  <>
    <div className="bg-card border border-border rounded-2xl p-5 md:p-6">
      <div className="flex items-start gap-3 md:gap-4 mb-5">
        <div className="w-11 h-11 md:w-12 md:h-12 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
          <Facebook className="w-6 h-6 text-blue-500" />
        </div>
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-foreground">Facebook Ads</h3>
          <p className="text-sm text-muted-foreground">
            Sincroniza campanhas, gasto e métricas. Permite pausar/ativar e ajustar orçamento direto do MarketDash.
          </p>
        </div>
      </div>
      <FacebookIntegrationSettings />
    </div>

    {showInstagram && (
      <div className="bg-card border border-border rounded-2xl p-5 md:p-6">
        <div className="flex items-start gap-3 md:gap-4 mb-5">
          <div className="w-11 h-11 md:w-12 md:h-12 rounded-xl bg-pink-500/10 flex items-center justify-center flex-shrink-0">
            <Instagram className="w-6 h-6 text-pink-500" />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-foreground">Instagram</h3>
            <p className="text-sm text-muted-foreground">
              Conexão usada pela automação do <strong>Instagram</strong> (comentário → direct).
              É independente da conexão do Meta Ads: outro login, outro token.
            </p>
          </div>
        </div>
        <InstagramConnectionSettings />
      </div>
    )}
  </>
);

const ResumoSecao = () => (
  <div className="bg-card border border-border rounded-2xl p-5 md:p-6">
    <div className="flex items-start gap-3 md:gap-4 mb-5">
      <div className="w-11 h-11 md:w-12 md:h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
        <MessageCircle className="w-6 h-6 text-emerald-500" />
      </div>
      <div className="min-w-0">
        <h3 className="text-lg font-bold text-foreground">Resumo diário</h3>
        <p className="text-sm text-muted-foreground">
          Todo dia às 9h você recebe no WhatsApp os números do dia anterior e um
          aviso quando alguma campanha ficar abaixo do ponto de equilíbrio.
        </p>
      </div>
    </div>
    <WhatsappResumoSettings />
  </div>
);

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

  return (
    <div className="bg-card border border-border rounded-2xl p-5 md:p-6 space-y-4">
      <h3 className="text-lg font-bold">Sua assinatura</h3>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Plano</dt>
          <dd className="font-medium">{context?.plano_label || "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Período</dt>
          <dd className="font-medium capitalize">{context?.periodo || "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Status</dt>
          <dd className="font-medium capitalize">{context?.assinatura_status || "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Vence em</dt>
          <dd className="font-medium">{vence}</dd>
        </div>
      </dl>
      <Button asChild variant="outline">
        <Link to="/dashboard/planos">Ver planos</Link>
      </Button>
    </div>
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
    <div className="bg-card border border-border rounded-2xl p-5 md:p-6">
      <div className="flex items-start gap-3 md:gap-4 mb-5">
        <div className="w-11 h-11 md:w-12 md:h-12 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
          <Receipt className="w-6 h-6 text-purple-500" />
        </div>
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-foreground">Impostos</h3>
          <p className="text-sm text-muted-foreground">
            Aplicados em tempo de cálculo sobre <strong>todos</strong> os dashboards (KPIs, gráficos, Sub ID, CPA, ROAS).
            O valor lançado em Custos de Anúncios continua sendo o que você pagou — o imposto é somado só no cálculo.
          </p>
        </div>
      </div>

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
    </div>
  );
};

export default Configuracoes;
