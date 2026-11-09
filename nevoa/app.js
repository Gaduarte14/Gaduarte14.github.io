import OBR, { buildShape, buildPath } from "https://esm.sh/@owlbear-rodeo/sdk";

const ID = "com.github.nevoa"; // Identificador único da nossa extensão

OBR.onReady(async () => {
  const statusMsg = document.getElementById("status-msg");
  statusMsg.innerText = "Conectado ao Owlbear Rodeo!";

  // 1. Função que converte PÉS (ft) para PIXELS do Mapa
  async function feetToPixels(feet) {
    const dpi = await OBR.scene.grid.getDpi(); // Quantos pixels tem 1 quadrado (ex: 150px)
    // No RPG, 1 quadrado = 5 ft (pés)
    const squares = feet / 5;
    return squares * dpi;
  }

  // 2. Aplicar Luz (Forte + Degradê em ft) no Token selecionado
  async function applyLightToSelected(brightFeet, dimFeet) {
    const selection = await OBR.player.getSelection();
    if (!selection || selection.length === 0) {
      statusMsg.style.color = "#ff5252";
      statusMsg.innerText = "⚠️ Clique em um Token no mapa primeiro!";
      return;
    }

    const playerId = await OBR.player.getId();

    // Salva a configuração de luz dentro do Token selecionado
    await OBR.scene.items.updateItems(selection, (items) => {
      for (let item of items) {
        item.metadata[`${ID}/light`] = {
          brightFt: Number(brightFeet), // Começo iluminado (ex: 20ft)
          dimFt: Number(dimFeet),       // Onde a luz acaba no degradê (ex: 40ft)
          ownerId: playerId             // Define quem é o dono dessa visão!
        };
      }
    });

    statusMsg.style.color = "#4caf50";
    statusMsg.innerText = `✅ Luz configurada: ${brightFeet}ft / ${dimFeet}ft!`;
    
    // Chama a função que atualiza o desenho da luz na tela
    updateLocalVision();
  }

  // 3. Eventos dos botões de Luz no Menu
  document.querySelectorAll(".preset").forEach((button) => {
    button.addEventListener("click", () => {
      const bright = button.getAttribute("data-bright");
      const dim = button.getAttribute("data-dim");
      document.getElementById("input-bright").value = bright;
      document.getElementById("input-dim").value = dim;
      applyLightToSelected(bright, dim);
    });
  });

  document.getElementById("btn-apply-light").addEventListener("click", () => {
    const bright = document.getElementById("input-bright").value;
    const dim = document.getElementById("input-dim").value;
    applyLightToSelected(bright, dim);
  });

  // 4. Botão de Ligar/Desligar a Névoa do Mapa
  document.getElementById("btn-toggle-fog").addEventListener("click", async () => {
    const isFilled = await OBR.scene.fog.getFilled();
    await OBR.scene.fog.setFilled(!isFilled);
    statusMsg.innerText = !isFilled ? "🌫️ Névoa Ativada!" : "☀️ Névoa Desativada!";
  });

  // 5. MOTOR DE VISÃO LOCAL (Só o dono vê + Efeito Degradê)
  async function updateLocalVision() {
    const myPlayerId = await OBR.player.getId();
    const myRole = await OBR.player.getRole(); // "GM" ou "PLAYER"
    
    // Pega todos os itens da mesa
    const allItems = await OBR.scene.items.getItems();
    
    // Filtra apenas os tokens que têm luz e pertencem a este jogador (ou todos, se for o Mestre)
    const myLightTokens = allItems.filter((item) => {
      const lightData = item.metadata[`${ID}/light`];
      if (!lightData || lightData.dimFt <= 0) return false;
      return myRole === "GM" || lightData.ownerId === myPlayerId;
    });

    // Limpa a visão antiga da tela local deste jogador
    const oldLocalItems = await OBR.scene.local.getItems();
    const oldIds = oldLocalItems
      .filter((item) => item.metadata[`${ID}/isVision`])
      .map((item) => item.id);
    if (oldIds.length > 0) {
      await OBR.scene.local.deleteItems(oldIds);
    }

    const newLocalVisionItems = [];

    // Para cada token do jogador, cria o corte na névoa e o degradê
    for (const token of myLightTokens) {
      const { brightFt, dimFt } = token.metadata[`${ID}/light`];
      const maxRadiusPx = await feetToPixels(dimFt);
      const brightRadiusPx = await feetToPixels(brightFt);

      // A) Recorta a Névoa (FOG) no limite máximo (para ver tokens até o fim da penumbra)
      const fogCut = buildShape()
        .shapeType("CIRCLE")
        .width(maxRadiusPx * 2)
        .height(maxRadiusPx * 2)
        .position(token.position)
        .layer("FOG")
        .fillColor("black")
        .strokeWidth(0)
        .metadata({ [`${ID}/isVision`]: true })
        .build();
      
      // Diz pro Owlbear que essa forma CORTA a névoa
      fogCut.fogFilled = false; 
      newLocalVisionItems.push(fogCut);

      // B) Cria o anel de Penumbra (escurecendo do brightFt até o dimFt)
      if (dimFt > brightFt) {
        const dimShadow = buildShape()
          .shapeType("CIRCLE")
          .width(maxRadiusPx * 2)
          .height(maxRadiusPx * 2)
          .position(token.position)
          .layer("POST_PROCESS") // Fica acima dos tokens para escurecê-los na penumbra
          .fillColor("#000000")
          .fillOpacity(0.35) // Deixa 35% mais escuro na área de penumbra
          .strokeWidth(0)
          .disableHit(true) // Não atrapalha o clique do mouse!
          .metadata({ [`${ID}/isVision`]: true })
          .build();
        newLocalVisionItems.push(dimShadow);
      }
    }

    // Desenha apenas na tela DESTE jogador!
    if (newLocalVisionItems.length > 0) {
      await OBR.scene.local.addItems(newLocalVisionItems);
    }
  }

  // Atualiza a luz automaticamente sempre que alguém mover um token na mesa!
  OBR.scene.items.onChange(() => {
    updateLocalVision();
  });
});