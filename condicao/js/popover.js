/**
 * Interface do Popover aberto ao clicar com o botão direito em um ou mais tokens.
 * Exibe a grade com as 15 condições, controle de Exaustão (1–6), contador de rodadas
 * e legenda com a regra resumida em português.
 */
import OBR from "@owlbear-rodeo/sdk";
import { CONDITIONS, CONDITION_MAP, EXHAUSTION_LEVELS, buildConditionSvg } from "./conditions.js";
import {
  getTokenDisplayName,
  getTokenConditions,
  toggleConditionOnTokens,
  setExhaustionOnTokens,
  setConditionRoundsOnTokens,
  clearConditionsOnTokens,
} from "./sync.js";

const els = {
  tokenTitle: document.getElementById("tokenTitle"),
  tokenSubtitle: document.getElementById("tokenSubtitle"),
  btnClearAll: document.getElementById("btnClearAll"),
  conditionGrid: document.getElementById("conditionGrid"),
  exhaustionContainer: document.getElementById("exhaustionContainer"),
  activeRoundsContainer: document.getElementById("activeRoundsContainer"),
  ruleTitle: document.getElementById("ruleTitle"),
  ruleBody: document.getElementById("ruleBody"),
};

let targetTokenIds = [];
let currentTokens = [];
let showExhaustionBar = false;

function showRule(title, text) {
  els.ruleTitle.textContent = title;
  els.ruleBody.textContent = text;
}

function resetRuleHint() {
  showRule(
    "Dica de Regras (D&D 5e)",
    "Passe o mouse sobre uma condição para ler a regra resumida. Clique para ativar ou desativar."
  );
}

/**
 * Resume as condições ativas considerando 1 ou múltiplos tokens selecionados.
 */
function getMergedConditions() {
  const merged = {};
  for (const token of currentTokens) {
    const conds = getTokenConditions(token);
    for (const [id, data] of Object.entries(conds)) {
      if (!merged[id]) {
        merged[id] = { ...data, count: 1 };
      } else {
        merged[id].count += 1;
        // Mantém o maior nível/rodadas para referência visual
        if (data.level && (!merged[id].level || data.level > merged[id].level)) {
          merged[id].level = data.level;
        }
        if (typeof data.rounds === "number") {
          merged[id].rounds = data.rounds;
        }
      }
    }
  }
  return merged;
}

function renderHeader(merged) {
  const activeCount = Object.keys(merged).length;

  if (currentTokens.length === 0) {
    els.tokenTitle.textContent = "Nenhum token selecionado";
    els.tokenSubtitle.textContent = "Selecione um token no mapa";
    els.btnClearAll.disabled = true;
    return;
  }

  if (currentTokens.length === 1) {
    els.tokenTitle.textContent = getTokenDisplayName(currentTokens[0]);
  } else {
    els.tokenTitle.textContent = `${currentTokens.length} tokens selecionados`;
  }

  els.tokenSubtitle.textContent =
    activeCount === 0
      ? "Nenhuma condição ativa"
      : activeCount === 1
      ? "1 condição ativa"
      : `${activeCount} condições ativas`;

  els.btnClearAll.disabled = activeCount === 0;
}

function renderGrid(merged) {
  els.conditionGrid.innerHTML = "";

  for (const cond of CONDITIONS) {
    const state = merged[cond.id];
    const isActive = Boolean(state);
    const isExpiring = isActive && state.rounds === 1;

    const card = document.createElement("button");
    card.type = "button";
    card.className = `condition-card${isActive ? " active" : ""}${isExpiring ? " expiring" : ""}`;
    card.style.setProperty("--cond-color", cond.color);

    const svgHtml = buildConditionSvg(cond.id, {
      level: state?.level || null,
      rounds: state?.rounds || null,
      size: 34,
    });

    card.innerHTML = `
      ${isActive ? '<span class="active-dot" title="Ativa"></span>' : ""}
      <span class="icon-box">${svgHtml}</span>
      <span class="cond-name">${cond.name}</span>
      <span class="cond-sub">${cond.id === "exhaustion" && state?.level ? `Nível ${state.level}` : cond.en}</span>
    `;

    card.addEventListener("mouseenter", () => {
      if (cond.id === "exhaustion" && state?.level) {
        const lvlObj = EXHAUSTION_LEVELS[state.level - 1];
        showRule(`Exaustão — Nível ${state.level}`, `${lvlObj.summary} (cumulativo com níveis anteriores).`);
      } else {
        showRule(`${cond.name} (${cond.en})`, cond.rule);
      }
    });

    card.addEventListener("click", async () => {
      if (cond.id === "exhaustion") {
        // Abre o seletor de níveis 1–6; se ainda não estava ativo, ativa no nível 1
        showExhaustionBar = true;
        if (!isActive) {
          await setExhaustionOnTokens(targetTokenIds, 1);
        } else {
          renderAll();
        }
        return;
      }
      await toggleConditionOnTokens(targetTokenIds, cond.id);
    });

    els.conditionGrid.appendChild(card);
  }
}

function renderExhaustionBar(merged) {
  const currentLevel = merged.exhaustion?.level || 0;

  if (!showExhaustionBar && currentLevel === 0) {
    els.exhaustionContainer.innerHTML = "";
    return;
  }

  const bar = document.createElement("div");
  bar.className = "exhaustion-bar";

  const activeDesc =
    currentLevel > 0
      ? `Nível ${currentLevel}: ${EXHAUSTION_LEVELS[currentLevel - 1].summary}`
      : "Escolha o nível de Exaustão (1 a 6) para aplicar.";

  bar.innerHTML = `
    <div class="exhaustion-header">
      <span>Nível de Exaustão (1–6)</span>
      <button type="button" class="btn-sm" id="btnCloseExh">Ocultar</button>
    </div>
    <div class="exhaustion-levels" id="exhLevelsRow"></div>
    <div class="exhaustion-desc">${activeDesc}</div>
  `;

  const row = bar.querySelector("#exhLevelsRow");

  // Botão "0" (Desligar)
  const offBtn = document.createElement("button");
  offBtn.type = "button";
  offBtn.textContent = "Off";
  offBtn.title = "Remover Exaustão";
  if (currentLevel === 0) offBtn.className = "selected";
  offBtn.addEventListener("click", async () => {
    showExhaustionBar = false;
    await setExhaustionOnTokens(targetTokenIds, 0);
  });
  row.appendChild(offBtn);

  // Botões de nível 1 a 6
  for (const item of EXHAUSTION_LEVELS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = String(item.level);
    btn.title = `Nível ${item.level}: ${item.summary}`;
    if (currentLevel === item.level) btn.className = "selected";
    btn.addEventListener("mouseenter", () => {
      showRule(`Exaustão — Nível ${item.level}`, item.summary);
    });
    btn.addEventListener("click", async () => {
      await setExhaustionOnTokens(targetTokenIds, item.level);
    });
    row.appendChild(btn);
  }

  bar.querySelector("#btnCloseExh").addEventListener("click", () => {
    showExhaustionBar = false;
    renderAll();
  });

  els.exhaustionContainer.innerHTML = "";
  els.exhaustionContainer.appendChild(bar);
}

function renderActiveRounds(merged) {
  const activeEntries = CONDITIONS.filter((c) => Boolean(merged[c.id])).map((c) => ({
    cond: c,
    state: merged[c.id],
  }));

  if (activeEntries.length === 0) {
    els.activeRoundsContainer.innerHTML = "";
    return;
  }

  const wrapper = document.createElement("div");
  wrapper.className = "active-rounds-section";
  wrapper.innerHTML = `<div class="section-label">Contador de Rodadas (Ativas)</div>`;

  for (const { cond, state } of activeEntries) {
    const rounds = state.rounds;
    const isExpiring = rounds === 1;

    const row = document.createElement("div");
    row.className = "active-round-row";

    const svg = buildConditionSvg(cond.id, { level: state.level, rounds, size: 22 });
    const titleLabel =
      cond.id === "exhaustion" && state.level ? `${cond.name} (${state.level})` : cond.name;

    const pillText =
      typeof rounds === "number"
        ? rounds === 1
          ? "1 rodada!"
          : `${rounds} rodadas`
        : "∞ livre";

    row.innerHTML = `
      <div class="round-cond-info">
        ${svg}
        <span class="round-cond-title">${titleLabel}</span>
      </div>
      <div class="round-controls">
        <button type="button" class="btn-icon btn-sm" data-act="dec" title="Diminuir 1 rodada (remove ao chegar a 0)">−</button>
        <span class="round-pill${typeof rounds === "number" ? " has-rounds" : ""}${isExpiring ? " expiring" : ""}">${pillText}</span>
        <button type="button" class="btn-icon btn-sm" data-act="inc" title="Adicionar 1 rodada">+</button>
        <button type="button" class="btn-icon btn-sm" data-act="inf" title="Deixar sem limite de rodadas">∞</button>
      </div>
    `;

    row.addEventListener("mouseenter", () => {
      showRule(`${cond.name} (${cond.en})`, cond.rule);
    });

    row.querySelector('[data-act="dec"]').addEventListener("click", async () => {
      const next = typeof rounds === "number" ? rounds - 1 : 1;
      await setConditionRoundsOnTokens(targetTokenIds, cond.id, next);
    });

    row.querySelector('[data-act="inc"]').addEventListener("click", async () => {
      const next = typeof rounds === "number" ? rounds + 1 : 1;
      await setConditionRoundsOnTokens(targetTokenIds, cond.id, next);
    });

    row.querySelector('[data-act="inf"]').addEventListener("click", async () => {
      await setConditionRoundsOnTokens(targetTokenIds, cond.id, null);
    });

    wrapper.appendChild(row);
  }

  els.activeRoundsContainer.innerHTML = "";
  els.activeRoundsContainer.appendChild(wrapper);
}

function renderAll() {
  const merged = getMergedConditions();
  renderHeader(merged);
  renderGrid(merged);
  renderExhaustionBar(merged);
  renderActiveRounds(merged);
}

async function loadTokens() {
  if (!(await OBR.scene.isReady()) || targetTokenIds.length === 0) {
    currentTokens = [];
    renderAll();
    return;
  }
  currentTokens = await OBR.scene.items.getItems(targetTokenIds);
  renderAll();
}

OBR.onReady(async () => {
  const params = new URLSearchParams(window.location.search);
  const rawTokens = params.get("tokens");

  if (rawTokens) {
    targetTokenIds = rawTokens.split(",").filter(Boolean);
  } else {
    targetTokenIds = (await OBR.player.getSelection()) || [];
  }

  els.btnClearAll.addEventListener("click", async () => {
    showExhaustionBar = false;
    await clearConditionsOnTokens(targetTokenIds);
  });

  els.conditionGrid.addEventListener("mouseleave", resetRuleHint);

  OBR.scene.items.onChange(() => {
    loadTokens();
  });

  await loadTokens();
});