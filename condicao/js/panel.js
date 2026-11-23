/**
 * Painel do Mestre (janela de ação na barra do Owlbear Rodeo):
 * - Lista todos os tokens da cena e suas condições ativas
 * - Filtros por nome, condição específica e "só com condição"
 * - Botão "Limpar condições" e seletor rápido por token
 * - Contador de rodadas individual e botão global "−1 Rodada (Todos)" com remoção automática
 * - Aba de referência rápida com todas as 15 regras em português
 */
import OBR from "@owlbear-rodeo/sdk";
import { CONDITIONS, CONDITION_MAP, EXHAUSTION_LEVELS, buildConditionSvg } from "./conditions.js";
import {
  isManagedToken,
  getTokenDisplayName,
  getTokenConditions,
  toggleConditionOnTokens,
  setExhaustionOnTokens,
  setConditionRoundsOnTokens,
  clearConditionsOnTokens,
  advanceRoundForTokens,
} from "./sync.js";

const els = {
  roleSubtitle: document.getElementById("roleSubtitle"),
  btnAdvanceRound: document.getElementById("btnAdvanceRound"),
  tabTokens: document.getElementById("tabTokens"),
  tabRules: document.getElementById("tabRules"),
  filtersBar: document.getElementById("filtersBar"),
  searchInput: document.getElementById("searchInput"),
  conditionFilter: document.getElementById("conditionFilter"),
  onlyActiveCheckbox: document.getElementById("onlyActiveCheckbox"),
  panelContent: document.getElementById("panelContent"),
  panelRuleTitle: document.getElementById("panelRuleTitle"),
  panelRuleBody: document.getElementById("panelRuleBody"),
};

let sceneReady = false;
let playerRole = "PLAYER";
let allTokens = [];
let activeTab = "tokens"; // "tokens" | "rules"
let expandedPickerTokenId = null;

function setRuleFooter(title, body) {
  els.panelRuleTitle.textContent = title;
  els.panelRuleBody.textContent = body;
}

function populateConditionFilter() {
  for (const cond of CONDITIONS) {
    const opt = document.createElement("option");
    opt.value = cond.id;
    opt.textContent = `${cond.name} (${cond.en})`;
    els.conditionFilter.appendChild(opt);
  }
}

function renderRulesTab() {
  const container = document.createElement("div");

  for (const cond of CONDITIONS) {
    const card = document.createElement("div");
    card.className = "rule-ref-card";
    const svg = buildConditionSvg(cond.id, {
      level: cond.id === "exhaustion" ? 1 : null,
      size: 30,
    });

    let extraHtml = "";
    if (cond.id === "exhaustion") {
      const listItems = EXHAUSTION_LEVELS.map(
        (e) => `<div><strong>Nível ${e.level}:</strong> ${e.summary}</div>`
      ).join("");
      extraHtml = `<div style="margin-top:4px;font-size:11px;color:#fecaca">${listItems}</div>`;
    }

    card.innerHTML = `
      <div>${svg}</div>
      <div>
        <div class="rule-ref-title">${cond.name} <span style="color:var(--text-muted);font-weight:400">(${cond.en})</span></div>
        <div class="rule-ref-text">${cond.rule}</div>
        ${extraHtml}
      </div>
    `;
    container.appendChild(card);
  }

  els.panelContent.innerHTML = "";
  els.panelContent.appendChild(container);
}

function renderTokensTab() {
  if (!sceneReady) {
    els.panelContent.innerHTML = `<div class="empty-state">Abra uma cena no Owlbear Rodeo para gerenciar os tokens.</div>`;
    return;
  }

  const query = els.searchInput.value.trim().toLowerCase();
  const condFilter = els.conditionFilter.value;
  const onlyActive = els.onlyActiveCheckbox.checked;

  const filtered = allTokens.filter((token) => {
    // Jogadores não veem tokens ocultos pelo Mestre
    if (playerRole !== "GM" && !token.visible) return false;

    const name = getTokenDisplayName(token).toLowerCase();
    if (query && !name.includes(query)) return false;

    const conds = getTokenConditions(token);
    const activeIds = Object.keys(conds);

    if (onlyActive && activeIds.length === 0) return false;
    if (condFilter && !conds[condFilter]) return false;

    return true;
  });

  // Ordena: tokens com condições primeiro, depois ordem alfabética
  filtered.sort((a, b) => {
    const countA = Object.keys(getTokenConditions(a)).length;
    const countB = Object.keys(getTokenConditions(b)).length;
    if (countA > 0 && countB === 0) return -1;
    if (countB > 0 && countA === 0) return 1;
    return getTokenDisplayName(a).localeCompare(getTokenDisplayName(b), "pt-BR");
  });

  if (filtered.length === 0) {
    els.panelContent.innerHTML = `<div class="empty-state">Nenhum token encontrado com os filtros atuais.</div>`;
    return;
  }

  const list = document.createElement("div");
  list.className = "token-list";

  for (const token of filtered) {
    const conds = getTokenConditions(token);
    const activeEntries = CONDITIONS.filter((c) => Boolean(conds[c.id])).map((c) => ({
      cond: c,
      state: conds[c.id],
    }));

    const card = document.createElement("div");
    card.className = "token-card";

    const thumbUrl = token.image?.url || "";
    const tokenName = getTokenDisplayName(token);

    card.innerHTML = `
      <div class="token-card-header">
        <div class="token-identity">
          ${thumbUrl ? `<img class="token-thumb" src="${thumbUrl}" alt="" />` : ""}
          <div style="min-width:0">
            <div class="token-name">${tokenName}</div>
            ${!token.visible ? '<span class="badge-hidden">Oculto</span>' : ""}
          </div>
        </div>
        <div class="header-actions">
          <button type="button" class="btn-sm" data-act="toggle-picker" title="Adicionar ou remover condições">
            ${expandedPickerTokenId === token.id ? "Fechar" : "+ Condição"}
          </button>
          <button type="button" class="btn-danger btn-sm" data-act="clear" ${
            activeEntries.length === 0 ? "disabled" : ""
          } title="Limpar todas as condições deste token">
            Limpar
          </button>
        </div>
      </div>
    `;

    // Botão "+ Condição" (abre mini seletor inline)
    card.querySelector('[data-act="toggle-picker"]').addEventListener("click", () => {
      expandedPickerTokenId = expandedPickerTokenId === token.id ? null : token.id;
      render();
    });

    // Botão "Limpar condições" por token
    card.querySelector('[data-act="clear"]').addEventListener("click", async () => {
      await clearConditionsOnTokens([token.id]);
    });

    // Lista de condições ativas deste token com contador de rodadas
    if (activeEntries.length > 0) {
      const condListEl = document.createElement("div");
      condListEl.className = "token-conditions";

      for (const { cond, state } of activeEntries) {
        const rounds = state.rounds;
        const isExpiring = rounds === 1;

        const row = document.createElement("div");
        row.className = `token-cond-item${isExpiring ? " expiring" : ""}`;

        const svg = buildConditionSvg(cond.id, { level: state.level, rounds, size: 24 });
        const nameText =
          cond.id === "exhaustion" && state.level
            ? `${cond.name} – Nível ${state.level}`
            : cond.name;

        const roundText =
          typeof rounds === "number"
            ? rounds === 1
              ? "1 rodada (acaba no próximo turno!)"
              : `${rounds} rodadas restantes`
            : "Sem contador de rodadas";

        row.innerHTML = `
          <div class="token-cond-left">
            ${svg}
            <div class="token-cond-text">
              <div class="token-cond-name">${nameText}</div>
              <div class="token-cond-meta">${roundText}</div>
            </div>
          </div>
          <div class="round-controls">
            ${
              cond.id === "exhaustion"
                ? `<button type="button" class="btn-sm" data-act="exh-up" title="Aumentar nível de Exaustão (1–6)">Nv+</button>`
                : ""
            }
            <button type="button" class="btn-icon btn-sm" data-act="dec" title="Decrementar 1 rodada (remove ao chegar a 0)">−1</button>
            <button type="button" class="btn-icon btn-sm" data-act="inc" title="Adicionar 1 rodada">+1</button>
            <button type="button" class="btn-icon btn-sm btn-danger" data-act="remove" title="Remover condição">×</button>
          </div>
        `;

        row.addEventListener("mouseenter", () => {
          if (cond.id === "exhaustion" && state.level) {
            setRuleFooter(
              `Exaustão — Nível ${state.level}`,
              EXHAUSTION_LEVELS[state.level - 1].summary
            );
          } else {
            setRuleFooter(`${cond.name} (${cond.en})`, cond.rule);
          }
        });

        const exhUpBtn = row.querySelector('[data-act="exh-up"]');
        if (exhUpBtn) {
          exhUpBtn.addEventListener("click", async () => {
            const nextLevel = (state.level || 1) >= 6 ? 1 : (state.level || 1) + 1;
            await setExhaustionOnTokens([token.id], nextLevel);
          });
        }

        row.querySelector('[data-act="dec"]').addEventListener("click", async () => {
          const next = typeof rounds === "number" ? rounds - 1 : 1;
          await setConditionRoundsOnTokens([token.id], cond.id, next);
        });

        row.querySelector('[data-act="inc"]').addEventListener("click", async () => {
          const next = typeof rounds === "number" ? rounds + 1 : 1;
          await setConditionRoundsOnTokens([token.id], cond.id, next);
        });

        row.querySelector('[data-act="remove"]').addEventListener("click", async () => {
          if (cond.id === "exhaustion") {
            await setExhaustionOnTokens([token.id], 0);
          } else {
            await toggleConditionOnTokens([token.id], cond.id);
          }
        });

        condListEl.appendChild(row);
      }

      card.appendChild(condListEl);
    }

    // Mini seletor rápido inline de todas as 15 condições
    if (expandedPickerTokenId === token.id) {
      const picker = document.createElement("div");
      picker.className = "quick-picker";

      for (const cond of CONDITIONS) {
        const isActive = Boolean(conds[cond.id]);
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `quick-pick-btn${isActive ? " active" : ""}`;
        btn.innerHTML = `
          ${buildConditionSvg(cond.id, { level: conds[cond.id]?.level || null, size: 18 })}
          <span>${cond.name}</span>
        `;
        btn.addEventListener("mouseenter", () => {
          setRuleFooter(`${cond.name} (${cond.en})`, cond.rule);
        });
        btn.addEventListener("click", async () => {
          if (cond.id === "exhaustion") {
            const cur = conds.exhaustion?.level || 0;
            const next = cur >= 6 ? 0 : cur + 1;
            await setExhaustionOnTokens([token.id], next);
          } else {
            await toggleConditionOnTokens([token.id], cond.id);
          }
        });
        picker.appendChild(btn);
      }

      card.appendChild(picker);
    }

    list.appendChild(card);
  }

  els.panelContent.innerHTML = "";
  els.panelContent.appendChild(list);
}

function render() {
  els.tabTokens.classList.toggle("active", activeTab === "tokens");
  els.tabRules.classList.toggle("active", activeTab === "rules");
  els.filtersBar.style.display = activeTab === "tokens" ? "flex" : "none";

  // Verifica se há alguma condição com contador de rodadas na cena
  const hasAnyTimed = allTokens.some((t) =>
    Object.values(getTokenConditions(t)).some((c) => typeof c.rounds === "number" && c.rounds > 0)
  );
  els.btnAdvanceRound.disabled = !sceneReady || !hasAnyTimed;

  if (activeTab === "rules") {
    renderRulesTab();
  } else {
    renderTokensTab();
  }
}

async function refreshSceneData() {
  sceneReady = await OBR.scene.isReady();
  if (!sceneReady) {
    allTokens = [];
    render();
    return;
  }

  const items = await OBR.scene.items.getItems();
  allTokens = items.filter(isManagedToken);
  render();
}

OBR.onReady(async () => {
  populateConditionFilter();

  playerRole = await OBR.player.getRole();
  els.roleSubtitle.textContent = playerRole === "GM" ? "Painel do Mestre (GM)" : "Visualização do Jogador";

  OBR.player.onChange((player) => {
    playerRole = player.role;
    els.roleSubtitle.textContent = playerRole === "GM" ? "Painel do Mestre (GM)" : "Visualização do Jogador";
    render();
  });

  // Abas
  els.tabTokens.addEventListener("click", () => {
    activeTab = "tokens";
    render();
  });

  els.tabRules.addEventListener("click", () => {
    activeTab = "rules";
    render();
  });

  // Filtros
  els.searchInput.addEventListener("input", render);
  els.conditionFilter.addEventListener("change", render);
  els.onlyActiveCheckbox.addEventListener("change", render);

  // Botão global "−1 Rodada (Todos)"
  els.btnAdvanceRound.addEventListener("click", async () => {
    const expired = await advanceRoundForTokens(null);
    if (expired.length > 0) {
      const summary = expired.map((e) => `${e.tokenName}: ${e.conditionName}`).join(" • ");
      await OBR.notification.show(`Condições encerradas — ${summary}`, "INFO");
    } else {
      await OBR.notification.show("Contador de rodadas avançado (−1).", "SUCCESS");
    }
  });

  // Reage a mudanças na cena em tempo real
  OBR.scene.onReadyChange(() => {
    refreshSceneData();
  });

  OBR.scene.items.onChange(() => {
    refreshSceneData();
  });

  await refreshSceneData();
});