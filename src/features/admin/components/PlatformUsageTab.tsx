import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import {
  Bar,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataCard } from "@/components/shared/DataCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminChartTooltip, CHART_COLORS } from "@/features/admin/components/AdminChartTooltip";
import { AXIS_PROPS, BAR_CURSOR } from "@/features/admin/components/chart-defaults";
import {
  fetchPlatformUsage,
  type PlatformUsage,
  type UsagePeriodo,
} from "@/services/admin-panel.service";
import { planLimit } from "@/shared/lib/plans";

const PERIODOS: { valor: UsagePeriodo; label: string }[] = [
  { valor: "hoje", label: "Hoje" },
  { valor: "7d", label: "7 dias" },
  { valor: "30d", label: "30 dias" },
  { valor: "90d", label: "90 dias" },
];

const POR_PAGINA = 10;

function dataCurta(iso: string) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

/** Card de número grande com subtítulo explicativo. */
function CardNumero({
  titulo,
  valor,
  subtitulo,
  onClick,
}: {
  titulo: string;
  valor: string | number;
  subtitulo?: string;
  onClick?: () => void;
}) {
  const conteudo = (
    <>
      <p className="text-sm text-muted-foreground">{titulo}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{valor}</p>
      {subtitulo && <p className="mt-1 text-xs text-muted-foreground">{subtitulo}</p>}
    </>
  );
  return (
    <Card className={onClick ? "cursor-pointer transition-colors hover:bg-accent/40" : undefined}>
      <CardContent className="pt-6" onClick={onClick}>
        {conteudo}
      </CardContent>
    </Card>
  );
}

export function PlatformUsageTab() {
  const [periodo, setPeriodo] = useState<UsagePeriodo>("7d");
  const [data, setData] = useState<PlatformUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagina, setPagina] = useState(1);

  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    fetchPlatformUsage(periodo)
      .then((d) => {
        if (cancelado) return;
        setData(d);
        setError(null);
        setPagina(1);
      })
      .catch((e) => !cancelado && setError(e instanceof Error ? e.message : "Erro"))
      .finally(() => !cancelado && setLoading(false));
    return () => {
      cancelado = true;
    };
  }, [periodo]);

  const totalPaginas = useMemo(
    () => Math.max(1, Math.ceil((data?.atividade.length || 0) / POR_PAGINA)),
    [data],
  );
  const linhasPagina = useMemo(
    () => (data?.atividade || []).slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA),
    [data, pagina],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {PERIODOS.map((p) => (
          <Button
            key={p.valor}
            size="sm"
            variant={periodo === p.valor ? "default" : "outline"}
            onClick={() => setPeriodo(p.valor)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error || !data ? (
        <p className="text-destructive">{error || "Sem dados"}</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <CardNumero
              titulo="Acessos"
              valor={data.cards.acessos}
              subtitulo="autenticações no período"
            />
            <CardNumero
              titulo="Usuárias ativas"
              valor={data.cards.usuarias_ativas}
              subtitulo={
                data.cards.taxa_uso == null
                  ? "sem base ativa"
                  : `${data.cards.usuarias_ativas} de ${data.cards.base_ativa} ativas · ${(
                      data.cards.taxa_uso * 100
                    ).toFixed(0)}%`
              }
            />
            <Link to="/admin/clientes?no_login_10d=1">
              <CardNumero
                titulo={`Sem acesso há ${data.cards.dias_sem_acesso}d+`}
                valor={data.cards.sem_acesso_10d}
                subtitulo="agora · clique para ver a lista"
              />
            </Link>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Acessos e usuárias por dia</CardTitle>
            </CardHeader>
            <CardContent>
              {data.usuarias_por_dia.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum acesso no período
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <ComposedChart data={data.usuarias_por_dia}>
                    <XAxis dataKey="date" tickFormatter={dataCurta} {...AXIS_PROPS} fontSize={12} />
                    <YAxis yAxisId="acessos" allowDecimals={false} {...AXIS_PROPS} fontSize={12} />
                    <YAxis
                      yAxisId="usuarias"
                      orientation="right"
                      allowDecimals={false}
                      {...AXIS_PROPS}
                      fontSize={12}
                    />
                    <Tooltip
                      cursor={BAR_CURSOR}
                      content={
                        <AdminChartTooltip
                          labelFormatter={(v) => new Date(String(v)).toLocaleDateString("pt-BR")}
                        />
                      }
                    />
                    <Bar
                      yAxisId="acessos"
                      dataKey="acessos"
                      name="Acessos"
                      fill={CHART_COLORS.blue}
                      radius={[4, 4, 0, 0]}
                    />
                    <Line
                      yAxisId="usuarias"
                      type="monotone"
                      dataKey="usuarias"
                      name="Usuárias"
                      stroke={CHART_COLORS.green}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Atividade por usuária</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="hidden overflow-x-auto lg:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead className="text-right">Acessos</TableHead>
                    <TableHead className="text-right">Dias ativos</TableHead>
                    <TableHead className="text-right">Links</TableHead>
                    <TableHead className="text-right">Páginas</TableHead>
                    <TableHead className="whitespace-nowrap">Último acesso</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linhasPagina.map((u) => (
                    <TableRow key={u.user_id}>
                      <TableCell className="whitespace-nowrap">
                        <Link className="font-medium hover:underline" to={`/admin/clientes/${u.user_id}`}>
                          {u.nome}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{u.acessos}</TableCell>
                      <TableCell className="text-right tabular-nums">{u.dias_ativos}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {planLimit(u.plan, "links") === 0 ? "—" : `${u.links_em_uso}/${u.links_criados}`}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {planLimit(u.plan, "paginas_captura") === 0
                          ? "—"
                          : `${u.paginas_em_uso}/${u.paginas_criadas}`}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {u.ultimo_acesso
                          ? new Date(u.ultimo_acesso).toLocaleDateString("pt-BR")
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {linhasPagina.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        Nenhum acesso no período
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              </div>

              {/* Seis colunas não cabem em 390px: no celular a linha vira card.
                  Limite 0 = o plano não tem o recurso, então mostra "—". */}
              <div className="space-y-3 lg:hidden">
                {linhasPagina.map((u) => (
                  <DataCard
                    key={u.user_id}
                    title={
                      <Link className="hover:underline" to={`/admin/clientes/${u.user_id}`}>
                        {u.nome}
                      </Link>
                    }
                    fields={[
                      { label: "Acessos", value: u.acessos, emphasis: true },
                      { label: "Dias ativos", value: u.dias_ativos },
                      {
                        label: "Links",
                        value:
                          planLimit(u.plan, "links") === 0
                            ? "—"
                            : `${u.links_em_uso}/${u.links_criados}`,
                      },
                      {
                        label: "Páginas",
                        value:
                          planLimit(u.plan, "paginas_captura") === 0
                            ? "—"
                            : `${u.paginas_em_uso}/${u.paginas_criadas}`,
                      },
                      {
                        label: "Último acesso",
                        value: u.ultimo_acesso
                          ? new Date(u.ultimo_acesso).toLocaleDateString("pt-BR")
                          : "—",
                      },
                    ]}
                  />
                ))}
                {linhasPagina.length === 0 && (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Nenhum acesso no período
                  </p>
                )}
              </div>

              {totalPaginas > 1 && (
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Página {pagina} de {totalPaginas}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pagina <= 1}
                      onClick={() => setPagina((p) => p - 1)}
                    >
                      Anterior
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pagina >= totalPaginas}
                      onClick={() => setPagina((p) => p + 1)}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Telas mais acessadas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.telas.map((t) => (
                <div key={t.tela}>
                  <div className="mb-1 flex items-baseline justify-between text-sm">
                    <span>{t.tela}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {t.acessos} · {(t.proporcao * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-[#318CE9]"
                      style={{ width: `${Math.max(t.proporcao * 100, 2)}%` }}
                    />
                  </div>
                </div>
              ))}
              {data.telas.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Sem visualizações no período
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
