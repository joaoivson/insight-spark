import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Gift, Share2, UserPlus, Coins, ArrowRight, Check } from "lucide-react";
import { APP_CONFIG } from "@/core/config/app.config";

const KIWIFY = APP_CONFIG.EXTERNALS.KIWIFY_AFFILIATE_URL;

const STEPS = [
  {
    icon: Share2,
    title: "Compartilhe seu link",
    desc: "Pegue seu link de indicação exclusivo e mande pra quem também vive de vender online.",
  },
  {
    icon: UserPlus,
    title: "Seu indicado assina",
    desc: "Quando ele assina o MarketDash pelo seu link, a indicação fica vinculada a você.",
  },
  {
    icon: Coins,
    title: "Você ganha 30% todo mês",
    desc: "Recebe 30% de comissão recorrente enquanto o seu indicado continuar assinante.",
  },
];

const BENEFITS = [
  "Pagamento recorrente — não é só na 1ª venda",
  "Sem limite de indicações",
  "Acompanhamento e pagamento direto na Kiwify",
];

/** CTA que abre o checkout/afiliação da Kiwify em nova aba. */
function CtaButton() {
  return (
    <Button asChild size="lg" className="gap-2">
      <a href={KIWIFY} target="_blank" rel="noopener noreferrer">
        Quero indicar e ganhar
        <ArrowRight className="w-5 h-5" />
      </a>
    </Button>
  );
}

const IndiquePage = () => {
  return (
    <DashboardLayout title="Indique & Ganhe">
      {/* Hero */}
      <Card className="relative overflow-hidden border-border/60 p-8 md:p-10">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#318CE9]/10 via-transparent to-[#2BD699]/10" />
        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#2BD699]/15 px-3 py-1 text-xs font-semibold text-[#2BD699]">
            <Gift className="h-3.5 w-3.5" /> Programa de indicação
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
            Ganhe <span className="text-[#2BD699]">30% todo mês</span> indicando o MarketDash
          </h2>
          <p className="mt-3 text-muted-foreground">
            Indique outros afiliados e ganhe 30% de comissão recorrente — todo mês, enquanto
            eles forem assinantes. Sem limite de indicações.
          </p>
          <div className="mt-6">
            <CtaButton />
          </div>
        </div>
      </Card>

      {/* Como funciona — 3 passos */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold">Como funciona</h3>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Card key={s.title} className="p-6">
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <s.icon className="h-5 w-5" />
                </span>
                <span className="text-3xl font-bold text-muted-foreground/25">{i + 1}</span>
              </div>
              <h4 className="mt-4 font-semibold">{s.title}</h4>
              <p className="mt-1.5 text-sm text-muted-foreground">{s.desc}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Painel 30% */}
      <Card className="mt-8 p-8 text-center md:p-10">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Comissão recorrente
        </p>
        <p className="mt-2 text-6xl font-bold text-[#2BD699]">30%</p>
        <p className="mt-2 text-muted-foreground">
          por indicação ativa, todo mês — enquanto durar a assinatura do seu indicado.
        </p>
        <ul className="mx-auto mt-6 flex max-w-md flex-col gap-2 text-left text-sm">
          {BENEFITS.map((t) => (
            <li key={t} className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#2BD699]" />
              <span className="text-muted-foreground">{t}</span>
            </li>
          ))}
        </ul>
        <div className="mt-8 flex justify-center">
          <CtaButton />
        </div>
      </Card>
    </DashboardLayout>
  );
};

export default IndiquePage;
