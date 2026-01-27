import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { motion } from "framer-motion";
import { User, Bell, CreditCard, Shield, Trash2, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
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
import { getApiUrl, fetchWithAuth } from "@/core/config/api.config";
import { Badge } from "@/components/ui/badge";
import { useSubscriptionCheck } from "@/shared/hooks/useSubscriptionCheck";
import { SubscriptionPlanModal } from "@/features/subscription/components/SubscriptionPlanModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const SettingsPage = () => {
  const storedUser = userStorage.get<StoredUser>() || undefined;
  const [name, setName] = useState(storedUser?.nome || storedUser?.name || "");
  const [email, setEmail] = useState(storedUser?.email || "");
  const [cpfCnpj] = useState(storedUser?.cpf_cnpj || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { status: subscriptionStatus, loading: subscriptionLoading } = useSubscriptionCheck({ 
    redirectOnInactive: false 
  });

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
      const response = await fetchWithAuth(getApiUrl(`/api/v1/auth/users/${userId}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.detail || result.error || "Erro ao salvar");
      }
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
    if (!userId || !token) return;
    setIsDeleting(true);
    try {
      const response = await fetchWithAuth(getApiUrl(`/api/v1/auth/users/${userId}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Erro ao remover conta");
      userStorage.remove();
      tokenStorage.remove();
      toast({ title: "Conta removida", description: "Seus dados foram excluídos." });
      navigate(APP_CONFIG.ROUTES.LOGIN);
    } catch (err) {
      toast({ title: "Erro ao excluir conta", variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setShowCancelDialog(false);
    }
  };

  const handleChangePlan = () => {
    setShowPlanModal(true);
  };

  const handleCancelSubscription = () => {
    setShowCancelDialog(true);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const getPlanDisplayName = (plan: string) => {
    const planNames: Record<string, string> = {
      'marketdash': 'MarketDash',
      'free': 'Gratuito',
    };
    return planNames[plan] || plan;
  };

  return (
    <DashboardLayout title="Configurações" subtitle="Gerencie sua conta e preferências">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-5xl mx-auto space-y-8"
      >
        
        {/* Grid Layout */}
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Coluna Principal (Perfil) */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Card de Perfil */}
            <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">Perfil Pessoal</h3>
                  <p className="text-sm text-muted-foreground">Atualize suas informações básicas</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cpfCnpj">CPF/CNPJ</Label>
                    <div className="relative">
                      <Input
                        id="cpfCnpj"
                        value={cpfCnpj}
                        disabled
                        className="bg-secondary/20 pr-10"
                      />
                      <Shield className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email de Acesso</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-background"
                  />
                </div>

                <div className="pt-4 flex justify-end">
                  <Button onClick={handleSave} disabled={isSaving} size="lg" className="min-w-[140px]">
                    {isSaving ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Notificações */}
            <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                  <Bell className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Preferências de Notificação</h3>
              </div>

              <div className="space-y-6">
                {[
                  { title: "Resumo Semanal", desc: "Receba estatísticas consolidadas toda segunda-feira" },
                  { title: "Alertas de Performance", desc: "Notifique-me quando o ROAS cair abaixo da meta" },
                  { title: "Atualizações do Sistema", desc: "Novidades e melhorias na plataforma" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-foreground">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch defaultChecked={i < 2} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Coluna Lateral (Assinatura e Danger Zone) */}
          <div className="space-y-8">
            
            {/* Card de Assinatura */}
            <div className="bg-gradient-to-br from-card to-secondary/10 border border-border rounded-2xl p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <CreditCard className="w-24 h-24" />
              </div>
              
              <div className="relative z-10">
                <h3 className="font-bold text-lg mb-1">Gerenciar Assinatura</h3>
                
                {subscriptionLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : subscriptionStatus ? (
                  <>
                    <div className="flex items-center gap-2 mb-4">
                      <Badge className={`${
                        subscriptionStatus.is_active 
                          ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20" 
                          : "bg-destructive/10 text-destructive border-destructive/20"
                      }`}>
                        {subscriptionStatus.is_active ? (
                          <><CheckCircle2 className="w-3 h-3 mr-1" /> Ativa</>
                        ) : (
                          "Inativa"
                        )}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {getPlanDisplayName(subscriptionStatus.plan)}
                      </span>
                    </div>

                    <div className="space-y-3 mb-6 text-sm">
                      {subscriptionStatus.expires_at && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Expira em</span>
                          <span className="font-medium">{formatDate(subscriptionStatus.expires_at)}</span>
                        </div>
                      )}
                      {subscriptionStatus.last_validation_at && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Última validação</span>
                          <span className="font-medium">{formatDate(subscriptionStatus.last_validation_at)}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Uploads Mensais</span>
                        <span className="font-medium">Ilimitado</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Button 
                        variant="default" 
                        className="w-full"
                        onClick={handleChangePlan}
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        Mudar de Plano
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={handleCancelSubscription}
                      >
                        Cancelar Assinatura
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="py-4 text-center">
                    <p className="text-sm text-muted-foreground mb-4">
                      Não foi possível carregar informações da assinatura.
                    </p>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={handleChangePlan}
                    >
                      Ativar Assinatura
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Modal de Seleção de Plano */}
            <SubscriptionPlanModal
              open={showPlanModal}
              onOpenChange={setShowPlanModal}
            />

            {/* Dialog de Confirmação de Cancelamento */}
            <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancelar Assinatura</AlertDialogTitle>
                  <AlertDialogDescription>
                    Para cancelar sua assinatura, você precisa acessar sua conta na Cakto. 
                    O cancelamento pode ser feito a qualquer momento e sua assinatura continuará ativa até o final do período pago.
                    <br /><br />
                    Deseja ser redirecionado para a página de gerenciamento da Cakto?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Fechar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      // Redirecionar para página de gerenciamento da Cakto
                      // Nota: A URL exata depende da configuração da Cakto
                      window.open('https://www.cakto.com.br/area-do-cliente', '_blank');
                      setShowCancelDialog(false);
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Ir para Cakto
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Danger Zone */}
            <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-bold">Zona de Perigo</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                A exclusão da conta é permanente e remove todos os históricos de dados.
              </p>
              <Button 
                variant="destructive" 
                onClick={handleDelete} 
                disabled={isDeleting} 
                className="w-full"
              >
                {isDeleting ? "Processando..." : "Excluir minha conta"}
              </Button>
            </div>

          </div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
};

export default SettingsPage;
