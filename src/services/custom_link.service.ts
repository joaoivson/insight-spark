import { getApiUrl, fetchWithAuth } from "@/core/config/api.config";

export interface CustomLink {
    id: number;
    user_id: number;
    name: string;
    original_url: string;
    slug: string;
    tag: string | null;
    expires_at: string | null;
    click_count: number;
    is_active: boolean;
    created_at: string;
    updated_at: string | null;
}

export interface CustomLinkCreate {
    name: string;
    original_url: string;
    slug?: string;
    tag?: string;
    expires_at?: string;
    is_active?: boolean;
}

export interface CustomLinkUpdate {
    name?: string;
    original_url?: string;
    slug?: string;
    tag?: string;
    expires_at?: string | null;
    is_active?: boolean;
}

export interface SlugCheckResponse {
    available: boolean;
    suggested_slug: string;
}

export const checkLinkSlug = async (slug: string): Promise<SlugCheckResponse> => {
    const url = getApiUrl(`/api/v1/links/check-slug?slug=${encodeURIComponent(slug)}`);
    const res = await fetchWithAuth(url);
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Erro ao verificar slug");
    }
    return res.json();
};

export const getUserLinks = async (): Promise<CustomLink[]> => {
    const url = getApiUrl("/api/v1/links");
    const res = await fetchWithAuth(url);
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Erro ao listar links");
    }
    return res.json();
};

export const createLink = async (link: CustomLinkCreate): Promise<CustomLink> => {
    const url = getApiUrl("/api/v1/links");
    const res = await fetchWithAuth(url, {
        method: "POST",
        body: JSON.stringify(link),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Erro ao criar link");
    }
    return res.json();
};

export const updateLink = async (id: number, link: CustomLinkUpdate): Promise<CustomLink> => {
    const url = getApiUrl(`/api/v1/links/${id}`);
    const res = await fetchWithAuth(url, {
        method: "PUT",
        body: JSON.stringify(link),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Erro ao atualizar link");
    }
    return res.json();
};

export const deleteLink = async (id: number): Promise<void> => {
    const url = getApiUrl(`/api/v1/links/${id}`);
    const res = await fetchWithAuth(url, { method: "DELETE" });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Erro ao deletar link");
    }
};
