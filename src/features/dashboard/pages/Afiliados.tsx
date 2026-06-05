import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, DollarSign, Target, CreditCard, Wallet, TrendingUp, Users } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { DataCard } from "@/components/shared/DataCard";
import { cn } from "@/shared/lib/utils";
import {
  getMyAffiliateSummary,
  type AffiliateSummary,
} from "@/services/affiliates.service";

const formatBRL = (value: string | number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(iso));

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  cancelled: "Cancelado",
};

const STATUS_CLASS: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-500",
  paid: "bg-emerald-500/10 text-emerald-500",
  cancelled: "bg-red-500/10 text-red-500",
};

const AfiliadosPage = () => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [summary, setSummary] = useState<AffiliateSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    getMyAffiliateSummary()
      .then((data) => {
        if (mounted) setSummary(data);
      })
      .catch((err) => {
        if (mounted) setError(err?.message || "Erro ao carregar afiliados");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const affiliateLink = summary?.ref_link || "https://marketdash.com.br/";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(affiliateLink);
      setCopied(true);
      toast({ title: "Link copiado!", description: "Compartilhe e comece a ganhar." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Erro ao copiar", variant: "destructive" });
    }
  };

  return (
    <DashboardLayout
      title="Indique & Ganhe"
      subtitle="Ganhe 40% Recorrente Indicando a MarketDash"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-5xl mx-auto space-y-6"
      >
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KpiCard
            icon={<Wallet className="w-5 h-5 text-amber-500" />}
            label="Saldo a receber"
            value={loading ? null : formatBRL(summary?.balance_pending ?? 0)}
            highlight
          />
          <KpiCard
            icon={<TrendingUp className="w-5 h-5 text-emerald-500" />}
            label="Total já pago"
            value={loading ? null : formatBRL(summary?.total_paid ?? 0)}
          />
          <KpiCard
            icon={<Users className="w-5 h-5 text-orange-500" />}
            label="Indicados ativos"
            value={loading ? null : `${summary?.active_referrals_count ?? 0} / ${summary?.referrals_count ?? 0}`}
          />
        </div>

        {/* Bloco institucional */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InfoCard
            icon={<DollarSign className="w-6 h-6 text-orange-500" />}
            title="40% Recorrente"
            text="Uma única indicação pode gerar receita todos os meses. Sem limite, sem teto, sem burocracia."
          />
          <InfoCard
            icon={<Target className="w-6 h-6 text-orange-500" />}
            title="Modelo Último Clique"
            text="A comissão é atribuída ao último afiliado que gerou o clique antes da compra. Simples, justo, sem confusão."
          />
          <InfoCard
            icon={<CreditCard className="w-6 h-6 text-orange-500" />}
            title="Pagamento via PIX"
            text="Pagamentos realizados manualmente após a confirmação do pagamento. Transparência total."
          />
        </div>

        {/* Link de afiliação */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-foreground mb-2">Seu link de afiliação</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Compartilhe este link nas suas redes. Toda indicação ativa rende 40% recorrente.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              readOnly
              value={affiliateLink}
              className="flex-1 bg-muted border border-border rounded-lg px-4 py-2.5 text-sm text-foreground font-mono"
            />
            <Button onClick={handleCopy} className="w-full sm:w-auto gap-2 transition-colors duration-150">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copiado" : "Copiar link"}
            </Button>
          </div>
        </div>

        {/* Histórico de comissões */}
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border">
            <h3 className="font-bold text-foreground">Histórico de comissões</h3>
            <p className="text-sm text-muted-foreground">Cada pagamento de assinatura de um indicado seu gera 40% de comissão.</p>
          </div>
          {error ? (
            <div className="p-6 text-sm text-red-500">{error}</div>
          ) : loading ? (
            <div className="p-6 space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : !summary?.commissions.length ? (
            <div className="p-10 text-center text-muted-foreground">
              Nenhuma comissão ainda. Compartilhe seu link e comece a indicar!
            </div>
          ) : (
            <>
              {/* Desktop: tabela */}
              <Table className="hidden md:table">
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Indicado</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Valor base</TableHead>
                    <TableHead className="text-right">Comissão</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.commissions.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.referred_email}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(c.created_at)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{formatBRL(c.base_amount)}</TableCell>
                      <TableCell className="text-right font-bold">{formatBRL(c.amount)}</TableCell>
                      <TableCell>
                        <span className={cn("text-xs font-semibold px-2 py-1 rounded", STATUS_CLASS[c.status] || "bg-muted")}>
                          {STATUS_LABEL[c.status] || c.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Mobile: cards */}
              <div className="md:hidden space-y-3 p-4">
                {summary.commissions.map((c) => (
                  <DataCard
                    key={c.id}
                    title={c.referred_email}
                    badge={
                      <span className={cn("text-xs font-semibold px-2 py-0.5 rounded", STATUS_CLASS[c.status] || "bg-muted")}>
                        {STATUS_LABEL[c.status] || c.status}
                      </span>
                    }
                    fields={[
                      { label: "Data", value: formatDate(c.created_at) },
                      { label: "Valor base", value: formatBRL(c.base_amount) },
                      { label: "Comissão", value: formatBRL(c.amount), emphasis: true },
                    ]}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </motion.div>
    </DashboardLayout>
  );
};

const KpiCard = ({
  icon, label, value, highlight = false,
}: { icon: React.ReactNode; label: string; value: string | null; highlight?: boolean }) => (
  <div className={cn(
    "bg-card border border-border rounded-2xl p-5 shadow-sm",
    highlight && "ring-1 ring-amber-500/30",
  )}>
    <div className="flex items-center justify-between mb-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      {icon}
    </div>
    {value === null ? <Skeleton className="h-8 w-32" /> : <div className="text-2xl font-bold text-foreground">{value}</div>}
  </div>
);

const InfoCard = ({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) => (
  <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
    <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center mb-4">
      {icon}
    </div>
    <h3 className="font-bold text-foreground mb-2">{title}</h3>
    <p className="text-sm text-muted-foreground">{text}</p>
  </div>
);

export default AfiliadosPage;
