import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl } from "@/core/config/api.config";
import { userStorage } from "@/shared/lib/storage";
import { DatasetRow } from "./DataTable";
import { PlusCircle, Wallet, Calendar as CalendarIcon, Edit, Trash2 } from "lucide-react";
import type { AdSpend } from "@/shared/hooks/useDatasetRows";

interface AdSpendDialogProps {
  rows: DatasetRow[];
  adSpends?: AdSpend[];
  onSuccess: () => void;
  dateRange: { from?: Date; to?: Date };
}

export function AdSpendDialog({ rows, adSpends = [], onSuccess, dateRange }: AdSpendDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [subId, setSubId] = useState("__all__");
  const [date, setDate] = useState<string>(
    dateRange.from ? new Date(dateRange.from).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
  );
  const [editingId, setEditingId] = useState<number | null>(null);
  const { toast } = useToast();

  // Extract unique sub_ids
  const subIds = Array.from(new Set(rows.map((r) => r.sub_id1).filter(Boolean))).sort();

  const handleSave = async () => {
    const val = Number(amount);
    if (!val || val <= 0) {
      toast({ title: "Valor inválido", description: "Insira um valor maior que zero.", variant: "destructive" });
      return;
    }

    try {
      setLoading(true);
      const storedUser = userStorage.get() as { id?: string } | null;
      const userIdParam = storedUser?.id ? `?user_id=${storedUser.id}` : "";

      const payload = {
        amount: val,
        sub_id: subId === "__all__" ? "" : subId,
        date: date,
      };

      const url = editingId
        ? getApiUrl(`/api/ad_spends/${editingId}${userIdParam}`)
        : getApiUrl(`/api/ad_spends${userIdParam}`);

      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Falha ao salvar");

      toast({
        title: editingId ? "Investimento atualizado!" : "Investimento registrado!",
        description: `R$ ${val} ${editingId ? "atualizados" : "aplicados"} em ${subId === "__all__" ? "Geral" : subId} na data ${date}.`,
      });

      setAmount("");
      setSubId("__all__");
      setOpen(false);
      setEditingId(null);
      onSuccess();
    } catch (error) {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: AdSpend) => {
    setEditingId(item.id);
    setAmount(String(item.amount));
    setSubId(item.sub_id ?? "__all__");
    setDate(new Date(item.date).toISOString().slice(0, 10));
    setOpen(true);
  };

  const handleDelete = async (id: number) => {
    const storedUser = userStorage.get() as { id?: string } | null;
    const userIdParam = storedUser?.id ? `?user_id=${storedUser.id}` : "";
    try {
      setLoading(true);
      const res = await fetch(getApiUrl(`/api/ad_spends/${id}${userIdParam}`), { method: "DELETE" });
      if (!res.ok) throw new Error("Falha ao excluir");
      toast({ title: "Investimento removido" });
      onSuccess();
    } catch (error) {
      toast({ title: "Erro ao remover", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
          <Wallet className="w-4 h-4 mr-2" />
          Registrar Investimento em Ads
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-foreground">Novo Investimento em Ads</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Registre o valor gasto para calcular o ROAS real.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 text-foreground">
          <div className="grid gap-2">
            <Label htmlFor="amount" className="text-foreground">Valor Gasto (R$)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="channel" className="text-foreground">Canal / Sub ID</Label>
            <Select value={subId} onValueChange={setSubId}>
              <SelectTrigger className="text-foreground">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent className="text-foreground">
                <SelectItem value="__all__">Geral (Rateio para todos)</SelectItem>
                {subIds.map((s) => (
                  <SelectItem key={s as string} value={s as string}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="date" className="text-foreground">Data do Gasto</Label>
            <div className="relative">
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="pr-10 text-foreground"
              />
              <CalendarIcon className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
        <div className="space-y-3">
          {adSpends.length > 0 && (
            <div className="border border-border rounded-lg p-3 space-y-2">
              <div className="text-sm font-medium text-foreground">Investimentos cadastrados</div>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {adSpends.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2 text-sm"
                  >
                    <div className="space-y-1">
                      <div className="font-semibold text-foreground">
                        {item.sub_id || "Geral"} · {new Date(item.date).toLocaleDateString("pt-BR")}
                      </div>
                      <div className="text-muted-foreground">R$ {item.amount.toFixed(2)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="icon" variant="ghost" className="text-foreground" onClick={() => handleEdit(item)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(item.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => { setOpen(false); setEditingId(null); }}>Cancelar</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Salvando..." : editingId ? "Salvar Alteração" : "Salvar Investimento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
