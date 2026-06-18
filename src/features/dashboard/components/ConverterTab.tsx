import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/shared/lib/utils";
import { convertShopeeLink } from "@/services/shopee_short_link.service";
import {
  Link2,
  Copy,
  Check,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

interface ConverterTabProps {
  onConvert: (shortLink: string) => void;
}

const MIN_URL_LENGTH = 8;

export default function ConverterTab({ onConvert }: ConverterTabProps) {
  const { toast } = useToast();

  const [originUrl, setOriginUrl] = useState("");
  const [subId, setSubId] = useState("");
  const [loading, setLoading] = useState(false);
  const [shortLink, setShortLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const urlReady = originUrl.trim().length >= MIN_URL_LENGTH;
  const hasSubId = subId.trim().length > 0;

  // Sub ID aceita apenas [A-Za-z0-9] — sanitiza enquanto digita.
  const handleSubIdChange = (value: string) => {
    setSubId(value.replace(/[^A-Za-z0-9]/g, ""));
  };

  const handleGenerate = async () => {
    // Guard contra duplo clique / URL curta.
    if (loading || !urlReady) return;

    setLoading(true);
    try {
      const result = await convertShopeeLink({
        originUrl: originUrl.trim(),
        subId: hasSubId ? subId.trim() : undefined,
      });
      setShortLink(result.shortLink);
      setCopied(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao gerar link de afiliado";
      toast({
        title: "Não foi possível gerar o link",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!shortLink) return;
    try {
      await navigator.clipboard.writeText(shortLink);
      setCopied(true);
      toast({ title: "Link copiado" });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Não foi possível copiar",
        description: "Copie o link manualmente.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
      {/* Coluna esquerda: formulário */}
      <div className="space-y-4 rounded-lg border border-border bg-card p-5 md:p-6">
        <div className="space-y-1">
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <Link2 className="h-4 w-4 text-primary" />
            Gerar link de afiliado
          </h3>
          <p className="text-sm text-muted-foreground">
            Cole o link de um produto da Shopee para gerar seu link de afiliado.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="converter-origin-url">Link do produto (Shopee)</Label>
          <Input
            id="converter-origin-url"
            type="url"
            inputMode="url"
            autoComplete="off"
            placeholder="https://shopee.com.br/..."
            value={originUrl}
            onChange={(e) => setOriginUrl(e.target.value)}
            leftIcon={<Link2 className="h-4 w-4" />}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="converter-sub-id">Sub ID (opcional)</Label>
          <Input
            id="converter-sub-id"
            placeholder="Ex: campanha01"
            value={subId}
            onChange={(e) => handleSubIdChange(e.target.value)}
            autoComplete="off"
          />
          <p className="text-xs text-muted-foreground">
            Use o Sub ID para rastrear a origem das vendas. Apenas letras e
            números.
          </p>
        </div>

        {/* Aviso: gerar sem Sub ID não permite rastreio (mas deixa gerar). */}
        {urlReady && !hasSubId && (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-600 dark:text-amber-400">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            <span>
              Sem Sub ID não dá pra rastrear. Se for pra anúncio, coloque um Sub
              ID.
            </span>
          </div>
        )}

        <Button
          onClick={handleGenerate}
          disabled={!urlReady || loading}
          loading={loading}
          loadingText="Gerando..."
          className="w-full"
        >
          <Sparkles className="h-4 w-4" />
          Gerar link de afiliado
        </Button>
      </div>

      {/* Coluna direita: resultado / empty / loading */}
      <div className="space-y-4 rounded-lg border border-border bg-card p-5 md:p-6">
        {shortLink ? (
          /* Estado: resultado */
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Check className="h-4 w-4" />
              Link gerado
            </div>

            {/* Card de resultado destacado (paleta selecionada — azul translúcido). */}
            <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
              <p className="text-xs font-medium text-muted-foreground">
                Seu link de afiliado
              </p>
              <button
                type="button"
                onClick={handleCopy}
                className="group flex w-full items-center gap-2 rounded-md border border-border bg-background px-3 py-2.5 text-left transition-colors duration-150 hover:border-primary/40 hover:bg-primary/5"
              >
                <Link2 className="h-4 w-4 flex-shrink-0 text-primary" />
                <span className="min-w-0 flex-1 truncate text-sm text-primary">
                  {shortLink}
                </span>
                {copied ? (
                  <Check className="h-4 w-4 flex-shrink-0 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4 flex-shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                )}
              </button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="w-full"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copiar link
                  </>
                )}
              </Button>
            </div>

            {/* Nota explicativa. */}
            <div className="flex items-start gap-2 rounded-md border border-border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
              <ExternalLink className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              <span>
                Esse link vai direto pro produto. Pra usar em anúncio e
                acompanhar resultados, crie um link rastreável.
              </span>
            </div>

            <Button
              onClick={() => onConvert(shortLink)}
              className="w-full"
            >
              Criar link rastreável com este
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        ) : loading ? (
          /* Estado: loading */
          <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-5 w-5 animate-pulse text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              Gerando seu link de afiliado...
            </p>
          </div>
        ) : (
          /* Estado: empty */
          <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Link2 className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Seu link aparece aqui</p>
              <p className="max-w-[240px] text-xs text-muted-foreground">
                Preencha o link do produto e gere seu link de afiliado.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
