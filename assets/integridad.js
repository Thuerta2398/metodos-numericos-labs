/* =====================================================================
   integridad.js — Métodos Numéricos (SCC-1017) · TecNM Campus Ensenada
   Registro de integridad académica para los laboratorios interactivos:
   · salidas de la ventana (cambio de pestaña, de app o pérdida de foco)
   · pegados de más de 5 caracteres (bloqueados)
   · teclas de captura de pantalla (Impr Pant y atajos conocidos)
   · código de verificación y folio (compartidos con /verificar/)
   ===================================================================== */
"use strict";
(function () {
  const LIMITE_SALIDAS = 4;      // a partir de la 5.ª salida: constancia CON INCIDENCIAS
  const MAX_PEGADO = 5;          // se permiten pegados de hasta 5 caracteres
  const SALT = 'MN-SCC1017-U4-ITE';

  /* ---------- folio y código (también los usa el verificador) ---------- */
  function hash(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    let g = 0x9e3779b1;
    for (let i = str.length - 1; i >= 0; i--) { g ^= str.charCodeAt(i); g = Math.imul(g, 0x85ebca6b) >>> 0; }
    return (h.toString(16).padStart(8, '0') + g.toString(16).padStart(8, '0')).toUpperCase();
  }
  const limpia = s => String(s).replace(/[|\n\r]/g, ' ').trim();
  function folioDe(payload) { const h = hash(SALT + '|' + payload); return h.slice(0, 4) + '-' + h.slice(4, 8) + '-' + h.slice(8, 12); }
  /* d = {lab, nombre, control, inicio, fin, niveles:[{n,f,p}], integ:{salidas,fuera,pegados,capturas,reinicios}} */
  function construirCodigo(d) {
    const i = d.integ;
    const payload = ['MN4', d.lab, limpia(d.nombre), limpia(d.control), Math.round(d.inicio).toString(36), Math.round(d.fin).toString(36),
      d.niveles.map(l => l.n + '.' + l.f + '.' + l.p).join(','),
      [i.salidas, i.fuera, i.pegados, i.capturas, i.reinicios].join('.')].join('|');
    const folio = folioDe(payload);
    return { codigo: payload + '|' + folio, folio };
  }
  function leerCodigo(code) {
    const p = String(code).trim().split('|');
    if (p.length !== 9 || p[0] !== 'MN4') return { ok: false, msg: 'El código no tiene el formato esperado (9 campos separados por |, empieza con MN4).' };
    const payload = p.slice(0, 8).join('|');
    const valido = folioDe(payload) === p[8];
    const [sal, fuera, peg, cap, rein] = p[7].split('.').map(Number);
    return {
      ok: true, valido, folio: p[8], lab: p[1], nombre: p[2], control: p[3],
      inicio: parseInt(p[4], 36), fin: parseInt(p[5], 36),
      niveles: p[6].split(',').map(s => { const [n, f, pp] = s.split('.').map(Number); return { n, f, p: pp }; }),
      integ: { salidas: sal, fuera, pegados: peg, capturas: cap, reinicios: rein },
      incidencias: sal > LIMITE_SALIDAS
    };
  }
  function fmtSeg(s) { s = Math.round(s || 0); if (s < 60) return s + ' s'; const m = Math.floor(s / 60); return m < 60 ? m + ' min ' + (s % 60) + ' s' : Math.floor(m / 60) + ' h ' + (m % 60) + ' min'; }

  /* ---------- monitoreo en la página del laboratorio ---------- */
  let cfg = null, awayStart = 0, toastT = null;
  const nuevo = () => ({ salidas: 0, fuera: 0, pegados: 0, capturas: 0, reinicios: 0, log: [] });

  function I() { const s = cfg.state(); if (!s.integ) s.integ = nuevo(); return s.integ; }
  function registra(tipo, det) { const i = I(); i.log.push({ t: Date.now(), tipo, det }); if (i.log.length > 60) i.log.shift(); cfg.save(); pinta(); }

  function toast(msg, bad) {
    let t = document.getElementById('itoast');
    if (!t) { t = document.createElement('div'); t.id = 'itoast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.classList.toggle('bad', !!bad); t.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 4200);
  }

  function pinta() {
    if (!cfg) return;
    const i = I(), bar = document.getElementById('ibar');
    if (bar) {
      const on = cfg.activo();
      bar.hidden = !on;
      bar.innerHTML = `<span class="chip ${i.salidas > LIMITE_SALIDAS ? 'warn' : ''}" title="Salidas de la ventana">↗ salidas <b>${i.salidas}</b>/${LIMITE_SALIDAS}</span>` +
        `<span class="chip ${i.pegados ? 'warn' : ''}" title="Pegados bloqueados">📋 <b>${i.pegados}</b></span>` +
        `<span class="chip ${i.capturas ? 'warn' : ''}" title="Intentos de captura de pantalla">📸 <b>${i.capturas}</b></span>`;
    }
    let b = document.getElementById('ibanner');
    if (i.salidas > LIMITE_SALIDAS && cfg.activo()) {
      if (!b) { b = document.createElement('div'); b.id = 'ibanner'; b.className = 'ibanner'; b.setAttribute('role', 'alert'); document.body.prepend(b); }
      b.innerHTML = `⚠️ Saliste de la ventana <b>${i.salidas}</b> veces (límite ${LIMITE_SALIDAS}). Tu constancia quedará marcada <b>CON INCIDENCIAS</b> y el docente lo verá.`;
    } else if (b) b.remove();
  }

  function sale() { if (cfg && cfg.activo() && !awayStart) awayStart = Date.now(); }
  function regresa() {
    if (!awayStart) return;
    const secs = (Date.now() - awayStart) / 1000; awayStart = 0;
    if (secs < 0.8 || !cfg.activo()) return;
    const i = I(); i.salidas++; i.fuera += Math.round(secs);
    registra('salida', Math.round(secs) + ' s');
    const n = i.salidas;
    toast(n > LIMITE_SALIDAS
      ? `⚠️ Saliste de la ventana (${n}). Superaste el límite de ${LIMITE_SALIDAS}: tu constancia quedará CON INCIDENCIAS.`
      : `⚠️ Saliste de la ventana (${n} de ${LIMITE_SALIDAS} permitidas). Quedó registrado.`, true);
  }

  function textoDe(e) {
    try { const dt = e.clipboardData || e.dataTransfer; if (dt) return dt.getData('text/plain') || dt.getData('text') || ''; } catch (_) { }
    return typeof e.data === 'string' ? e.data : '';
  }
  function filtraPegado(e) {
    if (!cfg || !cfg.activo()) return;
    const txt = textoDe(e);
    if (txt.length <= MAX_PEGADO && e.type !== 'drop') return;          // pegado corto: permitido
    if (e.type === 'drop' && txt.length <= MAX_PEGADO && txt.length > 0) return;
    e.preventDefault(); e.stopPropagation();
    const i = I(); i.pegados++; registra('pegado', txt.length + ' caracteres');
    toast(`🚫 No se permite pegar bloques de texto (máximo ${MAX_PEGADO} caracteres). Intento ${i.pegados} registrado.`, true);
  }

  function captura(det) {
    if (!cfg || !cfg.activo()) return;
    const i = I(); i.capturas++; registra('captura', det);
    toast(`📸 Se detectó un intento de captura de pantalla (${i.capturas}). Quedó registrado en tu constancia.`, true);
    try { if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText('Captura de pantalla no permitida en el laboratorio.').catch(() => { }); } catch (_) { }
  }

  function attach(c) {
    cfg = c;
    window.addEventListener('blur', sale);
    window.addEventListener('focus', regresa);
    document.addEventListener('visibilitychange', () => { document.hidden ? sale() : regresa(); });
    window.addEventListener('pagehide', sale);
    document.addEventListener('paste', filtraPegado, true);
    document.addEventListener('drop', filtraPegado, true);
    document.addEventListener('beforeinput', e => {
      if ((e.inputType === 'insertFromPaste' || e.inputType === 'insertFromDrop') && !e.defaultPrevented) {
        const txt = textoDe(e); if (txt.length > MAX_PEGADO) filtraPegado(e);
      }
    }, true);
    document.addEventListener('keyup', e => { if (e.key === 'PrintScreen' || e.code === 'PrintScreen') captura('Impr Pant'); }, true);
    document.addEventListener('keydown', e => {
      const k = (e.key || '').toLowerCase();
      if (e.key === 'PrintScreen') { e.preventDefault(); return; }
      if (e.metaKey && e.shiftKey && ['3', '4', '5', 's'].includes(k)) captura('atajo ' + (e.ctrlKey ? 'Ctrl+' : '') + 'Cmd/Win+Shift+' + k.toUpperCase());
    }, true);
    pinta();
  }

  window.INTEG = { attach, pinta, toast, nuevo, construirCodigo, leerCodigo, fmtSeg, LIMITE_SALIDAS, MAX_PEGADO,
    reinicia(prev) { const n = nuevo(); if (prev) { n.salidas = prev.salidas; n.fuera = prev.fuera; n.pegados = prev.pegados; n.capturas = prev.capturas; n.reinicios = (prev.reinicios || 0) + 1; n.log = prev.log || []; } return n; } };
})();
