/**
 * Auditoria visual de layout — celular, tablet e desktop.
 *
 * Faz login, percorre as rotas do app e, para cada uma, grava screenshot,
 * mede overflow horizontal (a página nunca deve rolar na horizontal) e
 * coleta erros de console/rede. Ver `.claude/commands/validar-tela.md`.
 *
 *   AUDIT_EMAIL=... AUDIT_PASSWORD=... node mobile-audit.mjs [flags]
 *
 *   --out=<dir>            destino dos screenshots (padrão /tmp/mobile-shots)
 *   --only=dashboard,admin filtra rotas pelo nome
 *   --viewport=mobile      roda só um viewport (mobile|tablet|desktop)
 */
import { chromium, devices } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const arg = (nome) => {
  const hit = process.argv.find((a) => a.startsWith(`--${nome}=`));
  return hit ? hit.slice(nome.length + 3) : undefined;
};

const BASE = process.env.AUDIT_BASE ?? "http://localhost:8080";
const EMAIL = process.env.AUDIT_EMAIL;
const PASSWORD = process.env.AUDIT_PASSWORD;
const OUT = arg("out") ?? "/tmp/mobile-shots";

const VIEWPORTS = [
  { nome: "mobile", ...devices["iPhone 12"], viewport: { width: 390, height: 844 } },
  {
    nome: "tablet",
    viewport: { width: 820, height: 1180 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: devices["iPad (gen 7)"]?.userAgent,
  },
  { nome: "desktop", viewport: { width: 1440, height: 900 } },
];

// Rotas autenticadas. Em localhost `isProductionHost()` é false, então as
// telas que só existem em homologação (automações, grupos, ofertas,
// templates) também entram.
const ROUTES = [
  ["dashboard", "/dashboard"],
  ["campanhas", "/dashboard/campanhas"],
  ["upload-cliques", "/dashboard/upload-cliques"],
  ["reports", "/dashboard/reports"],
  ["links", "/dashboard/links"],
  ["captura", "/dashboard/captura"],
  ["impostos", "/dashboard/impostos"],
  ["configuracoes", "/dashboard/configuracoes"],
  ["integracoes", "/dashboard/integracoes"],
  ["afiliados", "/dashboard/afiliados"],
  ["planos", "/dashboard/planos"],
  ["indique", "/dashboard/indique"],
  ["modules", "/dashboard/modules"],
  ["automacoes", "/dashboard/automacoes"],
  ["automacao-editor", "/dashboard/automacoes/nova"],
  ["grupos", "/dashboard/grupos"],
  ["ofertas", "/dashboard/ofertas"],
  ["templates", "/dashboard/templates"],
  ["afiliados-pendentes", "/dashboard/admin/afiliados"],
  ["admin", "/admin"],
  ["admin-clientes", "/admin/clientes"],
  ["admin-sincronizacoes", "/admin/sincronizacoes"],
  ["admin-uso", "/admin/sincronizacoes?tab=uso"],
  ["admin-despesas", "/admin/despesas"],
  ["admin-dre", "/admin/dre"],
];

/** Roda no browser: mede o quanto a página estoura à direita e quem causa. */
const overflowProbe = () => {
  const vw = window.innerWidth;
  const root = document.documentElement;
  // max(html, body): com um ancestral em overflow-hidden o scrollWidth do
  // html não cresce, mas o do body sim — medir só o html dava "0px" em
  // página que o screenshot mostrava claramente cortada.
  const docOverflow = Math.max(0, Math.max(root.scrollWidth, document.body.scrollWidth) - vw);
  const offenders = [];
  for (const el of document.body.querySelectorAll("*")) {
    const r = el.getBoundingClientRect();
    if (r.height <= 0 || r.width <= 0) continue;
    const overRight = Math.round(r.right - vw);
    const overLeft = Math.round(-r.left);
    if (overRight > 2 || overLeft > 2) {
      offenders.push({
        tag: el.tagName.toLowerCase(),
        cls: (typeof el.className === "string" ? el.className : "").slice(0, 70),
        txt: (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 50),
        w: Math.round(r.width),
        over: Math.max(overRight, overLeft),
      });
    }
  }
  offenders.sort((a, b) => b.over - a.over);
  return { vw, docOverflow, offenders: offenders.slice(0, 12) };
};

const login = async (page) => {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.fill("#email", EMAIL);
  await page.fill("#password", PASSWORD);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30000 }).catch(() => {}),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForTimeout(3500);
  return !page.url().includes("/login");
};

const run = async () => {
  if (!EMAIL || !PASSWORD) {
    console.error("Faltam AUDIT_EMAIL e AUDIT_PASSWORD no ambiente.");
    process.exit(1);
  }

  const filtro = arg("only")?.split(",").map((s) => s.trim());
  const rotas = filtro ? ROUTES.filter(([nome]) => filtro.includes(nome)) : ROUTES;
  const soViewport = arg("viewport");
  const viewports = soViewport ? VIEWPORTS.filter((v) => v.nome === soViewport) : VIEWPORTS;

  const browser = await chromium.launch();
  const relatorio = [];

  for (const { nome: viewportNome, ...contextOpts } of viewports) {
    const dir = path.join(OUT, viewportNome);
    fs.mkdirSync(dir, { recursive: true });

    // Sessão nova por viewport: o refresh token do Supabase roda a cada
    // sessão, então storage_state não se reaproveita entre execuções.
    const ctx = await browser.newContext(contextOpts);
    const page = await ctx.newPage();

    let erros = [];
    page.on("console", (m) => m.type() === "error" && erros.push(m.text().slice(0, 200)));
    page.on("pageerror", (e) => erros.push(`pageerror: ${e.message.slice(0, 200)}`));
    page.on("response", (r) => {
      if (r.status() >= 400 && !r.url().includes("favicon")) {
        erros.push(`HTTP ${r.status()} ${r.url().replace(BASE, "").slice(0, 120)}`);
      }
    });

    const logado = await login(page);
    console.log(`\n=== ${viewportNome} — login ${logado ? "OK" : "FALHOU"} (${page.url()})`);
    if (!logado) {
      relatorio.push({ viewport: viewportNome, erro: "login falhou", erros: erros.slice(0, 10) });
      await ctx.close();
      continue;
    }

    for (const [nome, rota] of rotas) {
      erros = [];
      try {
        await page.goto(`${BASE}${rota}`, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(2800);
        const probe = await page.evaluate(overflowProbe);
        const file = path.join(dir, `${nome}.png`);
        await page.screenshot({ path: file, fullPage: true });

        const falha = probe.docOverflow > 2;
        relatorio.push({
          viewport: viewportNome,
          nome,
          rota,
          url: page.url(),
          ...probe,
          erros: [...new Set(erros)].slice(0, 8),
          file,
          falha,
        });
        console.log(
          `[${viewportNome}/${nome}] ${falha ? `⚠️  OVERFLOW ${probe.docOverflow}px` : "ok"}` +
            ` | offenders:${probe.offenders.length} | erros:${new Set(erros).size}`,
        );
        for (const o of probe.offenders.slice(0, 3)) {
          console.log(`      +${o.over}px <${o.tag}> w${o.w} "${o.txt}" .${o.cls}`);
        }
        for (const e of [...new Set(erros)].slice(0, 3)) console.log(`      ! ${e}`);
      } catch (e) {
        console.log(`[${viewportNome}/${nome}] ERRO: ${e.message}`);
        relatorio.push({ viewport: viewportNome, nome, rota, erro: e.message, falha: true });
      }
    }

    await ctx.close();
  }

  const jsonPath = path.join(OUT, "audit.json");
  fs.writeFileSync(jsonPath, JSON.stringify(relatorio, null, 2));
  await browser.close();

  const falhas = relatorio.filter((r) => r.falha);
  console.log(`\n${relatorio.length} capturas | ${falhas.length} com overflow`);
  for (const f of falhas) console.log(`  ⚠️  ${f.viewport}/${f.nome} — ${f.docOverflow ?? "?"}px`);
  console.log(`Screenshots em ${OUT} | relatório ${jsonPath}`);
};

run();
