import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart3, Mail, Lock, ArrowRight, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { loginService } from "../services";
import { userStorage, tokenStorage } from "@/shared/lib/storage";
import { getApiUrl, fetchWithAuth } from "@/core/config/api.config";
import { APP_CONFIG } from "@/core/config/app.config";
import { caktoService } from "@/services/cakto.service";
import "../styles/index.scss";
import logoName from "@/assets/logo/logo_name.png";
import logoIcon from "@/assets/logo/logo.png";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Mostrar mensagem se vier de redirecionamento (ex: após definir senha)
  useEffect(() => {
    if (location.state?.message) {
      toast({
        title: "Sucesso!",
        description: location.state.message,
      });
      // Limpar state para não mostrar novamente
      window.history.replaceState({}, document.title);
    }
  }, [location.state, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await loginService({
        email: email,
        senha: password,
      });

      if (result.success && result.token) {
        // Se o backend retornou o usuário junto com o token, usamos diretamente.
        if (result.user) {
          tokenStorage.set(result.token);
          // Marcar quando o token foi criado para evitar remoção prematura
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('token_created_at', Date.now().toString());
          }
          userStorage.set({
            id: String(result.user.id ?? ""),
            nome: (result.user as any).name ?? (result.user as any).nome ?? "",
            name: (result.user as any).name ?? (result.user as any).nome ?? "",
            cpf_cnpj: (result.user as any).cpf_cnpj,
            email: result.user.email,
            created_at: (result.user as any).created_at,
            updated_at: (result.user as any).updated_at,
          });
        } else {
          // Fallback: buscar perfil usando o token recém-recebido
          // Temporariamente definir o token no storage para fetchWithAuth funcionar
          tokenStorage.set(result.token);
          // Marcar quando o token foi criado para evitar remoção prematura
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('token_created_at', Date.now().toString());
          }
          const meResponse = await fetchWithAuth(getApiUrl("/api/v1/auth/me"));
          const me = await meResponse.json().catch(() => null);
          if (!meResponse.ok || !me) {
            throw new Error(me?.detail || me?.error || "Não foi possível obter o perfil");
          }
          tokenStorage.set(result.token);
          userStorage.set({
            id: String(me.id ?? ""),
            nome: me.name ?? me.nome ?? "",
            name: me.name ?? me.nome ?? "",
            cpf_cnpj: me.cpf_cnpj,
            email: me.email,
            created_at: me.created_at,
            updated_at: me.updated_at,
          });
        }

        toast({
          title: "Login realizado com sucesso!",
          description: `Bem-vindo de volta!`,
        });

        navigate(APP_CONFIG.ROUTES.DASHBOARD);
      } else {
        throw new Error(result.error || "Erro ao fazer login");
      }
    } catch (error) {
      toast({
        title: "Erro ao fazer login",
        description: error instanceof Error ? error.message : "Email ou senha inválidos. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
            Bem-vindo de volta
          </h1>
          <p className="auth-subtitle">
            Entre na sua conta para acessar o dashboard
          </p>

          <form onSubmit={handleSubmit} className="auth-form">
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
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="auth-toggle-password"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="auth-remember">
              <label className="auth-remember-checkbox">
                <input type="checkbox" className="rounded border-border" />
                <span className="text-muted-foreground">Lembrar de mim</span>
              </label>
              <Link to="/auth/forgot-password" className="auth-link">
                Esqueceu a senha?
              </Link>
            </div>

            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={isLoading}>
              {isLoading ? "Entrando..." : "Entrar"}
              <ArrowRight className="w-5 h-5" />
            </Button>
          </form>

          <div className="auth-footer">
            Não tem assinatura?{" "}
            <button
              onClick={async () => {
                try {
                  const user = userStorage.get() as { email?: string; name?: string; cpf_cnpj?: string } | null;
                  if (user) {
                    await caktoService.redirectToCheckout({
                      email: user.email,
                      name: user.name,
                      cpf_cnpj: user.cpf_cnpj,
                    });
                  } else {
                    caktoService.redirectToCheckoutDirect();
                  }
                } catch (error) {
                  console.error('Erro ao redirecionar para checkout:', error);
                }
              }}
              className="auth-link auth-link--medium"
            >
              Assinar agora
            </button>
          </div>
        </motion.div>
      </div>

      {/* Right Side - Decorative */}
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
            Transforme dados em decisões
          </h2>
          <p className="auth-decorative-text">
            Acesse dashboards interativos, relatórios detalhados e filtros avançados para otimizar suas vendas.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;

