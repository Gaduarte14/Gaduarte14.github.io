/**
 * nevoa/geometria.js
 * Geometria 2D para organizar o traço de parede na ordem exata:
 * 1. Limpar -> 2. Simplificar (RDP) -> 3. Endireitar -> 4. Grudar e fechar -> 5. Limpeza final
 */

export function distancia(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function comprimentoTraco(pontos) {
  let total = 0;
  for (let i = 1; i < pontos.length; i++) {
    total += distancia(pontos[i - 1], pontos[i]);
  }
  return total;
}

export function distanciaPontoReta(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const comp2 = dx * dx + dy * dy;
  if (comp2 === 0) return distancia(p, a);
  const num = Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x);
  return num / Math.sqrt(comp2);
}

export function projetarPontoNoSegmento(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const comp2 = dx * dx + dy * dy;
  if (comp2 === 0) return { x: a.x, y: a.y, t: 0, dist: distancia(p, a) };
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / comp2));
  const proj = { x: a.x + t * dx, y: a.y + t * dy };
  return { ...proj, t, dist: distancia(p, proj) };
}

function mudancaAnguloGraus(a, b, c) {
  const a1 = Math.atan2(b.y - a.y, b.x - a.x);
  const a2 = Math.atan2(c.y - b.y, c.x - b.x);
  let diff = Math.abs(a2 - a1) * (180 / Math.PI);
  if (diff > 180) diff = 360 - diff;
  return diff;
}

/**
 * 1. LIMPAR:
 * - Remove pontos repetidos
 * - Suaviza tremidas leves (média móvel curta de 3 pontos) sem arredondar cantos reais (> 28°)
 * - Descarta traços minúsculos
 */
export function etapa1Limpar(pontosBrutos, comprimentoMinimo = 16) {
  if (!pontosBrutos || pontosBrutos.length < 2) return [];

  const semRepetidos = [{ x: pontosBrutos[0].x, y: pontosBrutos[0].y }];
  for (let i = 1; i < pontosBrutos.length; i++) {
    if (distancia(pontosBrutos[i], semRepetidos[semRepetidos.length - 1]) >= 2) {
      semRepetidos.push({ x: pontosBrutos[i].x, y: pontosBrutos[i].y });
    }
  }

  if (semRepetidos.length < 2) return [];
  if (comprimentoTraco(semRepetidos) < comprimentoMinimo) return [];

  if (semRepetidos.length <= 3) return semRepetidos;
  const suavizados = [semRepetidos[0]];
  for (let i = 1; i < semRepetidos.length - 1; i++) {
    const ant = semRepetidos[i - 1];
    const atual = semRepetidos[i];
    const prox = semRepetidos[i + 1];
    const desvio = mudancaAnguloGraus(ant, atual, prox);

    if (desvio > 28) {
      suavizados.push({ x: atual.x, y: atual.y });
    } else {
      suavizados.push({
        x: ant.x * 0.25 + atual.x * 0.5 + prox.x * 0.25,
        y: ant.y * 0.25 + atual.y * 0.5 + prox.y * 0.25
      });
    }
  }
  suavizados.push(semRepetidos[semRepetidos.length - 1]);
  return suavizados;
}

/**
 * 2. SIMPLIFICAR (Ramer-Douglas-Peucker):
 * Preserva cantos reais usando tolerância configurável
 */
export function etapa2SimplificarRDP(pontos, tolerancia = 10) {
  if (pontos.length <= 2) return pontos.slice();

  let maxDist = 0;
  let indiceMax = 0;
  const primeiro = pontos[0];
  const ultimo = pontos[pontos.length - 1];

  for (let i = 1; i < pontos.length - 1; i++) {
    const d = distanciaPontoReta(pontos[i], primeiro, ultimo);
    if (d > maxDist) {
      maxDist = d;
      indiceMax = i;
    }
  }

  if (maxDist > tolerancia) {
    const esq = etapa2SimplificarRDP(pontos.slice(0, indiceMax + 1), tolerancia);
    const dir = etapa2SimplificarRDP(pontos.slice(indiceMax), tolerancia);
    return esq.slice(0, -1).concat(dir);
  }

  return [
    { x: primeiro.x, y: primeiro.y },
    { x: ultimo.x, y: ultimo.y }
  ];
}

export function alinharValorAoGrid(valor, dpiGrid, meiaCelula = true) {
  const passo = meiaCelula ? dpiGrid * 0.5 : dpiGrid;
  return Math.round(valor / passo) * passo;
}

/**
 * 3. ENDIREITAR:
 * - Quase horizontais/verticais viram retas perfeitas (padrão ~8°)
 * - Opção para diagonais de 45°
 * - Opção para alinhar ao grid (1 célula ou 0.5 célula)
 */
export function etapa3Endireitar(pontos, opcoes, dpiGrid = 150) {
  if (pontos.length < 2) return pontos;
  const tolGraus = Number(opcoes.toleranciaAnguloGraus ?? 8);
  const usar45 = Boolean(opcoes.aceitarDiagonais45);
  const usarGrid = Boolean(opcoes.alinharAoGrid);
  const meiaCelula = Boolean(opcoes.passoGridMeiaCelula);

  const resultado = pontos.map((p) => ({ x: p.x, y: p.y }));

  for (let i = 0; i < resultado.length - 1; i++) {
    const a = resultado[i];
    const b = resultado[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const anguloGraus = Math.atan2(dy, dx) * (180 / Math.PI);
    const absAng = Math.abs(anguloGraus);

    if (absAng <= tolGraus || Math.abs(absAng - 180) <= tolGraus) {
      b.y = a.y;
    } else if (Math.abs(absAng - 90) <= tolGraus) {
      b.x = a.x;
    } else if (
      usar45 &&
      (Math.abs(absAng - 45) <= tolGraus || Math.abs(absAng - 135) <= tolGraus)
    ) {
      const media = (Math.abs(dx) + Math.abs(dy)) * 0.5;
      b.x = a.x + Math.sign(dx || 1) * media;
      b.y = a.y + Math.sign(dy || 1) * media;
    }
  }

  if (usarGrid) {
    for (let i = 0; i < resultado.length; i++) {
      resultado[i].x = alinharValorAoGrid(resultado[i].x, dpiGrid, meiaCelula);
      resultado[i].y = alinharValorAoGrid(resultado[i].y, dpiGrid, meiaCelula);
    }
  }

  return resultado;
}

/**
 * 4. GRUDAR E FECHAR:
 * - Se ponta final ficar perto da inicial do mesmo traço, fecha o polígono
 * - Se ponta ficar perto de outra parede, conecta no vértice ou divide o segmento existente
 */
export function etapa4GrudarEFechar(tracosPontos, paredesExistentes, raioSnap = 22) {
  let paredesAtuais = paredesExistentes.map((p) => ({ ...p }));
  const novosSegmentos = [];

  function grudarPonto(ponto, listaParedes) {
    let melhorVertice = null;
    let menorDistV = raioSnap;

    for (const par of listaParedes) {
      const d1 = distancia(ponto, { x: par.x1, y: par.y1 });
      if (d1 <= menorDistV) {
        menorDistV = d1;
        melhorVertice = { x: par.x1, y: par.y1 };
      }
      const d2 = distancia(ponto, { x: par.x2, y: par.y2 });
      if (d2 <= menorDistV) {
        menorDistV = d2;
        melhorVertice = { x: par.x2, y: par.y2 };
      }
    }
    if (melhorVertice) return melhorVertice;

    let indiceDividir = -1;
    let pontoProj = null;
    let menorDistSeg = raioSnap;

    for (let i = 0; i < listaParedes.length; i++) {
      const par = listaParedes[i];
      const proj = projetarPontoNoSegmento(
        ponto,
        { x: par.x1, y: par.y1 },
        { x: par.x2, y: par.y2 }
      );
      if (proj.t > 0.05 && proj.t < 0.95 && proj.dist <= menorDistSeg) {
        menorDistSeg = proj.dist;
        indiceDividir = i;
        pontoProj = { x: proj.x, y: proj.y };
      }
    }

    if (indiceDividir !== -1 && pontoProj) {
      const orig = listaParedes[indiceDividir];
      const segA = { ...orig, id: `${orig.id}_a`, x2: pontoProj.x, y2: pontoProj.y };
      const segB = { ...orig, id: `${orig.id}_b`, x1: pontoProj.x, y1: pontoProj.y };
      listaParedes.splice(indiceDividir, 1, segA, segB);
      return pontoProj;
    }

    return { x: ponto.x, y: ponto.y };
  }

  for (const ptsOrig of tracosPontos) {
    if (ptsOrig.length < 2) continue;
    const pts = ptsOrig.map((p) => ({ x: p.x, y: p.y }));

    const fecharPoligono =
      pts.length >= 3 && distancia(pts[0], pts[pts.length - 1]) <= raioSnap * 1.3;

    if (fecharPoligono) {
      pts[pts.length - 1] = { x: pts[0].x, y: pts[0].y };
    } else {
      const todas = paredesAtuais.concat(novosSegmentos);
      pts[0] = grudarPonto(pts[0], todas);
      pts[pts.length - 1] = grudarPonto(pts[pts.length - 1], todas);
      paredesAtuais = todas.filter((s) => !novosSegmentos.includes(s));
    }

    for (let i = 0; i < pts.length - 1; i++) {
      novosSegmentos.push({
        id: `par_${Date.now()}_${Math.random().toString(36).slice(2, 6)}_${i}`,
        x1: pts[i].x,
        y1: pts[i].y,
        x2: pts[i + 1].x,
        y2: pts[i + 1].y,
        porta: false,
        aberta: false
      });
    }
  }

  return {
    paredesExistentesAtualizadas: paredesAtuais,
    novosSegmentos
  };
}

/**
 * 5. LIMPEZA FINAL:
 * - Une segmentos colineares adjacentes
 * - Remove segmentos menores que o comprimento mínimo
 * - Remove paredes duplicadas idênticas
 */
export function etapa5LimpezaFinal(segmentos, comprimentoMinimo = 16) {
  const filtrados = segmentos.filter(
    (s) => Math.hypot(s.x2 - s.x1, s.y2 - s.y1) >= Math.max(4, comprimentoMinimo * 0.5)
  );

  const unidos = [];
  for (const atual of filtrados) {
    if (unidos.length === 0) {
      unidos.push({ ...atual });
      continue;
    }
    const ant = unidos[unidos.length - 1];
    const mesmaPonta =
      Math.hypot(ant.x2 - atual.x1, ant.y2 - atual.y1) < 1.5 &&
      !ant.porta &&
      !atual.porta;

    if (mesmaPonta) {
      const ang1 = Math.atan2(ant.y2 - ant.y1, ant.x2 - ant.x1);
      const ang2 = Math.atan2(atual.y2 - atual.y1, atual.x2 - atual.x1);
      let diff = Math.abs(ang2 - ang1) * (180 / Math.PI);
      if (diff > 180) diff = 360 - diff;

      if (diff <= 2.0) {
        ant.x2 = atual.x2;
        ant.y2 = atual.y2;
        continue;
      }
    }
    unidos.push({ ...atual });
  }

  const unicos = [];
  const chaves = new Set();
  for (const s of unidos) {
    const p1 = `${Math.round(s.x1)},${Math.round(s.y1)}`;
    const p2 = `${Math.round(s.x2)},${Math.round(s.y2)}`;
    const chave = p1 < p2 ? `${p1}|${p2}` : `${p2}|${p1}`;
    if (!chaves.has(chave)) {
      chaves.add(chave);
      unicos.push(s);
    }
  }

  return unicos;
}

/**
 * Executa as 5 etapas em sequência
 */
export function organizarTracosParede(tracosBrutos, paredesExistentes, config, dpiGrid = 150) {
  const tracosProcessados = [];

  for (const traco of tracosBrutos) {
    if (traco.linhaReta && traco.pontos.length === 2) {
      const endireitado = etapa3Endireitar(traco.pontos, config, dpiGrid);
      tracosProcessados.push(endireitado);
      continue;
    }

    const limpo = etapa1Limpar(traco.pontos, config.comprimentoMinimoSegmento);
    if (limpo.length < 2) continue;

    const simplificado = etapa2SimplificarRDP(limpo, config.toleranciaRDP);
    const endireitado = etapa3Endireitar(simplificado, config, dpiGrid);
    tracosProcessados.push(endireitado);
  }

  const { paredesExistentesAtualizadas, novosSegmentos } = etapa4GrudarEFechar(
    tracosProcessados,
    paredesExistentes,
    config.raioSnap
  );

  const novosLimpos = etapa5LimpezaFinal(novosSegmentos, config.comprimentoMinimoSegmento);
  const todas = etapa5LimpezaFinal(
    paredesExistentesAtualizadas.concat(novosLimpos),
    config.comprimentoMinimoSegmento
  );

  return {
    novosSegmentos: novosLimpos,
    todasParedes: todas
  };
}

/**
 * Verifica se dois segmentos (A->B) e (C->D) se cruzam (para bloquear movimento de tokens)
 */
export function segmentosSeCruzam(a, b, c, d) {
  const ccw = (p1, p2, p3) =>
    (p3.y - p1.y) * (p2.x - p1.x) > (p2.y - p1.y) * (p3.x - p1.x);
  return ccw(a, c, d) !== ccw(b, c, d) && ccw(a, b, c) !== ccw(a, b, d);
}