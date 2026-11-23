// ============================================================
// Definição das 15 condições de D&D 5e, regras resumidas (PT-BR)
// e ícones SVG inline (flat, fundo circular, traço grosso).
// ============================================================

export interface DefCondicao {
  id: string;
  nome: string; // nome em português
  nomeEn: string; // nome original
  cor: string; // cor principal do ícone
  fg: string; // cor do desenho (contraste com o fundo)
  regra: string; // regra resumida
  glifo: string; // desenho SVG (viewBox 64x64), usa currentColor
  comNivel?: boolean; // true = possui níveis (Exaustão)
}

export const CONDICOES: DefCondicao[] = [
  {
    id: "blinded", nome: "Cego", nomeEn: "Blinded", cor: "#37474F", fg: "#fff",
    regra: "Não enxerga e falha em testes que exigem visão. Ataques contra a criatura têm vantagem; os ataques dela têm desvantagem.",
    glifo: `<path d="M8 32Q32 12 56 32Q32 52 8 32Z"/><circle cx="32" cy="32" r="5" fill="currentColor"/><path d="M14 52L50 12"/>`,
  },
  {
    id: "charmed", nome: "Enfeitiçado", nomeEn: "Charmed", cor: "#EC407A", fg: "#fff",
    regra: "Não pode atacar nem escolher como alvo de efeitos nocivos quem o enfeitiçou. O enfeitiçador tem vantagem em testes sociais contra ele.",
    glifo: `<path fill="currentColor" d="M32 50C10 36 10 18 22 16C28 15 32 20 32 24C32 20 36 15 42 16C54 18 54 36 32 50Z"/>`,
  },
  {
    id: "deafened", nome: "Surdo", nomeEn: "Deafened", cor: "#6D4C41", fg: "#fff",
    regra: "Não consegue ouvir e falha automaticamente em testes que dependam da audição.",
    glifo: `<path d="M22 28a10 10 0 0 1 20 0c0 8-8 9-8 16a6 6 0 0 1-11 3"/><path d="M12 52L52 12"/>`,
  },
  {
    id: "frightened", nome: "Amedrontado", nomeEn: "Frightened", cor: "#8E24AA", fg: "#fff",
    regra: "Desvantagem em testes de habilidade e ataques enquanto a fonte do medo estiver à vista. Não pode se aproximar dela voluntariamente.",
    glifo: `<circle cx="23" cy="28" r="4" fill="currentColor"/><circle cx="41" cy="28" r="4" fill="currentColor"/><ellipse cx="32" cy="44" rx="6" ry="8"/><path d="M16 17L28 22M48 17L36 22"/>`,
  },
  {
    id: "grappled", nome: "Agarrado", nomeEn: "Grappled", cor: "#FB8C00", fg: "#fff",
    regra: "Deslocamento 0 e não ganha bônus de deslocamento. Termina se o agarrador ficar incapacitado ou for afastado do alcance.",
    glifo: `<rect x="16" y="28" width="32" height="22" rx="7" fill="currentColor"/><path d="M23 28V16M32 28V12M41 28V16M16 38L8 32"/>`,
  },
  {
    id: "incapacitated", nome: "Incapacitado", nomeEn: "Incapacitated", cor: "#C0CA33", fg: "#33380a",
    regra: "Não pode realizar ações nem reações.",
    glifo: `<path d="M32 32a4 4 0 0 1 8 0a8 8 0 0 1-16 0a12 12 0 0 1 24 0a16 16 0 0 1-32 0"/>`,
  },
  {
    id: "invisible", nome: "Invisível", nomeEn: "Invisible", cor: "#29B6F6", fg: "#fff",
    regra: "Impossível de ver sem magia ou sentido especial. Ataques contra a criatura têm desvantagem; os ataques dela têm vantagem.",
    glifo: `<g stroke-dasharray="5 6"><circle cx="32" cy="21" r="9"/><path d="M14 54C14 38 22 33 32 33C42 33 50 38 50 54"/></g>`,
  },
  {
    id: "paralyzed", nome: "Paralisado", nomeEn: "Paralyzed", cor: "#3949AB", fg: "#fff",
    regra: "Incapacitado, não se move nem fala. Falha em salvaguardas de FOR e DES. Ataques contra ele têm vantagem; acertos corpo a corpo a até 1,5 m são críticos.",
    glifo: `<path fill="currentColor" d="M37 8L17 36H30L26 56L47 26H34Z"/>`,
  },
  {
    id: "petrified", nome: "Petrificado", nomeEn: "Petrified", cor: "#9E9E9E", fg: "#fff",
    regra: "Transformado em pedra: incapacitado, sem percepção, resistência a todo dano, imune a veneno e doença. Falha em salvaguardas de FOR e DES; ataques contra ele têm vantagem.",
    glifo: `<path d="M20 14H44L54 32L44 50H20L10 32Z"/><path d="M31 14L26 30L37 36L30 50"/>`,
  },
  {
    id: "poisoned", nome: "Envenenado", nomeEn: "Poisoned", cor: "#43A047", fg: "#fff",
    regra: "Desvantagem em jogadas de ataque e em testes de habilidade.",
    glifo: `<path d="M32 7C32 7 14 28 14 40a18 18 0 0 0 36 0C50 28 32 7 32 7Z"/><circle cx="26" cy="38" r="3.5" fill="currentColor"/><circle cx="38" cy="38" r="3.5" fill="currentColor"/><path d="M27 49H37"/>`,
  },
  {
    id: "prone", nome: "Caído", nomeEn: "Prone", cor: "#00897B", fg: "#fff",
    regra: "Só pode rastejar (ou se levantar gastando metade do deslocamento). Desvantagem em ataques. Ataques corpo a corpo contra ele têm vantagem; à distância, desvantagem.",
    glifo: `<circle cx="13" cy="36" r="6" fill="currentColor"/><path d="M22 38H44L54 46M32 38L30 28M8 54H56"/>`,
  },
  {
    id: "restrained", nome: "Contido", nomeEn: "Restrained", cor: "#D84315", fg: "#fff",
    regra: "Deslocamento 0. Ataques contra ele têm vantagem; os ataques dele têm desvantagem. Desvantagem em salvaguardas de DES.",
    glifo: `<circle cx="18" cy="32" r="10"/><circle cx="46" cy="32" r="10"/><path d="M28 32H36"/>`,
  },
  {
    id: "stunned", nome: "Atordoado", nomeEn: "Stunned", cor: "#FDD835", fg: "#3E2723",
    regra: "Incapacitado, não se move e só fala de forma hesitante. Falha em salvaguardas de FOR e DES. Ataques contra ele têm vantagem.",
    glifo: `<polygon fill="currentColor" points="32,9 38,25 55,25 41,35 47,52 32,42 17,52 23,35 9,25 26,25"/>`,
  },
  {
    id: "unconscious", nome: "Inconsciente", nomeEn: "Unconscious", cor: "#1A237E", fg: "#fff",
    regra: "Incapacitado, não se move nem fala, inconsciente. Larga o que segura e cai. Falha em salvaguardas de FOR e DES; ataques contra ele têm vantagem e acertos a até 1,5 m são críticos.",
    glifo: `<path d="M12 14H28L12 30H28M34 32H48L34 48H48"/>`,
  },
  {
    id: "exhaustion", nome: "Exaustão", nomeEn: "Exhaustion", cor: "#E53935", fg: "#fff", comNivel: true,
    regra: "Níveis acumulativos: 1 desv. em testes; 2 deslocamento ÷2; 3 desv. em ataques e salvaguardas; 4 PV máx. ÷2; 5 deslocamento 0; 6 morte.",
    glifo: `<rect x="8" y="22" width="40" height="22" rx="4"/><path d="M52 29V37"/>`,
  },
];

export const POR_ID: Record<string, DefCondicao> = Object.fromEntries(
  CONDICOES.map((c) => [c.id, c])
);

/** Monta o SVG completo (64x64) de uma condição. */
export function svgDe(c: DefCondicao): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="128" height="128" color="${c.fg}">` +
    `<circle cx="32" cy="32" r="30" fill="${c.cor}" stroke="${c.fg}" stroke-width="3"/>` +
    `<g fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">${c.glifo}</g>` +
    `</svg>`
  );
}

const cache = new Map<string, string>();

/** URL data: do ícone (sem nenhum arquivo externo). */
export function urlIcone(c: DefCondicao): string {
  let u = cache.get(c.id);
  if (!u) {
    u = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgDe(c));
    cache.set(c.id, u);
  }
  return u;
}

/** Texto de rodadas: "3 rodadas" / "1 rodada". */
export function textoRodadas(n: number): string {
  return `${n} ${n === 1 ? "rodada" : "rodadas"}`;
}
