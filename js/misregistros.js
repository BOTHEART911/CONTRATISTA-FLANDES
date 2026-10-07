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

  window.MISREGISTROS = {
    configurar: function (c) { C = c || {}; },
    vista: vista,
    cargar: cargar,
    olvidar: function () { DATOS = null; CARGANDO = null; try { K.guardar.borrar(MEMO_K); } catch (e) {} },
    _datos: function () { return DATOS; },
    _medidas: function () { return MEDIDAS.slice(); }
  };
}());
