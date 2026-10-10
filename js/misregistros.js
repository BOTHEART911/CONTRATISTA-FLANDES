/* ============================================================
   CONTRATISTA-FLANDES · MIS REGISTROS (06/10/2026)
   "¿Dónde descargo lo que hice?" — para el contratista, lo que hace son
   sus CUENTAS: cada una con su periodo, lo cobrado, su estado, la orden
   de pago y el egreso.

   Es el mismo "Informe de cuentas" que ven Supervisión, Contabilidad y
   Tesorería (pieza kit/informe-cuentas.js), solo de SU contrato:
     · PDF por bloques (con o sin las actividades de cada obligación).
     · Excel con una fila por cuenta (las mismas columnas de las oficinas).

   Rendimiento: UN viaje ('misRegistros') por sesión. Si ya se vio, pinta
   YA lo último (memoria local) y lo pone al día de fondo.
   ============================================================ */
(function () {
  'use strict';

  var K = window.KIT;
  var C = {};
  var MEMO_K = 'misregistros.contratista.v1';
  var DATOS = null, CARGANDO = null, MEDIDAS = [];

  function fecha(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; }

  function cargar(fresco) {
    if (DATOS && !fresco) return Promise.resolve(DATOS);
    if (CARGANDO) return CARGANDO;
    CARGANDO = K.pedir('misRegistros', {}, { ms: 60000, fondo: true }).then(function (d) {
      CARGANDO = null; DATOS = d;
      try { K.guardar.escribir(MEMO_K, { d: d, t: Date.now() }); } catch (e) { /* sin espacio: no pasa nada */ }
      return d;
    }, function (e) { CARGANDO = null; throw e; });
    return CARGANDO;
  }

  function vista() {
    var caja = K.nodo('<div class="kit-ancho vista mrc"></div>');
    if (K.piezas.exportar && K.piezas.exportar.prepararGerencial) K.piezas.exportar.prepararGerencial();   /* 10/10 · informe gerencial listo antes del toque */
    C.app.appendChild(caja);
    var t0 = Date.now();
    var memo = null;
    if (!DATOS) { try { memo = K.guardar.leer(MEMO_K, null); } catch (e) { memo = null; } }
    if (memo && memo.d && memo.d.contrato) { pintar(caja, memo.d, new Date(memo.t)); MEDIDAS.push({ que: 'pinta (memoria local)', ms: Date.now() - t0 }); }
    else if (DATOS) { pintar(caja, DATOS, null); }
    var trae = cargar(!!memo || !DATOS);
    var espera = (memo || DATOS) ? trae : K.piezas.esqueletos.mientras(caja, trae, { forma: 'texto', cuantos: 6, espera: 'Trayendo tus cuentas' });
    espera.then(function (d) {
      MEDIDAS.push({ que: memo ? 'al día de fondo' : 'vista con datos', ms: Date.now() - t0 });
      if (caja.isConnected) { var y = window.scrollY; pintar(caja, d, new Date()); window.scrollTo(0, y); }
    })['catch'](function (e) {
      if (memo || DATOS) return;
      caja.appendChild(K.nodo('<section class="kit-tarjeta mrc-error"><p>' + K.esc((e && e.message) || 'No se pudieron traer tus cuentas.') + '</p></section>'));
    });
  }

  function pintar(caja, d, hora) {
    caja.innerHTML = '';
    var IC = K.piezas.informeCuentas;
    var c = d.contrato || {}, cuentas = d.cuentas || [], k = IC.cifras(d);

    caja.appendChild(K.nodo('<section class="kit-tarjeta mrc-cab">' +
      '<span class="mrc-cab__ico">' + K.icono('descargar', 22) + '</span>' +
      '<div><h2>MIS REGISTROS</h2><p>Todas tus cuentas del contrato ' + K.esc(c.contrato || '') + ': periodo, lo cobrado, el estado, la orden de pago y el egreso. ' +
      'Descárgalas en PDF o en Excel.</p></div></section>'));

    caja.appendChild(K.nodo('<section class="kit-tarjeta mrc-cifras">' +
      '<div><b>' + K.esc(K.pesos(k.valor)) + '</b><span>Valor del contrato</span></div>' +
      '<div><b>' + K.esc(K.pesos(k.cobrado)) + '</b><span>Cobrado · ' + k.cuentas + (k.total ? ' de ' + k.total : '') + ' cuentas</span></div>' +
      '<div class="mrc-ok"><b>' + K.esc(K.pesos(k.pagado)) + '</b><span>Pagado · ' + k.pagadas + '</span></div>' +
      '<div><b>' + K.esc(K.pesos(k.saldo)) + '</b><span>Saldo por ejecutar</span></div></section>'));

    var baj = K.nodo('<section class="kit-tarjeta mrc-bajar"><h3>Descargar mis cuentas</h3>' +
      '<label class="mrc-act"><input type="checkbox"> <span>Incluir en el PDF las actividades de cada obligación</span></label>' +
      '<div class="mrc-bajar__b">' +
      '<button type="button" class="kit-btn kit-btn--marca" data-f="pdf">' + K.icono('pdf', 16) + ' Descargar PDF</button>' +
      '<button type="button" class="kit-btn kit-btn--plano" data-f="xlsx">' + K.icono('hoja', 16) + ' Descargar Excel</button></div>' +
      '<p class="mrc-nota">El PDF es un informe para leer, una cuenta por bloque. El Excel trae una fila por cuenta. El archivo baja con tu nombre, tu contrato y la fecha.' +
      (hora ? ' Al día a las ' + K.esc(hora.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })) + '.' : '') + '</p></section>');
    var chk = baj.querySelector('input');
    baj.querySelectorAll('button').forEach(function (b) {
      b.disabled = !cuentas.length;
      b.addEventListener('click', function () {
        if (b.disabled) return;
        b.disabled = true; b.classList.add('kit-ocupado');
        var p = b.getAttribute('data-f') === 'pdf' ? IC.aPDF(d, { actividades: chk.checked }) : IC.aExcel(d);
        Promise.resolve(p).then(function (r) {
          K.aviso(r === 'csv' ? 'No cargó Excel: se descargó en CSV (Excel lo abre).' : (r === 'impresion' ? 'Guárdalo como PDF desde la ventana de impresión.' : 'Descargado.'), 'ok', 3500);
        }, function (e) { K.aviso((e && e.message) || 'No se pudo descargar.', 'malo', 6000); })
          .then(function () { b.disabled = false; b.classList.remove('kit-ocupado'); });
      });
    });
    caja.appendChild(baj);

    /* 10/10 · INFORME GERENCIAL: portada, indicadores y gráficas de sus
       cuentas en el rango que escoja (por fecha de radicación). Sale de lo
       que ya está en el teléfono; la pieza se baja al tocar el botón. */
    var ger = K.nodo('<section class="kit-tarjeta mrc-bajar mrc-ger"><h3>Informe gerencial</h3>' +
      '<p class="mrc-nota">Un PDF con portada, indicadores y gráficas de tus cuentas: lo cobrado, lo pagado, el saldo y los tiempos de trámite. Escoge el rango (por fecha de radicación); vacío es todo el contrato.</p>' +
      '<div class="rp-fechas">' +
      '<label><span>Desde</span><input type="date" data-kit-fecha data-desde="2025" data-titulo="Desde"></label>' +
      '<label><span>Hasta</span><input type="date" data-kit-fecha data-desde="2025" data-titulo="Hasta"></label></div>' +
      '<div class="mrc-bajar__b"><button type="button" class="kit-btn kit-btn--marca" data-f="gerencial">' + K.icono('grafica', 16) + ' Descargar informe gerencial</button></div></section>');
    var gD = ger.querySelectorAll('input')[0], gH = ger.querySelectorAll('input')[1], gB = ger.querySelector('button');
    gD.value = RANGO.desde; gH.value = RANGO.hasta;
    if (K.piezas.fechas) K.piezas.fechas.montar(ger.querySelector('.rp-fechas'));
    function alCambiarRango() {
      RANGO.desde = gD.value || ''; RANGO.hasta = gH.value || '';
      if (RANGO.desde && RANGO.hasta && RANGO.desde > RANGO.hasta) { var t = RANGO.desde; RANGO.desde = RANGO.hasta; RANGO.hasta = t; gD.value = RANGO.desde; gH.value = RANGO.hasta; }
      gB.disabled = !specGerencial(d).registros.length;
    }
    gD.addEventListener('change', alCambiarRango); gH.addEventListener('change', alCambiarRango);
    gB.disabled = !specGerencial(d).registros.length;
    gB.addEventListener('click', function () {
      if (gB.disabled) return;
      var ex = K.piezas.exportar;
      if (!ex || !ex.aGerencial) { K.aviso('El informe gerencial no está disponible en esta versión. Recarga la app.', 'aviso', 5000); return; }
      var sp = specGerencial(d);
      if (!sp.registros.length) { K.aviso('No hay cuentas radicadas en ese rango.', 'aviso', 4000); return; }
      gB.disabled = true; gB.classList.add('kit-ocupado');
      var t0 = Date.now();
      ex.aGerencial(sp).then(function (r) {
        MEDIDAS.push({ que: 'informe gerencial', ms: Date.now() - t0, carga: r.msCarga, dibujo: r.msDibujo, paginas: r.paginas });
        K.aviso('Informe gerencial descargado (' + r.paginas + ' páginas).', 'ok', 3500);
      }, function (e) { K.aviso((e && e.message) || 'No se pudo armar el informe.', 'malo', 6000); })
        .then(function () { gB.disabled = false; gB.classList.remove('kit-ocupado'); });
    });
    caja.appendChild(ger);

    var lista = K.nodo('<section class="kit-tarjeta mrc-lista"><h3>Mis cuentas (' + cuentas.length + ')</h3></section>');
    if (!cuentas.length) lista.appendChild(K.nodo('<p class="mrc-nota">Todavía no tienes cuentas en este contrato.</p>'));
    cuentas.slice().reverse().forEach(function (x) {
      var t = IC.tono(x.estado);
      var f = K.nodo('<article class="mrc-fila mrc-fila--' + (t || 'info') + '"></article>');
      f.appendChild(K.nodo('<div class="mrc-fila__n"><b>' + x.informe + '</b><small>de ' + (x.total || '?') + '</small></div>'));
      var cc = K.nodo('<div class="mrc-fila__c"></div>');
      cc.appendChild(K.nodo('<p class="mrc-fila__t">' + K.esc(K.pesos(x.cobro)) + (x.desde ? ' <small>· ' + K.esc(fecha(x.desde)) + ' al ' + K.esc(fecha(x.hasta)) + '</small>' : '') + '</p>'));
      var pago = [];
      if (x.radicada) pago.push('Radicada ' + fecha(x.radicada));
      if (x.orden) pago.push('Orden ' + x.orden + (x.fechaOrden ? ' (' + fecha(x.fechaOrden) + ')' : ''));
      if (x.egreso) pago.push('Egreso ' + x.egreso + (x.fechaEgreso ? ' (' + fecha(x.fechaEgreso) + ')' : ''));
      if (pago.length) cc.appendChild(K.nodo('<p class="mrc-fila__d">' + K.esc(pago.join(' · ')) + '</p>'));
      f.appendChild(cc);
      f.appendChild(K.nodo('<span class="kit-pastilla mrc-fila__e">' + K.esc(x.estado || '') + '</span>'));
      lista.appendChild(f);
    });
    caja.appendChild(lista);
    if (K.piezas.creditos) K.piezas.creditos.montar(caja);
  }

  /* ══════════════ 10/10 · INFORME GERENCIAL ══════════════ */
  var RANGO = { desde: '', hasta: '' };
  function fechaCuenta(x) { return String(x.radicada || x.desde || '').slice(0, 10); }
  function dias(a, b) {
    var x = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(a || '')), y = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(b || ''));
    if (!x || !y) return null;
    var n = Math.round((Date.UTC(+y[1], y[2] - 1, +y[3]) - Date.UTC(+x[1], x[2] - 1, +x[3])) / 864e5);
    return n >= 0 ? n : null;
  }
  function promedio(l) { l = l.filter(function (v) { return v !== null; }); return l.length ? Math.round(l.reduce(function (s, v) { return s + v; }, 0) / l.length * 10) / 10 : null; }
  function specGerencial(d) {
    var IC = K.piezas.informeCuentas, c = d.contrato || {}, k = IC.cifras(d);
    var cuentas = (d.cuentas || []).filter(function (x) {
      var f = fechaCuenta(x);
      return K.norm(x.estado) !== 'BORRADOR' && f && (!RANGO.desde || f >= RANGO.desde) && (!RANGO.hasta || f <= RANGO.hasta);
    });
    var nombre = K.piezas.personas ? K.piezas.personas.nombrePropio(c.nombre) : String(c.nombre || '');
    var rango = (RANGO.desde ? fecha(RANGO.desde).replace(/\//g, '-') : '') + (RANGO.hasta && RANGO.hasta !== RANGO.desde ? ' a ' + fecha(RANGO.hasta).replace(/\//g, '-') : '');
    var cobr = 0, pag = 0;
    cuentas.forEach(function (x) { cobr += Number(x.cobro) || 0; if (K.norm(x.estado) === 'PAGADA') pag += Number(x.cobro) || 0; });
    var tOrden = promedio(cuentas.map(function (x) { return dias(x.radicada, x.fechaOrden); }));
    var tPago = promedio(cuentas.map(function (x) { return dias(x.radicada, x.fechaEgreso); }));
    var devueltas = cuentas.filter(function (x) { return IC.tono(x.estado) === 'malo'; }).length;
    return {
      app: (window.MARCA && window.MARCA.TITULO) || 'Contratista', persona: nombre || 'Sin nombre', rol: 'Contratista · contrato ' + (c.contrato || ''),
      desde: RANGO.desde, hasta: RANGO.hasta,
      nombre: ['Informe gerencial', nombre, 'contrato ' + (c.contrato || ''), rango].filter(Boolean).join(' '),
      palabra: ['cuenta', 'cuentas'],
      etiquetas: { tipo: 'Estado de la cuenta', monto: 'Valor cobrado' },
      tonos: { ok: 'Pagadas', malo: 'Devueltas o incompletas', info: 'En trámite de pago', aviso: 'En revisión' },
      kpis: [
        { etiqueta: 'Cuentas radicadas', valor: K.numero(cuentas.length), nota: 'de ' + (k.total || '?') + ' del contrato' },
        { etiqueta: 'Valor cobrado', valor: K.pesos(cobr), nota: 'en el rango', tono: 'info' },
        { etiqueta: 'Valor pagado', valor: K.pesos(pag), nota: cobr ? Math.round(pag * 100 / cobr) + ' % de lo cobrado' : '', tono: 'ok' },
        { etiqueta: 'Ejecución del contrato', valor: k.avance + ' %', nota: K.pesos(k.cobrado) + ' de ' + K.pesos(k.valor) },
        { etiqueta: 'Saldo por ejecutar', valor: K.pesos(k.saldo), nota: 'a la última cuenta', tono: 'aviso' },
        { etiqueta: 'Devueltas o incompletas', valor: K.numero(devueltas), nota: devueltas ? 'revisar las observaciones' : 'ninguna en el rango', tono: devueltas ? 'malo' : 'ok' }
      ],
      registros: cuentas.map(function (x) {
        return { fecha: fechaCuenta(x), tipo: x.estado || 'SIN ESTADO', tono: IC.tono(x.estado) || 'info', categoria: '', sujeto: '',
                 monto: Number(x.cobro) || 0, ref: 'Cuenta ' + x.informe + (x.total ? ' de ' + x.total : '') + (x.desde ? ' · ' + fecha(x.desde) + ' al ' + fecha(x.hasta) : '') };
      }),
      hallazgos: [
        tOrden !== null ? 'En promedio pasaron ' + String(tOrden).replace('.', ',') + ' días entre la radicación y la orden de pago.' : '',
        tPago !== null ? 'En promedio pasaron ' + String(tPago).replace('.', ',') + ' días entre la radicación y el egreso (pago).' : ''
      ].filter(Boolean),
      secciones: [{
        titulo: 'Ejecución financiera del contrato',
        intro: 'Contrato ' + (c.contrato || '') + (c.secretaria ? ' · ' + c.secretaria : '') + '. Valor final ' + K.pesos(k.valor) + '. Lo cobrado, lo pagado y lo que queda por ejecutar.',
        graficas: [
          { titulo: 'Composición del valor del contrato', tipo: 'proporcion', formato: 'pesos',
            datos: [{ etiqueta: 'Pagado', valor: k.pagado, tono: 'ok' }, { etiqueta: 'En trámite', valor: k.enTramite, tono: 'info' }, { etiqueta: 'Saldo por ejecutar', valor: Math.max(k.saldo, 0), tono: 'aviso' }] },
          { titulo: 'Valor cobrado por cuenta', tipo: 'barras', formato: 'pesos',
            datos: cuentas.slice().sort(function (a, b) { return a.informe - b.informe; }).map(function (x) { return { etiqueta: 'C' + x.informe, valor: Number(x.cobro) || 0 }; }) }
        ],
        tabla: {
          titulo: 'Trazabilidad de cada cuenta', nota: 'días desde la radicación',
          cols: [{ titulo: 'Cuenta', ancho: 16 }, { titulo: 'Radicada', ancho: 22 }, { titulo: 'Cobro', ancho: 30, derecha: true }, { titulo: 'Estado' },
                 { titulo: 'Orden', ancho: 26 }, { titulo: 'Egreso', ancho: 26 }, { titulo: 'Días', ancho: 14, derecha: true }],
          filas: cuentas.slice().sort(function (a, b) { return a.informe - b.informe; }).map(function (x) {
            var f = [String(x.informe) + (x.total ? '/' + x.total : ''), fecha(x.radicada), K.pesos(x.cobro), x.estado || '',
                     x.orden ? 'N° ' + x.orden : '', x.egreso ? 'N° ' + x.egreso : '', String(dias(x.radicada, x.fechaEgreso || x.fechaOrden) === null ? '' : dias(x.radicada, x.fechaEgreso || x.fechaOrden))];
            return f;
          })
        }
      }]
    };
  }

  window.MISREGISTROS = {
    configurar: function (c) { C = c || {}; },
    vista: vista,
    cargar: cargar,
    olvidar: function () { DATOS = null; CARGANDO = null; try { K.guardar.borrar(MEMO_K); } catch (e) {} },
    _datos: function () { return DATOS; },
    _medidas: function () { return MEDIDAS.slice(); },
    _gerencial: function () { return DATOS ? specGerencial(DATOS) : null; },
    _rango: RANGO
  };
}());
