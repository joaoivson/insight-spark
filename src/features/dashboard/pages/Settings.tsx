import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { motion } from "framer-motion";
import { User, Bell, CreditCard, Shield, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { userStorage, tokenStorage } from "@/shared/lib/storage";
import type { User as StoredUser } from "@/shared/types";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { APP_CONFIG } from "@/core/config/app.config";
import { useNavigate } from "react-router-dom";
import { getApiUrl } from "@/core/config/api.config";

const SettingsPage = () => {
  const storedUser = userStorage.get<StoredUser>() || undefined;
  const [name, setName] = useState(storedUser?.nome || storedUser?.name || "");
  const [email, setEmail] = useState(storedUser?.email || "");
  const [cpfCnpj] = useState(storedUser?.cpf_cnpj || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const token = tokenStorage.get();
  const userId = storedUser?.id;

  const handleSave = async () => {
    if (!userId || !token) {
      toast({ title: "Sessão expirada", description: "Faça login novamente.", variant: "destructive" });
      navigate(APP_CONFIG.ROUTES.LOGIN);
      return;
    }
    setIsSaving(true);
    try {
      const response = await fetch(getApiUrl(`/api/auth/users/${userId}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, email }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.detail || result.error || "Erro ao salvar");
      }
      // Atualiza storage local
      userStorage.set({
        id: String(result.id ?? userId),
        nome: result.name ?? name,
        name: result.name ?? name,
        cpf_cnpj: result.cpf_cnpj ?? cpfCnpj,
        email: result.email ?? email,
        created_at: result.created_at,
        updated_at: result.updated_at,
      });
      toast({ title: "Dados salvos", description: "Perfil atualizado com sucesso." });
    } catch (err) {
      toast({
        title: "Erro ao salvar",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!userId || !token) {
      toast({ title: "Sessão expirada", description: "Faça login novamente.", variant: "destructive" });
      navigate(APP_CONFIG.ROUTES.LOGIN);
      return;
    }
    const confirmed = window.confirm("Tem certeza? Esta ação remove todos os dados da sua conta.");
    if (!confirmed) return;
    setIsDeleting(true);
    try {
      const response = await fetch(getApiUrl(`/api/auth/users/${userId}`), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.detail || result.error || "Erro ao remover conta");
      }
      // Limpa sessão e vai para login
      userStorage.remove();
      tokenStorage.remove();
      toast({ title: "Conta removida", description: "Seus dados foram excluídos." });
      navigate(APP_CONFIG.ROUTES.LOGIN);
    } catch (err) {
      toast({
        title: "Erro ao excluir conta",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <DashboardLayout title="Configurações" subtitle="Gerencie sua conta e preferências">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-3xl"
      >
        {/* Profile Section */}
        <div className="bg-card rounded-xl border border-border p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <User className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-foreground">Perfil</h3>
              <p className="text-sm text-muted-foreground">Informações da sua conta</p>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cpfCnpj">CPF/CNPJ</Label>
              <Input
                id="cpfCnpj"
                type="text"
                placeholder="000.000.000-00"
                value={cpfCnpj}
                disabled
              />
            </div>
          </div>

          <div className="mt-6">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="bg-card rounded-xl border border-border p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-foreground">Notificações</h3>
              <p className="text-sm text-muted-foreground">Configure suas preferências de notificação</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-foreground">Relatórios semanais</div>
                <div className="text-sm text-muted-foreground">Receba um resumo semanal por email</div>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-foreground">Alertas de performance</div>
                <div className="text-sm text-muted-foreground">Notificações sobre mudanças significativas</div>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-foreground">Novidades do produto</div>
                <div className="text-sm text-muted-foreground">Atualizações sobre novos recursos</div>
              </div>
              <Switch />
            </div>
          </div>
        </div>

        {/* Subscription Section */}
        <div className="bg-card rounded-xl border border-border p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-foreground">Assinatura</h3>
              <p className="text-sm text-muted-foreground">Gerencie seu plano</p>
            </div>
          </div>

          <div className="p-4 bg-accent/5 border border-accent/20 rounded-xl mb-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-display font-semibold text-foreground">Plano Básico</div>
                <div className="text-sm text-muted-foreground">R$ 67,00/mês</div>
              </div>
              <div className="px-3 py-1 bg-success/10 text-success rounded-full text-sm font-medium">
                Ativo
              </div>
            </div>
          </div>

          <Button variant="outline">Gerenciar Assinatura</Button>
        </div>

        {/* Danger Zone */}
        <div className="bg-card rounded-xl border border-destructive/20 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-foreground">Zona de Perigo</h3>
              <p className="text-sm text-muted-foreground">Ações irreversíveis</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mb-4">
            Ao excluir sua conta, todos os seus dados serão permanentemente removidos. Esta ação não pode ser desfeita.
          </p>

          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? "Excluindo..." : "Excluir Conta"}
          </Button>
        </div>
      </motion.div>
    </DashboardLayout>
  );
};

export default SettingsPage;

