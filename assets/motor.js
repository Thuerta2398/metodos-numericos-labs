/* =====================================================================
   motor.js — motor común de los laboratorios de Métodos Numéricos
   Nivel 1: rompecabezas de Parsons · Nivel 2: completar código con
   verificación numérica de expresiones · Nivel 3: reto (definido por
   cada laboratorio) · Constancia PNG con folio e integridad.
   Cada laboratorio define window.LAB antes de cargar este archivo.
   ===================================================================== */
"use strict";
const L$ = window.LAB;
function fresh() { return { v: 1, nombre: '', control: '', inicio: null, st: {}, ans: {}, t: {}, tab: 'inicio', integ: INTEG.nuevo() }; }
function load() { try { const s = JSON.parse(localStorage.getItem(L$.key)); return s && s.v === 1 ? s : null; } catch (e) { return null; } }
function save() { try { localStorage.setItem(L$.key, JSON.stringify(S)); } catch (e) { } }
let S = load() || fresh();
function st(id) { return S.st[id] || (S.st[id] = { ok: false, fallos: 0, pistas: 0 }); }
function ok(id) { return !!(S.st[id] && S.st[id].ok); }
function markOk(id) { st(id).ok = true; S.t[id] = Date.now(); save(); }
const $ = (q, el = document) => el.querySelector(q);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fmt = (v, d = 6) => (Math.abs(v) < 5e-13 ? 0 : v).toFixed(d);
const sci = v => v.toExponential(2);

/* ============ intérprete seguro de expresiones Python ============ */
const FNM = { exp: Math.exp, sin: Math.sin, cos: Math.cos, sqrt: Math.sqrt, log: Math.log, tan: Math.tan, abs: Math.abs };
function parsePy(src, vars, funcs) {
  vars = vars || []; funcs = funcs || [];
  src = String(src).trim();
  if (!src) throw new Error('El espacio está vacío.');
  if (src.includes('^')) throw new Error('En Python la potencia se escribe con ** (el símbolo ^ es otra operación).');
  const re = /\s*(\d+\.?\d*(?:[eE][-+]?\d+)?|\.\d+(?:[eE][-+]?\d+)?|\*\*|[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*|[-+*/(),])/y;
  const T = []; re.lastIndex = 0;
  while (re.lastIndex < src.length) {
    const pos = re.lastIndex; const m = re.exec(src);
    if (!m) { if (/^\s*$/.test(src.slice(pos))) break; throw new Error('No reconozco lo que escribiste cerca de "' + src.slice(pos, pos + 8).trim() + '".'); }
    T.push(m[1]);
  }
  let p = 0; const peek = () => T[p], next = () => T[p++];
  function expr() { let a = term(); while (peek() === '+' || peek() === '-') { const o = next(), b = term(), a0 = a; a = o === '+' ? v => a0(v) + b(v) : v => a0(v) - b(v); } return a; }
  function term() { let a = unary(); while (peek() === '*' || peek() === '/') { const o = next(), b = unary(), a0 = a; a = o === '*' ? v => a0(v) * b(v) : v => a0(v) / b(v); } return a; }
  function unary() { if (peek() === '-') { next(); const u = unary(); return v => -u(v); } if (peek() === '+') { next(); return unary(); } return power(); }
  function power() { const b = atom(); if (peek() === '**') { next(); const e = unary(); return v => Math.pow(b(v), e(v)); } return b; }
  function atom() {
    const t = next();
    if (t === undefined) throw new Error('La expresión está incompleta.');
    if (/^[\d.]/.test(t)) { const c = parseFloat(t); return () => c; }
    if (t === '(') { const e = expr(); if (next() !== ')') throw new Error('Falta cerrar un paréntesis.'); return e; }
    if (/^[A-Za-z_]/.test(t)) {
      const name = t.replace(/^(np|numpy|math)\./, '');
      if (name === 'pi') return () => Math.PI;
      if (FNM[name] && t !== name || FNM[name] && !vars.includes(name)) {
        if (next() !== '(') throw new Error('Después de ' + t + ' van paréntesis: ' + t + '(...).');
        const e = expr(); if (next() !== ')') throw new Error('Falta cerrar el paréntesis de ' + t + '.'); return v => FNM[name](e(v));
      }
      if (funcs.includes(t)) {
        if (next() !== '(') throw new Error(t + ' es una función: se usa como ' + t + '(...).');
        const e = expr(); if (next() !== ')') throw new Error('Falta cerrar el paréntesis de ' + t + '(...).'); return v => v[t](e(v));
      }
      if (vars.includes(t)) return v => v[t];
      throw new Error('No reconozco "' + t + '". Aquí puedes usar: ' + vars.concat(funcs.map(f => f + '(...)')).join(', ') + ' y funciones de NumPy como np.exp(...).');
    }
    throw new Error('Hay un operador fuera de lugar ("' + t + '").');
  }
  const f = expr();
  if (p < T.length) throw new Error('Sobra algo después de "' + T[p - 1] + '". ¿Falta un *? Python no acepta 2x; se escribe 2*x.');
  return f;
}
/* o = {vars:[], funcs:[], pts:[{...}] } ; ref(env) → número */
function checkExpr(src, ref, o) {
  let f; try { f = parsePy(src, o.vars, o.funcs); } catch (e) { return { ok: false, msg: e.message }; }
  let same = true, neg = true;
  for (const env of o.pts) {
    const a = f(env), r = ref(env);
    if (!isFinite(a)) return { ok: false, msg: 'Tu expresión produce un valor no válido (división entre cero o similar) en un punto de prueba.' };
    if (Math.abs(a - r) > 1e-9 * (1 + Math.abs(r))) same = false;
    if (Math.abs(a + r) > 1e-9 * (1 + Math.abs(r))) neg = false;
  }
  if (same) return { ok: true };
  if (neg) return { ok: false, msg: 'Está casi bien, pero con el signo invertido.' };
  return { ok: false, msg: o.miss || 'La sintaxis es válida, pero no coincide con lo pedido en los puntos de prueba. Revisa términos, coeficientes y signos.' };
}
const norm = s => String(s).replace(/\s+/g, '').replace(/"/g, "'");
function checkStr(src, acc, wrong, def) {
  const n = norm(src); if (!n) return { ok: false, msg: 'El espacio está vacío.' };
  if (acc.map(norm).includes(n)) return { ok: true };
  for (const k in wrong) if (norm(k) === n) return { ok: false, msg: wrong[k] };
  return { ok: false, msg: def };
}
function checkNum(src, val, tol, msgs) {
  const s = String(src).trim().replace(',', '.'); if (!s) return { ok: false, msg: 'El espacio está vacío.' };
  const v = Number(s); if (!isFinite(v)) return { ok: false, msg: 'Escribe un número.' };
  if (Math.abs(v - val) <= tol) return { ok: true };
  if (msgs) for (const m of msgs) if (Math.abs(v - m.v) <= (m.tol ?? tol)) return { ok: false, msg: m.msg };
  return { ok: false, msg: 'No coincide. Revisa el cálculo.' };
}

/* ============ SVG ============ */
const NS = 'http://www.w3.org/2000/svg';
function el(tag, attrs, parent) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
function mkPlot(svg, c) {
  const W = c.W || 440, H = c.H || 400, p = { l: 46, r: 12, t: 12, b: 34 };
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.innerHTML = '';
  const X = x => p.l + (x - c.xmin) / (c.xmax - c.xmin) * (W - p.l - p.r);
  const Y = y => H - p.b - (y - c.ymin) / (c.ymax - c.ymin) * (H - p.t - p.b);
  const g = el('g', {}, svg);
  for (const t of c.xt) { el('line', { x1: X(t), x2: X(t), y1: p.t, y2: H - p.b, class: 'gr' }, g); el('text', { x: X(t), y: H - p.b + 15, 'text-anchor': 'middle' }, g).textContent = c.xf ? c.xf(t) : t; }
  for (const t of c.yt) { el('line', { x1: p.l, x2: W - p.r, y1: Y(t), y2: Y(t), class: 'gr' }, g); el('text', { x: p.l - 6, y: Y(t) + 4, 'text-anchor': 'end' }, g).textContent = c.yf ? c.yf(t) : t; }
  if (c.xmin < 0 && c.xmax > 0) el('line', { x1: X(0), x2: X(0), y1: p.t, y2: H - p.b, class: 'ax' }, g);
  if (c.ymin < 0 && c.ymax > 0) el('line', { x1: p.l, x2: W - p.r, y1: Y(0), y2: Y(0), class: 'ax' }, g);
  el('rect', { x: p.l, y: p.t, width: W - p.l - p.r, height: H - p.t - p.b, fill: 'none', class: 'ax' }, g);
  if (c.xl) el('text', { x: (p.l + W - p.r) / 2, y: H - 4, 'text-anchor': 'middle' }, g).textContent = c.xl;
  if (c.yl) el('text', { x: 12, y: (p.t + H - p.b) / 2, 'text-anchor': 'middle', transform: `rotate(-90 12 ${(p.t + H - p.b) / 2})` }, g).textContent = c.yl;
  const clip = 'cp' + Math.random().toString(36).slice(2, 8);
  const defs = el('defs', {}, svg); const cp = el('clipPath', { id: clip }, defs); el('rect', { x: p.l, y: p.t, width: W - p.l - p.r, height: H - p.t - p.b }, cp);
  const layer = el('g', { 'clip-path': `url(#${clip})` }, svg);
  return { X, Y, layer, svg, W, H };
}
function curve(P, f, a, b, cls, n = 240) { let d = ''; for (let i = 0; i <= n; i++) { const x = a + (b - a) * i / n; d += (i ? 'L' : 'M') + P.X(x).toFixed(1) + ',' + P.Y(f(x)).toFixed(1); } return el('path', { d, class: cls }, P.layer); }
function table(head, rows) { return '<table class="it"><thead><tr>' + head.map(h => `<th>${h}</th>`).join('') + '</tr></thead><tbody>' + rows.map(r => '<tr>' + r.map(c => `<td>${c}</td>`).join('') + '</tr>').join('') + '</tbody></table>'; }

/* ============ navegación ============ */
const N3IDS = L$.n3.ids;
const LAST1 = L$.PZ.at(-1).id, LAST2 = L$.N2.at(-1).id, LAST3 = N3IDS.at(-1);
const TABS = [
  { id: 'inicio', n: '0', t: 'Inicio', on: () => true, done: () => !!S.inicio },
  { id: 'n1', n: '1', t: 'Nivel 1 · Rompecabezas', on: () => !!S.inicio, done: () => ok(LAST1) },
  { id: 'n2', n: '2', t: 'Nivel 2 · Completa el código', on: () => ok(LAST1), done: () => ok(LAST2) },
  { id: 'n3', n: '3', t: 'Nivel 3 · Reto', on: () => ok(LAST2), done: () => ok(LAST3) },
  { id: 'cons', n: '✓', t: 'Constancia', on: () => ok(LAST2), done: () => false }
];
function renderNav() {
  const nav = $('#nav'); nav.innerHTML = '';
  for (const t of TABS) {
    const b = document.createElement('button'); b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', S.tab === t.id); b.disabled = !t.on();
    b.innerHTML = `<span class="n">${t.n}</span>${t.t}${t.done() ? '<span class="ok">✔</span>' : ''}`;
    b.onclick = () => go(t.id); nav.appendChild(b);
  }
}
function go(id) { S.tab = id; save(); render(); window.scrollTo({ top: 0 }); }
function render() {
  const t = TABS.find(x => x.id === S.tab); if (!t || !t.on()) S.tab = 'inicio';
  renderNav(); INTEG.pinta(); const m = $('#main'); m.innerHTML = '';
  ({ inicio: rInicio, n1: rN1, n2: rN2, n3: L$.n3.render, cons: rCons })[S.tab](m);
}
function stepsBar(ids, labels) {
  return '<div class="steps">' + ids.map((id, i) => {
    const cur = !ok(id) && ids.slice(0, i).every(ok);
    return `<span class="${ok(id) ? 'ok' : cur ? 'cur' : ''}">${labels[i]}</span>`;
  }).join('') + '</div>';
}
function hintBtn(id, text, box) {
  const b = document.createElement('button'); b.className = 'btn'; b.textContent = 'Ver pista';
  b.onclick = () => { if (!st(id).hintShown) { st(id).pistas++; st(id).hintShown = true; save(); } box.className = 'fb hint'; box.innerHTML = '<b>Pista.</b> ' + text; }; return b;
}

/* ============ INICIO ============ */
function rInicio(m) {
  m.innerHTML = `
  <div class="secthead"><h2>Antes de empezar</h2><span class="ref">${L$.temas}</span></div>
  <p class="lead">${L$.intro}</p>
  <div class="levels">${L$.niveles.map(n => `<div class="box"><h3>${n[0]}</h3><div class="in"><p>${n[1]}</p></div></div>`).join('')}</div>
  <div class="box q"><h3>Reglas de integridad</h3><div class="in">
    <p>Desde que presionas <b>Comenzar</b>, el laboratorio registra: <b>cuántas veces sales de la ventana</b> (cambiar de pestaña o de aplicación) y cuánto tiempo, los <b>intentos de pegar</b> textos de más de ${INTEG.MAX_PEGADO} caracteres (se bloquean) y los <b>intentos de captura de pantalla</b>. Con más de ${INTEG.LIMITE_SALIDAS} salidas, tu constancia queda marcada <b>CON INCIDENCIAS</b>.</p>
    <p>Cada intento fallido y cada pista también quedan en tu constancia. Al terminar el Nivel 2 se habilita la constancia (PNG) y tu código de verificación: sube ambos a Moodle. El Nivel 3 cuenta como reto adicional.</p>
    <p class="small">El progreso se guarda en este navegador. Reiniciar la actividad no borra el registro de integridad.</p></div></div>
  <div class="box"><h3>Tus datos</h3><div class="in">
    <div class="form">
      <label>Nombre completo<input id="fNom" autocomplete="name" value="${esc(S.nombre)}" ${S.inicio ? 'disabled' : ''}></label>
      <label>Número de control<input id="fCtl" inputmode="numeric" value="${esc(S.control)}" ${S.inicio ? 'disabled' : ''}></label>
    </div>
    <div class="row"><button class="btn pri" id="bGo">${S.inicio ? 'Continuar' : 'Comenzar'}</button>
    ${S.inicio ? '<button class="btn" id="bReset">Reiniciar actividad</button>' : ''}</div>
    <div class="fb" id="fbI"></div></div></div>`;
  $('#bGo').onclick = () => {
    if (!S.inicio) {
      const n = $('#fNom').value.trim(), c = $('#fCtl').value.trim();
      if (n.split(/\s+/).length < 2 || c.length < 4) { const f = $('#fbI'); f.className = 'fb no'; f.textContent = 'Escribe tu nombre completo y tu número de control.'; return; }
      S.nombre = n; S.control = c; S.inicio = Date.now(); save();
    }
    const next = TABS.slice(1).find(t => t.on() && !t.done()); go(next ? next.id : 'cons');
  };
  const r = $('#bReset');
  if (r) {
    let armed = false; r.onclick = () => {
      if (!armed) { armed = true; r.textContent = 'Se borrará tu avance (no el registro de integridad). Clic otra vez para confirmar'; return; }
      const integ = INTEG.reinicia(S.integ); S = fresh(); S.integ = integ; save(); render();
    };
  }
}

/* ============ NIVEL 1: Parsons ============ */
const pzState = {}; let lastSolved1 = null, justSolved = null;
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; }
function getPz(z) {
  if (!pzState[z.id]) {
    const items = z.lines.map((t, i) => ({ t, k: 'c' + i })).concat(z.dis.map((d, j) => ({ t: d.t, k: 'd' + j, fb: d.fb })));
    let bank = shuffle(items.map((_, i) => i)); if (bank.every((v, i) => v === i)) bank.reverse(); pzState[z.id] = { items, bank, prog: [] };
  } return pzState[z.id];
}
function rN1(m) {
  const PZ = L$.PZ; const cur = PZ.find(z => !ok(z.id));
  m.innerHTML = `<div class="secthead"><h2>Nivel 1 · Ordena el programa</h2><span class="ref">${L$.n1ref}</span></div>
  ${stepsBar(PZ.map(z => z.id), PZ.map(z => z.tag))}
  <div class="panel"><div id="L"></div><div id="R"></div></div>`;
  const Lp = $('#L'), R = $('#R');
  let code = L$.n1pre.map(l => `<div class="ln">${esc(l) || ' '}</div>`).join('');
  for (const z of PZ) if (ok(z.id)) code += z.lines.map(l => `<div class="ln${z === lastSolved1 ? ' new' : ''}">${esc(l)}</div>`).join('') + '<div class="ln"> </div>';
  if (ok(LAST1)) code += L$.n1post.map(l => `<div class="ln">${esc(l)}</div>`).join('');
  Lp.innerHTML = `<div class="box"><h3>Tu programa hasta ahora</h3><div class="in"><div class="code">${code}</div></div></div>`;
  if (cur) {
    const s = getPz(cur); const box = document.createElement('div'); box.className = 'box q';
    box.innerHTML = `<h3>${cur.titulo}</h3><div class="in"><p>${cur.enun}</p>
      <p class="small">Toca una línea del banco para agregarla a tu programa. En el programa puedes subirla (▲), bajarla (▼) o regresarla (✕). No todas las líneas del banco se usan.</p>
      <div class="parsons"><div class="zone" id="zb"><div class="zt">Banco de líneas</div></div><div class="zone" id="zp"><div class="zt">Tu programa</div></div></div>
      <div class="row" id="rw"><button class="btn pri" id="bChk">Verificar</button></div><div class="fb" id="fb"></div></div>`;
    Lp.appendChild(box);
    const fb = $('#fb', box); $('#rw', box).appendChild(hintBtn(cur.id, cur.pista, fb));
    const draw = () => {
      const zb = $('#zb', box), zp = $('#zp', box); zb.querySelectorAll('.pl').forEach(e => e.remove()); zp.querySelectorAll('.pl').forEach(e => e.remove());
      s.bank.forEach(i => {
        const d = document.createElement('div'); d.className = 'pl'; d.innerHTML = `<code>${esc(s.items[i].t)}</code>`;
        d.querySelector('code').onclick = () => { s.bank = s.bank.filter(x => x !== i); s.prog.push(i); draw(); }; zb.appendChild(d);
      });
      s.prog.forEach((i, pos) => {
        const d = document.createElement('div'); d.className = 'pl';
        d.innerHTML = `<code>${esc(s.items[i].t)}</code><button title="Subir" aria-label="Subir">▲</button><button title="Bajar" aria-label="Bajar">▼</button><button title="Quitar" aria-label="Quitar">✕</button>`;
        const [u, dn, x] = d.querySelectorAll('button');
        u.onclick = () => { if (pos > 0) { [s.prog[pos - 1], s.prog[pos]] = [s.prog[pos], s.prog[pos - 1]]; draw(); } };
        dn.onclick = () => { if (pos < s.prog.length - 1) { [s.prog[pos + 1], s.prog[pos]] = [s.prog[pos], s.prog[pos + 1]]; draw(); } };
        x.onclick = () => { s.prog.splice(pos, 1); s.bank.push(i); draw(); }; zp.appendChild(d);
      });
    };
    draw();
    $('#bChk', box).onclick = () => {
      const keys = s.prog.map(i => s.items[i].k); const zp = $('#zp', box);
      const dz = s.prog.findIndex(i => s.items[i].k[0] === 'd');
      let msg = null;
      if (!keys.length) msg = 'Tu programa está vacío.';
      else if (dz >= 0) { msg = 'Línea ' + (dz + 1) + ': ' + s.items[s.prog[dz]].fb; zp.querySelectorAll('.pl')[dz].classList.add('badl'); }
      else {
        const bad = keys.findIndex((k, i) => k !== 'c' + i);
        if (bad >= 0) { msg = 'La línea ' + (bad + 1) + ' no está en su lugar. Revisa el orden lógico (y la sangría) a partir de ahí.'; zp.querySelectorAll('.pl')[bad].classList.add('badl'); }
        else if (keys.length < cur.lines.length) msg = 'Lo que llevas está bien, pero faltan líneas.';
      }
      if (msg) { st(cur.id).fallos++; save(); fb.className = 'fb no'; fb.textContent = msg; return; }
      markOk(cur.id); lastSolved1 = cur; justSolved = cur.id; render();
    };
  } else {
    const b = document.createElement('div'); b.className = 'box done';
    b.innerHTML = `<h3>Nivel 1 completado</h3><div class="in"><p>${L$.n1done}</p><div class="row"><button class="btn pri" id="bN2">Ir al Nivel 2</button></div></div>`;
    Lp.appendChild(b); $('#bN2').onclick = () => go('n2');
  }
  R.innerHTML = '';
  L$.n1right(R, justSolved); justSolved = null;
}

/* ============ NIVEL 2: huecos ============ */
function holeStep(h) { return L$.N2.find(s => s.holes.includes(h)).id; }
function scriptN2() { return L$.TPL.map(l => l.map(p => typeof p === 'string' ? p : (S.ans[p.h] || '')).join('').replace(/^ $/, '')).join('\n'); }
function rN2(m) {
  const N2 = L$.N2, HOLES = L$.HOLES; const cur = N2.find(s => !ok(s.id));
  m.innerHTML = `<div class="secthead"><h2>Nivel 2 · Completa el código</h2><span class="ref">${L$.n2ref}</span></div>
  ${stepsBar(N2.map(s => s.id), N2.map(s => s.tag))}<div class="panel"><div id="L"></div><div id="R"></div></div>`;
  const Lp = $('#L'), R = $('#R');
  const box = document.createElement('div'); box.className = 'box ' + (cur ? 'q' : 'done');
  let code = '';
  for (const line of L$.TPL) {
    let h = ''; let hasCur = false;
    for (const p of line) {
      if (typeof p === 'string') { h += esc(p); continue; }
      const sid = holeStep(p.h);
      if (ok(sid)) h += `<span class="fill">${esc(S.ans[p.h])}</span>`;
      else if (cur && sid === cur.id) { hasCur = true; h += `<input data-h="${p.h}" size="${HOLES[p.h].w}" spellcheck="false" autocomplete="off" autocapitalize="off" value="${esc(S.ans[p.h] || '')}" aria-label="Espacio ${p.h}">`; }
      else h += '<span class="lock">' + '▢'.repeat(Math.min(6, Math.ceil(HOLES[p.h].w / 3))) + '</span>';
    }
    code += `<div class="ln${hasCur ? ' new' : ''}"><span>${h || ' '}</span></div>`;
  }
  box.innerHTML = `<h3>${cur ? cur.titulo : 'Nivel 2 completado'}</h3><div class="in">${cur ? '<p>' + cur.enun + '</p>' : '<p>' + L$.n2done + '</p>'}<div class="code">${code}</div>
    <div class="row" id="rw">${cur ? '<button class="btn pri" id="bChk">Verificar</button>' : '<button class="btn pri" id="bCopy">Copiar script para Colab</button><button class="btn" id="bN3">Ir al reto (Nivel 3)</button><button class="btn" id="bC">Ver constancia</button>'}</div><div class="fb" id="fb"></div></div>`;
  Lp.appendChild(box);
  const fb = $('#fb', box);
  if (cur) {
    $('#rw', box).appendChild(hintBtn(cur.id, cur.pista, fb));
    const ins = [...box.querySelectorAll('input[data-h]')]; if (ins[0]) setTimeout(() => ins[0].focus({ preventScroll: true }), 0);
    ins.forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') $('#bChk', box).click(); }));
    $('#bChk', box).onclick = () => {
      let all = true, msgs = [];
      for (const i of ins) {
        const r = HOLES[i.dataset.h].chk(i.value); S.ans[i.dataset.h] = i.value.trim();
        i.classList.toggle('okk', r.ok); i.classList.toggle('err', !r.ok); if (!r.ok) { all = false; msgs.push((ins.length > 1 ? 'Espacio ' + (ins.indexOf(i) + 1) + ': ' : '') + r.msg); }
      }
      save();
      if (!all) { st(cur.id).fallos++; save(); fb.className = 'fb no'; fb.innerHTML = msgs.map(esc).join('<br>'); return; }
      markOk(cur.id); justSolved = cur.id; render();
    };
  } else {
    $('#bN3').onclick = () => go('n3'); $('#bC').onclick = () => go('cons');
    $('#bCopy').onclick = () => copyText(scriptN2(), fb, L$.colabMsg);
  }
  R.innerHTML = '';
  L$.n2right(R, justSolved); justSolved = null;
}
function copyText(t, fb, msg) {
  const done = () => { fb.className = 'fb ok'; fb.textContent = msg; };
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t).then(done, () => fallback()); else fallback();
  function fallback() {
    const ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { fb.className = 'fb no'; fb.textContent = 'No se pudo copiar automáticamente.'; } ta.remove();
  }
}

/* ============ utilidades para el Nivel 3 ============ */
function mcBlock(q, id, title, enun, opts, after) {
  q.innerHTML = `<h3>${title}</h3><div class="in"><p>${enun}</p><div class="mc">${opts.map((o, i) => `<label><input type="radio" name="mc" value="${i}"><span>${o.t}</span></label>`).join('')}</div>
    <div class="row"><button class="btn pri" id="bChk">Verificar</button></div><div class="fb" id="fb"></div></div>`;
  const fb = $('#fb', q);
  $('#bChk', q).onclick = () => {
    const s = q.querySelector('input[name=mc]:checked'); if (!s) { fb.className = 'fb no'; fb.textContent = 'Elige una opción.'; return; }
    const o = opts[+s.value]; if (o.ok) { markOk(id); render(); return; } st(id).fallos++; save(); fb.className = 'fb no'; fb.innerHTML = o.fb;
  };
}
function numBlock(q, id, title, enun, placeholder, chk, pista) {
  q.innerHTML = `<h3>${title}</h3><div class="in"><p>${enun}</p><p><input class="inp" id="iN" placeholder="${placeholder}" inputmode="decimal" spellcheck="false" autocomplete="off" style="max-width:240px"></p>
    <div class="row" id="rw"><button class="btn pri" id="bChk">Verificar</button></div><div class="fb" id="fb"></div></div>`;
  const fb = $('#fb', q); if (pista) $('#rw', q).appendChild(hintBtn(id, pista, fb));
  const go1 = () => { const r = chk($('#iN', q).value); $('#iN', q).classList.toggle('err', !r.ok); if (r.ok) { markOk(id); render(); return; } st(id).fallos++; save(); fb.className = 'fb no'; fb.textContent = r.msg; };
  $('#bChk', q).onclick = go1; $('#iN', q).addEventListener('keydown', e => { if (e.key === 'Enter') go1(); });
}

/* ============ CONSTANCIA ============ */
function stats(Lv) { let f = 0, p = 0; for (const id of Lv.ids) { const s = S.st[id]; if (s) { f += s.fallos; p += s.pistas; } } return { done: Lv.ids.every(ok), f, p, n: Lv.ids.filter(ok).length }; }
function dur(ms) { const m = Math.round(ms / 60000); return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + (m % 60) + ' min'; }
function datosCodigo() {
  const tEnd = Math.max(...Object.values(S.t));
  return INTEG.construirCodigo({ lab: L$.labId, nombre: S.nombre, control: S.control, inicio: S.inicio, fin: tEnd, niveles: L$.LEVELS.map(stats), integ: S.integ });
}
function rCons(m) {
  const tEnd = Math.max(...Object.values(S.t)); const I = S.integ; const inc = I.salidas > INTEG.LIMITE_SALIDAS;
  const { codigo, folio } = datosCodigo();
  m.innerHTML = `<div class="secthead"><h2>Constancia de laboratorio</h2><span class="ref">Evidencia para Moodle</span></div>
  <p class="lead">Descarga la imagen y súbela a Moodle. Copia también tu <b>código de verificación</b> y pégalo en el texto de la entrega. Si después completas el reto, vuelve aquí y descarga de nuevo.</p>
  <p><span class="stamp ${inc ? 'no' : 'ok'}">${inc ? 'CON INCIDENCIAS · ' + I.salidas + ' salidas de la ventana' : 'SIN INCIDENCIAS'}</span></p>
  <div class="row" style="margin:0 0 12px"><button class="btn pri" id="bD">Descargar constancia (PNG)</button>${ok(LAST3) ? '' : '<button class="btn" id="bN3">Intentar el reto (Nivel 3)</button>'}</div>
  <div class="box"><h3>Código de verificación</h3><div class="in"><textarea class="codev" id="tCode" rows="2" readonly>${esc(codigo)}</textarea>
  <div class="row"><button class="btn" id="bCode">Copiar código</button></div><div class="fb" id="fbC"></div></div></div>
  <canvas id="cv" width="1400" height="1060" aria-label="Constancia"></canvas>`;
  const cv = $('#cv');
  const draw = () => {
    const c = cv.getContext('2d'); const F = '"Fira Sans",system-ui,sans-serif', M = '"Fira Mono",monospace';
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, 1400, 1060);
    c.fillStyle = '#1B396A'; c.fillRect(0, 0, 1400, 150); c.fillStyle = '#EE762C'; c.fillRect(0, 150, 1400, 6);
    c.fillStyle = '#ffffff'; c.font = '500 22px ' + F; c.fillText('TECNM CAMPUS ENSENADA  ·  MÉTODOS NUMÉRICOS (SCC-1017)  ·  ' + L$.unidadTxt, 60, 58);
    c.font = '600 38px ' + F; c.fillText('Constancia · ' + L$.consTitle, 60, 112);
    c.fillStyle = '#5b6a6d'; c.font = '500 20px ' + F; c.fillText('ESTUDIANTE', 60, 215); c.fillText('NÚMERO DE CONTROL', 900, 215);
    c.fillStyle = '#1f2b2e'; c.font = '600 34px ' + F; c.fillText(S.nombre, 60, 256); c.fillText(S.control, 900, 256);
    c.fillStyle = '#5b6a6d'; c.font = '20px ' + F;
    c.fillText('Inicio: ' + new Date(S.inicio).toLocaleString('es-MX') + '     Última etapa: ' + new Date(tEnd).toLocaleString('es-MX') + '     Tiempo: ' + dur(tEnd - S.inicio), 60, 300);
    const y0 = 340; c.fillStyle = '#eef1f1'; c.fillRect(60, y0, 1280, 48); c.fillStyle = '#1f2b2e'; c.font = '600 21px ' + F;
    c.fillText('Nivel', 80, y0 + 32); c.fillText('Estado', 820, y0 + 32); c.fillText('Intentos fallidos', 985, y0 + 32); c.fillText('Pistas', 1225, y0 + 32);
    L$.LEVELS.forEach((Lv, i) => {
      const s = stats(Lv); const y = y0 + 48 + i * 60; c.strokeStyle = '#d5dcdc'; c.lineWidth = 1; c.beginPath(); c.moveTo(60, y + 60); c.lineTo(1340, y + 60); c.stroke();
      c.fillStyle = '#1f2b2e'; c.font = '22px ' + F; c.fillText(Lv.t, 80, y + 39);
      c.fillStyle = s.done ? '#14964a' : (s.n ? '#e0761a' : '#8a9799'); c.font = '600 22px ' + F; c.fillText(s.done ? 'Completado' : (s.n ? s.n + ' de ' + Lv.ids.length + ' pasos' : 'No realizado'), 820, y + 39);
      c.fillStyle = '#1f2b2e'; c.font = '22px ' + M; c.fillText(String(s.f), 1040, y + 39); c.fillText(String(s.p), 1250, y + 39);
    });
    // integridad
    const yi = 610; c.fillStyle = inc ? 'rgba(194,59,59,.10)' : 'rgba(20,150,74,.10)'; c.fillRect(60, yi, 1280, 150);
    c.fillStyle = inc ? '#c23b3b' : '#14964a'; c.font = '600 24px ' + F; c.fillText('REGISTRO DE INTEGRIDAD  ·  ' + (inc ? 'CON INCIDENCIAS' : 'SIN INCIDENCIAS'), 84, yi + 40);
    c.fillStyle = '#1f2b2e'; c.font = '22px ' + F;
    c.fillText('Salidas de la ventana: ' + I.salidas + ' (límite ' + INTEG.LIMITE_SALIDAS + ')   ·   Tiempo fuera: ' + INTEG.fmtSeg(I.fuera), 84, yi + 82);
    c.fillText('Pegados bloqueados: ' + I.pegados + '   ·   Intentos de captura de pantalla: ' + I.capturas + '   ·   Reinicios: ' + (I.reinicios || 0), 84, yi + 120);
    c.fillStyle = '#5b6a6d'; c.font = '500 20px ' + F; c.fillText('RESULTADO DEL NIVEL 2', 60, 805);
    c.fillStyle = '#1f2b2e'; c.font = '21px ' + M; c.fillText(L$.resultLine(), 60, 840);
    c.fillStyle = '#5b6a6d'; c.font = '500 20px ' + F; c.fillText('FOLIO', 60, 905);
    c.fillStyle = '#1B396A'; c.font = '600 40px ' + M; c.fillText(folio, 60, 950);
    c.fillStyle = '#8a9799'; c.font = '17px ' + F;
    c.fillText('Verificable en la página del verificador con el código de verificación. El folio depende de los datos, el desempeño y el registro de integridad.', 60, 1010);
  };
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(draw); draw();
  $('#bD').onclick = () => { draw(); cv.toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = L$.filePrefix + '_' + S.control.replace(/\W+/g, '') + '.png'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }, 'image/png'); };
  $('#bCode').onclick = () => copyText(codigo, $('#fbC'), 'Código copiado. Pégalo en el texto de tu entrega en Moodle.');
  const b3 = $('#bN3'); if (b3) b3.onclick = () => go('n3');
}

INTEG.attach({ state: () => S, save, activo: () => !!S.inicio });
render();
