// ============================================================
// Popover do menu de contexto: grade de condições (liga/desliga)
// ============================================================
import OBR from "https://esm.sh/@owlbear-rodeo/sdk@3";
import { CONDICOES, POR_ID, urlIcone } from "./condicoes.js";
import { alterarCondicoes, aplicarTema, esc, lerEstado } from "./comum.js";
const ids = (new URLSearchParams(location.search).get("ids") ?? "").split(",").filter(Boolean);
const app = document.getElementById("app");
let itens = [];
let duracao = ""; // rodadas ao ativar (vazio = sem duração)
let dica = "Passe o mouse (ou toque) em uma condição para ver a regra.";
/** Estado agregado: ativa se estiver ativa em TODOS os tokens selecionados. */
const ativaEmTodos = (id) => itens.length > 0 && itens.every((i) => lerEstado(i).condicoes[id]);
const nivelAtual = () => lerEstado(itens[0]).condicoes["exhaustion"]?.nivel ?? 1;
function render() {
    const nomes = itens.length === 1 ? esc(itens[0].name || "Token") : `${itens.length} tokens`;
    const exaustaoOn = ativaEmTodos("exhaustion");
    app.innerHTML = `
    <header><h1>Condições</h1><span class="mudo">${nomes}</span></header>
    <div class="grade">
      ${CONDICOES.map((c) => `
        <button class="cel ${ativaEmTodos(c.id) ? "on" : ""}" data-id="${c.id}"
                style="--cor:${c.cor}" title="${esc(c.nome + ": " + c.regra)}"
                aria-pressed="${ativaEmTodos(c.id)}">
          <img src="${urlIcone(c)}" alt="" width="32" height="32" />
          <span>${c.nome}</span>
        </button>`).join("")}
    </div>
    ${exaustaoOn ? `
      <div class="linha"><span>Nível de exaustão</span>
        <div class="seg">${[1, 2, 3, 4, 5, 6].map((n) => `<button data-nivel="${n}" class="${n === nivelAtual() ? "on" : ""}">${n}</button>`).join("")}</div>
      </div>` : ""}
    <label class="linha">
      <span>Duração ao ativar (rodadas)</span>
      <input id="dur" type="number" min="1" max="99" placeholder="sem limite" value="${duracao}" />
    </label>
    <p class="regra" id="regra">${esc(dica)}</p>`;
}
// Delegação de eventos (a tela é redesenhada a cada mudança)
app.addEventListener("click", async (ev) => {
    const alvo = ev.target;
    const cel = alvo.closest("[data-id]");
    const nv = alvo.closest("[data-nivel]");
    if (cel) {
        const def = POR_ID[cel.dataset.id];
        mostrarRegra(def);
        const ligar = !ativaEmTodos(def.id);
        const rod = parseInt(duracao, 10);
        await alterarCondicoes(ids, (cond) => {
            if (!ligar) {
                delete cond[def.id];
                return;
            }
            cond[def.id] = {};
            if (def.comNivel)
                cond[def.id].nivel = 1;
            else if (rod > 0)
                cond[def.id].rodadas = rod;
        });
    }
    else if (nv) {
        const n = Number(nv.dataset.nivel);
        await alterarCondicoes(ids, (cond) => { if (cond.exhaustion)
            cond.exhaustion.nivel = n; });
    }
});
app.addEventListener("input", (ev) => {
    const t = ev.target;
    if (t.id === "dur")
        duracao = t.value; // sem re-render para não perder o foco
});
// Mostra a regra ao passar o mouse / focar
function mostrarRegra(def) {
    dica = `${def.nome} (${def.nomeEn}): ${def.regra}`;
    const p = document.getElementById("regra");
    if (p)
        p.textContent = dica;
}
app.addEventListener("pointerover", (ev) => {
    const cel = ev.target.closest("[data-id]");
    if (cel)
        mostrarRegra(POR_ID[cel.dataset.id]);
});
app.addEventListener("focusin", (ev) => {
    const cel = ev.target.closest("[data-id]");
    if (cel)
        mostrarRegra(POR_ID[cel.dataset.id]);
});
let ultimaAssinatura = "";
async function carregar() {
    itens = await OBR.scene.items.getItems(ids);
    if (!itens.length) {
        OBR.popover.close("br.condicao/popover");
        return;
    }
    // Só redesenha se algo relevante mudou (evita perder o foco do campo de duração)
    const ass = JSON.stringify(itens.map((i) => [i.id, i.name, lerEstado(i)]));
    if (ass === ultimaAssinatura)
        return;
    ultimaAssinatura = ass;
    render();
}
OBR.onReady(async () => {
    await aplicarTema();
    await carregar();
    // Mantém a grade atualizada se outro jogador alterar as condições
    OBR.scene.items.onChange(carregar);
});
