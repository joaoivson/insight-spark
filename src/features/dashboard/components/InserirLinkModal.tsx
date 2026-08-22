import { useEffect, useMemo, useState } from "react";
import { Link2, Loader2, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getUserLinks, type CustomLink } from "@/services/custom_link.service";

/** Mesma regra de domínio usada na tela Meus Links. */
const baseDoLink = () => {
  const host = window.location.hostname;
  if (host.includes("hml")) return "hml.marketdash.com.br/l/";
  if (host.includes("marketdash.com.br")) return "marketdash.com.br/l/";
  return `${host}:${window.location.port}/l/`;
};

export const InserirLinkModal = ({
  aberto,
  onFechar,
  onInserir,
}: {
  aberto: boolean;
  onFechar: () => void;
  onInserir: (url: string) => void;
}) => {
  const [links, setLinks] = useState<CustomLink[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [manual, setManual] = useState("");
  const [busca, setBusca] = useState("");

  useEffect(() => {
    if (!aberto) return;
    setBusca("");
    setCarregando(true);
    getUserLinks()
      .then(setLinks)
      // Sem links (ou plano sem acesso a Meus Links) não é erro: a aluna ainda
      // pode colar um link manualmente.
      .catch(() => setLinks([]))
      .finally(() => setCarregando(false));
  }, [aberto]);

  // Com dezenas de links em Meus Links, rolar a lista não escala — busca por
  // nome e por slug, que é como a aluna lembra do link ("limpadorpatas").
  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return links;
    return links.filter(
      (l) =>
        (l.name || "").toLowerCase().includes(termo) ||
        (l.slug || "").toLowerCase().includes(termo),
    );
  }, [links, busca]);

  const inserir = (url: string) => {
    const limpo = url.trim();
    if (!limpo) return;
    onInserir(limpo);
    setManual("");
    onFechar();
  };

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Inserir link</DialogTitle>
          <DialogDescription>
            Escolha um dos seus links encurtados ou cole um endereço.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {carregando ? (
            <div className="flex items-center justify-center py-6 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando seus links…
            </div>
          ) : links.length > 0 ? (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por nome ou slug"
                  className="pl-9"
                  aria-label="Buscar link por nome ou slug"
                />
              </div>
              {filtrados.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Nenhum link com “{busca}”.
                </p>
              ) : (
              <div className="max-h-56 divide-y divide-border overflow-y-auto rounded-xl border border-border">
              {filtrados.map((link) => {
                const url = `https://${baseDoLink()}${link.slug}`;
                return (
                  <button
                    key={link.id}
                    type="button"
                    onClick={() => inserir(url)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent/40"
                  >
                    <Link2 className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-foreground">{link.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{url}</span>
                    </span>
                  </button>
                );
              })}
              </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Você ainda não tem links salvos em Meus Links.
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="link-manual">Ou cole um link</Label>
            <div className="flex gap-2">
              <Input
                id="link-manual"
                placeholder="https://..."
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    inserir(manual);
                  }
                }}
              />
              <Button onClick={() => inserir(manual)} disabled={!manual.trim()}>
                Inserir
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
