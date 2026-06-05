import { chromium, devices } from "@playwright/test";
import fs from "node:fs";

const BASE = "http://localhost:8081";
const EMAIL = process.env.AUDIT_EMAIL;
const PASSWORD = process.env.AUDIT_PASSWORD;
const OUT = "/tmp/mobile-shots";
fs.mkdirSync(OUT, { recursive: true });

const ROUTES = [
  ["dashboard", "/dashboard"],
  ["campanhas", "/dashboard/campanhas"],
  ["investimentos", "/dashboard/investimentos"],
  ["upload", "/dashboard/upload"],
  ["upload-cliques", "/dashboard/upload-cliques"],
  ["reports", "/dashboard/reports"],
  ["modules", "/dashboard/modules"],
  ["links", "/dashboard/links"],
  ["captura", "/dashboard/captura"],
  ["impostos", "/dashboard/impostos"],
  ["configuracoes", "/dashboard/configuracoes"],
  ["integracoes", "/dashboard/integracoes"],
  ["settings", "/dashboard/settings"],
  ["afiliados", "/dashboard/afiliados"],
  ["demo", "/demo"],
  ["landing", "/"],
  ["assinatura", "/assinatura"],
  ["notfound", "/rota-inexistente-xyz"],
];

const overflowProbe = () => {
  const vw = window.innerWidth;
  const root = document.documentElement;
  const docOverflow = Math.max(0, root.scrollWidth - vw);
  const offenders = [];
  const els = document.body.querySelectorAll("*");
  for (const el of els) {
    const r = el.getBoundingClientRect();
    if (r.height <= 0 || r.width <= 0) continue;
    const overRight = Math.round(r.right - vw);
    const overLeft = Math.round(-r.left);
    if (overRight > 2 || overLeft > 2) {
      const cls = (typeof el.className === "string" ? el.className : "").slice(0, 70);
      const txt = (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 50);
      offenders.push({
        tag: el.tagName.toLowerCase(),
        cls,
        txt,
        w: Math.round(r.width),
        over: Math.max(overRight, overLeft),
      });
    }
  }
  // ordenar pelos piores e cortar containers gigantes duplicados
  offenders.sort((a, b) => b.over - a.over);
  return { vw, docOverflow, offenders: offenders.slice(0, 12) };
};

const run = async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    ...devices["iPhone 12"],
    viewport: { width: 390, height: 844 },
  });
  const page = await ctx.newPage();
  const report = [];

  // -------- LOGIN --------
  let loggedIn = false;
  try {
    await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
    await page.fill("#email", EMAIL);
    await page.fill("#password", PASSWORD);
    await Promise.all([
      page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 25000 }).catch(() => {}),
      page.click('button[type="submit"]'),
    ]);
    await page.waitForTimeout(3500);
    loggedIn = !page.url().includes("/login");
    console.log("Login →", page.url(), loggedIn ? "OK" : "FALHOU");
  } catch (e) {
    console.log("Erro no login:", e.message);
  }

  // -------- AUDIT --------
  for (const [name, path] of ROUTES) {
    try {
      await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2600);
      // fecha eventual modal de assinatura para não bloquear screenshot
      const probe = await page.evaluate(overflowProbe);
      const file = `${OUT}/${name}.png`;
      await page.screenshot({ path: file, fullPage: true });
      report.push({ name, path, url: page.url(), ...probe, file });
      const flag = probe.docOverflow > 2 ? `⚠️ OVERFLOW ${probe.docOverflow}px` : "ok";
      console.log(`[${name}] ${flag} | offenders:${probe.offenders.length} | ${page.url()}`);
      if (probe.offenders.length) {
        for (const o of probe.offenders.slice(0, 4)) {
          console.log(`    +${o.over}px <${o.tag}> w${o.w} "${o.txt}" .${o.cls}`);
        }
      }
    } catch (e) {
      console.log(`[${name}] ERRO: ${e.message}`);
      report.push({ name, path, error: e.message });
    }
  }

  fs.writeFileSync("/tmp/mobile-audit.json", JSON.stringify(report, null, 2));
  await browser.close();
  console.log("\nScreenshots em", OUT, "| relatório /tmp/mobile-audit.json");
};

run();
