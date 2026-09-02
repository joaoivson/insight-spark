/** Tipos da automação de Instagram (comentário → direct). */

export type InstagramConnectionStatus = "ativo" | "expirado" | "revogado";

export interface InstagramConnection {
  id: number;
  ig_user_id: string;
  ig_username: string | null;
  ig_avatar_url: string | null;
  status: InstagramConnectionStatus;
  connected_at: string | null;
  token_expires_at: string | null;
  /**
   * A CONTA está inscrita no webhook de comentários?
   * Assinar o campo `comments` no painel da Meta vale só para o app — cada conta
   * precisa de uma chamada própria. Com isto `false`, nada dispara e a Meta não
   * reporta erro nenhum: por isso a tela precisa avisar.
   */
  webhook_subscrito: boolean;
  webhook_erro: string | null;
  /** BUSINESS | MEDIA_CREATOR — só Criador consegue tornar o perfil privado. */
  account_type: string | null;
  /**
   * `false` = conectou sem `instagram_business_manage_comments`. O direct sai,
   * mas a resposta pública no comentário não — e nada avisa.
   */
  pode_responder_comentario: boolean;
}

export interface InstagramMediaItem {
  id: string;
  caption_preview: string | null;
  media_type: string | null;
  /** AD | FEED | STORY | REELS */
  media_product_type: string | null;
  permalink: string | null;
  thumbnail_url: string | null;
  timestamp: string | null;
}

export interface InstagramMediaPage {
  items: InstagramMediaItem[];
  /** Cursor de "Carregar mais". null = acabou. */
  next_cursor: string | null;
  from_cache: boolean;
}

export type AutomacaoEscopo =
  | "post_especifico"
  | "qualquer"
  // Story: reply do story (que chega como DM) dispara a automação.
  | "story_especifico"
  | "story_qualquer";
export type AutomacaoTrigger = "palavras" | "qualquer";
export type AutomacaoStatus = "ativa" | "pausada" | "rascunho";

export interface InstagramAutomation {
  id: number;
  user_id: number;
  connection_id: number;
  nome: string;
  escopo: AutomacaoEscopo;
  media_id: string | null;
  media_thumbnail_url: string | null;
  media_caption_preview: string | null;
  media_permalink: string | null;
  trigger_tipo: AutomacaoTrigger;
  /** Texto como a aluna digitou (o backend guarda a versão normalizada à parte). */
  palavras: string[];
  resposta_publica_ativa: boolean;
  resposta_publica_variacoes: string[];
  dm_texto: string;
  /** Link do botão do direct. NULL = automação antiga, que vai como texto puro. */
  dm_link: string | null;
  /** Título do botão (limite 20 no backend e na Meta). */
  dm_botao_texto: string | null;
  status: AutomacaoStatus;
  created_at: string | null;
  updated_at: string | null;
  comentarios_capturados: number;
  directs_enviados: number;
}

/** Corpo de criação/edição — o backend calcula o resto. */
export type InstagramAutomationPayload = Pick<
  InstagramAutomation,
  | "nome"
  | "escopo"
  | "media_id"
  | "media_thumbnail_url"
  | "media_caption_preview"
  | "media_permalink"
  | "trigger_tipo"
  | "palavras"
  | "resposta_publica_ativa"
  | "resposta_publica_variacoes"
  | "dm_texto"
  | "dm_link"
  | "dm_botao_texto"
  | "status"
>;
