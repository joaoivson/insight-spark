import { getApiUrl, fetchWithAuth } from "@/core/config/api.config";

export interface CaptureSite {
    id: number;
    user_id: number;
    title: string | null;
    subtitle: string | null;
    button_text: string | null;
    button_link: string | null;
    benefits: string[] | null;
    image_url: string | null;
    urgency_text: string | null;
    slug: string | null;
    created_at: string;
    updated_at: string | null;
    theme_color: string | null;
    button_color: string | null;
    background_color: string | null;
    is_gradient: boolean;
    urgency_color: string | null;
    urgency_icon: string | null;
    urgency_size: string | null;
    urgency_icon_size: number | null;
    urgency_animation: string | null;
    text_primary_color: string | null;
    urgency_text_color: string | null;
}

export interface CaptureSiteCreate {
    title?: string;
    subtitle?: string;
    button_text?: string;
    button_link?: string;
    benefits?: string[];
    image_url?: string;
    urgency_text?: string;
    slug?: string;
    theme_color?: string;
    button_color?: string;
    background_color?: string;
    is_gradient?: boolean;
    urgency_color?: string;
    urgency_icon?: string;
    urgency_size?: string;
    urgency_icon_size?: number;
    urgency_animation?: string;
    text_primary_color?: string;
    urgency_text_color?: string;
}

export type CaptureSiteUpdate = CaptureSiteCreate;

export interface SlugCheckResponse {
    available: boolean;
    suggested_slug: string;
}

export const checkSlug = async (slug: string): Promise<SlugCheckResponse> => {
    const url = getApiUrl(`/api/v1/capturas/check-slug?slug=${encodeURIComponent(slug)}`);
    const res = await fetchWithAuth(url);
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Erro ao verificar slug");
    }
    return res.json();
};

export const getPublicSite = async (slug: string): Promise<CaptureSite> => {
    const url = getApiUrl(`/api/v1/capturas/public/${encodeURIComponent(slug)}`);
    const res = await fetch(url); // Sem auth porque é público
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Página de captura não encontrada");
    }
    return res.json();
};

export const getUserSites = async (): Promise<CaptureSite[]> => {
    const url = getApiUrl("/api/v1/capturas");
    const res = await fetchWithAuth(url);
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Erro ao listar sites de captura");
    }
    return res.json();
};

export const getSite = async (id: number): Promise<CaptureSite> => {
    const url = getApiUrl(`/api/v1/capturas/${id}`);
    const res = await fetchWithAuth(url);
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Erro ao carregar site de captura");
    }
    return res.json();
};

export const createSite = async (site: CaptureSiteCreate): Promise<CaptureSite> => {
    const url = getApiUrl("/api/v1/capturas");
    const res = await fetchWithAuth(url, {
        method: "POST",
        body: JSON.stringify(site),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Erro ao criar site de captura");
    }
    return res.json();
};

export const updateSite = async (id: number, site: CaptureSiteUpdate): Promise<CaptureSite> => {
    const url = getApiUrl(`/api/v1/capturas/${id}`);
    const res = await fetchWithAuth(url, {
        method: "PUT",
        body: JSON.stringify(site),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Erro ao atualizar site de captura");
    }
    return res.json();
};

export const deleteSite = async (id: number): Promise<void> => {
    const url = getApiUrl(`/api/v1/capturas/${id}`);
    const res = await fetchWithAuth(url, { method: "DELETE" });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Erro ao deletar site de captura");
    }
};

export const uploadImage = async (file: File): Promise<{ url: string }> => {
    const url = getApiUrl("/api/v1/uploads/image");
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetchWithAuth(url, {
        method: "POST",
        body: formData,
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Falha ao fazer upload da imagem");
    }
    return res.json();
};
