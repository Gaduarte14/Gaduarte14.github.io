/**
 * Script de segundo plano da extensão:
 * 1. Registra a opção "Condições" no menu de contexto (clique direito) dos tokens.
 * 2. Mantém a cena reconciliada (limpeza de ícones órfãos e tokens duplicados/redimensionados).
 * 3. Controla a animação local de pulso para condições com 1 rodada restante.
 */
import OBR from "@owlbear-rodeo/sdk";
import {
  EXTENSION_ID,
  reconcileSceneIcons,
  syncLocalPulseRings,
  stepLocalPulseAnimation,
  clearLocalPulseRings,
} from "./sync.js";

// Resolve URLs relativamente à pasta "condicao/", independente do nome do repositório
const BASE_URL = new URL("./", window.location.href).href;
const CONTEXT_MENU_ID = `${EXTENSION_ID}/context-menu`;
const POPOVER_ID = `${EXTENSION_ID}/popover`;

let reconcileTimer = null;
let pulseInterval = null;
let currentRole = "PLAYER";

function updatePulseLoop(hasExpiring) {
  if (hasExpiring && !pulseInterval) {
    pulseInterval = window.setInterval(() => {
      stepLocalPulseAnimation().catch(() => {});
    }, 150);
  } else if (!hasExpiring && pulseInterval) {
    window.clearInterval(pulseInterval);
    pulseInterval = null;
  }
}

async function refreshPulseState() {
  try {
    const hasExpiring = await syncLocalPulseRings();
    updatePulseLoop(hasExpiring);
  } catch {
    updatePulseLoop(false);
  }
}

function scheduleReconcile() {
  // Apenas o GM executa a reconciliação global automática para evitar conflitos de rede
  if (currentRole !== "GM") return;
  if (reconcileTimer) window.clearTimeout(reconcileTimer);
  reconcileTimer = window.setTimeout(async () => {
    try {
      await reconcileSceneIcons();
    } catch (err) {
      console.error("[Condições D&D 5e] Erro na reconciliação:", err);
    }
  }, 260);
}

function registerContextMenu() {
  OBR.contextMenu.create({
    id: CONTEXT_MENU_ID,
    icons: [
      {
        icon: `${BASE_URL}icon.svg`,
        label: "Condições",
        filter: {
          every: [
            { key: "layer", value: "CHARACTER", coordinator: "||" },
            { key: "layer", value: "MOUNT" },
          ],
        },
      },
    ],
    onClick(context, elementId) {
      const tokenIds = context.items.map((item) => item.id).join(",");
      OBR.popover.open({
        id: POPOVER_ID,
        url: `${BASE_URL}popover.html?tokens=${encodeURIComponent(tokenIds)}`,
        width: 400,
        height: 560,
        anchorElementId: elementId,
        anchorOrigin: { horizontal: "RIGHT", vertical: "TOP" },
        transformOrigin: { horizontal: "LEFT", vertical: "TOP" },
      });
    },
  });
}

OBR.onReady(async () => {
  currentRole = await OBR.player.getRole();
  OBR.player.onChange((player) => {
    currentRole = player.role;
  });

  registerContextMenu();

  // Escuta abertura/fechamento de cena
  OBR.scene.onReadyChange(async (ready) => {
    if (ready) {
      scheduleReconcile();
      await refreshPulseState();
    } else {
      updatePulseLoop(false);
      await clearLocalPulseRings();
    }
  });

  // Escuta alterações nos itens da cena (mover, deletar, redimensionar, mudar condições)
  OBR.scene.items.onChange(() => {
    scheduleReconcile();
    refreshPulseState();
  });

  // Inicialização caso a cena já esteja aberta
  if (await OBR.scene.isReady()) {
    scheduleReconcile();
    await refreshPulseState();
  }
});