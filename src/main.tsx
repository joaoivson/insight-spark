import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "@/shared/styles/index.scss";
import ogImage from "@/assets/logo/logo_name.png";
import { setupSubscriptionListener } from "@/shared/utils/subscription-events";

// Ensure the document uses the new brand assets
const applyBranding = () => {
  const title = "MarketDash";
  const description =
    "MarketDash - plataforma de dashboards e insights para vendedores digitais.";

  // Reforço do que o index.html já declara. O idioma errado ("en") era o que
  // fazia o Chrome oferecer tradução, e traduzir derruba o React (ver o
  // comentário e o guard de removeChild/insertBefore no index.html).
  const html = document.documentElement;
  if (html.lang !== "pt-BR") html.lang = "pt-BR";
  html.setAttribute("translate", "no");
  html.classList.add("notranslate");

  const upsertMeta = (selector: string, attributes: Record<string, string>) => {
    const element =
      (document.querySelector(selector) as HTMLMetaElement | null) ?? document.createElement("meta");

    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));

    if (!element.parentNode) {
      document.head.appendChild(element);
    }
  };

  if (document.title !== title) {
    document.title = title;
  }

  const existingFavicon =
    (document.querySelector("link[rel*='icon']") as HTMLLinkElement | null) ??
    document.createElement("link");

  existingFavicon.rel = "icon";
  existingFavicon.type = "image/svg+xml";
  existingFavicon.href = "/marketdash-symbol.svg";
  if (!existingFavicon.parentNode) {
    document.head.appendChild(existingFavicon);
  }

  upsertMeta("meta[name='google']", { name: "google", content: "notranslate" });
  upsertMeta("meta[name='description']", { name: "description", content: description });
  upsertMeta("meta[property='og:title']", { property: "og:title", content: title });
  upsertMeta("meta[property='og:description']", { property: "og:description", content: description });
  upsertMeta("meta[property='og:image']", { property: "og:image", content: ogImage });
  upsertMeta("meta[name='twitter:image']", { name: "twitter:image", content: ogImage });
};

const applyThemePreference = () => {
  try {
    const stored = window.localStorage.getItem("marketdash-theme");
    if (stored === "light" || stored === "dark") {
      document.documentElement.classList.remove("dark", "light");
      document.documentElement.classList.add(stored);
    } else {
      document.documentElement.classList.add("dark");
    }
  } catch {
    document.documentElement.classList.add("dark");
  }
};

// Uma aba aberta antes de um deploy aponta pros hashes de chunk antigos —
// qualquer import() dinâmico feito depois (ex.: jobs.service em
// UploadCSV.tsx) dá 404 e vira "Failed to fetch dynamically imported
// module". O Vite dispara `vite:preloadError` nesse caso; sem handler, o
// erro só aparecia cru pro usuário (ver UploadCSV.tsx). Recarrega uma vez
// por sessão — a nova carga já busca os hashes certos. Guard em
// sessionStorage evita loop infinito se o problema for um deploy
// genuinamente quebrado, não só cache de aba velha.
const setupChunkLoadRecovery = () => {
  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();
    const key = "marketdash-chunk-reload-attempted";
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, "1");
    window.location.reload();
  });
};

applyBranding();
applyThemePreference();
setupChunkLoadRecovery();

// Setup subscription event listener
setupSubscriptionListener();

createRoot(document.getElementById("root")!).render(<App />);
