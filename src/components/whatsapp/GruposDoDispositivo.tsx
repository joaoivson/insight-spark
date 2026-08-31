import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataCard } from "@/components/shared/DataCard";
import type { GrupoWhatsapp, InstanciaConexao } from "@/services/whatsapp_conexoes.service";
import { rotuloDoGrupo } from "@/shared/lib/grupo";

/** Acima disso a lista fica impossível de varrer com o polegar. */
const MIN_PARA_BUSCA = 8;

const BadgeEnvioOk = () => (
  <Badge className="border-emerald-500/25 bg-emerald-500/10 text-emerald-500">ok</Badge>
);

type Props = {
  grupos: GrupoWhatsapp[];
  /** Para resolver o "também em: X" — o vínculo grupo↔número é N:N. */
  instancias: InstanciaConexao[];
  /** `null` no bucket dos grupos sem dispositivo ativo. */
  instanciaId: number | null;
};

export function GruposDoDispositivo({ grupos, instancias, instanciaId }: Props) {
  const [busca, setBusca] = useState("");

  const termo = busca.trim().toLowerCase();
  const filtrados = termo
    ? grupos.filter((g) => rotuloDoGrupo(g.nome, g.id).toLowerCase().includes(termo))
    : grupos;

  /**
   * O mesmo grupo aparece no bloco de dois números quando os dois estão nele —
   * é o desenho (o motor faz failover entre eles). Sem dizer isso, a repetição
   * parece bug.
   */
  const tambemEm = (g: GrupoWhatsapp): string | null => {
    const outros = g.instancia_ids
      .filter((id) => id !== instanciaId)
      .map((id) => instancias.find((i) => i.id === id))
      .filter(Boolean)
      .map((i) => i!.nome_exibicao || `Número ${i!.id}`);
    return outros.length ? outros.join(", ") : null;
  };

  return (
    <div className="space-y-3">
      {grupos.length >= MIN_PARA_BUSCA && (
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar grupo…"
          className="h-9 w-full sm:max-w-[240px]"
        />
      )}

      {filtrados.length === 0 ? (
        <p className="py-3 text-sm text-muted-foreground">Nenhum grupo com esse nome.</p>
      ) : (
        <>
          <div className="hidden md:block rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-right">Participantes</TableHead>
                  <TableHead>Envio</TableHead>
                  <TableHead>Também em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium">{rotuloDoGrupo(g.nome, g.id)}</TableCell>
                    <TableCell className="text-right tabular-nums">{g.participantes}</TableCell>
                    <TableCell>
                      {g.permite_envio ? (
                        <BadgeEnvioOk />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {tambemEm(g) ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="md:hidden space-y-3">
            {filtrados.map((g) => {
              const outros = tambemEm(g);
              return (
                <DataCard
                  key={g.id}
                  title={rotuloDoGrupo(g.nome, g.id)}
                  badge={g.permite_envio ? <BadgeEnvioOk /> : undefined}
                  fields={[
                    {
                      label: "Participantes",
                      value: <span className="tabular-nums">{g.participantes}</span>,
                      emphasis: true,
                    },
                    { label: "Também em", value: outros ?? "—" },
                  ]}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
