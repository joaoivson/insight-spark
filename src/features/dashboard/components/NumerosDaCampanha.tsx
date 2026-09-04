import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Smartphone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckboxQuadrado } from "@/components/shared/CheckboxQuadrado";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/shared/lib/utils";
import { mensagemAmigavel } from "@/services/http-error";
import {
  definirNumerosDaCampanha,
  listarNumerosDaCampanha,
  type NumeroDaCampanha,
} from "@/services/campanhas_grupos.service";

const ERRO_CARGA = "Não foi possível carregar os números. Tente novamente.";
const ERRO_SALVAR = "Não foi possível salvar os números. Tente novamente.";

/** Assinatura do conjunto selecionado — é o que o PUT persiste, então define "sujo". */
const assinatura = (ids: Set<number>) => [...ids].sort((a, b) => a - b).join(",");

const ROTULO_STATUS: Record<string, string> = {
  conectada: "Conectado",
  desconectada: "Desconectado",
  criada: "Aguardando conexão",
  removida: "Removido",
};

const StatusDoNumero = ({ status }: { status: string }) => (
  <Badge
    variant="outline"
    className={cn(
      "flex-shrink-0 text-[11px] font-normal",
      status === "conectada" && "border-emerald-500/25 bg-emerald-500/10 text-emerald-500",
      status === "desconectada" && "border-destructive/25 bg-destructive/10 text-destructive",
    )}
  >
    {ROTULO_STATUS[status] ?? status}
  </Badge>
);

/**
 * Aba "Números": quais números esta campanha usa.
 *
 * Não é cosmético. A aba Grupos oferece só grupos destes números — sem isso ela
 * listava grupos de TODOS os números conectados, e um grupo do número A numa
 * campanha que dispara pelo B faz o envio falhar em silêncio.
 */
export const NumerosDaCampanha = ({
  campanhaId,
  onSalvo,
}: {
  campanhaId: number;
  /** A aba Grupos depende deste conjunto — recarrega o detalhe ao salvar. */
  onSalvo?: () => void;
}) => {
  const { toast } = useToast();
  const [numeros, setNumeros] = useState<NumeroDaCampanha[]>([]);
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [baseline, setBaseline] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);

  const aplicar = useCallback((lista: NumeroDaCampanha[]) => {
    setNumeros(lista);
    const marcados = new Set(lista.filter((n) => n.selecionado).map((n) => n.id));
    setSelecionados(marcados);
    setBaseline(assinatura(marcados));
  }, []);

  // Guarda contra resposta obsoleta: a resposta de uma campanha antiga não pode
  // cair em cima da tela de outra, nem setar estado depois do unmount.
  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setErro(null);
    listarNumerosDaCampanha(campanhaId)
      .then((lista) => {
        if (!ativo) return;
        aplicar(lista);
        setErro(null);
      })
      .catch((e) => ativo && setErro(mensagemAmigavel(e, ERRO_CARGA)))
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [campanhaId, aplicar, tentativa]);

  const alternar = (id: number) => {
    setSelecionados((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });
  };

  const sujo = assinatura(selecionados) !== baseline;

  const salvar = async () => {
    setSalvando(true);
    try {
      aplicar(await definirNumerosDaCampanha(campanhaId, [...selecionados]));
      toast({ title: "Números salvos" });
      onSalvo?.();
    } catch (e) {
      // O 409 já vem com o texto pronto do backend, nomeando os grupos que
      // travam a remoção e dizendo onde resolvê-los. Texto genérico aqui
      // esconderia exatamente a informação que destrava a afiliada.
      toast({
        title: "Não foi possível salvar os números",
        description: mensagemAmigavel(e, ERRO_SALVAR),
        variant: "destructive",
      });
      // Volta ao que o SERVIDOR tem. Sem isto a tela ficava num estado que não
      // existe em lugar nenhum: checkbox desmarcado, "Alterações não salvas"
      // aceso e "1 grupo nesta campanha" logo abaixo — que se lê como "o
      // bloqueio não funcionou", quando ele funcionou e recusou a mudança.
      setSelecionados(new Set(numeros.filter((n) => n.selecionado).map((n) => n.id)));
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (erro) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-sm text-muted-foreground">{erro}</p>
          <Button variant="outline" onClick={() => setTentativa((n) => n + 1)}>
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  // "Nenhum número CADASTRADO" e "cadastrado mas nenhum conectado" são estados
  // diferentes e pedem ações diferentes. Tratá-los como um só mandava a
  // afiliada conectar um chip que ela já tinha — e escondia o que resolvia.
  if (numeros.length === 0 || numeros.every((n) => n.status !== "conectada")) {
    const nenhumCadastrado = numeros.length === 0;
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <span className="rounded-full bg-accent/10 p-3">
            <Smartphone className="h-6 w-6 text-accent" aria-hidden />
          </span>
          <p className="max-w-md text-sm text-muted-foreground">
            {nenhumCadastrado
              ? "Nenhum número conectado ainda. Conecte um número para esta campanha poder enviar mensagens e receber entradas."
              : "Seus números estão desconectados — os envios desta campanha estão pausados. Os grupos continuam recebendo gente pelo link de entrada."}
          </p>
          <Button asChild variant="outline">
            <Link to="/dashboard/configuracoes?tab=whatsapp">
              {nenhumCadastrado ? "Conectar número" : "Reconectar número"}
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="max-w-xl text-xs text-muted-foreground">
          A campanha só usa os números marcados aqui — e a aba Grupos só oferece os
          grupos deles.
        </p>
        <div className="flex flex-shrink-0 items-center gap-3">
          {sujo && <span className="text-xs text-amber-500">Alterações não salvas</span>}
          <Button onClick={() => void salvar()} disabled={!sujo || salvando}>
            {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </div>
      </div>

      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
        {numeros.map((n) => (
          <label
            key={n.id}
            className="flex min-h-[56px] cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/40"
          >
            <CheckboxQuadrado
              checked={selecionados.has(n.id)}
              onCheckedChange={() => alternar(n.id)}
              disabled={salvando}
              aria-label={`Usar ${n.nome_exibicao ?? "número"} nesta campanha`}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-foreground">
                {n.nome_exibicao ?? `Número ${n.id}`}
              </span>
              <span className="block truncate text-[11px] text-muted-foreground">
                {n.numero ?? "sem número"}
                {/* Só para número MARCADO: o contador vem do servidor e não muda
                    ao desmarcar, então mostrá-lo na linha desmarcada dava
                    "número desmarcado + 1 grupo nesta campanha" — a leitura de
                    que o desmarcar não pegou. */}
                {selecionados.has(n.id) && n.grupos_na_campanha > 0 && (
                  <>
                    {" · "}
                    <span className="tabular-nums">{n.grupos_na_campanha}</span>{" "}
                    {n.grupos_na_campanha === 1 ? "grupo" : "grupos"} nesta campanha
                  </>
                )}
                {/* Desmarcar um número que serve grupos é bloqueado no salvar
                    (409). Avisar aqui, na hora, evita a ida e volta. */}
                {!selecionados.has(n.id) && n.selecionado && n.grupos_na_campanha > 0 && (
                  <>
                    {" · "}
                    <span className="text-amber-500">
                      {n.grupos_na_campanha === 1
                        ? "1 grupo depende dele"
                        : `${n.grupos_na_campanha} grupos dependem dele`}
                    </span>
                  </>
                )}
              </span>
            </span>
            <StatusDoNumero status={n.status} />
          </label>
        ))}
      </div>
    </div>
  );
};
