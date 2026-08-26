/**
 * Fonte única dos itens de navegação do dashboard.
 *
 * `DashboardSidebar` consome a lista completa; `MobileBottomNav` deriva as
 * tabs principais por `menuKey` e manda o resto para o drawer "Mais". Item
 * novo entra AQUI — não nos dois componentes (débito da F0, quitado na F2).
 */
import {
  Gift,
  Globe,
  Instagram,
  LayoutDashboard,
  Link2,
  MessagesSquare,
  MessageSquareText,
  MousePointerClick,
  Settings,
  Target,
  type LucideIcon,
} from "lucide-react";

import { isProductionHost } from "@/core/config/api.config";

export type DashboardMenuItem = {
  icon: LucideIcon;
  label: string;
  /** Rótulo curto da tab no bottom nav (cabem ~12 caracteres por tab). */
  shortLabel?: string;
  path: string;
  menuKey: string;
  isNew?: boolean;
  iconClass?: string;
  /** Gate de AMBIENTE (some inteiro em produção) — não confundir com o cadeado, que é gating por plano. */
  hmlOnly?: boolean;
};

export const DASHBOARD_MENU: DashboardMenuItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", shortLabel: "Início", path: "/dashboard", menuKey: "dashboard" },
  // "Anúncios" = a antiga tela Campanhas (tráfego pago Shopee/Meta).
  { icon: Target, label: "Anúncios", path: "/dashboard/campanhas", menuKey: "campanhas" },
  // "Campanhas" agora é o módulo de grupos de WhatsApp (MAX).
  { icon: MessagesSquare, label: "Campanhas", path: "/dashboard/grupos", menuKey: "campanhas_grupos", isNew: true, hmlOnly: true },
  // Templates alimentam os passos de oferta das campanhas de grupos (MAX).
  { icon: MessageSquareText, label: "Templates", path: "/dashboard/templates", menuKey: "templates", hmlOnly: true },
  { icon: MousePointerClick, label: "Upload Cliques", path: "/dashboard/upload-cliques", menuKey: "upload_cliques" },
  { icon: Globe, label: "Página de Captura", path: "/dashboard/captura", menuKey: "captura" },
  { icon: Link2, label: "Meus Links", shortLabel: "Links", path: "/dashboard/links", menuKey: "meus_links" },
  // menuKey "automacoes" só existe no plano MAX — nos demais o item aparece com cadeado.
  { icon: Instagram, label: "Instagram", path: "/dashboard/automacoes", isNew: true, menuKey: "automacoes", hmlOnly: true },
  { icon: Gift, label: "Indique & Ganhe", path: "/dashboard/indique", iconClass: "text-[#F0A94A]", menuKey: "indique_ganhe" },
  { icon: Settings, label: "Configurações", path: "/dashboard/configuracoes", menuKey: "configuracoes" },
];

/**
 * Aplica o gate de ambiente: em produção os itens `hmlOnly` somem inteiros
 * (a rota correspondente também não existe lá — quem tem a URL cai no 404).
 */
export function menuVisivel(itens: DashboardMenuItem[] = DASHBOARD_MENU): DashboardMenuItem[] {
  if (!isProductionHost()) return itens;
  return itens.filter((item) => !item.hmlOnly);
}
