// ============================================================
// Tipos e utilidades compartilhados por background, popover e painel
// ============================================================
import OBR, { Item, isImage } from "@owlbear-rodeo/sdk";

export const ID = "br.condicao";
/** Metadata do token: condições ativas */
export const META_ESTADO = `${ID}/estado`;
/** Metadata dos itens de ícone/texto criados pela extensão */
export const META_ICONE = `${ID}/icone`;

export interface CondicaoAtiva {
  rodadas?: number; // duração restante (indefinido = sem duração)
  nivel?: number; // somente Exaustão (1 a 6)
}
export interface EstadoToken {
  condicoes: Record<string, CondicaoAtiva>;
}
export interface MetaIcone {
  tokenId: string;
  sig: string; // assinatura do layout, para saber quando refazer
  base: number; // escala base (usada pelo efeito de pulsar)
  pulsar: boolean;
}

/** Lê as condições gravadas no token. */
export function lerEstado(item: Item): EstadoToken {
  const m = item.metadata[META_ESTADO] as EstadoToken | undefined;
  return m && m.condicoes ? m : { condicoes: {} };
}

/** Só imagens nas camadas de personagem/montaria contam como token. */
export function ehToken(item: Item): boolean {
  return isImage(item) && (item.layer === "CHARACTER" || item.layer === "MOUNT");
}

/**
 * Altera as condições de vários tokens de uma vez.
 * O metadata é salvo no próprio token, então sincroniza com todos os jogadores.
 */
export async function alterarCondicoes(
  ids: string[],
  fn: (cond: Record<string, CondicaoAtiva>, item: Item) => void
): Promise<void> {
  if (!ids.length) return;
  await OBR.scene.items.updateItems(ids, (itens) => {
    for (const it of itens) {
      const cond = JSON.parse(JSON.stringify(lerEstado(it).condicoes));
      fn(cond, it);
      if (Object.keys(cond).length) it.metadata[META_ESTADO] = { condicoes: cond };
      else delete it.metadata[META_ESTADO]; // sem condições: limpa o metadata
    }
  });
}

/** Resolve um caminho relativo para URL absoluta (exigida pelo SDK). */
export const abs = (p: string) => new URL(p, location.href).href;

/** Escapa texto antes de usar em innerHTML. */
export const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

/** Aplica as cores do tema do Owlbear às variáveis CSS. */
export async function aplicarTema(): Promise<void> {
  const set = (t: Awaited<ReturnType<typeof OBR.theme.getTheme>>) => {
    const r = document.documentElement.style;
    r.setProperty("--bg", t.background.paper);
    r.setProperty("--fg", t.text.primary);
    r.setProperty("--mudo", t.text.secondary);
    r.setProperty("--pri", t.primary.main);
    r.setProperty("--borda", t.mode === "DARK" ? "rgba(255,255,255,.14)" : "rgba(0,0,0,.16)");
    r.setProperty("--sup", t.mode === "DARK" ? "rgba(255,255,255,.06)" : "rgba(0,0,0,.05)");
  };
  set(await OBR.theme.getTheme());
  OBR.theme.onChange(set);
}
