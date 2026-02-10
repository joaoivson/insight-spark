import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Eye, EyeOff, CheckCircle2, BarChart3, Shield, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { passwordService } from "../services";
import { APP_CONFIG } from "@/core/config/app.config";
import "../styles/index.scss";
import logoName from "@/assets/logo/logo_name.png";
import logoIcon from "@/assets/logo/logo.png";

const SetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong'>('weak');

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('Token inválido ou ausente. Verifique o link do email.');
    }
  }, [token]);

  // Calcular força da senha
  useEffect(() => {
    if (!password) {
      setPasswordStrength('weak');
      return;
    }

    let strength = 0;
    if (password.length >= 8) strength++;
    if (/(?=.*[a-z])/.test(password)) strength++;
    if (/(?=.*[A-Z])/.test(password)) strength++;
    if (/(?=.*\d)/.test(password)) strength++;
    if (/(?=.*[@$!%*?&])/.test(password)) strength++;

    if (strength <= 2) setPasswordStrength('weak');
    else if (strength === 3) setPasswordStrength('medium');
    else setPasswordStrength('strong');
  }, [password]);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) {
      return 'A senha deve ter no mínimo 8 caracteres';
    }
    if (!/(?=.*[a-z])/.test(pwd)) {
      return 'A senha deve conter pelo menos uma letra minúscula';
    }
    if (!/(?=.*[A-Z])/.test(pwd)) {
      return 'A senha deve conter pelo menos uma letra maiúscula';
    }
    if (!/(?=.*\d)/.test(pwd)) {
      return 'A senha deve conter pelo menos um número';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('Token inválido');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    const validationError = validatePassword(password);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      await passwordService.setPassword(token, password);
      setSuccess(true);
      
      toast({
        title: "Senha definida com sucesso!",
        description: "Você pode fazer login agora.",
      });

      setTimeout(() => {
        navigate(APP_CONFIG.ROUTES.LOGIN, {
          state: { message: 'Senha definida com sucesso! Faça login para continuar.' }
        });
      }, 2000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao definir senha. Tente novamente.';
      
      if (errorMessage.includes('Token inválido') || errorMessage.includes('expirado')) {
        setError('Este link expirou ou é inválido. Por favor, solicite um novo link.');
      } else if (errorMessage.includes('já foi utilizado')) {
        setError('Este link já foi utilizado. Você já pode fazer login com sua senha.');
        setTimeout(() => {
          navigate(APP_CONFIG.ROUTES.LOGIN);
        }, 3000);
      } else if (errorMessage.includes('mínimo 8 caracteres')) {
        setError('A senha deve ter no mínimo 8 caracteres.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="auth-container">
        <div className="auth-form-side">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="auth-form-wrapper"
          >
            <Link to={APP_CONFIG.ROUTES.HOME} className="auth-logo">
              <img src={logoIcon} alt="Logo MarketDash" className="auth-logo-icon brand-logo-mark" />
              <img src={logoName} alt="MarketDash" className="auth-logo-name brand-logo-name" />
            </Link>

            <h1 className="auth-title">Token Inválido</h1>
            <p className="auth-subtitle">
              O link que você acessou é inválido ou expirou.
            </p>
            <p className="text-muted-foreground mb-6">
              Por favor, solicite um novo link ou entre em contato com o suporte.
            </p>
            <div className="flex flex-col gap-3">
              <Button onClick={() => navigate('/auth/forgot-password')} variant="hero" size="lg" className="w-full">
                Solicitar Novo Link
                <ArrowRight className="w-5 h-5" />
              </Button>
              <Button onClick={() => navigate(APP_CONFIG.ROUTES.LOGIN)} variant="outline" size="lg" className="w-full">
                Voltar ao Login
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="auth-container">
        <div className="auth-form-side">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="auth-form-wrapper"
          >
            <Link to={APP_CONFIG.ROUTES.HOME} className="auth-logo">
              <img src={logoIcon} alt="Logo MarketDash" className="auth-logo-icon brand-logo-mark" />
              <img src={logoName} alt="MarketDash" className="auth-logo-name brand-logo-name" />
            </Link>

            <div className="text-center space-y-6">
              <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto" />
              <div>
                <h1 className="auth-title">Senha Definida com Sucesso!</h1>
                <p className="auth-subtitle">
                  Redirecionando para a página de login...
                </p>
              </div>
            </div>
          </motion.div>
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
            Definir Senha
          </h1>
          <p className="auth-subtitle">
            Por favor, defina uma senha para acessar sua conta
          </p>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-form-group">
              <Label htmlFor="password">Nova Senha</Label>
              <div className="auth-input-wrapper">
                <Lock className="auth-input-icon" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
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
              {password && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`flex-1 h-2 rounded-full ${
                      passwordStrength === 'weak' ? 'bg-destructive' :
                      passwordStrength === 'medium' ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`} />
                    <span className="text-xs text-muted-foreground">
                      {passwordStrength === 'weak' ? 'Fraca' :
                       passwordStrength === 'medium' ? 'Média' :
                       'Forte'}
                    </span>
                  </div>
                  <small className="text-xs text-muted-foreground">
                    A senha deve conter: mínimo 8 caracteres, letra maiúscula, minúscula e número
                  </small>
                </div>
              )}
            </div>

            <div className="auth-form-group">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <div className="auth-input-wrapper">
                <Lock className="auth-input-icon" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Digite a senha novamente"
                  className="auth-input auth-input--with-toggle"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="auth-toggle-password"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading || !password || !confirmPassword}>
              {loading ? "Definindo senha..." : "Definir Senha"}
              <ArrowRight className="w-5 h-5" />
            </Button>
          </form>

          <div className="auth-footer">
            <Link to={APP_CONFIG.ROUTES.LOGIN} className="auth-link auth-link--medium">
              Voltar ao Login
            </Link>
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
            <Shield className="w-10 h-10 text-accent" />
          </div>
          <h2 className="auth-decorative-title">
            Segurança em primeiro lugar
          </h2>
          <p className="auth-decorative-text">
            Defina uma senha forte para proteger sua conta e seus dados. Use uma combinação de letras, números e caracteres especiais.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default SetPasswordPage;
