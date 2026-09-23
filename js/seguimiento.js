/* ============================================================
   CONTRATISTA-FLANDES · ESTADO DE CUENTA (seguimiento)
   Ecosistema Flandes · Fase 4, entrega 4.7

   Lo que en la app vieja eran SEIS botones sueltos del menú y
   ninguno era una vista:

     ESTADO DE CUENTA ........ un cuadro de texto que se cerraba solo
     PLAN DE PAGOS ........... mandaba un WhatsApp; no enseñaba nada
     REPORTAR CUENTA ......... mandaba un WhatsApp; no enseñaba nada
     MI CUENTA DRIVE ......... abría Drive en otra pestaña, y solo si el
                               teléfono tenía la cuenta de Google con el
                               correo exacto
     RECIBIR EGRESOS ......... te los mandaba al teléfono por WhatsApp
     CERTIFICACIÓN CONTRATO .. bajaba un PDF a ciegas

   Aquí es UNA vista, de arriba abajo:
     1. el contrato: cuánto vale, cuánto te han pagado y cuánto falta;
     2. tu cuenta: la línea de tiempo INGRESADA → APROBADA → ORDEN DE PAGO →
        EGRESO → PAGADA con la fecha de cada paso, lo que te toca hacer
        (reportar la cuenta, reportar el plan de pagos, corregir) y los
        documentos de su carpeta, vistos y descargados DENTRO de la app;
     3. el plan de pagos del contrato como tabla;
     4. los egresos registrados, que se descargan en PDF o Excel;
     5. la certificación del contrato, que se abre en el visor.

   Por qué dos llamadas y no una (medido el 22/09, no supuesto)
     Todo junto eran 4 a 5 s de servidor más 2 a 3 de viaje. Se piden
     A LA VEZ: 'seguimiento' (lo de CUENTAS, pinta la vista entera) y
     'seguimientoHistoria' (lo de las bitácoras: quién aprobó, las
     devoluciones con su motivo, el neto pagado), que llega después y
     completa. Y además se piden por detrás en cuanto se pinta el
     inicio: al tocar la tarjeta, normalmente ya están.

   Pareja de estilos: la sección "seguimiento" de styles.css
   ============================================================ */
(function () {
  'use strict';

  var K = window.KIT;
  var app = K.id('app');

  var S = null;            /* lo que respondió 'seguimiento', ya mezclado */
  var SEL = 0;             /* el informe que se está mirando */
  var CAJA = null;         /* la vista pintada */
  var CACHE = null;        /* {en, seg, hist} las dos promesas en vuelo */
  var FRESCO_MS = 60000;   /* lo precargado vale un minuto */
  var DOCS = {};           /* informe -> lista de documentos de su carpeta */
  var CERT = null;         /* la última certificación generada */
  var ULTIMO = null;       /* 4.9: lo último que llegó, aunque la vista no se haya abierto */

  /* ══════════════ las dos llamadas ══════════════ */

  function pedirTodo(forzar) {
    var ahora = Date.now();
    if (!forzar && CACHE && (ahora - CACHE.en) < FRESCO_MS) return CACHE;
    var c = { en: ahora };
    c.seg = K.pedir('seguimiento', { historia: false }, { ms: 90000 });
    c.hist = K.pedir('seguimientoHistoria', {}, { ms: 90000 })['catch'](function () { return null; });
    /* 4.9 · lo precargado también le sirve a la ayuda del inicio (quién
       aprobó, qué toca ahora) sin haber entrado a esta vista */
    c.seg.then(function (d) {
      ULTIMO = d;
      c.hist.then(function (h) { if (ULTIMO === d) mezclar(h, d); });
    }, function () {});
    /* si la principal falla, no se guarda: la próxima vez se vuelve a pedir */
    c.seg['catch'](function () { if (CACHE === c) CACHE = null; });
    CACHE = c;
    return c;
  }

  function precargar() {
    try { pedirTodo(false); } catch (e) {}
  }

  /* ══════════════ textos (con sus tildes: los del CORE van sin ellas) ══════════════ */

  /* 4.9.2: el estado PRE-ORDEN no existe (se suprimió hace tiempo). El paso
     3 es la ORDEN DE PAGO. Va aquí de nuevo porque la 4.9.2 no llegó a
     subirse al repo: esta entrega la reemplaza. */
  var HITOS = ['Ingresada', 'Aprobada', 'Orden de pago', 'Egreso', 'Pagada'];

  function pesos(v) { return '$ ' + K.pesos(v || 0).replace(/^\$\s*/, ''); }

  function detalle(c) {
    var n = c.informe;
    var cta = 'Tu cuenta ' + n + (c.valor ? ' por ' + pesos(c.valor) : '');
    switch (c.estado) {
      case 'BORRADOR': return ['Borrador', 'Tu cuenta ' + n + ' está en borrador. Termínala en Ingresar cuenta y después repórtala a tu supervisor(a).'];
      case 'EN PROCESO': return ['A medio ingresar', 'Tu cuenta ' + n + ' quedó a medias. Vuelve a Ingresar cuenta para terminarla.'];
      case 'INGRESADA': return ['Ingresada', cta + ' está ingresada. Revisa tus documentos y repórtala para que la vea tu supervisor(a).'];
      case 'INCOMPLETA': return ['Incompleta', cta + ' quedó incompleta. Adjunta solo los documentos que te pidieron en Corregir cuenta y vuelve a reportarla.'];
      case 'REPORTADA': return ['Reportada', 'Ya reportaste la cuenta ' + n + '. Ahora la revisa tu supervisor(a).'];
      case 'REVISADA POR SUPERVISOR': return ['Revisada por tu supervisor(a)', 'Tu supervisor(a) ya revisó la cuenta ' + n + '. Está a la espera de la aprobación de la oficina de Contratación.'];
      case 'DEVUELTA': return ['Devuelta', cta + ' fue devuelta. Corrígela en Corregir cuenta y vuelve a reportarla.'];
      case 'APROBADA': return ['Aprobada', cta + ' fue aprobada por la oficina de Contratación. Descarga tus documentos, unifícalos, súbelos al Plan de pagos del SECOP II y después reporta el plan de pagos.'];
      case 'PLAN DE PAGOS': return ['Plan de pagos reportado', 'Reportaste el plan de pagos de la cuenta ' + n + '. Falta que tu supervisor(a) lo acepte en el SECOP II.'];
      case 'CERRADA': return ['Plan de pagos aceptado', 'Tu supervisor(a) aceptó el plan de pagos de la cuenta ' + n + '. Falta la orden de pago de la oficina de Contabilidad.'];
      case 'ORDEN DE PAGO': return ['Orden de pago emitida', 'La orden de pago' + (c.orden ? ' N° ' + c.orden : '') + ' está emitida. Falta el egreso de la oficina de Tesorería.'];
      case 'EGRESO': return ['Egreso registrado', 'Tesorería registró el egreso' + (c.egreso ? ' N° ' + c.egreso : '') + '. Tu pago está en proceso.'];
      case 'PAGADA': return ['Pagada', cta + ' fue pagada' + (c.fechaPago ? ' el ' + c.fechaPago : '') + '.'];
      default: return [c.estado || 'Sin estado', 'Tu cuenta ' + n + ' está en estado ' + (c.estado || 'sin estado') + '.'];
    }
  }

  /* Lo que le toca hacer. El CORE decide QUÉ (tipo y botones); aquí solo
     se le pone la voz. */
  function textoAccion(a) {
    var n = a.informe;
    switch (a.tipo) {
      case 'ingresar': return ['Termina de ingresar tu cuenta ' + n, 'Todavía no la has radicado. Cuando la ingreses, vuelve aquí para reportarla.'];
      case 'reportarCuenta': return ['Reporta tu cuenta ' + n, 'Antes de reportar, revisa que tus documentos estén completos (planilla, baucher de pago y los anexos que te pidieron) y revísalos uno a uno. Si tu cuenta ya había sido devuelta, con honestidad elige CORRECCIÓN: así la revisión va más rápido.'];
      case 'corregirCuenta': return [a.titulo && /Completa/.test(a.titulo) ? 'Completa tu cuenta ' + n : 'Corrige tu cuenta ' + n, a.texto || ''];
      case 'reportarPlan': return ['Reporta el plan de pagos de la cuenta ' + n, 'Antes de reportar, confirma en el SECOP II: 1) subiste la cuenta unificada al Plan de pagos, 2) la planilla quedó validada y 3) el estado dice «Enviado a la entidad». Al reportar pierdes el acceso a la carpeta de Drive; aquí en la app vas a seguir viendo y descargando tus documentos.'];
      case 'corregirPlan': return ['Tu supervisor(a) debe aceptar el plan de pagos de la cuenta ' + n, 'Si te pidieron corregir el plan de pagos y ya lo corregiste en el SECOP II siguiendo las indicaciones, avísale.'];
      default: return [a.titulo || '', a.texto || ''];
    }
  }

  var BOTON = {
    'REPORTE INICIAL': 'REPORTE INICIAL', 'CORRECCION': 'CORRECCIÓN', 'REPORTAR CUENTA': 'REPORTAR CUENTA',
    'INGRESAR CUENTA': 'INGRESAR CUENTA', 'CORREGIR CUENTA': 'CORREGIR CUENTA',
    'REPORTAR PLAN DE PAGOS': 'REPORTAR PLAN DE PAGOS', 'REPORTAR CORRECCION DEL PLAN': 'REPORTAR CORRECCIÓN DEL PLAN'
  };

  /* ══════════════ mezcla de la historia (bitácoras) ══════════════ */

  function mezclar(h, X) {
    /* 4.9: mezcla sobre lo que se le pase (la precarga) o sobre la vista */
    var T = X || S;
    if (!h || !h.porInforme || !T) return;
    T.cuentas.forEach(function (c) {
      var x = h.porInforme[c.informe];
      if (!x) return;
      ['aprobada', 'aprobo', 'orden', 'fechaOrden', 'ordenQuien', 'egreso', 'egreso2', 'fechaEgreso', 'egresoQuien', 'fechaPago', 'fuente', 'banco']
        .forEach(function (k) { if (!c[k] && x[k]) c[k] = x[k]; });
      if (!c.neto && x.neto) c.neto = x.neto;
      if ((x.devoluciones || []).length > (c.devoluciones || []).length) c.devoluciones = x.devoluciones;
      var fechas = [c.radicada, c.aprobada, c.fechaOrden, c.fechaEgreso, c.fechaPago];
      (c.hitos || []).forEach(function (p) { if (!p.fecha && c.hito >= p.n) p.fecha = fechas[p.n - 1] || ''; });
    });
    T.netoPagado = h.netoPagado || T.netoPagado;
    T.egresos = egresosDe(T.cuentas);
    T._historia = true;
  }

  function egresosDe(cuentas) {
    return cuentas.filter(function (c) { return !!c.egreso; }).map(function (c) {
      return { informe: c.informe, egreso: c.egreso, egreso2: c.egreso2, fecha: c.fechaEgreso, valor: c.valor, neto: c.neto, estado: c.estado, orden: c.orden, fechaPago: c.fechaPago };
    });
  }

  function cuentaSel() {
    if (!S) return null;
    for (var i = 0; i < S.cuentas.length; i++) if (S.cuentas[i].informe === SEL) return S.cuentas[i];
    return S.cuentas[S.cuentas.length - 1] || null;
  }

  /* ══════════════ la vista ══════════════ */

  function abrir(sub) {
    CAJA = K.nodo('<div class="kit-ancho vista seg"></div>');
    app.appendChild(CAJA);
    var c = pedirTodo(false);
    K.piezas.esqueletos.mientras(CAJA, c.seg, { forma: 'ficha', cuantos: 3, espera: 'Trayendo tu estado de cuenta' })
      .then(function (d) {
        S = d;
        S.egresos = egresosDe(S.cuentas);
        SEL = S.actual;
        pintar();
        irA(sub);
        /* la historia llega cuando llegue: completa sin repintar lo que no cambió */
        c.hist.then(function (h) {
          if (!h || S !== d || !document.body.contains(CAJA)) return;
          mezclar(h);
          repintarCuenta();
          pintarPlan();
          pintarEgresos();
        });
      })
      ['catch'](function (e) {
        CAJA.appendChild(errorCaja(e));
        K.piezas.creditos.montar(CAJA);
      });
  }

  function horaCorta(d) {
    var h = d.getHours(), m = ('0' + d.getMinutes()).slice(-2);
    return (h % 12 || 12) + ':' + m + (h < 12 ? ' a. m.' : ' p. m.');
  }

  function recargar() {
    CACHE = null;
    DOCS = {};
    if (location.hash.indexOf('#/seguimiento') === 0) {
      app.innerHTML = '';
      abrir();
    }
  }

  function pintar() {
    CAJA.innerHTML = '';
    /* 5.2 · REFRESCAR en toda vista que liste cuentas: si Contratación o
       el supervisor movieron la cuenta hace un minuto, se ve sin salir. */
    var barra = K.nodo('<div class="seg-barra"><span class="seg-barra__t">Al día a las ' + K.esc(horaCorta(new Date())) + '</span></div>');
    var ref = K.nodo('<button type="button" class="kit-btn kit-btn--plano seg-refrescar" aria-label="Refrescar el estado de cuenta">' +
      K.icono('recargar', 16) + ' <span>Refrescar</span></button>');
    ref.addEventListener('click', function () { K.vibrar(8); recargar(); });
    barra.appendChild(ref);
    CAJA.appendChild(barra);
    CAJA.appendChild(K.nodo('<section class="kit-tarjeta seg-contrato" id="seg-contrato"></section>'));
    CAJA.appendChild(K.nodo('<div class="seg-cuenta" id="seg-cuenta"></div>'));
    CAJA.appendChild(K.nodo('<section class="kit-tarjeta seg-plan" id="seg-plan"></section>'));
    CAJA.appendChild(K.nodo('<section class="kit-tarjeta seg-egresos" id="seg-egresos"></section>'));
    CAJA.appendChild(K.nodo('<section class="kit-tarjeta seg-cert" id="seg-certificacion"></section>'));
    pintarContrato();
    repintarCuenta();
    pintarPlan();
    pintarEgresos();
    pintarCert();
    K.piezas.creditos.montar(CAJA);
  }

  /** #/seguimiento/certificacion y compañía llevan a su sección. */
  function irA(sub) {
    var id = { certificacion: 'seg-certificacion', egresos: 'seg-egresos', plan: 'seg-plan', documentos: 'seg-docs' }[sub];
    if (!id) return;
    setTimeout(function () {
      var el = K.id(id);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el.classList.add('seg-resalta');
      setTimeout(function () { el.classList.remove('seg-resalta'); }, 1800);
    }, 120);
  }

  /* ---------- 1. el contrato ---------- */

  function pintarContrato() {
    var el = K.id('seg-contrato');
    var valor = S.valorFinal || 0, pagado = S.pagado || 0;
    var pct = valor ? Math.min(100, Math.round(pagado * 100 / valor)) : 0;
    var pagadas = S.cuentas.filter(function (c) { return c.estado === 'PAGADA'; }).length;
    el.innerHTML =
      '<header class="seg-contrato__cab">' +
      '  <span class="seg-contrato__n">Contrato ' + K.esc(S.contrato || '') + '</span>' +
      '  <span class="seg-contrato__v">' + K.esc(pesos(valor)) + '</span>' +
      '</header>' +
      '<div class="seg-barra" role="img" aria-label="Pagado el ' + pct + ' por ciento del contrato">' +
      '  <span class="seg-barra__lleno" style="width:' + pct + '%"></span>' +
      '</div>' +
      '<div class="seg-cifras">' +
      cifra('Pagado', pesos(pagado), 'ok') +
      cifra('En trámite', pesos(S.enTramite || 0), 'aviso') +
      cifra('Por pagar', pesos(S.porPagar || 0), '') +
      '</div>' +
      '<p class="seg-contrato__pie">' + pagadas + ' de ' + (S.totalInformes || S.cuentas.length || 0) +
      ' cuentas pagadas · ' + pct + '% del contrato</p>';
  }

  function cifra(t, v, tono) {
    return '<div class="seg-cifra' + (tono ? ' seg-cifra--' + tono : '') + '"><span>' + K.esc(t) + '</span><b>' + K.esc(v) + '</b></div>';
  }

  /* ---------- 2. la cuenta ---------- */

  function repintarCuenta() {
    var zona = K.id('seg-cuenta');
    if (!zona) return;
    zona.innerHTML = '';
    if (!S.cuentas.length) {
      zona.appendChild(K.nodo(
        '<section class="kit-tarjeta seg-vacio"><h3>Todavía no tienes cuentas</h3>' +
        '<p>Empieza por el borrador de actividades. Cuando radiques tu primera cuenta, aquí verás en qué va.</p>' +
        '<button type="button" class="kit-btn kit-btn--marca">BORRADOR ACTIVIDADES</button></section>'));
      zona.querySelector('button').addEventListener('click', function () { location.hash = '#/borrador'; });
      return;
    }
    zona.appendChild(selector());
    var c = cuentaSel();
    zona.appendChild(tarjetaEstado(c));
    zona.appendChild(tarjetaDocs(c));
  }

  function selector() {
    var fila = K.nodo('<div class="kit-pastillas seg-sel" role="tablist" aria-label="Tus cuentas"></div>');
    S.cuentas.forEach(function (c) {
      var pend = c.accion ? ' seg-sel__b--pend' : '';
      var b = K.nodo('<button type="button" role="tab" class="kit-pastilla seg-sel__b' + pend + '" aria-pressed="' + (c.informe === SEL) +
        '"><i class="seg-punto seg-punto--' + tono(c) + '"></i>Cuenta ' + c.informe + '</button>');
      b.addEventListener('click', function () {
        if (SEL === c.informe) return;
        SEL = c.informe; K.vibrar(6);
        repintarCuenta();
      });
      fila.appendChild(b);
    });
    /* que la seleccionada se vea aunque haya muchas */
    setTimeout(function () {
      var s = fila.querySelector('[aria-pressed="true"]');
      if (s && fila.scrollWidth > fila.clientWidth) fila.scrollLeft = s.offsetLeft - 16;
    }, 0);
    return fila;
  }

  function tono(c) {
    if (c.estado === 'DEVUELTA' || c.estado === 'INCOMPLETA') return 'malo';
    if (c.estado === 'PAGADA') return 'ok';
    if (c.hito === 0) return 'nada';
    return 'aviso';
  }

  function tarjetaEstado(c) {
    var d = detalle(c);
    var t = K.nodo(
      '<section class="kit-tarjeta seg-estado seg-estado--' + tono(c) + '">' +
      '  <header class="seg-estado__cab">' +
      '    <span class="seg-estado__n">Cuenta ' + c.informe + (c.total ? ' de ' + c.total : '') + '</span>' +
      '    <span class="seg-estado__pastilla">' + K.esc(c.estado || 'SIN ESTADO') + '</span>' +
      '  </header>' +
      '  <h2 class="seg-estado__t">' + K.esc(d[0]) + '</h2>' +
      '  <p class="seg-estado__p">' + K.esc(d[1]) + '</p>' +
      '</section>'
    );
    t.appendChild(linea(c));
    if (c.accion) t.appendChild(cajaAccion(c.accion));
    if (c.observaciones && !c.accion) {
      t.appendChild(K.nodo('<div class="seg-obs"><b>Lo que te indicaron</b><p>' + K.esc(c.observaciones) + '</p></div>'));
    }
    var otras = (S.acciones || []).filter(function (a) { return a.informe !== c.informe; });
    otras.forEach(function (a) {
      var b = K.nodo('<button type="button" class="seg-otra">' + K.icono('aviso', 16) +
        '<span>Tu cuenta ' + a.informe + ' también tiene algo pendiente</span></button>');
      b.addEventListener('click', function () { SEL = a.informe; repintarCuenta(); });
      t.appendChild(b);
    });
    if ((c.devoluciones || []).length) t.appendChild(devoluciones(c.devoluciones));
    t.appendChild(datosCuenta(c));
    return t;
  }

  /** La línea de tiempo de cinco pasos. */
  function linea(c) {
    var ol = K.nodo('<ol class="seg-linea" aria-label="En qué va tu cuenta"></ol>');
    var devuelta = c.estado === 'DEVUELTA' || c.estado === 'INCOMPLETA';
    (c.hitos || HITOS.map(function (h, k) { return { n: k + 1, titulo: h, fecha: '', hecho: false, actual: false }; }))
      .forEach(function (h) {
        var clase = h.hecho ? ' seg-paso--hecho' : (h.actual ? ' seg-paso--actual' : '');
        if (h.actual && devuelta) clase += ' seg-paso--malo';
        var punto = h.hecho ? K.icono('check', 14) : (h.actual && devuelta ? '!' : String(h.n));
        ol.appendChild(K.nodo(
          '<li class="seg-paso' + clase + '"' + (h.actual ? ' aria-current="step"' : '') + '>' +
          '  <span class="seg-paso__punto">' + punto + '</span>' +
          '  <span class="seg-paso__t">' + K.esc(HITOS[h.n - 1]) + '</span>' +
          '  <span class="seg-paso__f">' + K.esc(h.fecha || (h.hecho || h.actual ? '' : '—')) + '</span>' +
          '</li>'
        ));
      });
    return ol;
  }

  function cajaAccion(a) {
    var tx = textoAccion(a);
    var caja = K.nodo(
      '<div class="seg-accion">' +
      '  <p class="seg-accion__eti">' + K.icono('cohete', 15) + ' Lo que te toca</p>' +
      '  <h3 class="seg-accion__t">' + K.esc(tx[0]) + '</h3>' +
      '  <p class="seg-accion__p">' + K.esc(tx[1]) + '</p>' +
      '  <div class="seg-accion__botones"></div>' +
      '</div>'
    );
    var zona = caja.querySelector('.seg-accion__botones');
    var reporta = a.botones.some(function (b) { return b.accion === 'reportarCuenta' || b.accion === 'reportarPlan'; });
    var habil = S.habil && S.habil.ok !== false;
    a.botones.forEach(function (b, k) {
      var esReporte = b.accion === 'reportarCuenta' || b.accion === 'reportarPlan';
      var boton = K.nodo('<button type="button" class="kit-btn ' + (k === 0 ? 'kit-btn--marca' : '') + '">' +
        K.esc(BOTON[b.texto] || b.texto) + '</button>');
      if (esReporte && !habil) boton.disabled = true;
      boton.addEventListener('click', function () {
        if (b.accion === 'ir') { location.hash = '#/' + b.destino; return; }
        reportar(b.accion, b.tipo, a.informe);
      });
      zona.appendChild(boton);
    });
    if (reporta && !habil) {
      caja.appendChild(K.nodo('<p class="seg-accion__horario">' + K.icono('reloj', 15) + ' ' + K.esc(S.habil.motivo || '') + '</p>'));
    }
    return caja;
  }

  function devoluciones(lista) {
    var d = K.nodo('<details class="seg-dev"><summary>' + lista.length + (lista.length === 1 ? ' devolución' : ' devoluciones') +
      ' en esta cuenta</summary><ul></ul></details>');
    var ul = d.querySelector('ul');
    lista.forEach(function (x) {
      var li = K.nodo('<li><span class="seg-dev__f">' + K.esc(x.fecha || '') + (x.quien && !K.piezas.personas ? ' · ' + K.esc(x.quien) : '') +
        '</span><span class="seg-dev__m">' + K.esc(x.motivo || 'Sin motivo escrito') + '</span></li>');
      /* 4.9 · quien la devolvió, con su cara (o sus iniciales) */
      if (x.quien && K.piezas.personas) {
        var q = K.nodo('<span class="seg-dev__quien"></span>');
        q.appendChild(K.piezas.personas.chip(x.quien, 'La devolvió', { tam: 26 }));
        li.insertBefore(q, li.firstChild.nextSibling);
      }
      ul.appendChild(li);
    });
    return d;
  }

  /* 4.9 · cada paso lleva la cara de quien lo hizo: el supervisor que
     revisó, quien aprobó en Contratación, quien hizo la orden en
     Contabilidad y el egreso en Tesorería. Sin foto, sus iniciales. */
  function datosCuenta(c) {
    var P = K.piezas.personas;
    var revisada = c.hito >= 1 && c.estado !== 'INGRESADA' && c.estado !== 'REPORTADA' ? c.revisada : '';
    var filas = [
      ['Valor de la cuenta', c.valor ? pesos(c.valor) : ''],
      ['Radicada', c.radicada],
      ['Revisada por tu supervisor(a)', revisada, revisada && S ? S.supervisor : '', 'Tu supervisor(a)'],
      ['Aprobada por Contratación', c.aprobada ? c.aprobada + (c.aprobo && !P ? ' · ' + c.aprobo : '') : '', c.aprobada ? c.aprobo : ''],
      ['Orden de pago', c.orden ? 'N° ' + c.orden + (c.fechaOrden ? ' · ' + c.fechaOrden : '') : '', c.orden ? c.ordenQuien : ''],
      ['Egreso', c.egreso ? 'N° ' + c.egreso + (c.egreso2 ? ' y ' + c.egreso2 : '') + (c.fechaEgreso ? ' · ' + c.fechaEgreso : '') : '', c.egreso ? c.egresoQuien : ''],
      ['Pagada', c.fechaPago],
      ['Neto girado', c.neto ? pesos(c.neto) : ''],
      ['Fuente', c.fuente ? c.fuente + (c.banco ? ' · Banco ' + c.banco : '') : '']
    ].filter(function (f) { return String(f[1] || '').trim(); });
    var dl = K.nodo('<dl class="seg-datos"></dl>');
    filas.forEach(function (f) {
      var fila = K.nodo('<div class="seg-dato"><dt>' + K.esc(f[0]) + '</dt><dd>' + K.esc(f[1]) + '</dd></div>');
      if (f[2] && P) {
        /* el dato queda en su sitio y la persona va debajo, a lo ancho:
           así ni el nombre ni el N° de orden se cortan en un teléfono */
        fila.classList.add('seg-dato--quien');
        var q = K.nodo('<div class="seg-quien"></div>');
        q.appendChild(P.chip(f[2], f[3] || '', { tam: 26 }));
        fila.appendChild(q);
      }
      dl.appendChild(fila);
    });
    return dl;
  }

  /* ---------- MI CUENTA DRIVE ---------- */

  function tarjetaDocs(c) {
    var t = K.nodo(
      '<section class="kit-tarjeta seg-docs" id="seg-docs">' +
      '  <h3 class="seg-sec__t">MI CUENTA DRIVE</h3>' +
      '  <p class="seg-sec__p">Los documentos de tu cuenta ' + c.informe + ', para verlos y descargarlos aquí mismo.</p>' +
      '  <div class="seg-docs__zona"></div>' +
      '</section>'
    );
    var zona = t.querySelector('.seg-docs__zona');
    if (!c.tieneCarpeta) {
      zona.innerHTML = '<p class="seg-nada">Esta cuenta todavía no tiene carpeta de documentos.</p>';
      return t;
    }
    if (c.estado === 'APROBADA') {
      t.insertBefore(K.nodo('<p class="seg-pista">' + K.icono('descargar', 15) +
        ' Descárgalos, únelos en un solo PDF y súbelo al Plan de pagos del SECOP II.</p>'), zona);
    }
    if (DOCS[c.informe]) { listaDocs(zona, c, DOCS[c.informe]); return t; }
    var b = K.nodo('<button type="button" class="kit-btn kit-btn--marca seg-docs__ver">' + K.icono('documento', 17) + ' Ver mis documentos</button>');
    b.addEventListener('click', function () {
      b.remove();
      var p = K.pedir('seguimientoDocs', { informe: c.informe }, { ms: 60000 });
      K.piezas.esqueletos.mientras(zona, p, { forma: 'filas', cuantos: 4, espera: 'Abriendo tu carpeta' })
        .then(function (r) { DOCS[c.informe] = r; if (c.informe === SEL) listaDocs(zona, c, r); })
        ['catch'](function (e) {
          zona.appendChild(K.nodo('<p class="seg-nada seg-nada--malo">' + K.esc(e.message || 'No se pudo abrir la carpeta.') + '</p>'));
          zona.appendChild(b);
        });
    });
    zona.appendChild(b);
    return t;
  }

  function listaDocs(zona, c, r) {
    zona.innerHTML = '';
    var todos = [];
    (r.grupos || []).forEach(function (g) { g.archivos.forEach(function (a) { todos.push(a); }); });
    if (!todos.length) { zona.innerHTML = '<p class="seg-nada">La carpeta de esta cuenta está vacía.</p>'; return; }

    /* Los del visor: todos los de la cuenta, en el mismo orden de la lista,
       para pasar de uno a otro con las flechas. Cada uno se pide SOLO
       cuando se ve, y una sola vez. */
    var paraVisor = todos.map(function (a) {
      return { titulo: a.nombre, tipo: a.tipo === 'imagen' ? 'imagen' : (a.tipo === 'pdf' ? 'pdf' : 'otro'), cargar: bytesDe(c.informe, a.id) };
    });

    (r.grupos || []).forEach(function (g) {
      var sec = K.nodo('<div class="seg-grupo"><p class="seg-grupo__t">' + K.esc(g.nombre) + '</p><ul class="seg-archivos"></ul></div>');
      var ul = sec.querySelector('ul');
      g.archivos.forEach(function (a) {
        var k = todos.indexOf(a);
        var li = K.nodo(
          '<li class="seg-archivo">' +
          '  <button type="button" class="seg-archivo__ver">' +
          '    <span class="seg-archivo__ico">' + K.icono(a.tipo === 'imagen' ? 'imagen' : (a.tipo === 'pdf' ? 'pdf' : 'archivo'), 20) + '</span>' +
          '    <span class="seg-archivo__txt"><b>' + K.esc(a.nombre) + '</b><small>' + K.esc([a.fecha, tamano(a.bytes)].filter(Boolean).join(' · ')) + '</small></span>' +
          '  </button>' +
          '  <button type="button" class="seg-archivo__bajar" aria-label="Descargar ' + K.esc(a.nombre) + '" title="Descargar">' + K.icono('descargar', 18) + '</button>' +
          '</li>'
        );
        li.querySelector('.seg-archivo__ver').addEventListener('click', function () {
          K.piezas.visor.abrir(paraVisor, { indice: k });
        });
        li.querySelector('.seg-archivo__bajar').addEventListener('click', function () { descargar(paraVisor[k], this); });
        ul.appendChild(li);
      });
      zona.appendChild(sec);
    });
  }

  var PEDIDOS = {};
  function bytesDe(informe, id) {
    return function () {
      var k = informe + ':' + id;
      if (!PEDIDOS[k]) {
        PEDIDOS[k] = K.pedir('seguimientoDocumento', { informe: informe, id: id }, { ms: 120000 });
        PEDIDOS[k]['catch'](function () { delete PEDIDOS[k]; });
      }
      return PEDIDOS[k];
    };
  }

  function descargar(doc, boton) {
    if (boton) boton.classList.add('seg-girando');
    Promise.resolve(doc.cargar()).then(function (r) {
      var bin = atob(String(r.base64 || ''));
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      var url = URL.createObjectURL(new Blob([bytes], { type: r.mime || 'application/octet-stream' }));
      var a = document.createElement('a');
      a.href = url; a.download = r.nombre || doc.titulo || 'documento';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 30000);
      K.aviso('Descargando ' + (r.nombre || 'el documento'), 'ok', 2600);
    })['catch'](function (e) { K.aviso(e.message || 'No se pudo descargar.', 'malo'); })
      .then(function () { if (boton) boton.classList.remove('seg-girando'); });
  }

  function tamano(b) {
    b = Number(b) || 0;
    if (!b) return '';
    if (b < 1024 * 1024) return Math.max(1, Math.round(b / 1024)) + ' KB';
    return (b / 1024 / 1024).toFixed(1).replace('.', ',') + ' MB';
  }

  /* ---------- 3. el plan de pagos ---------- */

  function pintarPlan() {
    var el = K.id('seg-plan');
    if (!el) return;
    var total = Math.max(S.totalInformes || 0, S.cuentas.length);
    var porN = {};
    S.cuentas.forEach(function (c) { porN[c.informe] = c; });
    var filas = '';
    for (var n = 1; n <= total; n++) {
      var c = porN[n];
      if (!c) {
        filas += '<tr class="seg-plan__pend"><th scope="row">' + n + '</th><td>—</td><td><span class="seg-est seg-est--nada">PENDIENTE</span></td>' +
          '<td>—</td><td>—</td><td>—</td><td>—</td></tr>';
        continue;
      }
      filas += '<tr data-n="' + n + '"' + (n === SEL ? ' class="seg-plan__sel"' : '') + '>' +
        '<th scope="row">' + n + '</th>' +
        '<td class="seg-num">' + K.esc(c.valor ? pesos(c.valor) : '—') + '</td>' +
        '<td><span class="seg-est seg-est--' + tono(c) + '">' + K.esc(c.estado || '—') + '</span></td>' +
        '<td>' + K.esc(c.radicada || '—') + '</td>' +
        '<td>' + K.esc(c.orden || '—') + '</td>' +
        '<td>' + K.esc(c.egreso || '—') + '</td>' +
        '<td>' + K.esc(c.fechaPago || (c.estado === 'PAGADA' ? 'Sí' : '—')) + '</td>' +
        '</tr>';
    }
    el.innerHTML =
      '<h3 class="seg-sec__t">PLAN DE PAGOS</h3>' +
      '<p class="seg-sec__p">Todas las cuentas de tu contrato. Toca una para ver en qué va.</p>' +
      '<div class="seg-tabla" tabindex="0" role="region" aria-label="Plan de pagos">' +
      '<table><thead><tr><th scope="col">Cuenta</th><th scope="col">Valor</th><th scope="col">Estado</th>' +
      '<th scope="col">Radicada</th><th scope="col">Orden de pago</th><th scope="col">Egreso</th><th scope="col">Pagada</th></tr></thead>' +
      '<tbody>' + filas + '</tbody>' +
      '<tfoot><tr><th scope="row">Total</th><td class="seg-num">' + K.esc(pesos(S.pagado)) + '</td><td colspan="5">pagado de ' +
      K.esc(pesos(S.valorFinal)) + '</td></tr></tfoot></table></div>';
    [].forEach.call(el.querySelectorAll('tr[data-n]'), function (tr) {
      tr.addEventListener('click', function () {
        SEL = +tr.getAttribute('data-n');
        repintarCuenta(); pintarPlan();
        var z = K.id('seg-cuenta');
        if (z) z.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  /* ---------- 4. egresos registrados ---------- */

  var COLS_EGRESOS = [
    { campo: 'egresoTxt', titulo: 'Egreso N°', fijo: true },
    { campo: 'fecha', titulo: 'Fecha del egreso' },
    { campo: 'cuenta', titulo: 'Cuenta' },
    { campo: 'valor', titulo: 'Valor de la cuenta', tipo: 'pesos' },
    { campo: 'neto', titulo: 'Neto girado', tipo: 'pesos' },
    { campo: 'estado', titulo: 'Estado' }
  ];

  function filasEgresos() {
    return (S.egresos || []).map(function (e) {
      return {
        egresoTxt: e.egreso + (e.egreso2 ? ' y ' + e.egreso2 : ''), fecha: e.fecha || '',
        cuenta: e.informe + ' de ' + (S.totalInformes || ''), valor: e.valor || 0, neto: e.neto || '', estado: e.estado
      };
    });
  }

  function pintarEgresos() {
    var el = K.id('seg-egresos');
    if (!el) return;
    var lista = S.egresos || [];
    var html = '<h3 class="seg-sec__t">EGRESOS REGISTRADOS</h3>';
    if (!lista.length) {
      el.innerHTML = html + '<p class="seg-nada">Todavía no tienes egresos registrados. Aparecen cuando Tesorería registra el pago de una cuenta.</p>';
      return;
    }
    html += '<p class="seg-sec__p">Los comprobantes de egreso de tus pagos. Descárgalos cuando los necesites.</p><ul class="seg-eg">';
    lista.forEach(function (e) {
      html += '<li class="seg-eg__i"><span class="seg-eg__n">' + K.icono('documento', 18) + '</span>' +
        '<span class="seg-eg__txt"><b>Egreso N° ' + K.esc(e.egreso) + (e.egreso2 ? ' y ' + K.esc(e.egreso2) : '') + '</b>' +
        '<small>Cuenta ' + e.informe + (e.fecha ? ' · ' + K.esc(e.fecha) : '') + (e.valor ? ' · ' + K.esc(pesos(e.valor)) : '') + '</small></span>' +
        '<button type="button" class="seg-copiar" data-v="' + K.esc(e.egreso) + '" title="Copiar el número">' + K.icono('copiar', 16) + '</button></li>';
    });
    html += '</ul><div class="seg-eg__bajar">' +
      '<button type="button" class="kit-btn kit-btn--marca" data-f="pdf">' + K.icono('pdf', 17) + ' Descargar PDF</button>' +
      '<button type="button" class="kit-btn" data-f="excel">' + K.icono('hoja', 17) + ' Excel</button></div>';
    el.innerHTML = html;
    [].forEach.call(el.querySelectorAll('.seg-copiar'), function (b) {
      b.addEventListener('click', function () {
        var v = b.getAttribute('data-v');
        (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject())
          .then(function () { K.aviso('Egreso ' + v + ' copiado', 'ok', 2000); }, function () { K.aviso(v, 'info', 4000); });
      });
    });
    [].forEach.call(el.querySelectorAll('[data-f]'), function (b) {
      b.addEventListener('click', function () {
        if (!K.piezas.exportar) { K.aviso('La descarga no está disponible en esta versión.', 'aviso'); return; }
        var titulo = 'Egresos registrados · Contrato ' + (S.contrato || '');
        var p = b.getAttribute('data-f') === 'pdf'
          ? K.piezas.exportar.aPDF(titulo, COLS_EGRESOS, filasEgresos(), { orientacion: 'portrait' })
          : K.piezas.exportar.aExcel(titulo, COLS_EGRESOS, filasEgresos());
        Promise.resolve(p)['catch'](function (e) { K.aviso((e && e.message) || 'No se pudo descargar.', 'malo'); });
      });
    });
  }

  /* ---------- 5. certificación del contrato ---------- */

  function pintarCert() {
    var el = K.id('seg-certificacion');
    el.innerHTML =
      '<h3 class="seg-sec__t">CERTIFICACIÓN CONTRATO</h3>' +
      '<p class="seg-sec__p">El certificado de tu contrato con su código de verificación y su QR. Se abre aquí para verlo, descargarlo o imprimirlo.</p>' +
      '<div class="seg-cert__botones"><button type="button" class="kit-btn kit-btn--marca">' + K.icono('documento', 17) + ' Generar certificación</button></div>';
    el.querySelector('button').addEventListener('click', generarCert);
    if (CERT) mostrarCertListo(el);
  }

  function generarCert() {
    K.ocupado = true;
    K.piezas.guardado.abrir({
      titulo: 'Generando tu certificación',
      sub: 'Tarda unos segundos. No cierres la app.',
      pasos: ['Leyendo tu contrato', 'Armando el documento', 'Poniendo el código de verificación', 'Pasándolo a PDF']
    });
    K.pedir('certificacion', {}, { ms: 150000 })
      .then(function (r) {
        K.ocupado = false;
        CERT = r;
        K.piezas.guardado.listo({ sub: 'Código ' + (r.idDoc || '') });
        var el = K.id('seg-certificacion');
        if (el) mostrarCertListo(el);
        setTimeout(verCert, 900);
      })
      ['catch'](function (e) {
        K.ocupado = false;
        K.piezas.guardado.fallo();
        K.aviso((e && e.message) || 'No se pudo generar la certificación.', 'malo', 8000);
      });
  }

  function mostrarCertListo(el) {
    var vieja = el.querySelector('.seg-cert__listo');
    if (vieja) vieja.remove();
    var n = K.nodo('<div class="seg-cert__listo">' + K.icono('check', 16) + '<span><b>' + K.esc(CERT.nombre) +
      '</b><small>Código de verificación ' + K.esc(CERT.idDoc || '') + '</small></span>' +
      '<button type="button" class="kit-btn">Ver</button></div>');
    n.querySelector('button').addEventListener('click', verCert);
    el.appendChild(n);
  }

  function verCert() {
    if (!CERT) return;
    K.piezas.visor.abrir([{ titulo: CERT.nombre, tipo: 'pdf', cargar: function () { return Promise.resolve(CERT); } }]);
  }

  /* ══════════════ reportar ══════════════ */

  function reportar(accion, tipo, informe) {
    var plan = accion === 'reportarPlan';
    var correccion = tipo === 'correccion';
    var titulo = plan
      ? (correccion ? '¿Avisas la corrección del plan de pagos?' : '¿Reportas el plan de pagos de la cuenta ' + informe + '?')
      : (correccion ? '¿Reportas la corrección de tu cuenta ' + informe + '?' : '¿Reportas tu cuenta ' + informe + '?');
    var nota = plan
      ? (correccion
          ? 'Hazlo solo si ya corregiste el plan de pagos en el SECOP II siguiendo al pie de la letra las indicaciones.'
          : 'Al reportar el plan de pagos pierdes el acceso a la carpeta de Drive. Aquí en la app vas a seguir viendo y descargando tus documentos.')
      : 'Revisa uno a uno tus documentos antes de reportar: planilla, baucher de pago y los anexos que te pidieron. Así evitas reprocesos.';
    K.piezas.confirmar.abrir({
      titulo: titulo,
      lista: [
        ['Cuenta', String(informe) + (S.totalInformes ? ' de ' + S.totalInformes : '')],
        ['Tipo', plan ? (correccion ? 'Corrección del plan de pagos' : 'Plan de pagos') : (correccion ? 'Corrección' : 'Reporte inicial')],
        ['Le avisamos a', S.supervisor || 'tu supervisor(a)']
      ],
      nota: nota,
      si: plan ? (correccion ? 'Avisar' : 'Reportar plan') : 'Reportar',
      no: 'Cancelar'
    }).then(function (ok) {
      if (!ok) return;
      K.ocupado = true;
      K.piezas.guardado.abrir({
        titulo: plan ? 'Reportando el plan de pagos' : 'Reportando tu cuenta',
        sub: 'Guardamos el reporte y le avisamos a tu supervisor(a).',
        pasos: ['Guardando el reporte', 'Avisando a tu supervisor(a)', 'Terminando']
      });
      K.pedir(accion, { informe: informe, tipo: tipo || 'inicial' }, { ms: 90000 })
        .then(function (r) {
          K.ocupado = false;
          K.piezas.guardado.listo({ sub: plan ? (correccion ? 'Tu supervisor(a) ya sabe.' : 'Plan de pagos reportado.') : 'Cuenta reportada.' });
          var aviso = r && r.aviso;
          var fallo = aviso && aviso.ok === false;
          setTimeout(function () {
            if (fallo) {
              /* lo mismo que avisarSiFalloElGrupo_ de la app vieja: el reporte
                 quedó, lo que no salió fue el WhatsApp */
              K.piezas.confirmar.avisar({
                titulo: 'Aviso no enviado al supervisor',
                texto: 'Tu reporte SÍ quedó registrado, pero el mensaje de WhatsApp al grupo de tu supervisor(a) no pudo enviarse.',
                nota: 'Infórmalo a la oficina de Contratación para que revisen la notificación.',
                si: 'Entendido'
              }).then(recargar);
            } else recargar();
          }, 1600);
        })
        ['catch'](function (e) {
          K.ocupado = false;
          K.piezas.guardado.fallo();
          if (e && (e.codigo === 'SIN_RED' || e.codigo === 'TIEMPO' || e.codigo === 'RESPUESTA_NO_JSON')) {
            /* la respuesta se perdió pero el servidor pudo terminar: se
               vuelve a leer el estado antes de dejar que reporte otra vez */
            K.piezas.confirmar.avisar({
              titulo: 'Se perdió la respuesta',
              texto: 'No sabemos si el reporte alcanzó a guardarse.',
              nota: 'Vamos a volver a leer el estado de tu cuenta. Si ya dice REPORTADA, no lo repitas.',
              si: 'Ver el estado'
            }).then(recargar);
            return;
          }
          K.aviso((e && e.message) || 'No se pudo reportar.', 'malo', 9000);
        });
    });
  }

  /* ══════════════ auxiliares ══════════════ */

  function errorCaja(e) {
    var c = K.nodo(
      '<section class="kit-tarjeta error">' +
      '  <p class="error__t">' + K.esc((e && e.message) || 'No se pudo cargar tu estado de cuenta.') + '</p>' +
      '  <button type="button" class="kit-btn kit-btn--plano">Reintentar</button>' +
      '</section>'
    );
    c.querySelector('button').addEventListener('click', recargar);
    return c;
  }

  window.SEGUIMIENTO = {
    abrir: function (sub) { abrir(sub); },
    precargar: precargar,
    /* 4.9: la ayuda (ayuda.js) habla con las mismas frases de esta vista */
    _detalle: detalle,
    _accion: textoAccion,
    /* para el banco de pruebas */
    _estado: function () { return S || ULTIMO; },
    _olvidar: function () { CACHE = null; DOCS = {}; PEDIDOS = {}; CERT = null; S = null; ULTIMO = null; }
  };
}());
