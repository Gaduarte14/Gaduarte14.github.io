# Condições D&D 5e — extensão para Owlbear Rodeo (v2)

Gerencia as 15 condições de D&D 5e nos tokens: menu de contexto, ícones acima do token
(itens anexados), Exaustão com níveis 1–6, rodadas por condição e painel do mestre.

## Estrutura

```
condicao/
├─ index.html / popover.html / gm.html   páginas da extensão
├─ public/manifest.json, icon.svg        manifest e ícone da extensão
├─ src/
│  ├─ condicoes.ts   15 condições, regras em PT-BR e ícones SVG inline
│  ├─ comum.ts       tipos, metadata e utilidades compartilhadas
│  ├─ background.ts  menu de contexto + ícones anexados ao token + pulsar
│  ├─ popover.ts     grade de condições (liga/desliga) e nível de exaustão
│  ├─ gm.ts          painel do mestre (filtros, rodadas, limpar)
│  └─ estilo.css
└─ .github/workflows/deploy.yml          deploy automático no GitHub Pages
```

## Instalação e desenvolvimento

```bash
cd condicao
npm install
npm run dev        # http://localhost:5173
```

No Owlbear Rodeo: **Perfil → Extensões → Adicionar extensão** e cole
`http://localhost:5173/manifest.json`.

## Build

```bash
npm run build      # gera a pasta dist/
npm run preview
```

## Deploy

**Vercel:** importe o repositório (preset Vite). A URL será
`https://seu-projeto.vercel.app/manifest.json`.

**GitHub Pages:** envie o projeto para o GitHub, em *Settings → Pages* escolha
*GitHub Actions*. A URL será `https://usuario.github.io/repo/manifest.json`.
Todos os caminhos são relativos (`base: "./"` e manifest sem `/` inicial).

## Como usar

- Clique direito em um token → **Condições**. Clique em uma condição para ligar/desligar.
- Campo "Duração ao ativar (rodadas)": preencha antes de clicar para definir a duração.
- Exaustão: após ativar, escolha o nível 1–6 (o número aparece sobre o ícone).
- Painel do mestre: ícone da extensão na barra superior. "Próximo turno" tira 1 rodada de
  todas as condições com duração; ao chegar a 0 a condição é removida.
- Condição com 1 rodada restante pulsa no mapa (`PULSAR_ATIVO` em `background.ts`).

## Como funciona

- Dados em `metadata["br.condicao/estado"]` do token (sincroniza com todos).
- Os ícones são itens `Image`/`Text` na camada ATTACHMENT com `attachedTo` = token.
  IDs determinísticos (`br.condicao:<token>:<condição>`); só um cliente ("líder") cria/remove,
  evitando duplicatas. Itens órfãos e ícones de condições desligadas são removidos.
- Muitas condições: reduz o tamanho até o mínimo e depois quebra em linhas para cima.

## Problemas comuns

- **Ícone não aparece:** os ícones usam URLs `data:` (sem arquivos externos). Se sua sala
  recusar, exporte os SVGs para `public/icons/` e use URLs absolutas em `urlIcone`.
- **Jogadores não conseguem alterar tokens de outros:** depende das permissões da sala.
