export const NS = "com.owlbear3em1";
export const META_WALL_INDEX = `${NS}/paredes-index`;
export const META_WALL_PREFIX = `${NS}/paredes-`;
export const META_FOG_MEMORY = `${NS}/nevoa-memoria`;
export const STORAGE_KEY = `${NS}/config-v2`;
export const STORAGE_MEM_LOCAL = `${NS}/memoria-individual-v2`;
export const CHANNEL_NAME = `${NS}/canal`;

export const CONFIG_PADRAO = {
  // Fase 1: Paredes
  simplificacao: 10,
  anguloMinimo: 10,
  alinharRetas: false,
  grudarGrid: false,
  subdivisoesGrid: 2,
  grudarPontas: true,
  distanciaGrudar: 28,
  fecharPoligono: true,
  distanciaFechar: 34,
  mostrarParedesMestre: true,
  espessuraParede: 6,

  // Fase 2: Luz com Falloff + Visão Individual
  visaoIndividual: true, // TRUE = Cada player só vê a luz do próprio token!
  donoLuzEscolhido: "AUTO", // "AUTO" | "TODOS" | playerId específico
  presetLuz: "tocha",
  alcanceQuadrados: 6,
  raioFonteQuadrados: 1,
  falloff: 0.8,
  anguloCone: 360,
  anguloInterno: 40,
  tipoLuz: "PRIMARY",

  // Fase 3: Memória de Névoa
  memoriaAtiva: true,
  modoMemoria: "LUZ_SECUNDARIA",
  raioMemoriaQuadrados: 5,
  falloffMemoria: 1.2,
  resolucaoCelula: 1.5,
  opacidadeSombra: 0.45
};

export const PRESETS_LUZ = {
  tocha: {
    nome: "🔥 Tocha (6q / 360°)",
    alcanceQuadrados: 6,
    raioFonteQuadrados: 1,
    falloff: 0.85,
    anguloCone: 360,
    anguloInterno: 360,
    tipoLuz: "PRIMARY"
  },
  lanterna: {
    nome: "🏮 Lanterna (9q / 360°)",
    alcanceQuadrados: 9,
    raioFonteQuadrados: 1.5,
    falloff: 0.75,
    anguloCone: 360,
    anguloInterno: 360,
    tipoLuz: "PRIMARY"
  },
  vela: {
    nome: "🕯️ Vela (2.5q / Suave)",
    alcanceQuadrados: 2.5,
    raioFonteQuadrados: 0.5,
    falloff: 1.3,
    anguloCone: 360,
    anguloInterno: 360,
    tipoLuz: "PRIMARY"
  },
  visaoEscuro: {
    nome: "👁️ Visão no Escuro (12q)",
    alcanceQuadrados: 12,
    raioFonteQuadrados: 2,
    falloff: 0.5,
    anguloCone: 360,
    anguloInterno: 360,
    tipoLuz: "PRIMARY"
  },
  cone: {
    nome: "🔦 Lanterna Foco (Cone 65°)",
    alcanceQuadrados: 10,
    raioFonteQuadrados: 0.8,
    falloff: 0.6,
    anguloCone: 65,
    anguloInterno: 35,
    tipoLuz: "PRIMARY"
  },
  ambiente: {
    nome: "✨ Luz no Ambiente (Só ilumina se tiver visão)",
    alcanceQuadrados: 5,
    raioFonteQuadrados: 1,
    falloff: 1.1,
    anguloCone: 360,
    anguloInterno: 360,
    tipoLuz: "SECONDARY"
  }
};

// ============================================================================
// Comunicação e Persistência de Configurações (Popover <-> Background)
// ============================================================================
let canal = null;
function obterCanal() {
  if (!canal && typeof BroadcastChannel !== "undefined") {
    canal = new BroadcastChannel(CHANNEL_NAME);
  }
  return canal;
}

export function lerConfig() {
  try {
    const salvo = localStorage.getItem(STORAGE_KEY);
    if (!salvo) return { ...CONFIG_PADRAO };
    return { ...CONFIG_PADRAO, ...JSON.parse(salvo) };
  } catch {
    return { ...CONFIG_PADRAO };
  }
}

export function salvarConfig(parcial) {
  const atual = lerConfig();
  const novo = { ...atual, ...parcial };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(novo));
  } catch {}
  enviarMensagem({ tipo: "CONFIG_ATUALIZADA", config: novo });
  return novo;
}

export function enviarMensagem(msg) {
  try {
    const c = obterCanal();
    if (c) c.postMessage(msg);
  } catch {}
}

export function escutarMensagens(callback) {
  const c = obterCanal();
  const handler = (ev) => {
    if (ev && ev.data) callback(ev.data);
  };
  if (c) c.addEventListener("message", handler);

  const storageHandler = (ev) => {
    if (ev.key === STORAGE_KEY) {
      callback({ tipo: "CONFIG_ATUALIZADA", config: lerConfig() });
    }
  };
  window.addEventListener("storage", storageHandler);

  return () => {
    if (c) c.removeEventListener("message", handler);
    window.removeEventListener("storage", storageHandler);
  };
}

// ============================================================================
// Geometria 2D para Paredes e Raycasting de Névoa
// ============================================================================
export function distancia(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function distanciaPontoSegmento(p, v, w) {
  const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
  if (l2 === 0) return distancia(p, v);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return distancia(p, {
    x: v.x + t * (w.x - v.x),
    y: v.y + t * (w.y - v.y)
  });
}

export function simplificarRDP(pontos, tolerancia) {
  if (!pontos || pontos.length <= 2 || tolerancia <= 0) return pontos ? [...pontos] : [];

  let dmax = 0;
  let index = 0;
  const fim = pontos.length - 1;

  for (let i = 1; i < fim; i++) {
    const d = distanciaPontoSegmento(pontos[i], pontos[0], pontos[fim]);
    if (d > dmax) {
      index = i;
      dmax = d;
    }
  }

  if (dmax > tolerancia) {
    const rec1 = simplificarRDP(pontos.slice(0, index + 1), tolerancia);
    const rec2 = simplificarRDP(pontos.slice(index), tolerancia);
    return rec1.slice(0, rec1.length - 1).concat(rec2);
  } else {
    return [pontos[0], pontos[fim]];
  }
}

export function fundirColineares(pontos, anguloMinGraus) {
  if (!pontos || pontos.length <= 2 || anguloMinGraus <= 0) return pontos;
  const limiarRad = (anguloMinGraus * Math.PI) / 180;
  const resultado = [pontos[0]];

  for (let i = 1; i < pontos.length - 1; i++) {
    const prev = resultado[resultado.length - 1];
    const curr = pontos[i];
    const next = pontos[i + 1];

    const a1 = Math.atan2(curr.y - prev.y, curr.x - prev.x);
    const a2 = Math.atan2(next.y - curr.y, next.x - curr.x);
    let diff = Math.abs(a1 - a2);
    while (diff > Math.PI) diff = Math.abs(diff - 2 * Math.PI);

    if (diff >= limiarRad) {
      resultado.push(curr);
    }
  }
  resultado.push(pontos[pontos.length - 1]);
  return resultado;
}

export function alinharRetas(pontos) {
  if (!pontos || pontos.length < 2) return pontos;
  const res = [{ ...pontos[0] }];
  for (let i = 1; i < pontos.length; i++) {
    const prev = res[i - 1];
    const curr = pontos[i];
    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;
    const len = Math.hypot(dx, dy);
    if (len < 2) continue;

    const ang = Math.atan2(dy, dx);
    const passo = Math.PI / 4;
    const angSnap = Math.round(ang / passo) * passo;
    if (Math.abs(ang - angSnap) < (14 * Math.PI) / 180) {
      res.push({
        x: prev.x + Math.cos(angSnap) * len,
        y: prev.y + Math.sin(angSnap) * len
      });
    } else {
      res.push({ ...curr });
    }
  }
  return res;
}

export function grudarNoGrid(pontos, gridDpi, subdivisoes = 2) {
  if (!pontos || !gridDpi) return pontos;
  const passo = gridDpi / Math.max(1, subdivisoes);
  return pontos.map((p) => ({
    x: Math.round(p.x / passo) * passo,
    y: Math.round(p.y / passo) * passo
  }));
}

export function encontrarVerticeProximo(ponto, paredesExistentes, tracosPendentes, raioMax) {
  let melhor = null;
  let menorDist = raioMax;

  const testarLista = (listaPontos) => {
    for (const pt of listaPontos) {
      const d = distancia(ponto, pt);
      if (d <= menorDist) {
        menorDist = d;
        melhor = { x: pt.x, y: pt.y };
      }
    }
  };

  for (const w of paredesExistentes || []) {
    if (w.points) testarLista(w.points);
  }
  for (const t of tracosPendentes || []) {
    if (t.points) testarLista(t.points);
  }
  return melhor;
}

export function processarTraco(pontosBrutos, config, paredesExistentes, tracosPendentes, gridDpi = 150) {
  if (!pontosBrutos || pontosBrutos.length < 2) return null;

  let pts = [pontosBrutos[0]];
  for (let i = 1; i < pontosBrutos.length; i++) {
    if (distancia(pontosBrutos[i], pts[pts.length - 1]) >= 2) {
      pts.push(pontosBrutos[i]);
    }
  }
  if (pts.length < 2) {
    pts = [pontosBrutos[0], pontosBrutos[pontosBrutos.length - 1]];
  }

  if (config.simplificacao > 0 && pts.length > 2) {
    pts = simplificarRDP(pts, config.simplificacao);
  }
  if (config.anguloMinimo > 0 && pts.length > 2) {
    pts = fundirColineares(pts, config.anguloMinimo);
  }
  if (config.alinharRetas) {
    pts = alinharRetas(pts);
  }
  if (config.grudarGrid) {
    pts = grudarNoGrid(pts, gridDpi, config.subdivisoesGrid || 2);
  }

  if (config.grudarPontas && config.distanciaGrudar > 0) {
    const ini = encontrarVerticeProximo(pts[0], paredesExistentes, tracosPendentes, config.distanciaGrudar);
    if (ini) pts[0] = ini;

    const fim = encontrarVerticeProximo(pts[pts.length - 1], paredesExistentes, tracosPendentes, config.distanciaGrudar);
    if (fim) pts[pts.length - 1] = fim;
  }

  let closed = false;
  if (
    config.fecharPoligono &&
    pts.length >= 3 &&
    distancia(pts[0], pts[pts.length - 1]) <= (config.distanciaFechar || 34)
  ) {
    pts[pts.length - 1] = { ...pts[0] };
    closed = true;
  }

  pts = pts.map((p) => ({
    x: Math.round(p.x * 10) / 10,
    y: Math.round(p.y * 10) / 10
  }));

  if (pts.length < 2 || (pts.length === 2 && distancia(pts[0], pts[1]) < 4)) {
    return null;
  }

  return {
    id: `w_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    points: pts,
    closed,
    porta: false,
    aberta: false
  };
}

function ccw(A, B, C) {
  return (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
}

export function segmentosCruzam(A, B, C, D) {
  return ccw(A, C, D) !== ccw(B, C, D) && ccw(A, B, C) !== ccw(A, B, D);
}

export function temVisadaLivre(origem, destino, paredes) {
  if (!paredes || paredes.length === 0) return true;
  for (const w of paredes) {
    if (w.porta && w.aberta) continue;
    const pts = w.points || [];
    for (let i = 0; i < pts.length - 1; i++) {
      if (segmentosCruzam(origem, destino, pts[i], pts[i + 1])) {
        return false;
      }
    }
  }
  return true;
}

// ============================================================================
// Serialização de Paredes em Lotes nos Metadados da Cena
// ============================================================================
const TAMANHO_LOTE = 85;

export function lerParedesDaCena(metadata) {
  if (!metadata) return { versao: 0, paredes: [] };
  const idx = metadata[META_WALL_INDEX];
  if (!idx || typeof idx !== "object") return { versao: 0, paredes: [] };

  const totalLotes = Number(idx.lotes) || 0;
  const paredes = [];

  for (let i = 0; i < totalLotes; i++) {
    const lote = metadata[`${META_WALL_PREFIX}${i}`];
    if (Array.isArray(lote)) {
      for (const item of lote) {
        if (item && Array.isArray(item.p) && item.p.length >= 2) {
          paredes.push({
            id: item.id || `w_${i}`,
            points: item.p.map(([x, y]) => ({ x, y })),
            closed: Boolean(item.c),
            porta: Boolean(item.d),
            aberta: Boolean(item.o)
          });
        }
      }
    }
  }

  return {
    versao: Number(idx.versao) || 1,
    paredes
  };
}

export function criarPatchMetadadosParedes(paredes, metadataAtual = {}) {
  const compactadas = paredes.map((w) => ({
    id: w.id,
    p: w.points.map((pt) => [Math.round(pt.x), Math.round(pt.y)]),
    c: w.closed ? 1 : 0,
    d: w.porta ? 1 : 0,
    o: w.aberta ? 1 : 0
  }));

  const lotes = [];
  for (let i = 0; i < compactadas.length; i += TAMANHO_LOTE) {
    lotes.push(compactadas.slice(i, i + TAMANHO_LOTE));
  }

  const idxAntigo = metadataAtual[META_WALL_INDEX] || {};
  const lotesAntigos = Number(idxAntigo.lotes) || 0;
  const novaVersao = (Number(idxAntigo.versao) || 0) + 1;

  const patch = {
    [META_WALL_INDEX]: {
      versao: novaVersao,
      lotes: lotes.length,
      atualizadoEm: Date.now()
    }
  };

  for (let i = 0; i < lotes.length; i++) {
    patch[`${META_WALL_PREFIX}${i}`] = lotes[i];
  }
  for (let i = lotes.length; i < lotesAntigos; i++) {
    patch[`${META_WALL_PREFIX}${i}`] = undefined;
  }

  return patch;
}

// ============================================================================
// Memória de Névoa Individual (Salva por Jogador)
// ============================================================================
export function lerMemoriaLocalJogador(playerId) {
  try {
    const raw = localStorage.getItem(`${STORAGE_MEM_LOCAL}_${playerId}`);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

export function salvarMemoriaLocalJogador(playerId, setCelulas) {
  try {
    const arr = Array.from(setCelulas).slice(-600);
    localStorage.setItem(`${STORAGE_MEM_LOCAL}_${playerId}`, JSON.stringify(arr));
  } catch {}
}