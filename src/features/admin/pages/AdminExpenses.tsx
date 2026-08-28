import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveModal } from "@/components/shared/ResponsiveModal";
import { DataCard } from "@/components/shared/DataCard";
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
  updateExpense,
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
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

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

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (e: ExpenseItem) => {
    setEditingId(e.id);
    setForm({
      date: e.date,
      category: e.category,
      supplier: e.supplier || "",
      description: e.description || "",
      amount_reais: (e.amount_cents / 100).toFixed(2).replace(".", ","),
      recurring: e.recurring,
      notes: e.notes || "",
    });
    setOpen(true);
  };

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    const amount_cents = Math.round(parseFloat(form.amount_reais.replace(",", ".")) * 100);
    if (!Number.isFinite(amount_cents) || amount_cents < 0) {
      toast({ title: "Valor inválido", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        date: form.date,
        category: form.category,
        supplier: form.supplier || null,
        description: form.description || null,
        amount_cents,
        recurring: form.recurring,
        notes: form.notes || null,
      };
      if (editingId) {
        await updateExpense(editingId, payload);
        toast({ title: "Despesa atualizada" });
      } else {
        await createExpense(payload);
        toast({ title: "Despesa lançada" });
      }
      setOpen(false);
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
        <h2 className="text-lg font-semibold">Despesas</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void onRepeat()}>
            Repetir mês anterior
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link to="/admin/dre">Ver DRE do mês</Link>
          </Button>
          <ResponsiveModal
            open={open}
            onOpenChange={setOpen}
            title={editingId ? "Editar despesa" : "Nova despesa"}
            trigger={
              <Button size="sm" onClick={openNew}>
                <Plus className="mr-1 h-4 w-4" />
                Nova despesa
              </Button>
            }
          >
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
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
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
                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? "Salvar" : "Lançar"}
                  </Button>
                </div>
              </form>
          </ResponsiveModal>
        </div>
      </div>

      {/* Cards de total no topo */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total do mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tracking-tight">{centsToBRL(total)}</div>
          </CardContent>
        </Card>
        {byCat.map((c) => (
          <Card key={c.category}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.category}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tracking-tight">{centsToBRL(c.amount_cents)}</div>
            </CardContent>
          </Card>
        ))}
        {byCat.length === 0 && (
          <Card className="sm:col-span-2 lg:col-span-3">
            <CardContent className="pt-6 text-sm text-muted-foreground">
              Sem despesas neste mês
            </CardContent>
          </Card>
        )}
      </div>

      {/* Lista ocupa o corpo */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
        <div className="hidden overflow-x-auto rounded-md border lg:block">
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
                    {e.recurring && <span className="ml-1 text-xs text-muted-foreground">(rec.)</span>}
                  </TableCell>
                  <TableCell>{centsToBRL(e.amount_cents)}</TableCell>
                  <TableCell className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(e)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => void onDelete(e.id)}>
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

        {/* Mesma informação empilhada — tabela de 6 colunas não se lê em 390px. */}
        <div className="space-y-3 lg:hidden">
          {items.map((e) => (
            <DataCard
              key={e.id}
              title={e.description || e.supplier || e.category}
              badge={
                e.recurring ? (
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    recorrente
                  </span>
                ) : undefined
              }
              fields={[
                { label: "Valor", value: centsToBRL(e.amount_cents), emphasis: true },
                { label: "Data", value: e.date },
                { label: "Categoria", value: e.category },
                { label: "Fornecedor", value: e.supplier || "—" },
              ]}
              actions={
                <>
                  <Button size="icon" variant="ghost" onClick={() => openEdit(e)} aria-label="Editar despesa">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => void onDelete(e.id)} aria-label="Excluir despesa">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </>
              }
            />
          ))}
          {items.length === 0 && (
            <p className="rounded-md border border-border p-6 text-center text-sm text-muted-foreground">
              Lance despesas para fechar o resultado no DRE
            </p>
          )}
        </div>
        </>
      )}
    </div>
  );
}
