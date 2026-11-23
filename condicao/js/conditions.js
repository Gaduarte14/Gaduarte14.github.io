/**
 * Definição das 15 condições oficiais de D&D 5e, regras resumidas em português,
 * níveis de Exaustão (1 a 6) e gerador de ícones SVG inline minimalistas.
 */

// Efeitos cumulativos dos 6 níveis de Exaustão (D&D 5e)
export const EXHAUSTION_LEVELS = [
  { level: 1, summary: "Desvantagem em testes de atributo." },
  { level: 2, summary: "Deslocamento reduzido à metade." },
  { level: 3, summary: "Desvantagem em jogadas de ataque e salvaguardas." },
  { level: 4, summary: "Pontos de vida máximos reduzidos à metade." },
  { level: 5, summary: "Deslocamento reduzido a 0." },
  { level: 6, summary: "Morte." },
];

// Lista completa das 15 condições com cor distinta e ícone SVG flat (viewBox 64x64)
export const CONDITIONS = [
  {
    id: "blinded",
    name: "Cego",
    en: "Blinded",
    color: "#334155",
    rule: "Não enxerga e falha automaticamente em testes que exigem visão. Ataques contra você têm vantagem; seus ataques têm desvantagem.",
    // Olho estilizado com risco diagonal
    svgInner: `
      <path d="M12 32 C18 21 25 18 32 18 C39 18 46 21 52 32 C46 43 39 46 32 46 C25 46 18 43 12 32 Z"
            fill="none" stroke="#ffffff" stroke-width="4.2" stroke-linejoin="round"/>
      <circle cx="32" cy="32" r="6.5" fill="#ffffff"/>
      <line x1="15" y1="49" x2="49" y2="15" stroke="#334155" stroke-width="8.5" stroke-linecap="round"/>
      <line x1="15" y1="49" x2="49" y2="15" stroke="#ffffff" stroke-width="4.8" stroke-linecap="round"/>
    `,
  },
  {
    id: "charmed",
    name: "Enfeitiçado",
    en: "Charmed",
    color: "#ec4899",
    rule: "Não pode atacar nem alvejar o encantador com habilidades nocivas. O encantador tem vantagem em testes sociais contra você.",
    // Coração preenchido com brilho
    svgInner: `
      <path d="M32 49 C20 40 15 33 15 26 C15 20.5 19.3 17 24 17 C27.4 17 30.3 18.8 32 21.5 C33.7 18.8 36.6 17 40 17 C44.7 17 49 20.5 49 26 C49 33 44 40 32 49 Z"
            fill="#ffffff"/>
      <path d="M47 13 L48.5 17 L52.5 18.5 L48.5 20 L47 24 L45.5 20 L41.5 18.5 L45.5 17 Z" fill="#fef08a"/>
    `,
  },
  {
    id: "deafened",
    name: "Surdo",
    en: "Deafened",
    color: "#4f46e5",
    rule: "Não consegue ouvir e falha automaticamente em qualquer teste de atributo que exija audição.",
    // Orelha com ondas cortadas
    svgInner: `
      <path d="M25 22 C25 16 36 15 39 22 C41.5 27.5 38 33 34 36 C31.5 38 31 41 31 44 C31 47 27 48 25 46"
            fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round"/>
      <path d="M44 23 C47.5 27 47.5 35 44 39" fill="none" stroke="#ffffff" stroke-width="3.8" stroke-linecap="round"/>
      <line x1="15" y1="49" x2="49" y2="15" stroke="#4f46e5" stroke-width="8.5" stroke-linecap="round"/>
      <line x1="15" y1="49" x2="49" y2="15" stroke="#ffffff" stroke-width="4.8" stroke-linecap="round"/>
    `,
  },
  {
    id: "frightened",
    name: "Amedrontado",
    en: "Frightened",
    color: "#7c3aed",
    rule: "Desvantagem em testes de atributo e ataques enquanto a fonte do medo estiver à vista. Não pode se aproximar voluntariamente dela.",
    // Rosto assustado (olhos arregalados e boca aberta)
    svgInner: `
      <circle cx="23" cy="26" r="5" fill="#ffffff"/>
      <circle cx="23" cy="26" r="2.2" fill="#1e1b4b"/>
      <circle cx="41" cy="26" r="5" fill="#ffffff"/>
      <circle cx="41" cy="26" r="2.2" fill="#1e1b4b"/>
      <path d="M17 18 Q23 15 27 18" fill="none" stroke="#ffffff" stroke-width="3.2" stroke-linecap="round"/>
      <path d="M37 18 Q41 15 47 18" fill="none" stroke="#ffffff" stroke-width="3.2" stroke-linecap="round"/>
      <ellipse cx="32" cy="43" rx="6.5" ry="9" fill="#ffffff"/>
      <ellipse cx="32" cy="43" rx="3.2" ry="5.5" fill="#4c1d95"/>
    `,
  },
  {
    id: "grappled",
    name: "Agarrado",
    en: "Grappled",
    color: "#b45309",
    rule: "Deslocamento se torna 0 e não recebe bônus de deslocamento. Termina se o agarrador for incapacitado ou você sair do alcance.",
    // Mão agarrando estilizada
    svgInner: `
      <path d="M21 36 V21 C21 19 25 19 25 21 V31 M27 31 V17 C27 15 31 15 31 17 V31 M33 31 V18 C33 16 37 16 37 18 V31 M39 33 V22 C39 20 43 20 43 22 V38 C43 45 38 49 31 49 C24 49 19 45 19 38 V33 C19 30 22 29 24 31"
            fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    `,
  },
  {
    id: "incapacitated",
    name: "Incapacitado",
    en: "Incapacitated",
    color: "#64748b",
    rule: "Não pode realizar ações nem reações.",
    // Símbolo de desligado/incapacitado (círculo aberto + barra)
    svgInner: `
      <path d="M22 20 A16 16 0 1 0 42 20" fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/>
      <line x1="32" y1="13" x2="32" y2="32" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/>
    `,
  },
  {
    id: "invisible",
    name: "Invisível",
    en: "Invisible",
    color: "#0891b2",
    rule: "Impossível de ver sem magia ou sentido especial (considerado em escuridão pesada). Seus ataques têm vantagem; ataques contra você têm desvantagem.",
    // Silhueta tracejada
    svgInner: `
      <circle cx="32" cy="21" r="8" fill="none" stroke="#ffffff" stroke-width="3.8" stroke-dasharray="5 3.5"/>
      <path d="M16 49 C16 38 22 33 32 33 C42 33 48 38 48 49"
            fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-dasharray="6 4"/>
    `,
  },
  {
    id: "paralyzed",
    name: "Paralisado",
    en: "Paralyzed",
    color: "#ca8a04",
    rule: "Incapacitado, não pode se mover nem falar. Falha em salvaguardas de FOR/DES. Ataques têm vantagem e acertos a até 1,5 m são críticos.",
    // Raio rígido
    svgInner: `
      <polygon points="35,12 18,35 30,35 27,52 46,28 34,28" fill="#ffffff" stroke="#ffffff" stroke-width="2" stroke-linejoin="round"/>
    `,
  },
  {
    id: "petrified",
    name: "Petrificado",
    en: "Petrified",
    color: "#57534e",
    rule: "Transformado em pedra (peso ×10), incapacitado, sem noção do entorno. Resistência a todos os danos; imune a veneno e doenças.",
    // Rocha angular rachada
    svgInner: `
      <polygon points="20,48 15,32 23,17 41,16 49,30 45,48" fill="#ffffff"/>
      <polyline points="32,16 29,28 36,33 31,48" fill="none" stroke="#57534e" stroke-width="3.5" stroke-linejoin="round"/>
      <line x1="29" y1="28" x2="21" y2="33" stroke="#57534e" stroke-width="3" stroke-linecap="round"/>
    `,
  },
  {
    id: "poisoned",
    name: "Envenenado",
    en: "Poisoned",
    color: "#16a34a",
    rule: "Tem desvantagem em jogadas de ataque e em testes de atributo.",
    // Gota com caveira simples dentro
    svgInner: `
      <path d="M32 12 C32 12 48 29 48 39 C48 47.8 40.8 53 32 53 C23.2 53 16 47.8 16 39 C16 29 32 12 32 12 Z"
            fill="#ffffff"/>
      <circle cx="26.5" cy="37" r="3.4" fill="#16a34a"/>
      <circle cx="37.5" cy="37" r="3.4" fill="#16a34a"/>
      <line x1="28" y1="45" x2="28" y2="49" stroke="#16a34a" stroke-width="2.6" stroke-linecap="round"/>
      <line x1="32" y1="45" x2="32" y2="49.5" stroke="#16a34a" stroke-width="2.6" stroke-linecap="round"/>
      <line x1="36" y1="45" x2="36" y2="49" stroke="#16a34a" stroke-width="2.6" stroke-linecap="round"/>
    `,
  },
  {
    id: "prone",
    name: "Caído",
    en: "Prone",
    color: "#ea580c",
    rule: "Só pode rastejar (ou gastar metade do deslocamento para levantar). Seus ataques têm desvantagem. Ataques a até 1,5 m têm vantagem; à distância têm desvantagem.",
    // Seta para baixo + figura deitada
    svgInner: `
      <line x1="32" y1="13" x2="32" y2="29" stroke="#ffffff" stroke-width="4.2" stroke-linecap="round"/>
      <polyline points="25,23 32,30 39,23" fill="none" stroke="#ffffff" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="20" cy="42" r="5" fill="#ffffff"/>
      <line x1="27" y1="43" x2="48" y2="43" stroke="#ffffff" stroke-width="5.2" stroke-linecap="round"/>
      <line x1="14" y1="50" x2="50" y2="50" stroke="#fed7aa" stroke-width="2.6" stroke-linecap="round"/>
    `,
  },
  {
    id: "restrained",
    name: "Contido",
    en: "Restrained",
    color: "#92400e",
    rule: "Deslocamento 0. Ataques contra você têm vantagem; seus ataques e salvaguardas de DES têm desvantagem.",
    // Elos de corrente entrelaçados
    svgInner: `
      <g transform="rotate(-45 32 32)">
        <rect x="14" y="25" width="19" height="14" rx="7" fill="none" stroke="#ffffff" stroke-width="4.5"/>
        <rect x="31" y="25" width="19" height="14" rx="7" fill="none" stroke="#ffffff" stroke-width="4.5"/>
      </g>
    `,
  },
  {
    id: "stunned",
    name: "Atordoado",
    en: "Stunned",
    color: "#f59e0b",
    rule: "Incapacitado, não pode se mover e fala de forma vacilante. Falha automaticamente em salvaguardas de FOR/DES. Ataques contra você têm vantagem.",
    // Órbita de tontura com estrelas
    svgInner: `
      <ellipse cx="32" cy="34" rx="18" ry="8" fill="none" stroke="#ffffff" stroke-width="3.6" transform="rotate(-14 32 34)"/>
      <polygon points="32,12 34.4,18.2 41,18.8 35.8,22.8 37.5,29 32,25.5 26.5,29 28.2,22.8 23,18.8 29.6,18.2" fill="#ffffff"/>
      <circle cx="17" cy="40" r="3.4" fill="#ffffff"/>
      <circle cx="47" cy="28" r="3.4" fill="#ffffff"/>
    `,
  },
  {
    id: "unconscious",
    name: "Inconsciente",
    en: "Unconscious",
    color: "#1e1b4b",
    rule: "Incapacitado, não se move, não fala, cai prostrado e larga o que segura. Falha em FOR/DES. Ataques têm vantagem e acertos a até 1,5 m são críticos.",
    // Zzz estilizado
    svgInner: `
      <polyline points="17,22 29,22 17,34 29,34" fill="none" stroke="#ffffff" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>
      <polyline points="32,31 42,31 32,41 42,41" fill="none" stroke="#c7d2fe" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>
      <polyline points="42,16 49,16 42,23 49,23" fill="none" stroke="#a5b4fc" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    `,
  },
  {
    id: "exhaustion",
    name: "Exaustão",
    en: "Exhaustion",
    color: "#dc2626",
    rule: "Cumulativa de nível 1 a 6 (1: desvant. atributos; 2: ½ deslocamento; 3: desvant. ataques/salvaguardas; 4: ½ PV máx; 5: deslocamento 0; 6: morte).",
    // Ampulheta simples de fundo (o número do nível aparece em destaque sobre o ícone)
    svgInner: `
      <path d="M21 15 H43 L34 32 L43 49 H21 L30 32 Z" fill="none" stroke="#fecaca" stroke-width="3.8" stroke-linejoin="round"/>
    `,
  },
];

// Mapa rápido por ID da condição
export const CONDITION_MAP = Object.fromEntries(CONDITIONS.map((c) => [c.id, c]));

/**
 * Gera o SVG completo de uma condição (com nível de Exaustão e badge de rodadas opcionais).
 */
export function buildConditionSvg(conditionId, options = {}) {
  const { level = null, rounds = null, size = 128 } = options;
  const cond = CONDITION_MAP[conditionId];
  if (!cond) return "";

  const isExpiring = typeof rounds === "number" && rounds === 1;
  const borderColor = isExpiring ? "#fbbf24" : "#ffffff";
  const borderWidth = isExpiring ? 4.5 : 3;

  // Para Exaustão, exibe o número do nível (1–6) bem legível sobre o ícone
  let exhaustionOverlay = "";
  if (conditionId === "exhaustion" && level) {
    exhaustionOverlay = `
      <circle cx="32" cy="34" r="15.5" fill="#7f1d1d" stroke="#ffffff" stroke-width="2.5"/>
      <text x="32" y="42.5" text-anchor="middle" fill="#ffffff"
        font-family="system-ui, -apple-system, Segoe UI, sans-serif"
        font-size="24" font-weight="900">${level}</text>
    `;
  }

  // Badge de rodadas no canto inferior direito quando o contador estiver ativo
  let roundsBadge = "";
  if (typeof rounds === "number" && rounds > 0) {
    const badgeFill = isExpiring ? "#ef4444" : "#0f172a";
    const badgeStroke = isExpiring ? "#fde047" : "#ffffff";
    const label = rounds > 99 ? "99+" : String(rounds);
    const fontSize = label.length > 2 ? 10.5 : 14;
    const textY = label.length > 2 ? 54.5 : 56;
    roundsBadge = `
      <circle cx="51" cy="51" r="12" fill="${badgeFill}" stroke="${badgeStroke}" stroke-width="2.2"/>
      <text x="51" y="${textY}" text-anchor="middle" fill="#ffffff"
        font-family="system-ui, -apple-system, Segoe UI, sans-serif"
        font-size="${fontSize}" font-weight="800">${label}</text>
    `;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">
    <circle cx="32" cy="32" r="28" fill="${cond.color}" stroke="${borderColor}" stroke-width="${borderWidth}"/>
    ${cond.svgInner}
    ${exhaustionOverlay}
    ${roundsBadge}
  </svg>`;
}

/**
 * Converte uma string SVG em Data URL base64 seguro para uso no buildImage do Owlbear Rodeo.
 */
export function svgToDataUrl(svg) {
  const bytes = new TextEncoder().encode(svg);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:image/svg+xml;base64,${btoa(binary)}`;
}