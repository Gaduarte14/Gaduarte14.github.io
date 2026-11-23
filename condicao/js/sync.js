/**
 * Módulo central de persistência no metadata do token, posicionamento responsivo
 * dos ícones anexados acima do token e efeito de pulso local para condições acabando.
 */
import OBR, { buildImage, buildShape } from "@owlbear-rodeo/sdk";
import { CONDITIONS, CONDITION_MAP, buildConditionSvg, svgToDataUrl } from "./conditions.js";

export const EXTENSION_ID = "com.gaduarte14.condicoes5e";
export const METADATA_KEY = `${EXTENSION_ID}/conditions`;
export const ATTACHMENT_META_KEY = `${EXTENSION_ID}/attachment`;
export const PULSE_META_KEY = `${EXTENSION_ID}/pulse`;

const ICON_INTRINSIC_PX = 128;

// Travas simples para evitar execuções concorrentes
let reconcileBusy = false;
let reconcilePending = false;
let pulseSyncBusy = false;
let pulseSyncPending = false;

/**
 * Retorna um nome amigável para exibir o token na interface.
 */
export function getTokenDisplayName(token) {
  const label = token?.text?.plainText?.trim();
  if (label) return label;
  if (token?.name) return token.name.replace(/\.[^/.]+$/, "");
  return "Token sem nome";
}

/**
 * Identifica se um item da cena é um token gerenciável (personagem ou montaria).
 */
export function isManagedToken(item) {
  if (!item) return false;
  if (item.metadata?.[ATTACHMENT_META_KEY]) return false;
  return item.layer === "CHARACTER" || item.layer === "MOUNT";
}

/**
 * Lê o objeto de condições salvas no metadata do token.
 * Formato: { [conditionId]: { level?: number, rounds?: number | null } }
 */
export function getTokenConditions(token) {
  const raw = token?.metadata?.[METADATA_KEY];
  if (!raw || typeof raw !== "object") return {};
  return { ...raw };
}

/**
 * Atualiza o metadata de um ou mais tokens e sincroniza imediatamente os ícones na cena.
 */
export async function updateTokensConditions(tokenIds, updater) {
  if (!tokenIds || tokenIds.length === 0) return;

  await OBR.scene.items.updateItems(tokenIds, (items) => {
    for (const item of items) {
      const current = getTokenConditions(item);
      const next = updater(current, item) || {};

      // Limpa chaves vazias para manter o metadata enxuto
      const cleaned = {};
      for (const [condId, data] of Object.entries(next)) {
        if (!CONDITION_MAP[condId] || !data) continue;
        cleaned[condId] = {
          level: condId === "exhaustion" ? Math.min(6, Math.max(1, Number(data.level) || 1)) : null,
          rounds:
            typeof data.rounds === "number" && data.rounds > 0
              ? Math.floor(data.rounds)
              : null,
        };
      }

      if (Object.keys(cleaned).length === 0) {
        delete item.metadata[METADATA_KEY];
      } else {
        item.metadata[METADATA_KEY] = cleaned;
      }
    }
  });

  await syncTokensIcons(tokenIds);
}

/**
 * Liga ou desliga uma condição nos tokens informados.
 */
export async function toggleConditionOnTokens(tokenIds, conditionId) {
  const tokens = await OBR.scene.items.getItems(tokenIds);
  // Se todos já têm a condição, desliga; caso contrário, liga em todos
  const allHave = tokens.length > 0 && tokens.every((t) => Boolean(getTokenConditions(t)[conditionId]));

  await updateTokensConditions(tokenIds, (current) => {
    const next = { ...current };
    if (allHave) {
      delete next[conditionId];
    } else {
      next[conditionId] = {
        level: conditionId === "exhaustion" ? current.exhaustion?.level || 1 : null,
        rounds: current[conditionId]?.rounds ?? null,
      };
    }
    return next;
  });
}

/**
 * Define o nível de Exaustão (1 a 6) ou remove se level <= 0 / null.
 */
export async function setExhaustionOnTokens(tokenIds, level) {
  await updateTokensConditions(tokenIds, (current) => {
    const next = { ...current };
    if (!level || level <= 0) {
      delete next.exhaustion;
    } else {
      next.exhaustion = {
        level: Math.min(6, Math.max(1, level)),
        rounds: current.exhaustion?.rounds ?? null,
      };
    }
    return next;
  });
}

/**
 * Define o número de rodadas restantes de uma condição ativa.
 * Se chegar a 0, a condição é removida automaticamente.
 */
export async function setConditionRoundsOnTokens(tokenIds, conditionId, rounds) {
  await updateTokensConditions(tokenIds, (current) => {
    const next = { ...current };
    if (!next[conditionId]) return next;

    if (rounds === null || rounds === undefined) {
      next[conditionId] = { ...next[conditionId], rounds: null };
    } else if (rounds <= 0) {
      delete next[conditionId];
    } else {
      next[conditionId] = { ...next[conditionId], rounds: Math.floor(rounds) };
    }
    return next;
  });
}

/**
 * Remove todas as condições dos tokens informados.
 */
export async function clearConditionsOnTokens(tokenIds) {
  await updateTokensConditions(tokenIds, () => ({}));
}

/**
 * Decrementa 1 rodada de todas as condições com contador nos tokens indicados
 * (ou em toda a cena se tokenIds não for passado).
 * Retorna a lista de condições que chegaram a 0 e foram removidas.
 */
export async function advanceRoundForTokens(tokenIds = null) {
  if (!(await OBR.scene.isReady())) return [];

  const allItems = await OBR.scene.items.getItems();
  const targetTokens = allItems.filter((item) => {
    if (!isManagedToken(item)) return false;
    if (tokenIds && !tokenIds.includes(item.id)) return false;
    const conds = getTokenConditions(item);
    return Object.values(conds).some((c) => typeof c.rounds === "number" && c.rounds > 0);
  });

  if (targetTokens.length === 0) return [];

  const expired = [];
  const targetIds = targetTokens.map((t) => t.id);

  await updateTokensConditions(targetIds, (current, token) => {
    const next = { ...current };
    for (const [condId, data] of Object.entries(current)) {
      if (typeof data.rounds === "number" && data.rounds > 0) {
        const remaining = data.rounds - 1;
        if (remaining <= 0) {
          delete next[condId];
          expired.push({
            tokenName: getTokenDisplayName(token),
            conditionName: CONDITION_MAP[condId]?.name || condId,
          });
        } else {
          next[condId] = { ...data, rounds: remaining };
        }
      }
    }
    return next;
  });

  return expired;
}

/**
 * Calcula o bounding box do token (com fallback seguro).
 */
async function getSafeTokenBounds(token, sceneDpi) {
  try {
    const bounds = await OBR.scene.items.getItemBounds([token.id]);
    if (bounds && bounds.width > 0 && bounds.height > 0) {
      return bounds;
    }
  } catch {
    // Fallback manual caso getItemBounds não esteja disponível para o tipo de item
  }

  const dpiScale = sceneDpi / (token.grid?.dpi || sceneDpi);
  const width = (token.image?.width || sceneDpi) * dpiScale * Math.abs(token.scale?.x ?? 1);
  const height = (token.image?.height || sceneDpi) * dpiScale * Math.abs(token.scale?.y ?? 1);
  const cx = token.position?.x ?? 0;
  const cy = token.position?.y ?? 0;

  return {
    min: { x: cx - width / 2, y: cy - height / 2 },
    max: { x: cx + width / 2, y: cy + height / 2 },
    center: { x: cx, y: cy },
    width,
    height,
  };
}

/**
 * Calcula posição, tamanho e quebra de linhas dos ícones logo acima do token.
 */
function computeIconLayout(activeList, bounds, sceneDpi) {
  const count = activeList.length;
  const tokenWidth = Math.max(bounds.width, sceneDpi * 0.55);
  const centerX = bounds.center.x;
  const topY = bounds.min.y;

  // Define quantos ícones cabem por linha antes de quebrar
  let maxPerRow = count;
  if (count > 8) {
    maxPerRow = 5;
  } else if (count > 4) {
    maxPerRow = 4;
  }

  // Tamanho proporcional à largura do token, com limites legíveis
  let iconSize = Math.min(Math.max(tokenWidth * 0.28, sceneDpi * 0.24), sceneDpi * 0.44);
  if (count > 4) {
    iconSize *= 0.9;
  }
  let gap = iconSize * 0.16;

  // Se a linha ficar larga demais para o token, reduz proporcionalmente
  const maxRowWidth = Math.max(tokenWidth * 1.25, sceneDpi * 1.15);
  const fullRowWidth = maxPerRow * iconSize + (maxPerRow - 1) * gap;
  if (fullRowWidth > maxRowWidth) {
    const ratio = maxRowWidth / fullRowWidth;
    iconSize *= ratio;
    gap *= ratio;
  }

  const scale = iconSize / sceneDpi;

  return activeList.map((entry, idx) => {
    const row = Math.floor(idx / maxPerRow); // Linha 0 = mais próxima ao topo do token
    const col = idx % maxPerRow;
    const itemsInRow = Math.min(maxPerRow, count - row * maxPerRow);
    const rowWidth = itemsInRow * iconSize + (itemsInRow - 1) * gap;
    const startX = centerX - rowWidth / 2 + iconSize / 2;

    return {
      ...entry,
      x: startX + col * (iconSize + gap),
      y: topY - iconSize * 0.62 - row * (iconSize + gap),
      scale,
      iconSize,
    };
  });
}

/**
 * Motor interno que compara os ícones existentes com o estado desejado e aplica apenas o diff.
 */
async function syncIconsInternal(filterTokenIds = null) {
  if (!(await OBR.scene.isReady())) return;

  const sceneDpi = await OBR.scene.grid.getDpi();
  const allItems = await OBR.scene.items.getItems();

  const tokenMap = new Map();
  const attachmentsByToken = new Map();

  for (const item of allItems) {
    const attMeta = item.metadata?.[ATTACHMENT_META_KEY];
    if (attMeta) {
      const ownerId = attMeta.tokenId || item.attachedTo || "__orphan__";
      if (!attachmentsByToken.has(ownerId)) {
        attachmentsByToken.set(ownerId, []);
      }
      attachmentsByToken.get(ownerId).push(item);
    } else if (isManagedToken(item)) {
      tokenMap.set(item.id, item);
    }
  }

  const targetIds = filterTokenIds
    ? new Set(filterTokenIds)
    : new Set([...tokenMap.keys(), ...attachmentsByToken.keys()]);

  const idsToDelete = [];
  const itemsToAdd = [];

  for (const tokenId of targetIds) {
    const token = tokenMap.get(tokenId);
    const existing = attachmentsByToken.get(tokenId) || [];

    // Se o token foi removido da cena, limpa todos os ícones órfãos
    if (!token) {
      for (const att of existing) idsToDelete.push(att.id);
      continue;
    }

    const condsMap = getTokenConditions(token);
    const activeList = CONDITIONS.filter((c) => Boolean(condsMap[c.id])).map((c) => ({
      conditionId: c.id,
      level: condsMap[c.id].level ?? null,
      rounds: condsMap[c.id].rounds ?? null,
    }));

    // Se todas as condições foram desligadas, remove os anexos
    if (activeList.length === 0) {
      for (const att of existing) idsToDelete.push(att.id);
      continue;
    }

    const bounds = await getSafeTokenBounds(token, sceneDpi);
    const desiredLayout = computeIconLayout(activeList, bounds, sceneDpi);

    // Verifica se os ícones existentes já batem exatamente (evita flicker ao mover o token)
    const alreadyInSync =
      existing.length === desiredLayout.length &&
      desiredLayout.every((spec) =>
        existing.some((att) => {
          const meta = att.metadata?.[ATTACHMENT_META_KEY];
          if (!meta) return false;
          return (
            meta.conditionId === spec.conditionId &&
            (meta.level ?? null) === (spec.level ?? null) &&
            (meta.rounds ?? null) === (spec.rounds ?? null) &&
            att.attachedTo === token.id &&
            att.visible === token.visible &&
            Math.abs(att.position.x - spec.x) < 2 &&
            Math.abs(att.position.y - spec.y) < 2 &&
            Math.abs((att.scale?.x ?? 1) - spec.scale) < 0.015
          );
        })
      );

    if (alreadyInSync) continue;

    // Substitui os anexos antigos pelos novos posicionados corretamente
    for (const att of existing) idsToDelete.push(att.id);

    desiredLayout.forEach((spec, index) => {
      const svg = buildConditionSvg(spec.conditionId, {
        level: spec.level,
        rounds: spec.rounds,
        size: ICON_INTRINSIC_PX,
      });
      const url = svgToDataUrl(svg);
      const condName = CONDITION_MAP[spec.conditionId]?.name || spec.conditionId;

      const imageItem = buildImage(
        {
          height: ICON_INTRINSIC_PX,
          width: ICON_INTRINSIC_PX,
          mime: "image/svg+xml",
          url,
        },
        {
          dpi: ICON_INTRINSIC_PX,
          offset: { x: ICON_INTRINSIC_PX / 2, y: ICON_INTRINSIC_PX / 2 },
        }
      )
        .name(`Condição: ${condName}`)
        .layer("ATTACHMENT")
        .position({ x: spec.x, y: spec.y })
        .scale({ x: spec.scale, y: spec.scale })
        .attachedTo(token.id)
        // Mantém VISIBLE e DELETE herdados do token; desativa rotação/escala/cópia para não distorcer
        .disableAttachmentBehavior(["ROTATION", "SCALE", "COPY"])
        .locked(true)
        .disableHit(true)
        .visible(token.visible)
        .zIndex((token.zIndex ?? 0) + 100 + index)
        .metadata({
          [ATTACHMENT_META_KEY]: {
            tokenId: token.id,
            conditionId: spec.conditionId,
            level: spec.level,
            rounds: spec.rounds,
            iconSize: spec.iconSize,
          },
        })
        .build();

      itemsToAdd.push(imageItem);
    });
  }

  if (idsToDelete.length > 0) {
    await OBR.scene.items.deleteItems(idsToDelete);
  }
  if (itemsToAdd.length > 0) {
    await OBR.scene.items.addItems(itemsToAdd);
  }
}

/**
 * Sincroniza apenas os tokens modificados por uma ação do usuário.
 */
export async function syncTokensIcons(tokenIds) {
  await syncIconsInternal(tokenIds);
}

/**
 * Reconcilia toda a cena (limpa órfãos, ajusta tokens redimensionados ou duplicados).
 * Chamada apenas pelo Mestre no background para evitar conflito entre jogadores.
 */
export async function reconcileSceneIcons() {
  if (reconcileBusy) {
    reconcilePending = true;
    return;
  }
  reconcileBusy = true;
  try {
    await syncIconsInternal(null);
  } finally {
    reconcileBusy = false;
    if (reconcilePending) {
      reconcilePending = false;
      await reconcileSceneIcons();
    }
  }
}

/* ============================================================================
 * EFEITO DE PULSO LOCAL (quando a condição está na última rodada: rounds === 1)
 * Usa OBR.scene.local para NÃO gerar tráfego de rede nem poluir o Ctrl+Z.
 * ========================================================================== */

export async function syncLocalPulseRings() {
  if (pulseSyncBusy) {
    pulseSyncPending = true;
    return false;
  }
  pulseSyncBusy = true;

  try {
    if (!(await OBR.scene.isReady())) return false;

    const sceneDpi = await OBR.scene.grid.getDpi();
    const sceneItems = await OBR.scene.items.getItems();
    const localItems = await OBR.scene.local.getItems();

    // Ícones de condição com exatamente 1 rodada restante
    const expiringIcons = sceneItems.filter((item) => {
      const meta = item.metadata?.[ATTACHMENT_META_KEY];
      return meta && meta.rounds === 1 && item.visible;
    });

    const existingPulses = localItems.filter((item) => Boolean(item.metadata?.[PULSE_META_KEY]));
    const expiringIds = new Set(expiringIcons.map((i) => i.id));
    const existingByAttId = new Map(
      existingPulses.map((p) => [p.metadata[PULSE_META_KEY].attachmentId, p])
    );

    const toDelete = [];
    const toAdd = [];

    for (const pulse of existingPulses) {
      const attId = pulse.metadata[PULSE_META_KEY].attachmentId;
      if (!expiringIds.has(attId)) {
        toDelete.push(pulse.id);
      }
    }

    for (const icon of expiringIcons) {
      if (existingByAttId.has(icon.id)) continue;
      const meta = icon.metadata[ATTACHMENT_META_KEY];
      const diameter = (meta.iconSize || sceneDpi * 0.28) * 1.08;

      const ring = buildShape()
        .shapeType("CIRCLE")
        .width(diameter)
        .height(diameter)
        .position({ x: icon.position.x, y: icon.position.y })
        .fillColor("#fbbf24")
        .fillOpacity(0)
        .strokeColor("#fbbf24")
        .strokeOpacity(0.9)
        .strokeWidth(4)
        .layer("ATTACHMENT")
        .attachedTo(icon.attachedTo)
        .disableAttachmentBehavior(["ROTATION", "SCALE", "COPY"])
        .locked(true)
        .disableHit(true)
        .visible(icon.visible)
        .zIndex((icon.zIndex ?? 100) + 1)
        .metadata({
          [PULSE_META_KEY]: {
            attachmentId: icon.id,
            tokenId: icon.attachedTo,
          },
        })
        .build();

      toAdd.push(ring);
    }

    if (toDelete.length > 0) {
      await OBR.scene.local.deleteItems(toDelete);
    }
    if (toAdd.length > 0) {
      await OBR.scene.local.addItems(toAdd);
    }

    return expiringIcons.length > 0;
  } finally {
    pulseSyncBusy = false;
    if (pulseSyncPending) {
      pulseSyncPending = false;
      await syncLocalPulseRings();
    }
  }
}

/**
 * Executa um passo suave da animação de pulso nos anéis locais existentes.
 */
export async function stepLocalPulseAnimation() {
  if (!(await OBR.scene.isReady())) return;
  const localItems = await OBR.scene.local.getItems();
  const pulseIds = localItems
    .filter((item) => Boolean(item.metadata?.[PULSE_META_KEY]))
    .map((item) => item.id);

  if (pulseIds.length === 0) return;

  // Onda senoidal suave entre 0 e 1
  const wave = (Math.sin(Date.now() / 220) + 1) / 2;
  const scale = 1.0 + wave * 0.3;
  const opacity = 0.95 - wave * 0.72;

  await OBR.scene.local.updateItems(pulseIds, (items) => {
    for (const item of items) {
      item.scale = { x: scale, y: scale };
      if (item.style) {
        item.style.strokeOpacity = opacity;
      }
    }
  });
}

/**
 * Remove todos os anéis pulsantes locais (ex.: ao trocar de cena).
 */
export async function clearLocalPulseRings() {
  try {
    if (!(await OBR.scene.isReady())) return;
    const localItems = await OBR.scene.local.getItems();
    const pulseIds = localItems
      .filter((item) => Boolean(item.metadata?.[PULSE_META_KEY]))
      .map((item) => item.id);
    if (pulseIds.length > 0) {
      await OBR.scene.local.deleteItems(pulseIds);
    }
  } catch {
    // Cena já fechada
  }
}