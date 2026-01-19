import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "@/shared/styles/index.scss";
import favicon from "@/assets/logo/favicon-32x32.png";
import ogImage from "@/assets/logo/logo_name.png";

// Ensure the document uses the new brand assets
const applyBranding = () => {
  const title = "MarketDash";
  const description =
    "MarketDash - plataforma de dashboards e insights para vendedores digitais.";

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
  existingFavicon.type = "image/png";
  existingFavicon.href = favicon;
  if (!existingFavicon.parentNode) {
    document.head.appendChild(existingFavicon);
  }

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

applyBranding();
applyThemePreference();

createRoot(document.getElementById("root")!).render(<App />);
