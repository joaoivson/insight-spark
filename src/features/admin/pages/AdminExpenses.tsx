import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  centsToBRL,
  createExpense,
  deleteExpense,
  fetchExpenses,
  repeatExpenses,
  type ExpenseItem,
} from "@/services/admin-panel.service";
import { useAdminPanelStore } from "@/stores/adminPanelStore";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = ["Infra", "Ferramentas", "Taxas", "Marketing", "Outros"];

const emptyForm = {
  date: new Date().toISOString().slice(0, 10),
  category: "Infra",
  supplier: "",
  description: "",
  amount_reais: "",
  recurring: false,
  notes: "",
};

export default function AdminExpensesPage() {
  const { year, month } = useAdminPanelStore();
  const { toast } = useToast();
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [total, setTotal] = useState(0);
  const [byCat, setByCat] = useState<{ category: string; amount_cents: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    fetchExpenses(year, month)
      .then((d) => {
        setItems(d.items);
        setTotal(d.total_cents);
        setByCat(d.by_category);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [year, month]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const amount_cents = Math.round(parseFloat(form.amount_reais.replace(",", ".")) * 100);
    if (!Number.isFinite(amount_cents) || amount_cents < 0) {
      toast({ title: "Valor inválido", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await createExpense({
        date: form.date,
        category: form.category,
        supplier: form.supplier || null,
        description: form.description || null,
        amount_cents,
        recurring: form.recurring,
        notes: form.notes || null,
      });
      setForm({ ...emptyForm, date: form.date, category: form.category });
      toast({ title: "Despesa lançada" });
      load();
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const onRepeat = async () => {
    try {
      const r = await repeatExpenses(year, month);
      toast({ title: `${r.created} despesa(s) repetida(s)` });
      load();
    } catch (err) {
      toast({
        title: "Erro ao repetir",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    }
  };

  const onDelete = async (id: number) => {
    await deleteExpense(id);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Despesas</h2>
          <p className="text-sm text-muted-foreground">
            Total do mês: {centsToBRL(total)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void onRepeat()}>
            Repetir mês anterior
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link to="/admin/dre">Ver DRE do mês</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Nova despesa</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={onSubmit}>
              <div>
                <Label>Data</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Categoria</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm({ ...form, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fornecedor</Label>
                <Input
                  value={form.supplier}
                  onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                />
              </div>
              <div>
                <Label>Descrição</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div>
                <Label>Valor (R$)</Label>
                <Input
                  inputMode="decimal"
                  placeholder="0,00"
                  value={form.amount_reais}
                  onChange={(e) => setForm({ ...form, amount_reais: e.target.value })}
                  required
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="recurring"
                  checked={form.recurring}
                  onCheckedChange={(v) => setForm({ ...form, recurring: Boolean(v) })}
                />
                <Label htmlFor="recurring">Recorrente</Label>
              </div>
              <Button type="submit" disabled={saving} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                  <>
                    <Plus className="mr-1 h-4 w-4" />
                    Lançar
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Por categoria</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3 text-sm">
              {byCat.map((c) => (
                <span key={c.category} className="rounded-md border px-3 py-1">
                  {c.category}: {centsToBRL(c.amount_cents)}
                </span>
              ))}
              {byCat.length === 0 && (
                <span className="text-muted-foreground">Sem despesas neste mês</span>
              )}
            </CardContent>
          </Card>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>{e.date}</TableCell>
                      <TableCell>{e.category}</TableCell>
                      <TableCell>{e.supplier || "—"}</TableCell>
                      <TableCell>
                        {e.description || "—"}
                        {e.recurring && (
                          <span className="ml-1 text-xs text-muted-foreground">(rec.)</span>
                        )}
                      </TableCell>
                      <TableCell>{centsToBRL(e.amount_cents)}</TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => void onDelete(e.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        Lance despesas para fechar o resultado no DRE
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
