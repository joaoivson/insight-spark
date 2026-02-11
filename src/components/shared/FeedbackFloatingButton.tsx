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
import { useNavigationTracker } from "@/shared/hooks/useNavigationTracker";
import { useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl, fetchWithAuth } from "@/core/config/api.config";
import { userStorage } from "@/shared/lib/storage";
import type { User } from "@/shared/types";

const CHALLENGE_OPTIONS = [
  "Organizar dados de vários canais",
  "Entender quais produtos vendem mais",
  "Controlar custos de anúncios vs. lucro",
  "Acompanhar comissões e faturamento",
  "Tomar decisões rápidas com dados",
  "Outro",
];

const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: "sugestao", label: "Sugestão" },
  { value: "problema", label: "Problema" },
  { value: "duvida", label: "Dúvida" },
  { value: "outro", label: "Outro" },
];

export const FeedbackFloatingButton = () => {
  const { canShowFeedback } = useNavigationTracker();
  const location = useLocation();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [category, setCategory] = useState("sugestao");
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
      const user = userStorage.get() as User | null;
      const pathSegments = location.pathname.split("/").filter(Boolean);
      const page = pathSegments.length > 0 ? pathSegments[pathSegments.length - 1] : location.pathname.replace(/^\//, "") || "app";

      const messageParts: string[] = [];
      if (nextFeatureWish.trim()) messageParts.push(`Próxima funcionalidade: ${nextFeatureWish.trim()}`);
      if (mainChallenge) messageParts.push(`Maior desafio: ${mainChallenge}`);
      if (recommendationTip.trim()) messageParts.push(`O que faria recomendar: ${recommendationTip.trim()}`);
      if (comment.trim()) messageParts.push(`Comentário: ${comment.trim()}`);
      const message = messageParts.length > 0 ? messageParts.join("\n") : "Sem texto adicional.";

      const payload = {
        data: {
          message,
          rating,
          category,
          page,
          next_feature_wish: nextFeatureWish.trim(),
          main_challenge: mainChallenge,
          recommendation_tip: recommendationTip.trim(),
          comment: comment.trim(),
        },
        name: user?.nome ?? "",
        email: user?.email ?? "",
      };

      const url = getApiUrl("/api/v1/feedback");
      const res = await fetchWithAuth(url, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Falha ao enviar");

      let result: unknown;
      const contentType = res.headers.get("Content-Type");
      if (contentType?.includes("application/json")) {
        result = await res.json();
      }

      setRating(null);
      setCategory("sugestao");
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
          "fixed bottom-6 right-6 z-40 flex h-12 items-center gap-2 rounded-full px-4 py-2",
          "bg-secondary text-secondary-foreground border border-border text-sm font-medium",
          "ring-2 ring-white/90 shadow-lg shadow-black/10",
          "transition-all duration-300 hover:scale-105 hover:bg-secondary/80",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
              <Label htmlFor="category">Tipo de feedback</Label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={cn(
                  "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  "disabled:cursor-not-allowed disabled:opacity-50"
                )}
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
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
