import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataCard } from "@/components/shared/DataCard";
import type { GrupoWhatsapp } from "@/services/whatsapp_conexoes.service";
import { fragmentoDoJid, nomesDuplicados, rotuloDoGrupo } from "@/shared/lib/grupo";

const POR_PAGINA_PADRAO = 25;
const OPCOES_POR_PAGINA = [25, 50, 100];

type Props = {
  grupos: GrupoWhatsapp[];
  /** Ativar liga o grupo ao funil (nasce sub_id + link) e conta no limite do
   *  plano; desativar é só a flag — nada é apagado, por isso não há confirmação. */
  onAlternarAtivado: (grupo: GrupoWhatsapp, ativado: boolean) => void;
};

/**
 * Lista de grupos com o toggle "Ativo": tabela de 3 colunas no desktop,
 * DataCard no mobile. Busca e filtro de estado ficam em quem usa — aqui é a
 * apresentação, compartilhada entre a página do número e o bloco de grupos
 * sem dispositivo.
 *
 * **Paginada.** O sync traz TODOS os grupos do WhatsApp da pessoa (493 num
 * teste real, 1 deles de trabalho) e o scroll infinito não dá como voltar a
 * um grupo que se passou. 25 por página, com 50/100 para quem prefere rolar.
 */
export function TabelaDeGrupos({ grupos, onAlternarAtivado }: Props) {
  const [porPagina, setPorPagina] = useState(POR_PAGINA_PADRAO);
  const [pagina, setPagina] = useState(1);

  const totalDePaginas = Math.max(1, Math.ceil(grupos.length / porPagina));

  // Filtrar/buscar encurta a lista: manter a página 7 mostraria vazio com
  // resultado existindo. Também cobre o toggle que tira um grupo do filtro
  // "Ativos" e esvazia a última página.
  useEffect(() => {
    setPagina((p) => Math.min(p, totalDePaginas));
  }, [totalDePaginas]);

  const duplicados = useMemo(() => nomesDuplicados(grupos), [grupos]);

  const daPagina = useMemo(
    () => grupos.slice((pagina - 1) * porPagina, pagina * porPagina),
    [grupos, pagina, porPagina],
  );

  if (grupos.length === 0) return null;

  const switchDoGrupo = (g: GrupoWhatsapp) => (
    <Switch
      checked={g.ativado}
      onCheckedChange={(ativado) => onAlternarAtivado(g, ativado)}
      aria-label={
        g.ativado
          ? `Desativar ${rotuloDoGrupo(g.nome, g.id)}`
          : `Ativar ${rotuloDoGrupo(g.nome, g.id)}`
      }
    />
  );

  /** Fragmento do JID só onde o nome se repete — em 493 linhas, sempre é ruído. */
  const desambiguador = (g: GrupoWhatsapp) =>
    duplicados.has(rotuloDoGrupo(g.nome, g.id)) ? fragmentoDoJid(g.jid) : null;

  const primeiro = (pagina - 1) * porPagina + 1;
  const ultimo = Math.min(pagina * porPagina, grupos.length);

  return (
    <div className="space-y-3">
      <div className="hidden md:block rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-9 w-16">Ativo</TableHead>
              <TableHead className="h-9">Nome</TableHead>
              <TableHead className="h-9 text-right">Participantes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {daPagina.map((g) => {
              const fragmento = desambiguador(g);
              return (
                // py-1.5: a altura padrão da linha cabia 10 grupos onde cabem
                // 18 — com 493 grupos, cada linha a mais é uma página a menos.
                <TableRow key={g.id}>
                  <TableCell className="py-1.5">{switchDoGrupo(g)}</TableCell>
                  {/* Peso normal: em bold, 25 nomes seguidos viram um bloco só
                      e nenhum se destaca — o negrito não hierarquiza nada aqui. */}
                  <TableCell className="py-1.5 font-normal">
                    {rotuloDoGrupo(g.nome, g.id)}
                    {fragmento && (
                      <span className="ml-2 text-xs text-muted-foreground tabular-nums">
                        {fragmento}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="py-1.5 text-right tabular-nums">
                    {g.participantes}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="md:hidden space-y-3">
        {daPagina.map((g) => {
          const fragmento = desambiguador(g);
          return (
            <DataCard
              key={g.id}
              title={
                fragmento
                  ? `${rotuloDoGrupo(g.nome, g.id)} ${fragmento}`
                  : rotuloDoGrupo(g.nome, g.id)
              }
              actions={switchDoGrupo(g)}
              fields={[
                {
                  label: "Participantes",
                  value: <span className="tabular-nums">{g.participantes}</span>,
                  emphasis: true,
                },
              ]}
            />
          );
        })}
      </div>

      {/* Controles só quando há mais de uma página — com 12 grupos, paginação
          é moldura sem quadro. O seletor fica junto porque é a saída de quem
          prefere rolar a paginar. */}
      {grupos.length > POR_PAGINA_PADRAO && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Select
              value={String(porPagina)}
              onValueChange={(v) => {
                setPorPagina(Number(v));
                setPagina(1);
              }}
            >
              <SelectTrigger className="h-8 w-[4.5rem] text-xs" aria-label="Grupos por página">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPCOES_POR_PAGINA.map((n) => (
                  <SelectItem key={n} value={String(n)} className="text-xs">
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground tabular-nums">
              {primeiro}–{ultimo} de {grupos.length}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={pagina <= 1}
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-1 text-xs text-muted-foreground tabular-nums">
              {pagina} / {totalDePaginas}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setPagina((p) => Math.min(totalDePaginas, p + 1))}
              disabled={pagina >= totalDePaginas}
              aria-label="Próxima página"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
