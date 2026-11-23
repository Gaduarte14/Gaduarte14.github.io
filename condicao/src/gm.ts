// ============================================================
// Painel do Mestre: todos os tokens, condições ativas, filtros,
// contador de rodadas e botão "Limpar condições".
// ============================================================
import OBR, { Item } from "@owlbear-rodeo/sdk";
import { CONDICOES, POR_ID, textoRodadas, urlIcone } from "./condicoes";
import { alterarCondicoes, aplicarTema, ehToken, esc, lerEstado } from "./comum";
import "./estilo.css";

const app = document.getElementById("app")!;
let tokens: Item[] = [];
const filtro = { texto: "", condicao: "", soComCondicao: true };

/** Tokens filtrados e ordenados por nome. */
function visiveis(): Item[] {
  return tokens
    .filter((t) => {
      const cond = lerEstado(t).condicoes;
      if (filtro.soComCondicao && !Object.keys(cond).length) return false;
      if (filtro.condicao && !cond[filtro.condicao]) return false;
      if (filtro.texto && !(t.name || "").toLowerCase().includes(filtro.texto.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", "pt-BR"));
}

function chip(tokenId: string, id: string, dados: { rodadas?: number; nivel?: number }): string {
  const def = POR_ID[id];
  const extra = def.comNivel
    ? ` – nível ${dados.nivel ?? 1}`
    : dados.rodadas !== undefined ? ` – ${textoRodadas(dados.rodadas)}` : "";
  const fim = dados.rodadas === 1 ? "fim" : "";
  return `
    <li class="chip ${fim}" style="--cor:${def.cor}" title="${esc(def.regra)}">
      <img src="${urlIcone(def)}" alt="" width="22" height="22" />
      <span class="chip-txt">${def.nome}${extra}</span>
      ${def.comNivel ? "" : `
        <span class="ctl">
          <button data-acao="dec" data-t="${tokenId}" data-c="${id}" title="Diminuir 1 rodada">−</button>
          <button data-acao="inc" data-t="${tokenId}" data-c="${id}" title="Aumentar 1 rodada">+</button>
        </span>`}
      <button data-acao="rm" data-t="${tokenId}" data-c="${id}" title="Remover condição" aria-label="Remover ${def.nome}">×</button>
    </li>`;
}

function render() {
  const lista = visiveis();
  app.innerHTML = `
    <header><h1>Painel de Condições</h1><span class="mudo">${lista.length} de ${tokens.length} tokens</span></header>
    <div class="filtros">
      <input id="f-texto" type="search" placeholder="Buscar token…" value="${esc(filtro.texto)}" />
      <select id="f-cond">
        <option value="">Todas as condições</option>
        ${CONDICOES.map((c) => `<option value="${c.id}" ${filtro.condicao === c.id ? "selected" : ""}>${c.nome}</option>`).join("")}
      </select>
      <label class="check"><input id="f-so" type="checkbox" ${filtro.soComCondicao ? "checked" : ""}/> Só com condições</label>
    </div>
    <div class="acoes">
      <button class="primario" data-acao="turno" title="Remove 1 rodada de todas as condições com duração">Próximo turno (−1 rodada)</button>
      <button data-acao="limpar-tudo">Limpar todas</button>
    </div>
    <div class="lista">
      ${lista.length ? lista.map((t) => {
        const cond = lerEstado(t).condicoes;
        const chips = CONDICOES.filter((c) => cond[c.id]).map((c) => chip(t.id, c.id, cond[c.id])).join("");
        return `
        <section class="token">
          <div class="token-topo">
            <strong>${esc(t.name || "Sem nome")}</strong>
            <span>
              <button data-acao="focar" data-t="${t.id}" title="Selecionar e centralizar o token">Focar</button>
              <button data-acao="limpar" data-t="${t.id}" ${chips ? "" : "disabled"}>Limpar condições</button>
            </span>
          </div>
          ${chips ? `<ul class="chips">${chips}</ul>` : `<p class="mudo">Sem condições.</p>`}
        </section>`;
      }).join("") : `<p class="vazio">Nenhum token encontrado com esses filtros.</p>`}
    </div>`;
}

/** Decrementa uma rodada; remove ao chegar a 0. */
function decrementar(cond: Record<string, { rodadas?: number; nivel?: number }>, id: string) {
  const c = cond[id];
  if (!c || c.rodadas === undefined) return;
  c.rodadas -= 1;
  if (c.rodadas <= 0) delete cond[id]; // remoção automática
}

app.addEventListener("click", async (ev) => {
  const b = (ev.target as HTMLElement).closest<HTMLElement>("[data-acao]");
  if (!b) return;
  const { acao, t, c } = b.dataset;
  switch (acao) {
    case "dec": await alterarCondicoes([t!], (cond) => decrementar(cond, c!)); break;
    case "inc": await alterarCondicoes([t!], (cond) => {
      if (cond[c!]) cond[c!].rodadas = (cond[c!].rodadas ?? 0) + 1;
    }); break;
    case "rm": await alterarCondicoes([t!], (cond) => { delete cond[c!]; }); break;
    case "limpar": await alterarCondicoes([t!], (cond) => { for (const k of Object.keys(cond)) delete cond[k]; }); break;
    case "limpar-tudo":
      if (confirm("Remover as condições de TODOS os tokens?"))
        await alterarCondicoes(tokens.filter((x) => Object.keys(lerEstado(x).condicoes).length).map((x) => x.id),
          (cond) => { for (const k of Object.keys(cond)) delete cond[k]; });
      break;
    case "turno": {
      // Só mexe em tokens que têm alguma condição com duração
      const alvo = tokens.filter((x) => Object.values(lerEstado(x).condicoes).some((v) => v.rodadas !== undefined));
      await alterarCondicoes(alvo.map((x) => x.id), (cond) => { for (const k of Object.keys(cond)) decrementar(cond, k); });
      break;
    }
    case "focar": {
      await OBR.player.select([t!]);
      const bb = await OBR.scene.items.getItemBounds([t!]);
      await OBR.viewport.animateToBounds({ ...bb, min: { x: bb.min.x - 300, y: bb.min.y - 300 }, max: { x: bb.max.x + 300, y: bb.max.y + 300 }, width: bb.width + 600, height: bb.height + 600 });
      break;
    }
  }
});

// Filtros (sem re-render completo do campo de busca para manter o foco)
app.addEventListener("input", (ev) => {
  const el = ev.target as HTMLInputElement;
  if (el.id === "f-texto") { filtro.texto = el.value; render(); const n = document.getElementById("f-texto") as HTMLInputElement; n.focus(); n.setSelectionRange(n.value.length, n.value.length); }
});
app.addEventListener("change", (ev) => {
  const el = ev.target as HTMLInputElement;
  if (el.id === "f-cond") { filtro.condicao = el.value; render(); }
  if (el.id === "f-so") { filtro.soComCondicao = el.checked; render(); }
});

let ultima = "";
async function carregar() {
  tokens = (await OBR.scene.items.getItems()).filter(ehToken);
  const ass = JSON.stringify(tokens.map((t) => [t.id, t.name, lerEstado(t)]));
  if (ass === ultima) return; // ignora mudanças irrelevantes (movimento, pulsar...)
  ultima = ass;
  render();
}

OBR.onReady(async () => {
  await aplicarTema();
  if ((await OBR.player.getRole()) !== "GM") {
    app.innerHTML = `<p class="vazio">O painel de condições é exclusivo do mestre (GM).</p>`;
    return;
  }
  if (!(await OBR.scene.isReady())) {
    app.innerHTML = `<p class="vazio">Abra uma cena para ver os tokens.</p>`;
    OBR.scene.onReadyChange((p) => p && carregar());
    return;
  }
  await carregar();
  OBR.scene.items.onChange(carregar);
});
