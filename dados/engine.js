// Motor de rolagem no estilo do bot Rollem.
const rnd = n => globalThis.crypto
  ? 1 + (globalThis.crypto.getRandomValues(new Uint32Array(1))[0] % n)
  : 1 + Math.floor(Math.random() * n);

// mode: null | "adv" | "dis". Vale para cada d20 único da fórmula (ex.: 1d20+20 vira 2d20, fica o maior/menor + modificador).
function parseExpr(src, mode) {
  let i = 0, diceN = 0, applied = false;
  const skip = () => { while (src[i] === " ") i++; };
  const num = () => { const m = /^\d+(?:\.\d+)?/.exec(src.slice(i)); if (!m) return null; i += m[0].length; return +m[0]; };

  function dice(n) {
    let fudge = false, sides;
    if (src[i] === "f" || src[i] === "F") { fudge = true; sides = 3; i++; }
    else if (src[i] === "%") { sides = 100; i++; }
    else { sides = num(); if (sides === null) throw new Error("dado inválido"); }
    if (!Number.isInteger(n) || n < 1) throw new Error("quantidade de dados inválida");
    if (!Number.isInteger(sides) || sides < 2 || sides > 100000) throw new Error("o dado precisa ter 2 ou mais lados");
    const useMode = !!mode && n === 1 && sides === 20 && !fudge;
    if (useMode) n = 2;
    diceN += n;
    if (diceN > 100) throw new Error("máximo de 100 dados por rolagem");
    const rolls = Array.from({ length: n }, () => ({ v: fudge ? rnd(3) - 2 : rnd(sides), k: true }));
    if (useMode) {
      applied = true;
      const drop = mode === "adv" ? (rolls[0].v >= rolls[1].v ? rolls[1] : rolls[0]) : (rolls[0].v <= rolls[1].v ? rolls[1] : rolls[0]);
      drop.k = false;
    }
    for (;;) {
      const m = /^(kh|kl|dh|dl|k|d|!|r)(\d+)?/i.exec(src.slice(i));
      if (!m) break;
      i += m[0].length;
      const op = m[1].toLowerCase(), N = m[2] === undefined ? null : +m[2];
      if (op === "!") {
        if (fudge) throw new Error("dados Fudge não explodem");
        const th = N ?? sides; if (th < 2) throw new Error("explosão inválida");
        let added = 0;
        for (let j = 0; j < rolls.length && added < 100; j++)
          if (rolls[j].k && rolls[j].v >= th) { rolls.push({ v: rnd(sides), k: true }); added++; }
      } else if (op === "r") {
        const th = N ?? 1; if (fudge || th >= sides) throw new Error("reroll inválido");
        rolls.forEach(r => { let g = 0; while (r.v <= th && g++ < 100) r.v = rnd(sides); });
      } else {
        const cnt = N ?? 1, desc = op === "kh" || op === "k" || op === "dh";
        const s = rolls.filter(r => r.k).sort((a, b) => desc ? b.v - a.v : a.v - b.v);
        (op[0] === "k" ? s.slice(cnt) : s.slice(0, cnt)).forEach(r => (r.k = false));
      }
    }
    return { t: rolls.filter(r => r.k).reduce((a, r) => a + r.v, 0), d: "[" + rolls.map(r => r.k ? r.v : "~" + r.v + "~").join(", ") + "]" };
  }
  function atom() {
    skip();
    let n = null;
    if (/\d/.test(src[i] ?? "")) n = num();
    if (src[i] === "d" || src[i] === "D") { i++; return dice(n ?? 1); }
    if (n === null) throw new Error("fórmula inválida");
    return { t: n, d: String(n) };
  }
  function factor() {
    skip();
    if (src[i] === "-") { i++; const f = factor(); return { t: -f.t, d: "-" + f.d }; }
    if (src[i] === "(") {
      i++; const e = expr(); skip();
      if (src[i] !== ")") throw new Error("falta fechar )");
      i++; return { t: e.t, d: "(" + e.d + ")" };
    }
    return atom();
  }
  function term() {
    let a = factor();
    for (;;) {
      skip(); const c = src[i];
      if (c !== "*" && c !== "/") return a;
      const save = i; i++;
      let b; try { b = factor(); } catch { i = save; return a; }
      if (c === "/" && b.t === 0) throw new Error("divisão por zero");
      a = { t: c === "*" ? a.t * b.t : a.t / b.t, d: a.d + " " + c + " " + b.d };
    }
  }
  function expr() {
    let a = term();
    for (;;) {
      skip(); const c = src[i];
      if (c !== "+" && c !== "-") return a;
      const save = i; i++;
      let b; try { b = term(); } catch { i = save; return a; }
      a = { t: c === "+" ? a.t + b.t : a.t - b.t, d: a.d + " " + c + " " + b.d };
    }
  }
  const r = expr();
  return { t: r.t, d: r.d, end: i, applied };
}

function rollOne(text, mode) {
  let src = text.trim().replace(/^(?:\/roll|\/r|roll|&|r(?=[\sd\d(]))\s*/i, "");
  let count = 1;
  const rep = /^(\d{1,2})#\s*/.exec(src);
  if (rep) { count = Math.max(1, Math.min(+rep[1], 20)); src = src.slice(rep[0].length); }
  const results = []; let end = 0, applied = false;
  for (let n = 0; n < count; n++) {
    const p = parseExpr(src, mode);
    if (!Number.isFinite(p.t)) throw new Error("resultado inválido");
    results.push({ t: Math.round(p.t * 100) / 100, d: p.d.slice(0, 600) });
    end = p.end;
    applied = applied || p.applied;
  }
  const tag = applied ? (mode === "adv" ? " (vantagem)" : " (desvantagem)") : "";
  return { label: src.slice(end).trim().slice(0, 80), formula: (src.slice(0, end).trim() + tag).slice(0, 80), results };
}

// Aceita "2d6+3 fogo", "6#4d6d1", "r6+6" e rolagens no meio do texto: "ataco [d20+5 espada] e causo [2d6 fogo]"
export function rollInput(text, mode = null) {
  const t = text.trim();
  if (!t) throw new Error("digite uma rolagem");
  const br = [...t.matchAll(/\[([^\]]+)\]/g)];
  return br.length ? br.slice(0, 10).map(m => rollOne(m[1], mode)) : [rollOne(t, mode)];
}
