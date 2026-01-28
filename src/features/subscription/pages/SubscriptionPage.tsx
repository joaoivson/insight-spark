import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { caktoService, PlanInfo } from "@/services/cakto.service";
import { useSubscriptionCheck } from "@/shared/hooks/useSubscriptionCheck";
import { userStorage } from "@/shared/lib/storage";
import { Loader2, CheckCircle2, BarChart3, TrendingUp, Target, Shield, ArrowRight, User, Phone, Mail, CreditCard, Check } from "lucide-react";
import { APP_CONFIG } from "@/core/config/app.config";
import { SubscriptionPlanModal } from "@/features/subscription/components/SubscriptionPlanModal";
import "../styles/index.scss";
import logoName from "@/assets/logo/logo_name.png";
import logoIcon from "@/assets/logo/logo.png";

const SubscriptionPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { status, loading: statusLoading, isActive } = useSubscriptionCheck({ redirectOnInactive: false });
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>("principal");
  const [plansLoading, setPlansLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    cpf_cnpj: "",
    telefone: "",
  });
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [checkoutPrefill, setCheckoutPrefill] = useState<{ name: string; email: string; cpf_cnpj: string; telefone: string } | null>(null);

  // Buscar planos disponíveis
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const plansList = await caktoService.getPlans();
        setPlans(plansList);
        // Se houver apenas um plano, selecionar automaticamente
        if (plansList.length === 1) {
          setSelectedPlan(plansList[0].id);
        } else if (plansList.length > 0) {
          // Selecionar plano "principal" por padrão, ou o primeiro se não existir
          const principalPlan = plansList.find(p => p.id === "principal");
          setSelectedPlan(principalPlan?.id || plansList[0].id);
        }
      } catch (error) {
        console.error('Erro ao carregar planos:', error);
        toast({ 
          title: "Erro ao carregar planos", 
          description: "Usando plano padrão. Tente novamente mais tarde.",
          variant: "destructive" 
        });
        // Fallback: usar plano padrão
        setSelectedPlan("principal");
      } finally {
        setPlansLoading(false);
      }
    };
    fetchPlans();
  }, [toast]);

  // Pré-preencher formulário se usuário estiver logado
  useEffect(() => {
    const user = userStorage.get() as { name?: string; email?: string; cpf_cnpj?: string; telefone?: string } | null;
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        cpf_cnpj: user.cpf_cnpj || "",
        telefone: user.telefone || "",
      });
    }
  }, []);

  // Validação de CPF/CNPJ básica
  const validateCpfCnpj = (value: string): boolean => {
    const cleaned = value.replace(/\D/g, "");
    // CPF tem 11 dígitos, CNPJ tem 14
    return cleaned.length === 11 || cleaned.length === 14;
  };

  // Validação de telefone (DDD + número)
  const validateTelefone = (value: string): boolean => {
    const cleaned = value.replace(/\D/g, "");
    // DDD (2 dígitos) + número (8 ou 9 dígitos para celular, 8 para fixo)
    return cleaned.length >= 10 && cleaned.length <= 11;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validações obrigatórias
    if (!formData.name.trim()) {
      toast({ title: "Nome completo é obrigatório", variant: "destructive" });
      return;
    }

    if (!formData.cpf_cnpj.trim()) {
      toast({ title: "CPF/CNPJ é obrigatório", variant: "destructive" });
      return;
    }

    if (!validateCpfCnpj(formData.cpf_cnpj)) {
      toast({ title: "CPF/CNPJ inválido", description: "Digite um CPF (11 dígitos) ou CNPJ (14 dígitos) válido", variant: "destructive" });
      return;
    }

    if (!formData.telefone.trim()) {
      toast({ title: "Telefone é obrigatório", variant: "destructive" });
      return;
    }

    if (!validateTelefone(formData.telefone)) {
      toast({ title: "Telefone inválido", description: "Digite o telefone com DDD (ex: 11987654321)", variant: "destructive" });
      return;
    }

    // Validação de email (obrigatório)
    if (!formData.email.trim()) {
      toast({ title: "Email é obrigatório", variant: "destructive" });
      return;
    }

    // Validação de formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      toast({ title: "Email inválido", description: "Digite um email válido (ex: seu@email.com)", variant: "destructive" });
      return;
    }

    const sanitizedData = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      cpf_cnpj: formData.cpf_cnpj.replace(/\D/g, ""),
      telefone: formData.telefone.replace(/\D/g, ""),
    };

    setLoading(true);
    setCheckoutPrefill(sanitizedData);
    setShowPlanModal(true);
  };

  // Se já tiver assinatura ativa, mostrar mensagem
  if (statusLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Verificando assinatura...</p>
        </div>
      </div>
    );
  }

  if (isActive && status) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md text-center space-y-6">
          <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto" />
          <div>
            <h1 className="text-3xl font-bold">Assinatura Ativa</h1>
            <p className="text-muted-foreground mt-2">
              Sua assinatura está ativa{status.expires_at ? ` até ${new Date(status.expires_at).toLocaleDateString("pt-BR")}` : ""}.
            </p>
          </div>
          <Button onClick={() => navigate("/dashboard")}>
            Ir para Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      {/* Left Side - Form */}
      <div className="auth-form-side">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="auth-form-wrapper"
        >
          {/* Logo */}
          <Link to={APP_CONFIG.ROUTES.HOME} className="auth-logo">
            <img src={logoIcon} alt="Logo MarketDash" className="auth-logo-icon brand-logo-mark" />
            <img src={logoName} alt="MarketDash" className="auth-logo-name brand-logo-name" />
          </Link>

          <h1 className="auth-title">
            Assine o MarketDash
          </h1>
          <p className="auth-subtitle">
            Escolha seu plano e preencha seus dados para iniciar sua assinatura
          </p>

          {/* Seleção de Planos */}
          {plansLoading ? (
            <div className="mb-6 flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Carregando planos...</span>
            </div>
          ) : plans.length > 0 ? (
            <div className="mb-6 space-y-3">
              <Label className="text-base font-semibold">Escolha seu plano:</Label>
              <div className="grid grid-cols-1 gap-3">
                {plans.map((plan) => (
                  <motion.button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                      selectedPlan === plan.id
                        ? "border-accent bg-accent/10"
                        : "border-border hover:border-accent/50 bg-card"
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground">{plan.name}</h3>
                          {selectedPlan === plan.id && (
                            <Check className="w-4 h-4 text-accent" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground capitalize">
                          Período: {plan.period}
                        </p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedPlan === plan.id
                          ? "border-accent bg-accent"
                          : "border-border"
                      }`}>
                        {selectedPlan === plan.id && (
                          <div className="w-2 h-2 rounded-full bg-accent-foreground" />
                        )}
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mb-6 p-4 rounded-lg border border-border bg-muted/50">
              <p className="text-sm text-muted-foreground text-center">
                Não foi possível carregar os planos. Usando plano padrão.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-form-group">
              <Label htmlFor="name">Nome Completo</Label>
              <div className="auth-input-wrapper">
                <User className="auth-input-icon" />
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={loading}
                  placeholder="Seu nome completo"
                  className="auth-input"
                  required
                />
              </div>
            </div>

            <div className="auth-form-group">
              <Label htmlFor="cpf_cnpj">CPF/CNPJ</Label>
              <div className="auth-input-wrapper">
                <CreditCard className="auth-input-icon" />
                <Input
                  id="cpf_cnpj"
                  value={formData.cpf_cnpj}
                  onChange={(e) => setFormData({ ...formData, cpf_cnpj: e.target.value })}
                  disabled={loading}
                  placeholder="000.000.000-00 ou 00.000.000/0000-00"
                  className="auth-input"
                  required
                />
              </div>
            </div>

            <div className="auth-form-group">
              <Label htmlFor="telefone">Telefone com DDD</Label>
              <div className="auth-input-wrapper">
                <Phone className="auth-input-icon" />
                <Input
                  id="telefone"
                  value={formData.telefone}
                  onChange={(e) => {
                    let value = e.target.value.replace(/\D/g, "");
                    // Limita a 11 dígitos (DDD + 9 dígitos)
                    if (value.length > 11) value = value.slice(0, 11);
                    // Formata: (XX) XXXXX-XXXX
                    if (value.length > 6) {
                      value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
                    } else if (value.length > 2) {
                      value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
                    } else if (value.length > 0) {
                      value = `(${value}`;
                    }
                    setFormData({ ...formData, telefone: value });
                  }}
                  disabled={loading}
                  placeholder="(11) 98765-4321"
                  className="auth-input"
                  required
                />
              </div>
            </div>

            <div className="auth-form-group">
              <Label htmlFor="email">Email</Label>
              <div className="auth-input-wrapper">
                <Mail className="auth-input-icon" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={loading}
                  placeholder="seu@email.com"
                  className="auth-input"
                  required
                />
              </div>
            </div>

            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  Assinar Agora
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </Button>
          </form>

          <div className="auth-footer">
            Já tem uma conta?{" "}
            <Link
              to={APP_CONFIG.ROUTES.LOGIN}
              className="auth-link auth-link--medium"
            >
              Entrar
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Right Side - SaaS Information */}
      <div className="auth-decorative-side">
        <div className="auth-decorative-gradient" />
        <div className="auth-decorative-blob auth-decorative-blob--large auth-decorative-blob--top-right" />
        <div className="auth-decorative-blob auth-decorative-blob--small auth-decorative-blob--bottom-left" />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="auth-decorative-content"
        >
          <div className="auth-decorative-icon">
            <BarChart3 className="w-10 h-10 text-accent" />
          </div>
          <h2 className="auth-decorative-title">
            Potencialize suas vendas
          </h2>
          <p className="auth-decorative-text">
            Dashboard completo para análise de performance, ROAS, comissões e muito mais. Tome decisões baseadas em dados reais.
          </p>

          <div className="auth-features">
            <div className="auth-feature-item">
              <div className="auth-feature-icon">
                <TrendingUp className="w-5 h-5 text-accent" />
              </div>
              <p className="auth-feature-text">
                Análise de performance em tempo real
              </p>
            </div>
            <div className="auth-feature-item">
              <div className="auth-feature-icon">
                <Target className="w-5 h-5 text-accent" />
              </div>
              <p className="auth-feature-text">
                Cálculo automático de ROAS e lucro
              </p>
            </div>
            <div className="auth-feature-item">
              <div className="auth-feature-icon">
                <Shield className="w-5 h-5 text-accent" />
              </div>
              <p className="auth-feature-text">
                Dados seguros e protegidos
              </p>
            </div>
          </div>
        </motion.div>
      </div>
      <SubscriptionPlanModal
        open={showPlanModal}
        onOpenChange={(open) => {
          setShowPlanModal(open);
          if (!open) {
            setLoading(false);
          }
        }}
        initialPlanId={selectedPlan}
        onPlanSelected={(planId) => setSelectedPlan(planId)}
        customerData={checkoutPrefill || undefined}
      />
    </div>
  );
};

export default SubscriptionPage;
