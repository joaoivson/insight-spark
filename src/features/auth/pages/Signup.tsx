import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart3, Mail, Lock, User, ArrowRight, Eye, EyeOff, Check, IdCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { signupService, loginService } from "../services";
import { userStorage, tokenStorage } from "@/shared/lib/storage";
import { APP_CONFIG } from "@/core/config/app.config";
import "../styles/index.scss";
import logoName from "@/assets/logo/logo_name.png";
import logoIcon from "@/assets/logo/logo.png";

const Signup = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await signupService({
        nome: name,
        email: email,
        cpfCnpj,
        senha: password,
      });

      if (result.success && result.user) {
        // Armazena usuário criado
        userStorage.set({
          id: String((result.user as any).id),
          nome: (result.user as any).name || (result.user as any).nome || name,
          cpf_cnpj: (result.user as any).cpf_cnpj,
          email: result.user.email,
          created_at: (result.user as any).created_at,
          updated_at: (result.user as any).updated_at,
        });

        // Realiza login para obter token
        const loginResult = await loginService({ email, senha: password });
        if (loginResult.success && loginResult.token) {
          tokenStorage.set(loginResult.token);
        }

        toast({
          title: "Conta criada com sucesso!",
          description: `Bem-vindo, ${name}!`,
        });

        navigate(APP_CONFIG.ROUTES.DASHBOARD);
      } else {
        throw new Error(result.error || "Erro ao criar conta");
      }
    } catch (error) {
      toast({
        title: "Erro ao criar conta",
        description: error instanceof Error ? error.message : "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    "Upload ilimitado de CSVs",
    "Dashboards em tempo real",
    "Filtros avançados",
    "Suporte prioritário",
  ];

  return (
    <div className="auth-container">
      {/* Left Side - Decorative */}
      <div className="auth-decorative-side">
        <div className="auth-decorative-gradient" />
        <div className="auth-decorative-blob auth-decorative-blob--large auth-decorative-blob--top-left" />
        <div className="auth-decorative-blob auth-decorative-blob--small auth-decorative-blob--bottom-right" />
        
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
            Comece sua jornada de dados
          </h2>
          <p className="auth-decorative-text">
            Junte-se a vendedores digitais que já transformam seus dados em resultados.
          </p>

          <div className="auth-features">
            {features.map((feature, index) => (
              <motion.div
                key={feature}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                className="auth-feature-item"
              >
                <div className="auth-feature-icon">
                  <Check className="w-3 h-3 text-accent" />
                </div>
                <span className="auth-feature-text">{feature}</span>
              </motion.div>
            ))}
          </div>

          <div className="auth-pricing-card">
            <div className="auth-pricing-amount">
              <span>R$ 67</span>
              <span className="auth-pricing-period">/mês</span>
            </div>
            <p className="auth-pricing-description">
              Acesso completo a todas as funcionalidades
            </p>
          </div>
        </motion.div>
      </div>

      {/* Right Side - Form */}
      <div className="auth-form-side">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
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
            Criar sua conta
          </h1>
          <p className="auth-subtitle">
            Preencha os dados abaixo para começar
          </p>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-form-group">
              <Label htmlFor="name">Nome completo</Label>
              <div className="auth-input-wrapper">
                <User className="auth-input-icon" />
                <Input
                  id="name"
                  type="text"
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
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
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="auth-input"
                  required
                />
              </div>
            </div>

            <div className="auth-form-group">
              <Label htmlFor="cpfCnpj">CPF ou CNPJ</Label>
              <div className="auth-input-wrapper">
                <IdCard className="auth-input-icon" />
                <Input
                  id="cpfCnpj"
                  type="text"
                  placeholder="000.000.000-00"
                  value={cpfCnpj}
                  onChange={(e) => setCpfCnpj(e.target.value)}
                  className="auth-input"
                  required
                />
              </div>
            </div>

            <div className="auth-form-group">
              <Label htmlFor="password">Senha</Label>
              <div className="auth-input-wrapper">
                <Lock className="auth-input-icon" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="auth-input auth-input--with-toggle"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="auth-toggle-password"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Mínimo de 8 caracteres</p>
            </div>

            <div className="flex items-start gap-2">
              <input type="checkbox" id="terms" className="mt-1 rounded border-border" required />
              <label htmlFor="terms" className="text-sm text-muted-foreground">
                Eu concordo com os{" "}
                <Link to="/terms" className="auth-link">Termos de Uso</Link>
                {" "}e{" "}
                <Link to="/privacy" className="auth-link">Política de Privacidade</Link>
              </label>
            </div>

            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={isLoading}>
              {isLoading ? "Criando conta..." : "Criar Conta"}
              <ArrowRight className="w-5 h-5" />
            </Button>
          </form>

          <div className="auth-footer">
            Já tem uma conta?{" "}
            <Link to={APP_CONFIG.ROUTES.LOGIN} className="auth-link auth-link--medium">
              Fazer login
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Signup;

