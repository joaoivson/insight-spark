import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/shared/lib/utils";
import { useNavigationTracker, getNavigationHistory } from "@/shared/hooks/useNavigationTracker";
import { useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const FEEDBACK_EMAIL =
  import.meta.env.VITE_FEEDBACK_EMAIL || "relacionamento@marketdash.com.br";

const CHALLENGE_OPTIONS = [
  "Organizar dados de vários canais",
  "Entender quais produtos vendem mais",
  "Controlar custos de anúncios vs. lucro",
  "Acompanhar comissões e faturamento",
  "Tomar decisões rápidas com dados",
  "Outro",
];

export const FeedbackFloatingButton = () => {
  const { canShowFeedback } = useNavigationTracker();
  const location = useLocation();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [nextFeatureWish, setNextFeatureWish] = useState("");
  const [mainChallenge, setMainChallenge] = useState("");
  const [recommendationTip, setRecommendationTip] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) {
      toast({
        title: "Avaliação obrigatória",
        description: "Por favor, nos diga como está sua experiência (1 a 5).",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const history = getNavigationHistory();
      const formData = new FormData();
      formData.append("_subject", "Feedback - MarketDash");
      formData.append("_template", "box");
      formData.append("_captcha", "false");
      formData.append("rating", String(rating));
      formData.append("next_feature_wish", nextFeatureWish || "-");
      formData.append("main_challenge", mainChallenge || "-");
      formData.append("recommendation_tip", recommendationTip || "-");
      formData.append("comment", comment || "-");
      formData.append(
        "navigation_history",
        history.length ? history.join(" → ") : location.pathname
      );
      formData.append("current_page", location.pathname);
      formData.append(
        "referrer",
        typeof document !== "undefined" ? document.referrer || "(direto)" : "(direto)"
      );
      formData.append("timestamp", new Date().toISOString());

      const res = await fetch(`https://formsubmit.co/${FEEDBACK_EMAIL}`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Falha ao enviar");

      setRating(null);
      setNextFeatureWish("");
      setMainChallenge("");
      setRecommendationTip("");
      setComment("");
      setOpen(false);
      toast({
        title: "Obrigado pelo seu feedback!",
        description: "Sua opinião faz a diferença para crescer junto com você.",
      });
    } catch {
      toast({
        title: "Erro ao enviar",
        description: "Não foi possível enviar seu feedback. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!canShowFeedback) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Enviar feedback"
        className={cn(
          "fixed bottom-6 right-24 z-40 flex h-12 items-center gap-2 rounded-full px-4 py-2",
          "bg-primary text-primary-foreground text-sm font-medium shadow-lg shadow-primary/30",
          "transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-primary/40",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        )}
      >
        <span>Enviar feedback</span>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Ajude a crescer conosco</SheetTitle>
            <SheetDescription>
              Suas respostas nos guiam para construir um MarketDash cada vez melhor para o seu negócio.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="rating">
                De 1 a 5, como está sua experiência até agora?
              </Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    className={cn(
                      "h-10 w-10 rounded-lg border-2 text-sm font-medium transition-colors",
                      rating === n
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:border-primary/50 hover:bg-primary/5"
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nextFeatureWish">
                Que funcionalidade faria mais diferença para o seu negócio?
              </Label>
              <textarea
                id="nextFeatureWish"
                value={nextFeatureWish}
                onChange={(e) => setNextFeatureWish(e.target.value)}
                rows={2}
                placeholder="Ex: Um relatório que mostre..."
                className={cn(
                  "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
                  "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  "disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mainChallenge">
                Qual é o maior desafio ao gerenciar suas vendas?
              </Label>
              <select
                id="mainChallenge"
                value={mainChallenge}
                onChange={(e) => setMainChallenge(e.target.value)}
                className={cn(
                  "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  "disabled:cursor-not-allowed disabled:opacity-50"
                )}
              >
                <option value="">Selecione...</option>
                {CHALLENGE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recommendationTip">
                O que faria você recomendar o MarketDash para outro vendedor?
              </Label>
              <textarea
                id="recommendationTip"
                value={recommendationTip}
                onChange={(e) => setRecommendationTip(e.target.value)}
                rows={2}
                placeholder="Ex: Se tivesse..."
                className={cn(
                  "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
                  "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  "disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="comment">Algo mais que queira compartilhar? (opcional)</Label>
              <textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                placeholder="Sugestões, ideias ou comentários..."
                className={cn(
                  "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
                  "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  "disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                )}
              />
            </div>

            <div className="pt-2">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Enviando..." : "Enviar feedback"}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
};
