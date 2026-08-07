import { fetchWithAuth, getApiUrl } from "@/core/config/api.config";

// getApiUrl resolve o host por ambiente. URL relativa só funcionaria no dev
// com proxy — em produção o front está em outro domínio que a API.
const base = () => getApiUrl("/api/v1/whatsapp");

export type StatusWhatsapp = {
  status: "pendente" | "confirmado" | "desligado";
  numero: string | null;      // já vem mascarado do backend
  disponivel: boolean;
  confirmado_em: string | null;
};

export type InstanciaWhatsapp = {
  configurado: boolean;
  estado: string;
  qrcode: string | null;
};

async function json<T>(r: Response): Promise<T> {
  if (!r.ok) {
    // O backend manda mensagem pronta para a tela em `detail`; preservá-la é o
    // que faz o usuário ler "confira o número" em vez de "erro 400".
    let detalhe = "";
    try {
      const corpo = await r.json();
      detalhe = typeof corpo?.detail === "string" ? corpo.detail : "";
    } catch {
      /* resposta sem corpo JSON */
    }
    throw new Error(detalhe || `Erro ${r.status}`);
  }
  return r.json() as Promise<T>;
}

export async function buscarStatusWhatsapp(): Promise<StatusWhatsapp> {
  return json(await fetchWithAuth(`${base()}/status`));
}

export async function registrarNumero(numero: string): Promise<StatusWhatsapp> {
  return json(
    await fetchWithAuth(`${base()}/optin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ numero }),
    }),
  );
}

export async function confirmarCodigo(codigo: string): Promise<StatusWhatsapp> {
  return json(
    await fetchWithAuth(`${base()}/confirmar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ codigo }),
    }),
  );
}

export async function desligarWhatsapp(): Promise<StatusWhatsapp> {
  return json(await fetchWithAuth(`${base()}/optin`, { method: "DELETE" }));
}

export async function buscarInstancia(): Promise<InstanciaWhatsapp> {
  return json(await fetchWithAuth(`${base()}/instancia`));
}
