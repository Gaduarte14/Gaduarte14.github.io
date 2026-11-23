// ============================================================
// Background: registra o menu de contexto e mantém os ícones
// (itens de cena anexados ao token) sincronizados com o metadata.
// ============================================================
import OBR, { Item, buildImage, buildText, isImage } from "@owlbear-rodeo/sdk";
import { CONDICOES, POR_ID, urlIcone } from "./condicoes";
import { ID, META_ICONE, MetaIcone, abs, ehToken, lerEstado } from "./comum";

const PULSAR_ATIVO = true; // efeito de pulsar quando falta 1 rodada
const LADO_BASE = 128; // lado (px) do ícone SVG original

/** Um item que deve existir na cena (ícone ou texto do nível). */
interface Desejado {
  id: string;
  sig: string;
  tokenId: string;
  base: number;
  pulsar: boolean;
  construir: () => Item;
}

/* ---------------------------------------------------------- */
/* Líder: só um cliente cria/remove itens, evitando duplicatas */
/* ---------------------------------------------------------- */
async function souLider(): Promise<boolean> {
  const outros = (await OBR.party.getPlayers()).map((p) => p.id);
  return [OBR.player.id, ...outros].sort()[0] === OBR.player.id;
}

/* ---------------------------------------------------------- */
/* Layout: linha centralizada acima do token, quebrando linhas  */
/* ou reduzindo o tamanho conforme a largura do token           */
/* ---------------------------------------------------------- */
function calcularLayout(largura: number, qtd: number, dpi: number) {
  const max = dpi * 0.4; // tamanho ideal
  const min = dpi * 0.22; // tamanho mínimo legível
  // Reduz proporcionalmente para caber numa linha, até o mínimo
  const lado = Math.max(min, Math.min(max, largura / qtd));
  const porLinha = Math.max(1, Math.floor(largura / lado));
  return { lado, porLinha };
}

/** Calcula todos os itens desejados para um token. */
async function itensDoToken(token: Item, dpi: number): Promise<Desejado[]> {
  const estado = lerEstado(token).condicoes;
  const ativas = CONDICOES.filter((c) => estado[c.id]);
  if (!ativas.length) return [];

  const b = await OBR.scene.items.getItemBounds([token.id]);
  const { lado, porLinha } = calcularLayout(b.width, ativas.length, dpi);
  const gap = dpi * 0.04;
  const escala = lado / dpi; // imagem de 1 célula * escala = lado
  const out: Desejado[] = [];

  ativas.forEach((c, i) => {
    const dados = estado[c.id];
    const linha = Math.floor(i / porLinha);
    const naLinha = Math.min(porLinha, ativas.length - linha * porLinha);
    const col = i % porLinha;
    // Centraliza cada linha horizontalmente no token
    const x = b.center.x + (col - (naLinha - 1) / 2) * lado;
    // Linha 0 fica colada no token; as próximas empilham para cima
    const y = b.min.y - gap - lado / 2 - linha * (lado + gap);
    const pulsar = PULSAR_ATIVO && dados.rodadas === 1;
    const sig = [c.id, Math.round(b.width), i, ativas.length, dados.nivel ?? 0, pulsar ? 1 : 0].join("|");
    const meta: MetaIcone = { tokenId: token.id, sig, base: escala, pulsar };

    out.push({
      id: `${ID}:${token.id}:${c.id}`, sig, tokenId: token.id, base: escala, pulsar,
      construir: () =>
        buildImage(
          { width: LADO_BASE, height: LADO_BASE, mime: "image/svg+xml", url: urlIcone(c) },
          { dpi: LADO_BASE, offset: { x: LADO_BASE / 2, y: LADO_BASE / 2 } }
        )
          .id(`${ID}:${token.id}:${c.id}`)
          .name(c.nome)
          .position({ x, y })
          .scale({ x: escala, y: escala })
          .layer("ATTACHMENT")
          .attachedTo(token.id) // acompanha o token ao mover
          .disableAttachmentBehavior(["ROTATION", "SCALE"]) // ícone não gira nem escala com o token
          .disableHit(true)
          .locked(true)
          .metadata({ [META_ICONE]: meta })
          .build(),
    });

    // Exaustão: número do nível sobre o ícone
    if (c.comNivel) {
      const idTxt = `${ID}:${token.id}:${c.id}:nivel`;
      out.push({
        id: idTxt, sig, tokenId: token.id, base: escala, pulsar: false,
        construir: () =>
          buildText()
            .id(idTxt)
            .name("Nível de exaustão")
            .position({ x: x - lado / 2, y: y - lado / 2 })
            .textType("PLAIN")
            .plainText(String(dados.nivel ?? 1))
            .width(lado)
            .height(lado)
            .style({
              fillColor: "#ffffff", fillOpacity: 1,
              strokeColor: "#222222", strokeOpacity: 1, strokeWidth: Math.max(2, lado * 0.06),
              textAlign: "CENTER", textAlignVertical: "MIDDLE",
              fontFamily: "Roboto", fontSize: lado * 0.55, fontWeight: 800,
              lineHeight: 1, padding: 0,
            })
            .layer("ATTACHMENT")
            .attachedTo(token.id)
            .disableAttachmentBehavior(["ROTATION", "SCALE"])
            .disableHit(true)
            .locked(true)
            .metadata({ [META_ICONE]: { ...meta, pulsar: false } })
            .build(),
      });
    }
  });
  return out;
}

/* ---------------------------------------------------------- */
/* Reconciliação: compara metadata dos tokens x itens na cena  */
/* ---------------------------------------------------------- */
let ocupado = false;
let pendente = false;
let pulsaveis: { id: string; base: number }[] = [];

async function reconciliar() {
  if (ocupado) { pendente = true; return; }
  ocupado = true;
  try {
    if (!(await OBR.scene.isReady()) || !(await souLider())) return;

    const itens = await OBR.scene.items.getItems();
    const dpi = await OBR.scene.grid.getDpi();

    const desejados: Desejado[] = [];
    for (const t of itens.filter(ehToken)) desejados.push(...(await itensDoToken(t, dpi)));
    const porId = new Map(desejados.map((d) => [d.id, d]));

    // Itens da extensão já existentes na cena
    const existentes = itens.filter((i) => i.metadata[META_ICONE]);
    const jaOk = new Set<string>();
    const remover: string[] = [];
    for (const e of existentes) {
      const d = porId.get(e.id);
      const m = e.metadata[META_ICONE] as MetaIcone;
      // Remove: condição desligada, token removido ou layout mudou
      if (!d || m.sig !== d.sig) remover.push(e.id);
      else jaOk.add(e.id);
    }
    if (remover.length) await OBR.scene.items.deleteItems(remover);

    const novos = desejados.filter((d) => !jaOk.has(d.id)).map((d) => d.construir());
    if (novos.length) await OBR.scene.items.addItems(novos);

    pulsaveis = desejados.filter((d) => d.pulsar).map((d) => ({ id: d.id, base: d.base }));
  } catch (e) {
    console.error("[condicao] erro ao reconciliar", e);
  } finally {
    ocupado = false;
    if (pendente) { pendente = false; reconciliar(); }
  }
}

// Evita rodar a cada pixel de movimento do token
let timer: number | undefined;
const agendar = () => { clearTimeout(timer); timer = window.setTimeout(reconciliar, 200); };

/* ---------------------------------------------------------- */
/* Efeito de pulsar (condição prestes a acabar)                */
/* ---------------------------------------------------------- */
let fase = false;
async function pulsar() {
  if (!pulsaveis.length || !(await souLider())) return;
  fase = !fase;
  const f = fase ? 1.25 : 1;
  const mapa = new Map(pulsaveis.map((p) => [p.id, p.base]));
  try {
    await OBR.scene.items.updateItems(
      (i) => mapa.has(i.id),
      (lista) => lista.forEach((i) => { const b = mapa.get(i.id)!; i.scale = { x: b * f, y: b * f }; })
    );
  } catch { /* item pode ter sido removido */ }
}

/* ---------------------------------------------------------- */
/* Inicialização                                               */
/* ---------------------------------------------------------- */
OBR.onReady(() => {
  // Menu de contexto (clique direito) nos tokens
  OBR.contextMenu.create({
    id: `${ID}/menu`,
    icons: [
      {
        icon: abs("icon.svg"),
        label: "Condições",
        filter: {
          every: [
            { key: "layer", value: "CHARACTER", coordinator: "||" },
            { key: "layer", value: "MOUNT" },
          ],
        },
      },
    ],
    onClick(contexto, elementoId) {
      const ids = contexto.items.map((i) => i.id).join(",");
      OBR.popover.open({
        id: `${ID}/popover`,
        url: abs("popover.html") + "?ids=" + encodeURIComponent(ids),
        width: 360,
        height: 500,
        anchorElementId: elementoId,
      });
    },
  });

  OBR.scene.items.onChange(agendar);
  OBR.party.onChange(agendar); // se o líder sair, outro assume
  OBR.scene.onReadyChange((pronta) => pronta && agendar());
  OBR.scene.isReady().then((p) => p && agendar());

  if (PULSAR_ATIVO) setInterval(pulsar, 700);
});

// Evita aviso de import não usado em alguns linters
void isImage; void POR_ID;
