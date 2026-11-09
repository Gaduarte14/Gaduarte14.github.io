import OBR, { buildCurve, buildLine } from "https://esm.sh/@owlbear-rodeo/sdk";

const ID = "com.github.nevoa";
let currentBuildMode = "WALL"; // "WALL" ou "DOOR"
let dragStartPoint = null;
let previewLineId = null;

OBR.onReady(async () => {
  const statusMsg = document.getElementById("status-msg");
  const role = await OBR.player.getRole();

  // Esconde botões de parede se não for o Mestre (GM)
  if (role !== "GM") {
    document.getElementById("gm-controls").style.display = "none";
  }

  statusMsg.innerText = "Selecione um token ou desenhe paredes!";

  // ==========================================
  // 1. LISTA DE JOGADORES (DONO DO TOKEN)
  // ==========================================
  async function updatePlayerList() {
    const select = document.getElementById("select-owner");
    const myId = await OBR.player.getId();
    const myName = await OBR.player.getName();
    const party = await OBR.party.getPlayers();

    select.innerHTML = `<option value="ALL">🌐 Todos os Jogadores (Tocha/Pública)</option>`;
    select.innerHTML += `<option value="${myId}">👤 Eu mesmo (${myName})</option>`;

    for (const p of party) {
      if (p.id !== myId) {
        select.innerHTML += `<option value="${p.id}">👤 Jogador: ${p.name}</option>`;
      }
    }
  }
  await updatePlayerList();
  OBR.party.onChange(() => updatePlayerList());

  // ==========================================
  // 2. CONVERSÃO DE PÉS (FT) E IMÃ NO GRID
  // ==========================================
  async function feetToPixels(feet) {
    const dpi = await OBR.scene.grid.getDpi();
    return (feet / 5) * dpi; // 1 quadrado = 5 ft
  }

  async function snapToGrid(point) {
    const dpi = await OBR.scene.grid.getDpi();
    const halfGrid = dpi / 2; // Gruda nas linhas e meios de quadrados
    return {
      x: Math.round(point.x / halfGrid) * halfGrid,
      y: Math.round(point.y / halfGrid) * halfGrid
    };
  }

  // ==========================================
  // 3. FERRAMENTA DE DESENHAR PAREDES E PORTAS
  // ==========================================
  if (role === "GM") {
    // Cria a ferramenta na barra lateral do Owlbear
    await OBR.tool.create({
      id: `${ID}/tool`,
      icons: [{ icon: "https://cdn-icons-png.flaticon.com/512/702/702814.png", label: "Paredes & Portas" }],
      defaultMode: `${ID}/mode-draw`
    });

    await OBR.tool.createMode({
      id: `${ID}/mode-draw`,
      icons: [{ icon: "https://cdn-icons-png.flaticon.com/512/702/702814.png", label: "Desenhar Parede/Porta" }],
      async onToolDragStart(context, event) {
        dragStartPoint = await snapToGrid(event.pointerPosition);
        const isDoor = currentBuildMode === "DOOR";

        const preview = buildLine()
          .startPosition(dragStartPoint)
          .endPosition(dragStartPoint)
          .strokeColor(isDoor ? "#ff9800" : "#ff4444")
          .strokeWidth(8)
          .strokeDash(isDoor ? [15, 10] : [])
          .layer("DRAWING")
          .build();

        previewLineId = preview.id;
        await OBR.scene.local.addItems([preview]);
      },
      async onToolDragMove(context, event) {
        if (!dragStartPoint || !previewLineId) return;
        const currentPos = await snapToGrid(event.pointerPosition);
        await OBR.scene.local.updateItems([previewLineId], (items) => {
          for (let item of items) item.endPosition = currentPos;
        });
      },
      async onToolDragEnd(context, event) {
        if (!dragStartPoint) return;
        const endPoint = await snapToGrid(event.pointerPosition);

        if (previewLineId) {
          await OBR.scene.local.deleteItems([previewLineId]);
          previewLineId = null;
        }

        // Evita criar parede de tamanho zero
        const dist = Math.hypot(endPoint.x - dragStartPoint.x, endPoint.y - dragStartPoint.y);
        if (dist > 10) {
          const isDoor = currentBuildMode === "DOOR";
          const wallItem = buildLine()
            .startPosition(dragStartPoint)
            .endPosition(endPoint)
            .strokeColor(isDoor ? "#ff9800" : "#ff4444")
            .strokeWidth(isDoor ? 10 : 6)
            .strokeDash(isDoor ? [15, 10] : [])
            .layer("DRAWING")
            .visible(false) // INVISÍVEL PARA OS JOGADORES, VISÍVEL PRO MESTRE!
            .locked(true)
            .name(isDoor ? "Porta (Fechada)" : "Parede")
            .metadata({
              [`${ID}/isWall`]: true,
              [`${ID}/isDoor`]: isDoor,
              [`${ID}/doorOpen`]: false
            })
            .build();

          await OBR.scene.items.addItems([wallItem]);
        }
        dragStartPoint = null;
      }
    });

    // Menu de Contexto para Abrir/Fechar Porta clicando nela no mapa!
    await OBR.contextMenu.create({
      id: `${ID}/door-menu`,
      icons: [{
        icon: "https://cdn-icons-png.flaticon.com/512/702/702814.png",
        label: "🔓 Abrir / Fechar Porta",
        filter: {
          every: [{ key: ["metadata", `${ID}/isDoor`], value: true }]
        }
      }],
      async onClick(context) {
        const doorIds = context.items.map(i => i.id);
        await OBR.scene.items.updateItems(doorIds, (items) => {
          for (let item of items) {
            const isOpen = !item.metadata[`${ID}/doorOpen`];
            item.metadata[`${ID}/doorOpen`] = isOpen;
            item.style.strokeColor = isOpen ? "#4caf50" : "#ff9800"; // Verde = Aberta, Laranja = Fechada
            item.name = isOpen ? "Porta (Aberta)" : "Porta (Fechada)";
          }
        });
      }
    });

    // Botões de Parede e Porta no Painel
    const btnWall = document.getElementById("btn-wall");
    const btnDoor = document.getElementById("btn-door");

    btnWall.addEventListener("click", async () => {
      currentBuildMode = "WALL";
      btnWall.classList.add("active");
      btnDoor.classList.remove("active");
      await OBR.tool.activateTool(`${ID}/tool`);
      statusMsg.innerText = "✏️ Clique e arraste no mapa para criar PAREDES!";
    });

    btnDoor.addEventListener("click", async () => {
      currentBuildMode = "DOOR";
      btnDoor.classList.add("active");
      btnWall.classList.remove("active");
      await OBR.tool.activateTool(`${ID}/tool`);
      statusMsg.innerText = "🚪 Clique e arraste no mapa para criar PORTAS!";
    });

    document.getElementById("btn-clear-walls").addEventListener("click", async () => {
      const items = await OBR.scene.items.getItems(i => i.metadata[`${ID}/isWall`]);
      if (items.length > 0) {
        await OBR.scene.items.deleteItems(items.map(i => i.id));
        statusMsg.innerText = "🗑️ Todas as paredes foram apagadas!";
      }
    });

    document.getElementById("btn-toggle-fog").addEventListener("click", async () => {
      const isFilled = await OBR.scene.fog.getFilled();
      await OBR.scene.fog.setFilled(!isFilled);
      statusMsg.innerText = !isFilled ? "🌫️ Névoa Ativada no Mapa!" : "☀️ Névoa Desativada!";
    });
  }

  // ==========================================
  // 4. APLICAR LUZ NO TOKEN (EM PÉS / FT)
  // ==========================================
  async function applyLightToSelected(brightFeet, dimFeet) {
    const selection = await OBR.player.getSelection();
    if (!selection || selection.length === 0) {
      statusMsg.style.color = "#ff5252";
      statusMsg.innerText = "⚠️ Clique em um Token no mapa primeiro!";
      return;
    }

    const chosenOwner = document.getElementById("select-owner").value;

    // Desbloqueia a edição e salva a luz no Token
    await OBR.scene.items.updateItems(selection, (items) => {
      for (let item of items) {
        item.metadata[`${ID}/light`] = {
          brightFt: Number(brightFeet),
          dimFt: Number(dimFeet),
          ownerId: chosenOwner // "ALL" ou o ID do jogador escolhido
        };
      }
    });

    // Ativa a névoa automaticamente se ainda não estiver ativa
    const fogFilled = await OBR.scene.fog.getFilled();
    if (!fogFilled && Number(dimFeet) > 0) {
      await OBR.scene.fog.setFilled(true);
    }

    statusMsg.style.color = "#4caf50";
    statusMsg.innerText = `✅ Luz de ${brightFeet}ft / ${dimFeet}ft aplicada!`;
    await updateLocalVision();
  }

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

  // ==========================================
  // 5. MATEMÁTICA DE SOMBRA E PAREDES (RAYCASTING)
  // ==========================================
  function intersectRaySegment(ox, oy, dx, dy, x1, y1, x2, y2) {
    const r_px = ox, r_py = oy, r_dx = dx, r_dy = dy;
    const s_px = x1, s_py = y1, s_dx = x2 - x1, s_dy = y2 - y1;
    const r_mag = Math.hypot(r_dx, r_dy);
    const s_mag = Math.hypot(s_dx, s_dy);
    if (r_dx / r_mag === s_dx / s_mag && r_dy / r_mag === s_dy / s_mag) return null;

    const T2 = (r_dx * (s_py - r_py) + r_dy * (r_px - s_px)) / (s_dx * r_dy - s_dy * r_dx);
    const T1 = (s_px + s_dx * T2 - r_px) / r_dx;
    if (isNaN(T1)) {
      const T1_alt = (s_py + s_dy * T2 - r_py) / r_dy;
      if (T1_alt < 0 || T2 < 0 || T2 > 1) return null;
      return T1_alt;
    }
    if (T1 < 0 || T2 < 0 || T2 > 1) return null;
    return T1;
  }

  function computeVisibilityPolygon(origin, radius, walls) {
    const points = [];
    const numRays = 72; // 72 raios ao redor do token (a cada 5 graus)

    for (let i = 0; i < numRays; i++) {
      const angle = (i * 2 * Math.PI) / numRays;
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);
      let closestDist = radius;

      for (const w of walls) {
        const dist = intersectRaySegment(origin.x, origin.y, dx, dy, w.x1, w.y1, w.x2, w.y2);
        if (dist !== null && dist < closestDist) {
          closestDist = dist;
        }
      }

      points.push({
        x: origin.x + dx * closestDist,
        y: origin.y + dy * closestDist
      });
    }
    return points;
  }

  // ==========================================
  // 6. RENDERIZAR VISÃO LOCAL E DEGRADÊ
  // ==========================================
  async function updateLocalVision() {
    const isSceneReady = await OBR.scene.isReady();
    if (!isSceneReady) return;

    const myPlayerId = await OBR.player.getId();
    const myRole = await OBR.player.getRole();
    const allItems = await OBR.scene.items.getItems();

    // Pega todas as paredes e portas FECHADAS
    const activeWalls = allItems
      .filter(i => i.metadata[`${ID}/isWall`] && !i.metadata[`${ID}/doorOpen`])
      .map(i => ({
        x1: i.startPosition.x,
        y1: i.startPosition.y,
        x2: i.endPosition.x,
        y2: i.endPosition.y
      }));

    // Filtra os tokens que este jogador tem permissão para ver a luz
    const myLightTokens = allItems.filter((item) => {
      const light = item.metadata[`${ID}/light`];
      if (!light || light.dimFt <= 0) return false;
      return (
        myRole === "GM" ||
        light.ownerId === "ALL" ||
        light.ownerId === myPlayerId ||
        item.createdUserId === myPlayerId
      );
    });

    // Remove a luz antiga da tela local
    const oldLocal = await OBR.scene.local.getItems(i => i.metadata[`${ID}/isVision`]);
    if (oldLocal.length > 0) {
      await OBR.scene.local.deleteItems(oldLocal.map(i => i.id));
    }

    const newLocalItems = [];

    for (const token of myLightTokens) {
      const { brightFt, dimFt } = token.metadata[`${ID}/light`];
      const maxRadiusPx = await feetToPixels(dimFt);
      const brightRadiusPx = await feetToPixels(brightFt);

      // Polígono máximo da luz (respeitando paredes!)
      const maxPoly = computeVisibilityPolygon(token.position, maxRadiusPx, activeWalls);

      // 1. CORTA A NÉVOA (Para o Jogador enxergar!)
      // IMPORTANTE: .visible(false) na camada FOG significa CORTAR a névoa no Owlbear!
      const fogCut = buildCurve()
        .points(maxPoly)
        .tension(0)
        .closed(true)
        .layer("FOG")
        .fillColor("#000000")
        .strokeWidth(0)
        .visible(false) // <-- ISSO FAZ O JOGADOR VER A ÁREA ILUMINADA!
        .metadata({ [`${ID}/isVision`]: true })
        .build();
      newLocalItems.push(fogCut);

      // 2. EFEITO DEGRADÊ (A luz vai diminuindo de brightFt até dimFt)
      if (dimFt > brightFt) {
        const steps = 3; // 3 camadas suaves de escurecimento na borda da luz
        for (let s = 1; s <= steps; s++) {
          const ratio = s / (steps + 1);
          const ringRadius = brightRadiusPx + (maxRadiusPx - brightRadiusPx) * ratio;
          const ringThickness = (maxRadiusPx - brightRadiusPx) / steps;
          const ringPoly = computeVisibilityPolygon(token.position, ringRadius, activeWalls);

          const fadeRing = buildCurve()
            .points(ringPoly)
            .tension(0)
            .closed(true)
            .layer("POST_PROCESS")
            .fillOpacity(0)
            .strokeColor("#000000")
            .strokeOpacity(0.18 * s) // Vai ficando mais escuro quanto mais longe!
            .strokeWidth(ringThickness * 1.5)
            .disableHit(true)
            .metadata({ [`${ID}/isVision`]: true })
            .build();
          newLocalItems.push(fadeRing);
        }
      }

      // 3. AURA DE LUZ VISÍVEL PARA O MESTRE E JOGADOR (Brilho amarelado suave)
      const lightGlow = buildCurve()
        .points(maxPoly)
        .tension(0)
        .closed(true)
        .layer("DRAWING")
        .fillColor("#ffebb3")
        .fillOpacity(myRole === "GM" ? 0.18 : 0.06) // Mestre vê o brilho mais forte para saber onde ilumina
        .strokeColor("#ffca28")
        .strokeOpacity(myRole === "GM" ? 0.6 : 0.15)
        .strokeWidth(3)
        .disableHit(true)
        .metadata({ [`${ID}/isVision`]: true })
        .build();
      newLocalItems.push(lightGlow);
    }

    if (newLocalItems.length > 0) {
      await OBR.scene.local.addItems(newLocalItems);
    }
  }

  // Atualiza automaticamente quando qualquer token ou parede se move ou muda
  OBR.scene.items.onChange(() => {
    updateLocalVision();
  });

  // Roda uma vez ao carregar a sala
  OBR.scene.onReadyChange((ready) => {
    if (ready) updateLocalVision();
  });
  await updateLocalVision();
});