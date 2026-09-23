/* ============================================================
   CONTRATISTA-FLANDES · TRÁMITES Y SOLICITUDES
   Ecosistema Flandes · Fase 4, entrega 4.8

     #/prensa[/nueva]      SOLICITUD PRENSA
     #/tesoreria[/nueva]   SOLICITUD TESORERÍA

   Lo que hacía la app vieja (leído en BOTHEART911/CONTRATISTA y en su
   backend, y medido en la copia el 22/09)

     PRENSA. Un formulario de once campos con dos ruedas de fecha que solo
       conocían el año 2026 y febrero con 31 días; la antelación de 3 días
       solo la miraba la rueda, no el servidor. Al enviar: un cuadro de
       SweetAlert con el resumen, la fila en BRIEF, un WhatsApp de "hemos
       recibido" al contratista y otro al celular de UNA persona de prensa,
       escrito a mano en el código. Y nunca más: el contratista no podía
       ver su solicitud, ni si ya la tomaron, ni quién.

     TESORERÍA. Una caja de texto. La regla ("cuenta PAGADA y 3 días
       hábiles después del EGRESO") era un párrafo que nadie hacía
       cumplir, y la solicitud no le llegaba a NADIE de Tesorería: las 2
       que hay en la hoja siguen PENDIENTE desde abril y septiembre.

   Lo que es ahora
     · Una vista con "Mis solicitudes" (estado, a quién se asignó, la
       respuesta) y el formulario al lado, sin cuadros emergentes.
     · Las reglas las hace cumplir el SERVIDOR; aquí solo se ayudan: las
       ruedas no dejan elegir una fecha que el servidor va a rechazar.
     · El aviso va a los grupos de Prensa y de Tesorería de CONFIG.
     · En Tesorería se elige la cuenta, y la que todavía no se puede
       preguntar dice por qué y desde qué día sí.

   Pareja de estilos: la sección "4.8" de styles.css
   ============================================================ */
(function () {
  'use strict';

  var K = window.KIT;
  var app = K.id('app');

  var PRENSA = null;       /* lo último que respondió prensaEstado */
  var TESO = null;         /* lo último que respondió tesoreriaEstado */
  var FILTRO_PRENSA = '';

  /* ══════════════ utilidades ══════════════ */

  function caja() {
    var c = K.nodo('<div class="kit-ancho vista tr"></div>');
    app.appendChild(c);
    return c;
  }

  function errorCaja(e, reintentar) {
    var c = K.nodo(
      '<section class="kit-tarjeta error">' +
      '  <p class="error__t">' + K.esc((e && e.message) || 'No se pudo cargar.') + '</p>' +
      '  <button type="button" class="kit-btn kit-btn--plano">Reintentar</button>' +
      '</section>'
    );
    c.querySelector('button').addEventListener('click', reintentar);
    return c;
  }

  /** dd/mm/aaaa -> aaaa-mm-dd, para el min/max de la rueda. */
  function iso(dmy) {
    var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(dmy || ''));
    return m ? (m[3] + '-' + m[2] + '-' + m[1]) : '';
  }

  function campo(etiqueta, ayuda, control, obligatorio) {
    var c = K.nodo('<label class="campo"><span>' + K.esc(etiqueta) + (obligatorio ? ' <i class="tr-oblig" aria-hidden="true">*</i>' : '') + '</span></label>');
    c.appendChild(control);
    if (ayuda) c.appendChild(K.nodo('<p class="campo__ayuda">' + ayuda + '</p>'));
    return c;
  }

  function estadoTono(e) {
    e = K.norm(e);
    if (e === 'REALIZADA' || e === 'RESPONDIDA' || e === 'RESUELTA' || e === 'CERRADA') return 'ok';
    if (e === 'EN PROCESO' || e === 'ASIGNADA') return 'info';
    if (e === 'RECHAZADA' || e === 'ANULADA') return 'malo';
    return 'aviso';
  }

  function estadoTexto(e) {
    return { 'PENDIENTE': 'Recibida', 'EN PROCESO': 'En proceso', 'REALIZADA': 'Realizada' }[K.norm(e)] ||
      (String(e || '').charAt(0) + String(e || '').slice(1).toLowerCase());
  }

  /** "Recibida → En proceso → Realizada" en pequeño. */
  function pasos(estado) {
    var n = { 'PENDIENTE': 1, 'EN PROCESO': 2, 'REALIZADA': 3 }[K.norm(estado)] || 1;
    return '<ol class="tr-pasos" aria-label="En qué va">' +
      ['Recibida', 'En proceso', 'Realizada'].map(function (t, i) {
        var cl = i + 1 < n ? ' tr-paso--hecho' : (i + 1 === n ? ' tr-paso--actual' : '');
        return '<li class="tr-paso' + cl + '"' + (i + 1 === n ? ' aria-current="step"' : '') + '><i></i>' + t + '</li>';
      }).join('') + '</ol>';
  }

  function pesos(v) { return '$ ' + K.pesos(v || 0).replace(/^\$\s*/, ''); }

  /* ══════════════ SOLICITUD PRENSA ══════════════ */

  function vistaPrensa(sub) {
    var c = caja();
    var p = K.pedir('prensaEstado', {}, { ms: 60000 }).then(function (r) { PRENSA = r; return r; });
    K.piezas.esqueletos.mientras(c, p, { forma: 'ficha', cuantos: 2, espera: 'Trayendo tus solicitudes a Prensa' })
      .then(function () { pintarPrensa(c, sub === 'nueva'); })
      ['catch'](function (e) {
        c.appendChild(errorCaja(e, function () { app.innerHTML = ''; vistaPrensa(sub); }));
        K.piezas.creditos.montar(c);
      });
  }

  function pintarPrensa(c, abrirForm) {
    c.innerHTML = '';
    var P = PRENSA;
    var cab = K.nodo(
      '<section class="kit-tarjeta tr-cab">' +
      '  <span class="tr-cab__ico">' + K.icono('megafono', 24) + '</span>' +
      '  <div class="tr-cab__txt"><h2 class="tr-cab__t">SOLICITUD PRENSA</h2>' +
      '  <p class="tr-cab__p">Pide apoyo al equipo de Comunicaciones: fotos, video, piezas gráficas, perifoneo o publicación en la web. ' +
      'Necesitas el aval de tu supervisor(a) y pedirlo con <b>' + P.antelacion + ' días de antelación</b>.</p></div>' +
      '</section>'
    );
    c.appendChild(cab);

    if (!P.puede) {
      c.appendChild(K.nodo('<section class="kit-tarjeta tr-cerrada">' + K.icono('candado', 20) +
        '<p>' + K.esc(textoTildes(P.motivo)) + '</p></section>'));
    } else {
      var zona = K.nodo('<section class="kit-tarjeta tr-nueva"></section>');
      var boton = K.nodo('<button type="button" class="kit-btn kit-btn--marca tr-nueva__b">' + K.icono('mas', 18) + ' Nueva solicitud a Prensa</button>');
      zona.appendChild(boton);
      boton.addEventListener('click', function () {
        boton.hidden = true;
        zona.appendChild(formPrensa(c, function () { boton.hidden = false; }));
        zona.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      c.appendChild(zona);
      if (abrirForm) boton.click();
    }

    c.appendChild(misPrensa());
    K.piezas.creditos.montar(c);
  }

  /* Los textos del CORE van sin tildes a propósito; los que se enseñan
     tal cual se arreglan aquí, con las pocas palabras que usa. */
  function textoTildes(s) {
    return String(s || '').replace(/\besta\b/g, 'está').replace(/\bdias\b/g, 'días').replace(/\bhabiles\b/g, 'hábiles')
      .replace(/\bTesoreria\b/g, 'Tesorería').replace(/\bTodavia\b/g, 'Todavía').replace(/\ben que va\b/g, 'en qué va')
      .replace(/\bpublicacion\b/g, 'publicación').replace(/\bantelacion\b/g, 'antelación').replace(/\bvalida\b/g, 'válida')
      .replace(/\bterminacion\b/g, 'terminación').replace(/\bdespues\b/g, 'después').replace(/\bmas\b/g, 'más')
      .replace(/\bsecretaria\b/g, 'secretaría').replace(/\blogistica\b/g, 'logística').replace(/\baun\b/g, 'aún')
      .replace(/\bde que\b/g, 'de qué');
  }

  function formPrensa(c, alCerrar) {
    var P = PRENSA;
    var D = { requerimientos: [] };
    var f = K.nodo('<form class="formulario tr-form" novalidate><h3 class="grupo__t">Nueva solicitud</h3></form>');

    /* ¿qué necesitas? — lo primero, porque decide lo demás */
    var chips = K.nodo('<div class="tr-chips" role="group" aria-label="Qué necesitas"></div>');
    P.requerimientos.forEach(function (r) {
      var b = K.nodo('<button type="button" class="kit-pastilla tr-chip" aria-pressed="false">' + K.icono('check', 14) + K.esc(r) + '</button>');
      b.addEventListener('click', function () {
        var on = b.getAttribute('aria-pressed') !== 'true';
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        D.requerimientos = [].map.call(chips.querySelectorAll('[aria-pressed="true"]'), function (x) { return x.textContent.trim(); });
        chips.closest('.campo').classList.toggle('campo--ok', D.requerimientos.length > 0);
      });
      chips.appendChild(b);
    });
    var cReq = K.nodo('<div class="campo"><span>¿Qué necesitas? <i class="tr-oblig" aria-hidden="true">*</i></span></div>');
    cReq.appendChild(chips);
    cReq.appendChild(K.nodo('<p class="campo__ayuda">Elige uno o varios.</p>'));
    f.appendChild(cReq);

    var det = K.nodo('<textarea rows="5" maxlength="5000" placeholder="Objetivo, participantes, el texto que debe llevar la pieza, logos, logística…"></textarea>');
    var cuenta = K.nodo('<small class="tr-cuenta">0 caracteres</small>');
    var cDet = campo('Detalles del evento o requerimiento', 'Cuenta todo lo que prensa necesita saber. Mínimo una frase completa.', det, true);
    cDet.appendChild(cuenta);
    det.addEventListener('input', function () {
      D.detalles = det.value;
      cuenta.textContent = det.value.trim().length + ' caracteres';
      cDet.classList.toggle('campo--ok', det.value.trim().length >= 15);
    });
    f.appendChild(cDet);

    var pub = K.nodo('<input type="date" data-kit-fecha data-titulo="Entrega o publicación" min="' + iso(P.minPublicacion) + '" placeholder="dd/mm/aaaa">');
    pub.addEventListener('change', function () { D.publicacion = K.fecha(pub.value); });
    f.appendChild(campo('Fecha de entrega o publicación', 'Desde el <b>' + K.esc(P.minPublicacion) + '</b>: ' + P.antelacion + ' días de antelación.', pub, true));

    f.appendChild(K.nodo('<h3 class="grupo__t grupo__t--sub">Si es un evento</h3>'));
    var ev = K.nodo('<input type="text" maxlength="300" placeholder="Ej: Jornada de vacunación en la vereda El Colegio">');
    ev.addEventListener('input', function () { D.evento = ev.value; });
    f.appendChild(campo('Nombre del evento', 'Si no es un evento, déjalo vacío.', ev, false));

    var fe = K.nodo('<input type="date" data-kit-fecha data-titulo="Fecha del evento" min="' + iso(P.hoy) + '" placeholder="dd/mm/aaaa">');
    fe.addEventListener('change', function () { D.fechaEvento = K.fecha(fe.value); });
    f.appendChild(campo('Fecha del evento', '', fe, false));

    var fila = K.nodo('<div class="campo-fila"></div>');
    var hi = K.nodo('<input type="time">'), hf = K.nodo('<input type="time">');
    hi.addEventListener('input', function () { D.horaInicio = hi.value; });
    hf.addEventListener('input', function () { D.horaFin = hf.value; });
    fila.appendChild(campo('Hora de inicio', '', hi, false));
    fila.appendChild(campo('Hora de terminación', '', hf, false));
    f.appendChild(fila);

    var lug = K.nodo('<input type="text" maxlength="300" placeholder="Lugar o punto de encuentro">');
    lug.addEventListener('input', function () { D.lugar = lug.value; });
    f.appendChild(campo('Lugar', '', lug, false));

    var otr = K.nodo('<textarea rows="2" maxlength="1000" placeholder="Algo más que no esté en la lista"></textarea>');
    otr.addEventListener('input', function () { D.otros = otr.value; });
    f.appendChild(campo('Otros', '', otr, false));

    f.appendChild(K.nodo('<h3 class="grupo__t grupo__t--sub">Quién lo pide</h3>'));
    f.appendChild(K.nodo('<div class="dato"><span class="dato__e">Nombre</span><span class="dato__v">' + K.esc(P.nombre) + '</span></div>'));
    f.appendChild(K.nodo('<div class="dato"><span class="dato__e">Secretaría</span><span class="dato__v">' + K.esc(P.secretaria) + '</span></div>'));
    var car = K.nodo('<input type="text" maxlength="150" placeholder="Tu cargo en la secretaría">');
    car.value = P.cargo || '';
    D.cargo = car.value;
    car.addEventListener('input', function () { D.cargo = car.value; });
    f.appendChild(campo('Tu cargo', P.cargo ? 'El de tu última solicitud. Cámbialo si no es el mismo.' : 'Escríbelo como aparece en tu contrato.', car, true));

    var pie = K.nodo('<div class="campo-fila campo-fila--botones"></div>');
    var no = K.nodo('<button type="button" class="kit-btn kit-btn--plano">Cancelar</button>');
    var si = K.nodo('<button type="submit" class="kit-btn kit-btn--marca">' + K.icono('enviar', 16) + ' Revisar y enviar</button>');
    pie.appendChild(no); pie.appendChild(si);
    f.appendChild(pie);
    no.addEventListener('click', function () { f.remove(); if (alCerrar) alCerrar(); });

    f.addEventListener('submit', function (evn) {
      evn.preventDefault();
      var falta = faltaPrensa(D, P);
      if (falta) { K.aviso(falta, 'aviso', 5000); return; }
      K.piezas.confirmar.abrir({
        titulo: 'Resumen de tu solicitud',
        lista: [
          ['Necesitas', D.requerimientos.join(', ')],
          ['Entrega o publicación', D.publicacion],
          D.evento ? ['Evento', D.evento] : null,
          D.fechaEvento ? ['Fecha del evento', D.fechaEvento + (D.horaInicio ? ' · ' + D.horaInicio + (D.horaFin ? ' a ' + D.horaFin : '') : '')] : null,
          D.lugar ? ['Lugar', D.lugar] : null,
          ['Detalles', D.detalles.trim().length > 140 ? D.detalles.trim().slice(0, 139) + '…' : D.detalles.trim()],
          ['Tu cargo', String(D.cargo || '').toUpperCase()]
        ].filter(Boolean),
        nota: 'Le avisamos al grupo de Prensa. Aquí mismo vas a ver cuándo la toman y quién la atiende.',
        si: 'Enviar', no: 'Editar'
      }).then(function (ok) { if (ok) enviarPrensa(c, D); });
    });

    if (K.piezas.fechas) setTimeout(function () { K.piezas.fechas.montar(f); }, 0);
    return f;
  }

  /** Lo mismo que va a exigir el servidor, dicho antes de viajar. */
  function faltaPrensa(D, P) {
    if (!D.requerimientos.length) return 'Elige al menos una cosa que necesitas.';
    if (String(D.detalles || '').trim().length < 15) return 'Cuenta con más detalle lo que necesitas.';
    if (!D.publicacion) return 'Elige la fecha de entrega o publicación.';
    if (iso(D.publicacion) < iso(P.minPublicacion)) return 'La entrega o publicación va desde el ' + P.minPublicacion + '.';
    if (D.fechaEvento && iso(D.fechaEvento) < iso(P.hoy)) return 'La fecha del evento ya pasó.';
    if (D.horaInicio && D.horaFin && D.horaFin <= D.horaInicio) return 'La hora de terminación tiene que ser después de la de inicio.';
    if (!String(D.cargo || '').trim()) return 'Escribe tu cargo.';
    return '';
  }

  function enviarPrensa(c, D) {
    K.ocupado = true;
    K.piezas.guardado.abrir({
      titulo: 'Enviando tu solicitud a Prensa',
      sub: 'No cierres la app hasta que termine.',
      pasos: ['Guardando la solicitud', 'Avisando al equipo de Comunicaciones', 'Terminando']
    });
    K.pedir('prensaSolicitar', {
      requerimientos: D.requerimientos, detalles: D.detalles, publicacion: D.publicacion,
      evento: D.evento || '', fechaEvento: D.fechaEvento || '', horaInicio: D.horaInicio || '', horaFin: D.horaFin || '',
      lugar: D.lugar || '', otros: D.otros || '', cargo: D.cargo || ''
    }, { ms: 90000 })
      .then(function (r) {
        K.ocupado = false;
        K.piezas.guardado.listo({ sub: 'Quedó con el código ' + r.codigo + '.' });
        var aviso = r && r.aviso;
        setTimeout(function () {
          if (aviso && aviso.ok === false) {
            K.piezas.confirmar.avisar({
              titulo: 'El aviso a Prensa no salió',
              texto: 'Tu solicitud ' + r.codigo + ' SÍ quedó registrada, pero el WhatsApp al grupo de Prensa no se pudo enviar.',
              nota: 'Coméntaselo al equipo de Comunicaciones para que la busquen en su app.',
              si: 'Entendido'
            });
          }
          app.innerHTML = ''; vistaPrensa();
        }, 1500);
      })
      ['catch'](function (e) {
        K.ocupado = false;
        K.piezas.guardado.fallo();
        K.aviso(textoTildes((e && e.message) || 'No se pudo enviar.'), 'malo', 9000);
      });
  }

  function misPrensa() {
    var P = PRENSA;
    var s = K.nodo('<section class="kit-tarjeta tr-mias"><h3 class="seg-sec__t">MIS SOLICITUDES</h3></section>');
    if (!P.solicitudes.length) {
      s.appendChild(K.nodo('<p class="seg-nada">Todavía no le has pedido nada a Prensa desde la app.</p>'));
      return s;
    }
    var conteos = { '': P.solicitudes.length };
    P.solicitudes.forEach(function (x) { conteos[x.estado] = (conteos[x.estado] || 0) + 1; });
    var ops = [{ valor: '', texto: 'Todas' }];
    ['PENDIENTE', 'EN PROCESO', 'REALIZADA'].forEach(function (e) { if (conteos[e]) ops.push({ valor: e, texto: estadoTexto(e) + 's', tono: estadoTono(e) === 'ok' ? 'ok' : 'aviso' }); });
    var fil = K.nodo('<div></div>');
    s.appendChild(fil);
    var lista = K.nodo('<div class="tr-lista"></div>');
    s.appendChild(lista);
    if (FILTRO_PRENSA && !conteos[FILTRO_PRENSA]) FILTRO_PRENSA = '';
    var pp = K.piezas.pastillas.montar(fil, { opciones: ops, valor: FILTRO_PRENSA, alCambiar: function (v) { FILTRO_PRENSA = v || ''; pintar(); } });
    if (pp && pp.conteos) pp.conteos(conteos);

    function pintar() {
      lista.innerHTML = '';
      P.solicitudes.filter(function (x) { return !FILTRO_PRENSA || x.estado === FILTRO_PRENSA; }).forEach(function (x) {
        var tono = estadoTono(x.estado);
        var d = K.nodo(
          '<details class="tr-sol tr-sol--' + tono + '">' +
          '  <summary>' +
          '    <span class="tr-sol__cab"><b>' + K.esc(x.codigo) + '</b><span class="tr-est tr-est--' + tono + '">' + K.esc(estadoTexto(x.estado)) + '</span></span>' +
          '    <span class="tr-sol__t">' + K.esc(x.evento || resumen(x.detalles, 90)) + '</span>' +
          '    <span class="tr-sol__meta">' + K.esc(['Pedida el ' + x.fecha, x.publicacion ? 'para el ' + x.publicacion : ''].filter(Boolean).join(' · ')) + '</span>' +
          (x.asignado ? '<span class="tr-sol__quien">' + K.icono('check', 13) + ' <span class="tr-sol__cara"></span>La atiende ' + K.esc(nombrePropio(x.asignado)) + '</span>' : '') +
          '  </summary>' +
          '  <div class="tr-sol__cuerpo">' + pasos(x.estado) +
          '    <div class="tr-chips tr-chips--quietas">' + x.requerimientos.map(function (r) { return '<span class="kit-pastilla">' + K.esc(r) + '</span>'; }).join('') + '</div>' +
          '    <p class="tr-sol__det">' + K.esc(x.detalles).replace(/\n/g, '<br>') + '</p>' +
          '    <dl class="seg-datos">' +
          dato('Evento', x.evento) + dato('Fecha del evento', [x.fechaEvento, x.horaInicio && x.horaFin ? x.horaInicio + ' a ' + x.horaFin : x.horaInicio].filter(Boolean).join(' · ')) +
          dato('Lugar', x.lugar) + dato('Otros', x.otros) + dato('Cargo', x.cargo) +
          '    </dl>' +
          '  </div>' +
          '</details>'
        );
        /* 4.9 · la cara de quien atiende en Prensa (o sus iniciales) */
        var hueco = d.querySelector('.tr-sol__cara');
        if (hueco && K.piezas.personas) hueco.appendChild(K.piezas.personas.avatar(x.asignado, { tam: 22, sinZoom: true }));
        else if (hueco) hueco.remove();
        lista.appendChild(d);
      });
    }
    pintar();
    return s;
  }

  function dato(t, v) {
    v = String(v || '').trim();
    return v ? '<div class="seg-dato"><dt>' + K.esc(t) + '</dt><dd>' + K.esc(v) + '</dd></div>' : '';
  }

  function resumen(t, n) {
    var s = String(t || '').replace(/\s+/g, ' ').trim();
    return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s;
  }

  function nombrePropio(s) {
    return String(s || '').toLowerCase().replace(/(^|[\s,])([a-záéíóúñü])/g, function (t, a, l) { return a + l.toUpperCase(); });
  }

  /* ══════════════ SOLICITUD TESORERÍA ══════════════ */

  function vistaTesoreria(sub) {
    var c = caja();
    var p = K.pedir('tesoreriaEstado', {}, { ms: 60000 }).then(function (r) { TESO = r; return r; });
    K.piezas.esqueletos.mientras(c, p, { forma: 'ficha', cuantos: 2, espera: 'Trayendo tus cuentas y tus solicitudes' })
      .then(function () { pintarTesoreria(c, sub === 'nueva'); })
      ['catch'](function (e) {
        c.appendChild(errorCaja(e, function () { app.innerHTML = ''; vistaTesoreria(sub); }));
        K.piezas.creditos.montar(c);
      });
  }

  function pintarTesoreria(c, abrirForm) {
    c.innerHTML = '';
    c.appendChild(K.nodo(
      '<section class="kit-tarjeta tr-cab">' +
      '  <span class="tr-cab__ico">' + K.icono('moneda', 24) + '</span>' +
      '  <div class="tr-cab__txt"><h2 class="tr-cab__t">SOLICITUD TESORERÍA</h2>' +
      '  <p class="tr-cab__p">Pregunta a Tesorería por el pago de una cuenta o haz otra consulta. ' +
      'Por el pago se puede preguntar cuando la cuenta ya tiene <b>egreso</b> y han pasado <b>' + TESO.habiles + ' días hábiles</b>.</p>' +
      '  <p class="tr-cab__p">Antes de escribir, mira en qué va tu cuenta: ahí están el egreso, la fecha de pago y el comprobante.</p>' +
      '  <a class="kit-btn kit-btn--plano tr-cab__ir" href="#/seguimiento/egresos">' + K.icono('documento', 16) + ' Ver mis egresos</a></div>' +
      '</section>'
    ));

    var zona = K.nodo('<section class="kit-tarjeta tr-nueva"></section>');
    var boton = K.nodo('<button type="button" class="kit-btn kit-btn--marca tr-nueva__b">' + K.icono('mas', 18) + ' Nueva solicitud a Tesorería</button>');
    zona.appendChild(boton);
    boton.addEventListener('click', function () {
      boton.hidden = true;
      zona.appendChild(formTesoreria(c, function () { boton.hidden = false; }));
      zona.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    c.appendChild(zona);
    if (abrirForm) boton.click();

    c.appendChild(misTesoreria());
    K.piezas.creditos.montar(c);
  }

  function formTesoreria(c, alCerrar) {
    var D = { tipo: '', informe: 0, texto: '' };
    var f = K.nodo('<form class="formulario tr-form" novalidate><h3 class="grupo__t">Nueva solicitud</h3></form>');

    var tipos = K.nodo('<div class="tr-tipos" role="radiogroup" aria-label="De qué trata"></div>');
    [['PAGO', 'moneda', 'El pago de una cuenta', 'Egreso, comprobante o el giro'],
     ['OTRA', 'comentario', 'Otra consulta', 'Retenciones, certificados u otra duda']].forEach(function (t) {
      var b = K.nodo('<button type="button" role="radio" aria-checked="false" class="tr-tipo" data-v="' + t[0] + '">' +
        '<span class="tr-tipo__ico">' + K.icono(t[1], 20) + '</span><span><b>' + t[2] + '</b><small>' + t[3] + '</small></span></button>');
      b.addEventListener('click', function () {
        D.tipo = t[0];
        [].forEach.call(tipos.children, function (x) { x.setAttribute('aria-checked', x === b ? 'true' : 'false'); });
        cuentas.hidden = D.tipo !== 'PAGO';
        if (D.tipo !== 'PAGO') D.informe = 0;
      });
      tipos.appendChild(b);
    });
    var cTipo = K.nodo('<div class="campo"><span>¿De qué trata? <i class="tr-oblig" aria-hidden="true">*</i></span></div>');
    cTipo.appendChild(tipos);
    f.appendChild(cTipo);

    var cuentas = K.nodo('<div class="campo tr-cuentas" hidden><span>¿Por cuál cuenta preguntas? <i class="tr-oblig" aria-hidden="true">*</i></span></div>');
    var lista = K.nodo('<div class="tr-cuentas__lista" role="radiogroup" aria-label="Tus cuentas"></div>');
    cuentas.appendChild(lista);
    if (!TESO.cuentas.length) {
      lista.appendChild(K.nodo('<p class="seg-nada">Todavía no tienes cuentas con orden de pago o egreso. Mira en qué va tu cuenta en ' +
        '<a href="#/seguimiento">Estado de cuenta</a>.</p>'));
    }
    TESO.cuentas.slice().reverse().forEach(function (x) {
      var b = K.nodo('<button type="button" role="radio" aria-checked="false" class="tr-cta' + (x.puede ? '' : ' tr-cta--no') + '"' + (x.puede ? '' : ' aria-disabled="true"') + '>' +
        '<span class="tr-cta__cab"><b>Cuenta ' + x.informe + (x.total ? ' de ' + x.total : '') + '</b><span class="tr-est tr-est--' + (x.estado === 'PAGADA' ? 'ok' : 'aviso') + '">' + K.esc(x.estado) + '</span></span>' +
        '<small>' + K.esc([x.valor ? pesos(x.valor) : '', x.egreso ? 'Egreso ' + x.egreso : '', x.fechaEgreso ? 'del ' + x.fechaEgreso : ''].filter(Boolean).join(' · ')) + '</small>' +
        (x.puede ? '' : '<small class="tr-cta__por">' + K.icono('reloj', 13) + ' ' + K.esc(textoTildes(x.motivo)) + '</small>') + '</button>');
      b.addEventListener('click', function () {
        if (!x.puede) { K.aviso(textoTildes(x.motivo), 'aviso', 6000); return; }
        D.informe = x.informe;
        [].forEach.call(lista.querySelectorAll('.tr-cta'), function (y) { y.setAttribute('aria-checked', y === b ? 'true' : 'false'); });
      });
      lista.appendChild(b);
    });
    f.appendChild(cuentas);

    var tx = K.nodo('<textarea rows="5" maxlength="3000" placeholder="Cuéntale a Tesorería qué necesitas, con el mayor detalle posible."></textarea>');
    var n = K.nodo('<small class="tr-cuenta">0 / 3000</small>');
    var cTx = campo('Tu solicitud', '', tx, true);
    cTx.appendChild(n);
    tx.addEventListener('input', function () {
      D.texto = tx.value;
      n.textContent = tx.value.length + ' / 3000';
      cTx.classList.toggle('campo--ok', tx.value.trim().length >= 10);
    });
    f.appendChild(cTx);

    var pie = K.nodo('<div class="campo-fila campo-fila--botones"></div>');
    var no = K.nodo('<button type="button" class="kit-btn kit-btn--plano">Cancelar</button>');
    var si = K.nodo('<button type="submit" class="kit-btn kit-btn--marca">' + K.icono('enviar', 16) + ' Revisar y enviar</button>');
    pie.appendChild(no); pie.appendChild(si);
    f.appendChild(pie);
    no.addEventListener('click', function () { f.remove(); if (alCerrar) alCerrar(); });

    f.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var falta = !D.tipo ? 'Elige de qué trata tu solicitud.'
        : (D.tipo === 'PAGO' && !D.informe) ? 'Elige la cuenta por la que preguntas.'
        : (String(D.texto).trim().length < 10) ? 'Redacta tu solicitud con más detalle.' : '';
      if (falta) { K.aviso(falta, 'aviso', 5000); return; }
      var cta = null;
      TESO.cuentas.forEach(function (x) { if (x.informe === D.informe) cta = x; });
      K.piezas.confirmar.abrir({
        titulo: 'Resumen de tu solicitud',
        lista: [
          ['Trata de', D.tipo === 'PAGO' ? 'El pago de una cuenta' : 'Otra consulta'],
          cta ? ['Cuenta', cta.informe + (cta.total ? ' de ' + cta.total : '') + (cta.egreso ? ' · Egreso ' + cta.egreso : '')] : null,
          ['Solicitud', D.texto.trim().length > 160 ? D.texto.trim().slice(0, 159) + '…' : D.texto.trim()]
        ].filter(Boolean),
        nota: 'Le avisamos al grupo de Tesorería. La respuesta la vas a ver aquí mismo.',
        si: 'Enviar', no: 'Editar'
      }).then(function (ok) { if (ok) enviarTesoreria(D); });
    });
    return f;
  }

  function enviarTesoreria(D) {
    K.ocupado = true;
    K.piezas.guardado.abrir({
      titulo: 'Enviando tu solicitud a Tesorería',
      sub: 'No cierres la app hasta que termine.',
      pasos: ['Comprobando tu cuenta', 'Guardando la solicitud', 'Avisando a Tesorería']
    });
    K.pedir('tesoreriaSolicitar', { tipo: D.tipo, informe: D.informe || '', texto: D.texto }, { ms: 90000 })
      .then(function (r) {
        K.ocupado = false;
        K.piezas.guardado.listo({ sub: 'Quedó con el código ' + r.codigo + '.' });
        var aviso = r && r.aviso;
        setTimeout(function () {
          if (aviso && aviso.ok === false) {
            K.piezas.confirmar.avisar({
              titulo: 'El aviso a Tesorería no salió',
              texto: 'Tu solicitud ' + r.codigo + ' SÍ quedó registrada, pero el WhatsApp al grupo de Tesorería no se pudo enviar.',
              nota: 'Coméntaselo a la oficina de Tesorería para que la busquen.',
              si: 'Entendido'
            });
          }
          app.innerHTML = ''; vistaTesoreria();
        }, 1500);
      })
      ['catch'](function (e) {
        K.ocupado = false;
        K.piezas.guardado.fallo();
        K.aviso(textoTildes((e && e.message) || 'No se pudo enviar.'), 'malo', 9000);
      });
  }

  function misTesoreria() {
    var s = K.nodo('<section class="kit-tarjeta tr-mias"><h3 class="seg-sec__t">MIS SOLICITUDES</h3></section>');
    if (!TESO.solicitudes.length) {
      s.appendChild(K.nodo('<p class="seg-nada">Todavía no le has escrito a Tesorería desde la app.</p>'));
      return s;
    }
    var lista = K.nodo('<div class="tr-lista"></div>');
    TESO.solicitudes.forEach(function (x) {
      var respondida = !!String(x.respuesta || '').trim();
      var tono = respondida ? 'ok' : estadoTono(x.estado);
      var d = K.nodo(
        '<article class="tr-sol tr-sol--' + tono + ' tr-sol--abierta">' +
        '  <div class="tr-sol__cab"><b>' + K.esc(x.codigo) + '</b><span class="tr-est tr-est--' + tono + '">' +
        K.esc(respondida ? 'Respondida' : estadoTexto(x.estado)) + '</span></div>' +
        '  <span class="tr-sol__meta">' + K.esc(['Enviada el ' + String(x.fecha || '').split(' ')[0],
          x.informe ? 'Cuenta ' + x.informe : '', x.tipo ? x.tipo.charAt(0) + x.tipo.slice(1).toLowerCase() : ''].filter(Boolean).join(' · ')) + '</span>' +
        '  <p class="tr-sol__det">' + K.esc(x.solicitud).replace(/\n/g, '<br>') + '</p>' +
        (respondida
          ? '<div class="tr-resp"><p class="tr-resp__t">' + K.icono('comentario', 15) + ' Respuesta de Tesorería' + (x.fechaRespuesta ? ' · ' + K.esc(String(x.fechaRespuesta).split(' ')[0]) : '') + '</p>' +
            '<p>' + K.esc(x.respuesta).replace(/\n/g, '<br>') + '</p></div>'
          : '<p class="tr-sin-resp">' + K.icono('reloj', 14) + ' Todavía sin respuesta.</p>') +
        '</article>'
      );
      lista.appendChild(d);
    });
    s.appendChild(lista);
    return s;
  }

  window.TRAMITES = {
    prensa: vistaPrensa,
    tesoreria: vistaTesoreria,
    /* para el banco de pruebas */
    _textoTildes: textoTildes,
    _faltaPrensa: faltaPrensa
  };
}());
