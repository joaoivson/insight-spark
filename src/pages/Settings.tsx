import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { motion } from "framer-motion";
import { User, Bell, CreditCard, Shield, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

const SettingsPage = () => {
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
              <Input id="name" placeholder="Seu nome" defaultValue="Usuário Demo" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="seu@email.com" defaultValue="demo@dashads.com" />
            </div>
          </div>

          <div className="mt-6">
            <Button>Salvar Alterações</Button>
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

          <Button variant="destructive">Excluir Conta</Button>
        </div>
      </motion.div>
    </DashboardLayout>
  );
};

export default SettingsPage;
