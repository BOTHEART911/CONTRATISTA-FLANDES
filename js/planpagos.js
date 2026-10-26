/* ============================================================
   CONTRATISTA-FLANDES · UNIFICAR Y DESCARGAR (26/10/2026)

   Desde ESTADO DE CUENTA → MI CUENTA DRIVE: arma en el teléfono UN solo
   PDF con los documentos del Plan de pagos del SECOP II, en el orden de la
   guía, y lo baja con el nombre CTA{n}-{contrato}-{vigencia}.pdf.

   De dónde sale cada cosa
     · La lista (qué documento va, cómo se reconoce y en qué orden) la
       manda el CORE con seguimientoDocs {plan:1}; la administra ADMIN. Si
       el CORE todavía no la manda, rige la de fábrica de abajo (la misma).
     · Los bytes, directo de Drive con la llave (KIT.drive). Si Drive no
       lo entrega, por el CORE (seguimientoDocumento), de fondo.
     · Word y Excel: el CORE los deja en PDF (planPagosPdf, UN viaje para
       todos, solo IDs); el Excel viene vertical y horizontal.
     · La unión: pdf-lib, en el teléfono. Nada se sube.

   El contratista puede: quitar o incluir, subir o bajar, girar (PDF e
   imágenes) y poner un Excel vertical u horizontal. Lo que ajusta se
   recuerda en ese teléfono para esa cuenta.
   ============================================================ */
(function () {
  'use strict';

  var K = window.KIT;
  var app = K.id('app');

  var PDFLIB_URL = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';
  var ESTADOS = ['APROBADA', 'PLAN DE PAGOS', 'ORDEN DE PAGO', 'EGRESO', 'PAGADA', 'CERRADA'];
  var CARTA = [612, 792];   /* hoja carta, en puntos */
  var MARGEN = 24;

  /* La lista de fábrica: la misma del CORE (FCPP_fabrica_). */
  function d(k, t, archivo, carpeta, aplica, nota, va) {
    return { k: k, t: t, archivo: archivo, carpeta: carpeta || '', aplica: !!aplica, nota: nota || '', va: va !== false };
  }
  var FABRICA = [
    d('actaCumplimiento', 'Acta de cumplimiento', 'ACT_C', '', true, 'Última cuenta'),
    d('otroR', 'Otro documento requerido', 'Otro Requerido', 'NOVEDADES', true, 'Si aplica'),
    d('actaInicio', 'Acta de inicio', 'Acta de Inicio', 'NOVEDADES', false, ''),
    d('cdp', 'CDP', 'CDP', 'NOVEDADES', false, ''),
    d('rp', 'RP', 'RP', 'NOVEDADES', false, ''),
    d('clausulados', 'Clausulados', 'Clausulados', 'NOVEDADES', false, ''),
    d('arl', 'Certificación ARL', 'Certificado ARL', 'NOVEDADES', false, ''),
    d('otrosi', 'Otrosí', 'OTROSI', 'NOVEDADES', true, 'Si aplica'),
    d('cdpAdicion', 'CDP adición', 'CDP Adicion', 'NOVEDADES', true, 'Adición'),
    d('rpAdicion', 'RP adición', 'RP Adicion', 'NOVEDADES', true, 'Adición'),
    d('supervision', 'Informe de supervisión', 'SUP_C', '', false, '', false),
    d('actividades', 'Formato de actividades', 'Formato de Actividades', '', false, ''),
    d('evidencias', 'Formato de evidencias', 'Formato de Evidencias', '', true, 'Si aplica'),
    d('anexos', 'Anexos', '*', 'ANEXOS', true, 'Si tienes'),
    d('baucher', 'Baucher de pago de planilla', 'Baucher Planilla', 'BANCO Y PLANILLA', false, ''),
    d('planilla', 'Planilla de aportes', 'Planilla', 'BANCO Y PLANILLA', false, ''),
    d('baucherAnexa', 'Baucher de planilla anexa', 'Baucher Planilla Anexa', 'BANCO Y PLANILLA', true, 'Si aplica'),
    d('planillaAnexa', 'Planilla anexa', 'Planilla Anexa', 'BANCO Y PLANILLA', true, 'Si aplica'),
    d('arlAlcaldia', 'Planilla ARL de la Alcaldía', 'Planilla ARL suministrada', 'BANCO Y PLANILLA', true, 'Riesgo elevado'),
    d('pension', 'Documento de pensión', 'Certificacion NO Aportes Pension', '', true, 'Pensionados'),
    d('factura', 'Factura electrónica', 'Factura Electronica', '', true, 'Si aplica'),
    d('exoneracion', 'Formato de exoneración', 'Formato de Exoneracion', '', false, ''),
    d('equivalente', 'Formato factura equivalente', 'Formato Equivalente Factura', '', true, 'Si aplica'),
    d('rutNatural', 'RUT', 'RUT Persona Natural', 'NOVEDADES', false, ''),
    d('rutSimple', 'RUT régimen simple', 'RUT (Regimen Simple)', '', true, 'Régimen Simple'),
    d('parafiscales', 'Certificado de parafiscales', 'Certificado Parafiscales', '', true, 'Si aplica'),
    d('bancaria', 'Certificación bancaria', 'Certificacion Bancaria', 'BANCO Y PLANILLA', false, ''),
    d('fotosEvidencias', 'Fotos de evidencias', '*', 'EVIDENCIAS', false, 'Ya van en el formato', false),
    d('ordenEgreso', 'Orden de pago y egreso', '*', 'ORDEN -EGRESO', false, 'Después del pago', false)
  ];

  var OFICINA = {
    'application/msword': 'word',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'word',
    'application/vnd.ms-excel': 'excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'excel'
  };

  var ST = null;          /* la vista abierta */
  var GEN = 0;            /* generación: una respuesta de una vista vieja no pisa la nueva */
  var LIB = null;         /* promesa de pdf-lib */
  var MED = [];           /* medidas de la última apertura */

  /* ══════════════ reconocer los archivos ══════════════ */

  function norm(s) {
    var t = String(s || '').toLowerCase();
    try { t = t.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch (e) {}
    return t.replace(/[^a-z0-9]/g, '');
  }
  function sinExt(n) { return String(n || '').replace(/\.[a-z0-9]{2,5}$/i, ''); }
  function carpetaDe(grupo) {
    var g = String(grupo || '');
    if (/^formatos de la cuenta$/i.test(g)) return { top: '', todo: '' };
    var top = g.split(' / ')[0];
    return { top: top, todo: g };
  }

  /** La entrada de la lista que le toca a un archivo (o null). Gana el patrón más largo. */
  function entradaDe(lista, nombre, grupo) {
    var c = carpetaDe(grupo), nb = norm(sinExt(nombre)), mejor = null, largo = -1;
    lista.forEach(function (e, i) {
      var ec = norm(e.carpeta);
      if (String(e.archivo).trim() === '*') {
        if (ec && ec === norm(c.top) && largo < 0) { mejor = { e: e, i: i }; largo = 0; }
        return;
      }
      if (ec !== norm(c.todo)) return;
      var p = norm(e.archivo);
      if (p && nb.indexOf(p) === 0 && p.length > largo) { mejor = { e: e, i: i }; largo = p.length; }
    });
    return mejor;
  }

  function claseDe(mime) {
    var m = String(mime || '').toLowerCase();
    if (OFICINA[m]) return OFICINA[m];
    if (m === 'application/pdf') return 'pdf';
    if (m === 'application/vnd.google-apps.document') return 'google';
    if (/^image\//.test(m)) return 'imagen';
    return 'otro';
  }

  /** Arma la lista de la cuenta: los de la guía en su orden y, al final, lo que no está en la guía. */
  function armar(lista, grupos) {
    var guia = [], otros = [];
    (grupos || []).forEach(function (g) {
      (g.archivos || []).forEach(function (a) {
        var m = entradaDe(lista, a.nombre, g.nombre);
        if (m && m.e.va === false) return;          /* la lista dice que no va (informe de supervisión, fotos...) */
        var it = {
          id: a.id, nombre: a.nombre, mime: a.mime || '', clase: claseDe(a.mime), kb: Math.round((a.bytes || 0) / 1024),
          grupo: g.nombre, pos: m ? m.i : 9999, ent: m ? m.e : null,
          incluido: !!m, rot: 0, hz: false, estado: 'espera', paginas: 0, err: ''
        };
        if (it.clase === 'otro') { it.incluido = false; it.err = 'Este tipo de archivo no se puede unir.'; }
        (m ? guia : otros).push(it);
      });
    });
    var nat = function (x, y) { return x.pos - y.pos || x.nombre.localeCompare(y.nombre, 'es', { numeric: true }); };
    guia.sort(nat);
    otros.sort(function (x, y) { return x.nombre.localeCompare(y.nombre, 'es', { numeric: true }); });
    return guia.concat(otros);
  }

  /* ══════════════ lo que el teléfono recuerda ══════════════ */

  function llave() { return 'contratista.pp.' + (ST.contrato || '') + '.' + ST.informe; }
  function recordar() {
    try {
      var o = { orden: ST.items.map(function (i) { return i.id; }), fuera: [], dentro: [], rot: {}, hz: {} };
      ST.items.forEach(function (i) {
        if (!i.incluido && i.ent) o.fuera.push(i.id);
        if (i.incluido && !i.ent) o.dentro.push(i.id);
        if (i.rot) o.rot[i.id] = i.rot;
        if (i.hz) o.hz[i.id] = true;
      });
      localStorage.setItem(llave(), JSON.stringify(o));
    } catch (e) {}
  }
  function aplicarRecuerdo(items) {
    var o = null;
    try { o = JSON.parse(localStorage.getItem(llave()) || 'null'); } catch (e) { o = null; }
    if (!o) return items;
    var pos = {};
    (o.orden || []).forEach(function (id, i) { pos[id] = i; });
    items.forEach(function (it, i) {
      if ((o.fuera || []).indexOf(it.id) >= 0) it.incluido = false;
      if ((o.dentro || []).indexOf(it.id) >= 0 && it.clase !== 'otro') it.incluido = true;
      if (o.rot && o.rot[it.id]) it.rot = o.rot[it.id];
      if (o.hz && o.hz[it.id]) it.hz = true;
      it._p = pos[it.id] === undefined ? 1000 + i : pos[it.id];
    });
    return items.slice().sort(function (x, y) { return x._p - y._p; });
  }
  function olvidar() { try { localStorage.removeItem(llave()); } catch (e) {} }

  /* ══════════════ la vista ══════════════ */

  function abrir(sub) {
    var informe = parseInt(sub, 10);
    var gen = ++GEN;
    MED = [];
    var t0 = Date.now();
    K.piezas.banner.atras(function () { location.hash = '#/seguimiento/documentos'; });
    var caja = K.nodo('<div class="kit-ancho vista pp"></div>');
    app.appendChild(caja);
    if (!informe) { caja.appendChild(K.nodo('<p class="seg-nada">Falta la cuenta.</p>')); return; }

    var cab = K.nodo(
      '<section class="kit-tarjeta pp-cab">' +
      '  <h3 class="seg-sec__t">UNIFICAR Y DESCARGAR</h3>' +
      '  <p class="seg-sec__p">Tu cuenta ' + informe + ' en un solo PDF, en el orden de la guía del plan de pagos. ' +
      'Quita, mueve o gira lo que necesites y descárgalo listo para subirlo al SECOP II.</p>' +
      '  <p class="pp-nombre">' + K.icono('pdf', 16) + ' <b class="pp-nombre__t">CTA' + informe + '-…</b></p>' +
      '  <div class="pp-resumen" aria-live="polite"></div>' +
      '</section>');
    caja.appendChild(cab);
    var zona = K.nodo('<section class="kit-tarjeta pp-lista-caja"><ol class="pp-lista"></ol></section>');
    caja.appendChild(zona);
    var pie = K.nodo(
      '<div class="pp-pie">' +
      '  <button type="button" class="kit-btn kit-btn--plano pp-restablecer">' + K.icono('recargar', 16) + ' Orden de la guía</button>' +
      '  <button type="button" class="kit-btn kit-btn--marca pp-bajar" disabled>' + K.icono('descargar', 18) + ' <span>Preparando…</span></button>' +
      '</div>');
    caja.appendChild(pie);
    if (K.piezas.esqueletos) K.piezas.esqueletos.poner(zona.querySelector('.pp-lista'), { forma: 'filas', cuantos: 6 });

    ST = { gen: gen, informe: informe, items: [], caja: caja, cab: cab, ol: zona.querySelector('.pp-lista'), pie: pie,
           contrato: '', vigencia: '', oficina: null, bajando: false, vuelo: 0 };

    var seg = window.SEGUIMIENTO;
    var pDocs = seg && seg.docsDe ? seg.docsDe(informe) : K.pedir('seguimientoDocs', { informe: informe, plan: 1 }, { ms: 60000 });
    var pDatos = (seg && seg.datos) ? seg.datos()['catch'](function () { return null; }) : Promise.resolve(null);
    cargarLib();   /* pdf-lib se baja mientras tanto */

    Promise.all([pDocs, pDatos]).then(function (a) {
      if (gen !== GEN) return;
      var r = a[0] || {}, S = a[1] || {};
      MED.push({ paso: 'lista', ms: Date.now() - t0 });
      var c = null;
      (S.cuentas || []).forEach(function (x) { if (x.informe === informe) c = x; });
      ST.contrato = String(S.contrato || '').replace(/\D/g, '');
      ST.vigencia = vigenciaDe(c);
      ST.estado = c ? c.estado : '';
      cab.querySelector('.pp-nombre__t').textContent = nombreFinal();
      var lista = (r.plan && Array.isArray(r.plan.lista) && r.plan.lista.length) ? r.plan.lista : FABRICA;
      if (!r.carpeta) { ST.ol.innerHTML = '<li class="seg-nada">Esta cuenta todavía no tiene carpeta de documentos.</li>'; return; }
      ST.items = aplicarRecuerdo(armar(lista, r.grupos));
      if (!ST.items.length) { ST.ol.innerHTML = '<li class="seg-nada">No encontramos documentos del plan de pagos en tu carpeta.</li>'; return; }
      if (c && ESTADOS.indexOf(String(c.estado || '').toUpperCase()) < 0) {
        cab.appendChild(K.nodo('<p class="seg-pista pp-ojo">' + K.icono('reloj', 15) +
          ' Tu cuenta todavía no está aprobada: puede faltar el acta o algún formato. Úsalo como borrador.</p>'));
      }
      pintar();
      cargarTodo();
    })['catch'](function (e) {
      if (gen !== GEN || (e && e.codigo === 'CANCELADA')) return;
      ST.ol.innerHTML = '';
      ST.ol.appendChild(K.nodo('<li class="seg-nada seg-nada--malo">' + K.esc((e && e.message) || 'No se pudo abrir tu carpeta.') + '</li>'));
    });

    pie.querySelector('.pp-restablecer').addEventListener('click', function () {
      if (!ST.items.length || ST.bajando) return;
      K.vibrar && K.vibrar(8);
      olvidar();
      var porId = {};
      ST.items.forEach(function (i) { porId[i.id] = i; });
      ST.items.sort(function (x, y) { return x.pos - y.pos || x.nombre.localeCompare(y.nombre, 'es', { numeric: true }); });
      ST.items.forEach(function (i) {
        i.incluido = !!i.ent && i.clase !== 'otro' && i.estado !== 'clave';
        if (i.rot || i.hz) { if (i.hz) { i.hz = false; i.estado = 'espera'; i.doc = null; i.mini = null; } i.rot = 0; }
      });
      pintar();
      cargarTodo();
      K.aviso('Volviste al orden de la guía.', 'ok', 2200);
    });

    pie.querySelector('.pp-bajar').addEventListener('click', K.piezas.antidoble
      ? K.piezas.antidoble.una(unificar) : unificar);
  }

  function vigenciaDe(c) {
    var f = c && (c.radicada || c.revisada || '');
    var m = /(\d{4})\s*$/.exec(String(f || ''));
    return m ? m[1] : String(new Date().getFullYear());
  }
  function nombreFinal() {
    var n = ST.contrato ? ('000' + ST.contrato).slice(-Math.max(3, ST.contrato.length)) : 'CONTRATO';
    return 'CTA' + ST.informe + '-' + n + '-' + (ST.vigencia || new Date().getFullYear()) + '.pdf';
  }

  /* ══════════════ pintar ══════════════ */

  function icono(it) {
    return { pdf: 'pdf', google: 'pdf', imagen: 'imagen', word: 'documento', excel: 'hoja' }[it.clase] || 'archivo';
  }

  function pintar() {
    var ol = ST.ol;
    ol.innerHTML = '';
    var n = 0;
    var yaOtros = false;
    ST.items.forEach(function (it, k) {
      if (!it.ent && !yaOtros) {
        yaOtros = true;
        ol.appendChild(K.nodo('<li class="pp-sep" role="presentation">Otros archivos de tu carpeta · no están en la guía</li>'));
      }
      if (it.incluido) n++;
      ol.appendChild(fila(it, k, it.incluido ? n : 0));
    });
    resumen();
  }

  function fila(it, k, n) {
    var badge = it.ent
      ? (it.ent.aplica
        ? '<span class="pp-badge pp-badge--aplica">' + K.esc(it.ent.nota || 'Si aplica') + '</span>'
        : '<span class="pp-badge pp-badge--siempre">Siempre va</span>')
      : '<span class="pp-badge pp-badge--otro">No está en la guía</span>';
    var titulo = it.ent ? it.ent.t : sinExt(it.nombre);
    var li = K.nodo(
      '<li class="pp-item' + (it.incluido ? '' : ' pp-item--fuera') + '" data-id="' + K.esc(it.id) + '">' +
      '  <label class="pp-check" title="Incluir en el PDF"><input type="checkbox"' + (it.incluido ? ' checked' : '') +
           (it.clase === 'otro' || it.estado === 'clave' ? ' disabled' : '') + ' aria-label="Incluir ' + K.esc(titulo) + '"><span class="pp-n">' + (n || '') + '</span></label>' +
      '  <button type="button" class="pp-txt" aria-label="Ver ' + K.esc(titulo) + '">' +
      '    <span class="pp-mini" data-tipo="' + K.esc(it.clase) + '">' + miniHtml(it) + '</span>' +
      '    <span class="pp-txt__l"><b>' + K.esc(titulo) + '</b>' +
      '      <small>' + K.esc(it.nombre) + '</small>' +
      '      <small class="pp-estado">' + estadoTxt(it) + '</small></span>' +
      '  </button>' +
      '  <div class="pp-acc">' + badge +
      '    <span class="pp-botones">' +
      (it.clase === 'excel'
        ? '<button type="button" class="pp-b pp-hz" aria-pressed="' + (it.hz ? 'true' : 'false') + '" title="Vertical u horizontal">' + (it.hz ? 'Horizontal' : 'Vertical') + '</button>'
        : '') +
      (it.clase !== 'otro'
        ? '<button type="button" class="pp-b pp-girar" title="Girar 90°" aria-label="Girar ' + K.esc(titulo) + '"><span class="pp-girar__i" style="transform:rotate(' + it.rot + 'deg)">' + K.icono('girar', 16) + '</span></button>'
        : '') +
      '      <button type="button" class="pp-b pp-sube" title="Subir"' + (k === 0 ? ' disabled' : '') + ' aria-label="Subir ' + K.esc(titulo) + '">' + K.icono('arriba', 16) + '</button>' +
      '      <button type="button" class="pp-b pp-baja" title="Bajar"' + (k === ST.items.length - 1 ? ' disabled' : '') + ' aria-label="Bajar ' + K.esc(titulo) + '">' + K.icono('abajo', 16) + '</button>' +
      '    </span>' +
      '  </div>' +
      '</li>');
    var chk = li.querySelector('input');
    chk.addEventListener('change', function () {
      it.incluido = chk.checked;
      recordar();
      pintar();
      if (it.incluido) cargarTodo();
    });
    li.querySelector('.pp-sube').addEventListener('click', function () { mover(it, -1); });
    li.querySelector('.pp-baja').addEventListener('click', function () { mover(it, 1); });
    var g = li.querySelector('.pp-girar');
    if (g) g.addEventListener('click', function () {
      it.rot = (it.rot + 90) % 360;
      recordar();
      g.querySelector('.pp-girar__i').style.transform = 'rotate(' + it.rot + 'deg)';
      var im = li.querySelector('.pp-mini img');
      if (im) im.style.transform = 'rotate(' + it.rot + 'deg)';
      K.vibrar && K.vibrar(6);
    });
    var hz = li.querySelector('.pp-hz');
    if (hz) hz.addEventListener('click', function () {
      it.hz = !it.hz; it.doc = null; it.bytes = null; it.mini = null; it.estado = 'espera';
      recordar(); pintar(); cargarTodo();
    });
    li.querySelector('.pp-txt').addEventListener('click', function () { ver(it); });
    return li;
  }

  function estadoTxt(it) {
    switch (it.estado) {
      case 'bajando': return '<span class="pp-gira">' + K.icono('recargar', 12) + '</span> ' + (it.clase === 'word' || it.clase === 'excel' ? 'Pasando a PDF…' : 'Trayendo…');
      case 'listo': return K.icono('check', 12) + ' ' + (it.paginas ? it.paginas + (it.paginas === 1 ? ' página' : ' páginas') : 'Listo') + (it.kbReal ? ' · ' + tamano(it.kbReal) : '') +
        (it.protegido ? ' · protegido, va como imagen' : '');
      case 'clave': return '<span class="pp-malo">Tiene clave: ábrelo, quítasela y vuelve a subirlo.</span>';
      case 'error': return '<span class="pp-malo">' + K.esc(it.err || 'No se pudo traer.') + '</span> <button type="button" class="pp-reintentar">Reintentar</button>';
      default: return it.err ? '<span class="pp-malo">' + K.esc(it.err) + '</span>' : (it.incluido ? 'En espera' : (it.kb ? tamano(it.kb) : ''));
    }
  }

  function repintarFila(it) {
    if (!ST || !ST.ol) return;
    var li = ST.ol.querySelector('.pp-item[data-id="' + cssId(it.id) + '"]');
    if (!li) return;
    var e = li.querySelector('.pp-estado');
    if (e) e.innerHTML = estadoTxt(it);
    var r = li.querySelector('.pp-reintentar');
    if (r) r.addEventListener('click', function () { it.estado = 'espera'; it.err = ''; repintarFila(it); cargarTodo(); });
    if (it.estado === 'clave') { var c = li.querySelector('input'); if (c) { c.checked = false; c.disabled = true; } li.classList.add('pp-item--fuera'); }
    resumen();
  }
  function cssId(id) { return String(id).replace(/["\\]/g, '\\$&'); }

  function mover(it, paso) {
    var i = ST.items.indexOf(it), j = i + paso;
    if (j < 0 || j >= ST.items.length) return;
    ST.items.splice(i, 1);
    ST.items.splice(j, 0, it);
    recordar();
    pintar();
    var li = ST.ol.querySelector('.pp-item[data-id="' + cssId(it.id) + '"]');
    if (li) {
      li.classList.add('pp-item--movido');
      var b = li.querySelector(paso < 0 ? '.pp-sube' : '.pp-baja');
      if (b && !b.disabled) b.focus();
      setTimeout(function () { li.classList.remove('pp-item--movido'); }, 600);
    }
  }

  function tamano(kb) {
    kb = Number(kb) || 0;
    return kb >= 1024 ? (kb / 1024).toFixed(1).replace('.', ',') + ' MB' : kb + ' KB';
  }

  function resumen() {
    if (!ST) return;
    var dentro = ST.items.filter(function (i) { return i.incluido; });
    var listos = dentro.filter(function (i) { return i.estado === 'listo'; });
    var malos = dentro.filter(function (i) { return i.estado === 'error' || i.estado === 'clave'; });
    var pags = listos.reduce(function (s, i) { return s + (i.paginas || 0); }, 0);
    var kb = listos.reduce(function (s, i) { return s + (i.kbReal || i.kb || 0); }, 0);
    var r = ST.cab.querySelector('.pp-resumen');
    r.innerHTML =
      '<span><b>' + dentro.length + '</b> documentos</span>' +
      '<span><b>' + pags + '</b> páginas</span>' +
      '<span><b>' + tamano(kb) + '</b></span>' +
      (malos.length ? '<span class="pp-malo">' + malos.length + ' sin poder unir</span>' : '');
    var b = ST.pie.querySelector('.pp-bajar');
    var faltan = dentro.length - listos.length - malos.length;
    if (ST.bajando) return;
    b.disabled = !listos.length || faltan > 0;
    b.querySelector('span').textContent = faltan > 0
      ? 'Preparando ' + (listos.length + malos.length) + ' de ' + dentro.length + '…'
      : 'UNIFICAR Y DESCARGAR';
  }

  /* ══════════════ traer los bytes ══════════════ */

  function cargarLib() {
    if (window.PDFLib) return Promise.resolve(window.PDFLib);
    if (LIB) return LIB;
    LIB = new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = PDFLIB_URL; s.async = true; s.crossOrigin = 'anonymous';
      s.onload = function () { window.PDFLib ? res(window.PDFLib) : rej(new Error('No cargó la librería de PDF.')); };
      s.onerror = function () { LIB = null; rej(new Error('No se pudo cargar la librería de PDF. Revisa tu conexión.')); };
      document.head.appendChild(s);
    });
    return LIB;
  }

  /** Word y Excel: UN viaje al CORE para todos los que hagan falta (solo IDs). */
  function pdfsOficina() {
    if (ST.oficina) return ST.oficina;
    var ids = ST.items.filter(function (i) { return i.clase === 'word' || i.clase === 'excel'; }).map(function (i) { return i.id; });
    if (!ids.length) { ST.oficina = Promise.resolve({}); return ST.oficina; }
    var t0 = Date.now(), gen = ST.gen;
    ST.oficina = K.pedir('planPagosPdf', { informe: ST.informe, ids: ids.slice(0, 12) }, { ms: 120000, fondo: true })
      .then(function (r) {
        if (gen === GEN) MED.push({ paso: 'oficina', ms: Date.now() - t0, convertidos: r.convertidos || 0, servidor: r.ms || 0 });
        return (r && r.pdfs) || {};
      }, function (e) {
        if (gen === GEN) ST.oficina = null;
        throw e;
      });
    return ST.oficina;
  }

  function deCore(it) {
    return K.pedir('seguimientoDocumento', { informe: ST.informe, id: it.id }, { ms: 120000, fondo: true }).then(function (r) {
      var bin = atob(String(r.base64 || '')), b = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
      return { bytes: b, mime: r.mime || it.mime };
    });
  }

  function bytesDe(it) {
    if (it.clase === 'word' || it.clase === 'excel') {
      return pdfsOficina().then(function (m) {
        var p = m[it.id];
        if (!p) throw new Error('Todavía no está en PDF. Intenta en unos minutos.');
        var id = it.clase === 'excel' && it.hz ? (p.h || p.v) : p.v;
        return K.drive.bytes({ id: id, mime: 'application/pdf', nombre: it.nombre });
      });
    }
    var ref = { id: it.id, google: it.clase === 'google', mime: it.mime, nombre: it.nombre };
    if (!K.drive || !K.drive.listo()) return deCore(it);
    return K.drive.bytes(ref, it.nombre).then(null, function (e) {
      if (e && e.cortado) throw e;
      return deCore(it);   /* Drive no lo entregó (privado): por el CORE */
    });
  }

  var A_LA_VEZ = 3;
  function cargarTodo() {
    if (!ST) return;
    var st = ST, gen = ST.gen;
    ST.items.forEach(function (it) {
      if (it.incluido && it.estado === 'espera') it.estado = 'cola';
    });
    (function bombear() {
      if (gen !== GEN) return;
      while (st.vuelo < A_LA_VEZ) {
        var it = null;
        for (var i = 0; i < st.items.length; i++) { if (st.items[i].estado === 'cola' && st.items[i].incluido) { it = st.items[i]; break; } }
        if (!it) break;
        st.vuelo++;
        traer(it, gen).then(function () { st.vuelo--; bombear(); }, function () { st.vuelo--; bombear(); });
      }
    }());
    resumen();
  }

  function traer(it, gen) {
    var t0 = Date.now();
    it.estado = 'bajando';
    repintarFila(it);
    return Promise.all([bytesDe(it), cargarLib()]).then(function (a) {
      if (gen !== GEN) return;
      var x = a[0], L = a[1];
      it.kbReal = Math.round(x.bytes.length / 1024);
      var paso = it.clase === 'imagen'
        ? comoImagen(x.bytes, x.mime || it.mime).then(function (img) {
            it.img = img; it.paginas = 1; it.estado = 'listo';
          })
        : L.PDFDocument.load(x.bytes, { updateMetadata: false }).then(function (doc) {
            it.doc = doc; it.paginas = doc.getPageCount(); it.estado = 'listo';
          }, function (e) {
            if (!/encrypt/i.test(String(e && e.message))) throw new Error('El PDF está dañado y no se puede unir.');
            /* 26/10 · PROTEGIDO SIN CLAVE DE APERTURA (muchas certificaciones
               bancarias): se abre, pero no se puede copiar tal cual. Va como
               imagen de cada página. Si de verdad pide clave, queda fuera. */
            return rasterizar(x.bytes).then(function (r) {
              it.raster = r; it.paginas = r.length; it.protegido = true; it.estado = 'listo';
            }, function () { it.estado = 'clave'; it.incluido = false; });
          });
      /* 26/10 · la miniatura sale de fondo con los mismos bytes (sin otro viaje) */
      return paso.then(function () { if (it.estado === 'listo' && gen === GEN) encolarMini(it, x.bytes); });
    }).then(function () {
      if (gen !== GEN) return;
      MED.push({ paso: 'doc', id: it.id.slice(0, 6), clase: it.clase, kb: it.kbReal, ms: Date.now() - t0 });
      repintarFila(it);
    }, function (e) {
      if (gen !== GEN || (e && (e.cortado || e.codigo === 'CANCELADA'))) return;
      it.estado = 'error'; it.err = (e && e.message) || 'No se pudo traer.';
      repintarFila(it);
    });
  }


  /** JPG/PNG tal cual; lo demás (WEBP, GIF, HEIC si el teléfono lo abre) se pasa a JPG. */
  function comoImagen(bytes, mime) {
    var m = String(mime || '').toLowerCase();
    if (m === 'image/jpeg' || m === 'image/jpg') return Promise.resolve({ tipo: 'jpg', bytes: bytes });
    if (m === 'image/png') return Promise.resolve({ tipo: 'png', bytes: bytes });
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(new Blob([bytes], { type: m || 'image/*' }));
      var im = new Image();
      im.onload = function () {
        var c = document.createElement('canvas');
        c.width = im.naturalWidth; c.height = im.naturalHeight;
        c.getContext('2d').drawImage(im, 0, 0);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) {
          if (!b) { rej(new Error('Esta imagen no se puede unir.')); return; }
          b.arrayBuffer().then(function (ab) { res({ tipo: 'jpg', bytes: new Uint8Array(ab) }); }, rej);
        }, 'image/jpeg', 0.9);
      };
      im.onerror = function () { URL.revokeObjectURL(url); rej(new Error('Este teléfono no puede abrir esa imagen.')); };
      im.src = url;
    });
  }

  /* ══════════════ miniaturas (26/10: ver cómo va a quedar al girar) ══════════════ */

  /* La primera página en pequeño. Se arma de fondo, de a 2, cuando el
     documento ya llegó (los bytes ya están en memoria: no hay viaje). Al
     girar, la miniatura gira igual que va a quedar en el PDF unido. */
  function miniHtml(it) {
    if (!it.mini) return K.icono(icono(it), 20);
    return '<img src="' + it.mini + '" alt="" style="transform:rotate(' + it.rot + 'deg)">' +
      '<i class="pp-mini__t">' + K.icono(icono(it), 10) + '</i>';
  }

  var MINI = { cola: [], vuelo: 0, err: [] };
  function encolarMini(it, bytes) {
    if (it.mini) return;
    MINI.cola.push({ it: it, bytes: bytes, gen: GEN });
    bombearMini();
  }
  function bombearMini() {
    while (MINI.vuelo < 2 && MINI.cola.length) {
      var p = MINI.cola.shift();
      if (p.gen !== GEN) continue;
      MINI.vuelo++;
      hacerMini(p.it, p.bytes).then(function (r) { return r; }, function (e) { MINI.err.push(p.it.nombre + ': ' + ((e && e.message) || e)); return null; }).then((function (p) {
        return function (url) {
          MINI.vuelo--;
          if (url && p.gen === GEN) {
            p.it.mini = url;
            var li = ST && ST.ol ? ST.ol.querySelector('.pp-item[data-id="' + cssId(p.it.id) + '"] .pp-mini') : null;
            if (li) li.innerHTML = miniHtml(p.it);
          }
          bombearMini();
        };
      })(p));
    }
  }
  var MINI_ALTO = 140;
  function lienzo(w, h) {
    var c = document.createElement('canvas');
    var esc = MINI_ALTO / Math.max(w, h);
    c.width = Math.max(1, Math.round(w * esc)); c.height = Math.max(1, Math.round(h * esc));
    return c;
  }
  function hacerMini(it, bytes) {
    if (it.clase === 'imagen') {
      var b = it.img ? it.img.bytes : bytes;
      return new Promise(function (res, rej) {
        var url = URL.createObjectURL(new Blob([b], { type: it.img && it.img.tipo === 'png' ? 'image/png' : 'image/jpeg' }));
        var im = new Image();
        im.onload = function () {
          var c = lienzo(im.naturalWidth, im.naturalHeight);
          c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
          URL.revokeObjectURL(url);
          res(c.toDataURL('image/jpeg', 0.78));
        };
        im.onerror = function () { URL.revokeObjectURL(url); rej(new Error('mini')); };
        im.src = url;
      });
    }
    var visor = K.piezas.visor;
    if (!visor || !visor.precalentar) return Promise.reject(new Error('sin pdf.js'));
    return visor.precalentar().then(function (lib) {
      if (!lib) throw new Error('sin pdf.js');
      return lib.getDocument({ data: bytes.slice(0) }).promise.then(function (pdf) {
        return pdf.getPage(1).then(function (pg) {
          var v1 = pg.getViewport({ scale: 1 });
          var c = lienzo(v1.width, v1.height);
          var vp = pg.getViewport({ scale: c.width / v1.width });
          var ctx = c.getContext('2d');
          ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
          return pg.render({ canvasContext: ctx, viewport: vp }).promise.then(function () {
            var u = c.toDataURL('image/jpeg', 0.78);
            /* cleanup, no destroy: el trabajador de pdf.js es uno solo para
               toda la app (visor incluido) y destroy lo deja inservible */
            try { pdf.cleanup(); } catch (e) {}
            return u;
          });
        });
      });
    });
  }

  /** PDF protegido sin clave de apertura → cada página como JPG (~150 ppp). */
  function rasterizar(bytes) {
    var visor = K.piezas.visor;
    if (!visor || !visor.precalentar) return Promise.reject(new Error('sin pdf.js'));
    return visor.precalentar().then(function (lib) {
      if (!lib) throw new Error('sin pdf.js');
      return lib.getDocument({ data: bytes.slice(0), password: '' }).promise.then(function (pdf) {
        var out = [], n = pdf.numPages;
        function una(i) {
          if (i > n) { try { pdf.cleanup(); } catch (e) {} return out; }
          return pdf.getPage(i).then(function (pg) {
            var v1 = pg.getViewport({ scale: 1 });
            var esc = Math.min(2.2, 1700 / Math.max(v1.width, v1.height));
            var vp = pg.getViewport({ scale: esc });
            var c = document.createElement('canvas');
            c.width = Math.round(vp.width); c.height = Math.round(vp.height);
            var ctx = c.getContext('2d');
            ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
            return pg.render({ canvasContext: ctx, viewport: vp }).promise.then(function () {
              return new Promise(function (res, rej) {
                c.toBlob(function (b) { b ? b.arrayBuffer().then(res, rej) : rej(new Error('jpg')); }, 'image/jpeg', 0.86);
              });
            }).then(function (ab) {
              out.push({ bytes: new Uint8Array(ab), w: v1.width, h: v1.height });
              return una(i + 1);
            });
          });
        }
        return una(1);
      });
    });
  }

  /* ══════════════ ver uno ══════════════ */

  /* 26/10 · se ve TAL CUAL va a quedar en el PDF unido (con el giro y, el
     Excel, en la orientación escogida). */
  function ver(it) {
    if (!K.piezas.visor) return;
    var titulo = it.ent ? it.ent.t : sinExt(it.nombre);
    K.piezas.visor.abrir([{
      titulo: titulo + (it.rot ? ' · girado ' + it.rot + '°' : ''), tipo: 'pdf',
      cargar: function () {
        var listo = it.estado === 'listo' ? Promise.resolve() : traer(it, GEN);
        return listo.then(cargarLib).then(function (L) {
          if (it.estado !== 'listo') throw new Error(it.err || 'Este documento todavía no se pudo traer.');
          return L.PDFDocument.create().then(function (out) {
            return pegar(L, out, it).then(function () { return out.save(); });
          });
        }).then(function (b) { return { bytes: b, mime: 'application/pdf', nombre: sinExt(it.nombre) + '.pdf' }; });
      }
    }], { indice: 0 });
  }

  /* ══════════════ unir y descargar ══════════════ */

  function unificar() {
    if (!ST || ST.bajando) return Promise.resolve();
    var dentro = ST.items.filter(function (i) { return i.incluido && i.estado === 'listo'; });
    if (!dentro.length) return Promise.resolve();
    var gen = ST.gen, t0 = Date.now();
    var b = ST.pie.querySelector('.pp-bajar');
    ST.bajando = true;
    b.disabled = true;
    b.classList.add('pp-bajar--ocupado');
    var txt = b.querySelector('span');
    return cargarLib().then(function (L) {
      return L.PDFDocument.create().then(function (out) {
        var k = 0;
        function paso() {
          if (gen !== GEN) throw Object.assign(new Error('cortado'), { cortado: true });
          if (k >= dentro.length) return out;
          var it = dentro[k++];
          txt.textContent = 'Uniendo ' + k + ' de ' + dentro.length + '…';
          return pegar(L, out, it).then(function () { return new Promise(function (r) { setTimeout(r, 0); }); }).then(paso);
        }
        return paso();
      }).then(function (out) {
        txt.textContent = 'Guardando el PDF…';
        out.setTitle(nombreFinal().replace(/\.pdf$/, ''));
        out.setProducer('FLANDES-CORE · Contratista');
        return out.save({ useObjectStreams: true });
      });
    }).then(function (bytes) {
      var nombre = nombreFinal();
      var url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
      var a = document.createElement('a');
      a.href = url; a.download = nombre;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
      MED.push({ paso: 'union', ms: Date.now() - t0, docs: dentro.length, kb: Math.round(bytes.length / 1024) });
      K.aviso('Listo: ' + nombre + ' (' + tamano(Math.round(bytes.length / 1024)) + ').', 'ok', 5000);
    })['catch'](function (e) {
      if (e && e.cortado) return;
      K.aviso((e && e.message) || 'No se pudo armar el PDF.', 'malo', 6000);
    }).then(function () {
      if (gen !== GEN) return;
      ST.bajando = false;
      b.classList.remove('pp-bajar--ocupado');
      resumen();
    });
  }

  function pegar(L, out, it) {
    if (it.raster) {
      return it.raster.reduce(function (p, r) {
        return p.then(function () {
          return out.embedJpg(r.bytes).then(function (img) {
            var pg = out.addPage([r.w, r.h]);
            pg.drawImage(img, { x: 0, y: 0, width: r.w, height: r.h });
            if (it.rot) pg.setRotation(L.degrees(it.rot));
          });
        });
      }, Promise.resolve());
    }
    if (it.clase === 'imagen') {
      var emb = it.img.tipo === 'png' ? out.embedPng(it.img.bytes) : out.embedJpg(it.img.bytes);
      return emb.then(function (img) {
        var ancho = img.width >= img.height;
        var W = ancho ? CARTA[1] : CARTA[0], H = ancho ? CARTA[0] : CARTA[1];
        var esc = Math.min((W - 2 * MARGEN) / img.width, (H - 2 * MARGEN) / img.height, 1);
        var w = img.width * esc, h = img.height * esc;
        var pg = out.addPage([W, H]);
        pg.drawImage(img, { x: (W - w) / 2, y: (H - h) / 2, width: w, height: h });
        if (it.rot) pg.setRotation(L.degrees(it.rot));
      });
    }
    return out.copyPages(it.doc, it.doc.getPageIndices()).then(function (pags) {
      pags.forEach(function (p) {
        if (it.rot) p.setRotation(L.degrees(((p.getRotation().angle || 0) + it.rot) % 360));
        out.addPage(p);
      });
    });
  }

  /* al salir de la vista: se corta lo que se estaba bajando de Drive */
  window.addEventListener('hashchange', function () {
    if (!ST) return;
    var v = String(location.hash || '').replace(/^#\/?/, '').split('/')[0];
    if (v === 'unificar') return;
    GEN++;
    if (!ST.bajando && K.drive && K.drive.cortar) K.drive.cortar();
    ST = null;
  });

  window.PLANPAGOS = {
    abrir: abrir,
    /** ¿se ofrece el botón en esta cuenta? */
    aplica: function (estado) { return ESTADOS.indexOf(String(estado || '').toUpperCase()) >= 0; },
    medidas: function () { return MED.slice(); },
    _miniErr: function () { return MINI.err.slice(); },
    /* para el banco de pruebas */
    _armar: armar, _entradaDe: entradaDe, _norm: norm, _fabrica: FABRICA, _estado: function () { return ST; }
  };
}());
