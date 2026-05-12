import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Copy, AlertCircle, Check } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  getPendingAffiliates,
  markCommissionsPaid,
  type PendingAffiliate,
} from "@/services/admin-affiliates.service";

const formatBRL = (value: string | number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));

const AfiliadosPendentesPage = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<PendingAffiliate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PendingAffiliate | null>(null);
  const [paymentRef, setPaymentRef] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    getPendingAffiliates()
      .then((data) => {
        setItems(data);
        setError(null);
      })
      .catch((err) => setError(err?.message || "Erro ao carregar"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleCopyPix = async (pix: string | null) => {
    if (!pix) return;
    try {
      await navigator.clipboard.writeText(pix);
      toast({ title: "PIX copiado" });
    } catch {
      toast({ title: "Erro ao copiar", variant: "destructive" });
    }
  };

  const handleConfirmPaid = async () => {
    if (!selected || !paymentRef.trim()) return;
    setSubmitting(true);
    try {
      const result = await markCommissionsPaid(selected.commission_ids, paymentRef.trim());
      toast({
        title: "Pagamento registrado",
        description: `${result.paid_count} comissões marcadas como pagas (${formatBRL(result.total_paid)}).`,
      });
      setSelected(null);
      setPaymentRef("");
      load();
    } catch (err) {
      toast({
        title: "Erro ao registrar pagamento",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout
      title="Afiliados pendentes"
      subtitle="Lista de afiliados com comissões a receber. Pague via PIX e marque como pago."
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-6xl mx-auto"
      >
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          {error ? (
            <div className="p-6 text-sm text-red-500">{error}</div>
          ) : loading ? (
            <div className="p-6 space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : items.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">
              Nenhum afiliado com saldo pendente. ✨
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Afiliado</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>PIX</TableHead>
                  <TableHead className="text-right">Comissões</TableHead>
                  <TableHead className="text-right">Total a pagar</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it) => (
                  <TableRow key={it.referrer_user_id}>
                    <TableCell className="font-medium">{it.name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{it.email}</TableCell>
                    <TableCell>
                      {it.pix_key ? (
                        <button
                          onClick={() => handleCopyPix(it.pix_key)}
                          className="inline-flex items-center gap-1 text-sm text-foreground hover:text-primary"
                        >
                          <span className="font-mono">{it.pix_key}</span>
                          <Copy className="w-3 h-3" />
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-500">
                          <AlertCircle className="w-3 h-3" />
                          Sem PIX
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{it.commissions_count}</TableCell>
                    <TableCell className="text-right font-bold">{formatBRL(it.total_pending)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => setSelected(it)}
                        className="gap-2"
                      >
                        <Check className="w-3 h-3" />
                        Marcar como pago
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </motion.div>

      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null);
            setPaymentRef("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar pagamento</DialogTitle>
            <DialogDescription>
              Marcar {selected?.commissions_count} comissões de {selected?.name || selected?.email}
              <strong> ({formatBRL(selected?.total_pending || 0)})</strong> como pagas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Referência do pagamento (ID do comprovante PIX)</label>
            <Input
              value={paymentRef}
              onChange={(e) => setPaymentRef(e.target.value)}
              placeholder="ex: E18236120202605070800..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmPaid} disabled={!paymentRef.trim() || submitting}>
              {submitting ? "Confirmando..." : "Confirmar pagamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AfiliadosPendentesPage;
