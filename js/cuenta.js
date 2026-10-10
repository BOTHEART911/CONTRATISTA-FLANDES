/* ============================================================
   CONTRATISTA-FLANDES · INGRESAR Y CORREGIR CUENTA
   Ecosistema Flandes · Fase 4, entrega 4.3

   Lo que se hace distinto a la app vieja

     · No es un formulario de 460 líneas seguidas. Son cuatro bloques
       con un índice que dice cuál está listo y cuál no, y se entra al
       que se quiera. En la app vieja había que bajar por todo para
       saber qué faltaba.

     · Lo escrito no se pierde. Cada cambio se guarda en el teléfono
       (respaldo local) y se borra en cuanto el CORE confirma. En la
       app vieja, cerrar la pestaña a medias era volver a empezar.

     · Los PDF suben de uno en uno y quedan guardados al instante. La
       app vieja mandaba los 21 juntos con el resto de la cuenta en
       una sola petición de dos minutos; cuando se perdía la respuesta,
       la persona veía un 404, reenviaba, y los archivos se duplicaban
       en Drive. Aquí lo subido está subido.

     · Los documentos se generan en un paso aparte y avisado. Si se
       corta la conexión, se vuelve a pedir ese paso y nada se duplica.

   El CORE es el que manda: el nuevo saldo, el 1% del fondo solidario y
   las fechas de radicación válidas los calcula él. Aquí se enseñan para
   que la persona los vea antes de guardar, no para decidirlos.

   Pareja de estilos: la sección "cuenta" de styles.css
   ============================================================ */
(function () {
  'use strict';

  var K = window.KIT;
  var app = K.id('app');

  var E = null;          /* lo que respondió cuentaEstado */
  var D = {};            /* lo que la persona lleva escrito */
  var BLOQUE = null;     /* el bloque abierto, o null si el índice */
  /* 10/10 · #/cuenta/editar: la cuenta guardada y sin reportar se vuelve a abrir.
     Cada viaje de la vista lleva editar:true para que el CORE abra esa fila. */
  var EDITANDO = false;
  function conEd(o) { o = o || {}; if (EDITANDO) o.editar = true; return o; }
  var RESPALDO = 'cuenta.borrador';

  /* ══════════════ los cuatro bloques ══════════════ */

  var BLOQUES = [
    {
      /* 28/09 · la fecha de radicación ya no va aquí: se elige al final, al
         guardar, igual en INGRESAR y en CORREGIR CUENTA (Oss). */
      id: 'fechas', titulo: 'Periodo',
      pista: 'Qué periodo estás cobrando',
      campos: ['inicioPeriodo', 'finPeriodo']
    },
    {
      id: 'pago', titulo: 'Relación de pago',
      pista: 'Saldo, lo que cobras y tu factura',
      campos: ['saldo', 'cobro']
    },
    {
      id: 'planilla', titulo: 'Relación de planilla',
      pista: 'Tu planilla de seguridad social ya pagada',
      campos: ['planilla', 'mesPlanilla', 'base', 'salud', 'pension', 'riesgos']
    },
    {
      id: 'documentos', titulo: 'Documentos',
      pista: 'Los tres obligatorios y los que apliquen a tu caso',
      campos: []
    }
  ];

  /*
   * QUÉ ACEPTA CADA CASILLA (regla de Oss, 22/09/2026)
   *
   * Todos los documentos van en PDF, MENOS los dos BAUCHER: el comprobante
   * de pago de la planilla casi siempre es una captura del banco o del
   * datáfono, no un PDF. Esos dos aceptan imagen Y PDF; los demás siguen
   * siendo PDF, que es como los recibe Contratación.
   *
   * Se listan también las EXTENSIONES y no solo los tipos MIME a propósito:
   * varios navegadores de Android mandan el archivo con el tipo vacío, y
   * entonces un PDF de verdad se rechazaba con "no es un tipo admitido".
   */
  var SOLO_PDF = 'application/pdf,.pdf';
  var IMAGEN_O_PDF = 'application/pdf,image/png,image/jpeg,.pdf,.png,.jpg,.jpeg';

  /* Los documentos, en el orden en que se piden. 'obliga' son los tres sin
     los que Contratación no recibe la cuenta. */
  var ARCHIVOS = [
    { k: 'bancaria',   t: 'Certificación bancaria',      obliga: true,  nota: 'Sin contraseña' },
    { k: 'baucher1',   t: 'Baucher de la planilla',      obliga: true,  nota: 'Foto o PDF', acepta: IMAGEN_O_PDF },
    { k: 'planilla1',  t: 'Planilla',                    obliga: true,  nota: 'Sin contraseña' },
    /* 05/10 · el adjunto general de la cuenta se SUPRIME: ahora cada obligación lleva su archivo
       de evidencia (BORRADOR ACTIVIDADES). Solo sale si el CORE todavía no lo sabe (sin desplegar). */
    { k: 'anexos',     t: 'Anexos de actividades',       obliga: false, nota: 'Todo en un solo PDF', mb: 10, viejo: true },
    /* 10/10 · Los opcionales van dentro de una pestaña que el contratista abre
       y cierra a voluntad (ninguna obliga). Abre sola si ya hay archivo. */
    { k: 'baucher2',   t: 'Baucher planilla anexa',      obliga: false, nota: 'Foto o PDF', acepta: IMAGEN_O_PDF, pestana: 'anexa' },
    { k: 'planilla2',  t: 'Planilla anexa',              obliga: false, nota: 'Sin contraseña', pestana: 'anexa' },
    /* 30/09 · Va en BANCO Y PLANILLA y la revisión la muestra en la pestaña
       Relación de planilla (FC_ARCHIVOS_CUENTA.arlAlcaldia). */
    { k: 'arlAlcaldia', t: 'Planilla ARL suministrada por la Alcaldía', obliga: false, nota: 'Riesgo elevado', nuevo: true, pestana: 'arl' },
    { k: 'otroR',      t: 'Otro documento requerido',    obliga: false, nota: 'El que te pidió tu supervisor(a)', pestana: 'otro' },
    { k: 'rutSimple',  t: 'RUT (Régimen Simple)',        obliga: false, nota: 'Con la responsabilidad de IVA', pestana: 'iva' },
    { k: 'facturaPdf', t: 'Factura electrónica',         obliga: false, nota: 'PDF de la factura', pestana: 'factura' },
    { k: 'parafiscales', t: 'Certificado parafiscales',  obliga: false, nota: 'Aportes parafiscales', pestana: 'parafiscales' },
    { k: 'noPension',  t: 'Certificado NO aportes a pensión', obliga: false, nota: 'Pensionados', pestana: 'pension' },
    { k: 'actaInicio', t: 'Acta de inicio',              obliga: false, nota: 'Solo primera cuenta', grupo: 'primera' },
    { k: 'clausulados', t: 'Clausulados del contrato',   obliga: false, nota: 'Solo primera cuenta', grupo: 'primera' },
    { k: 'cdp',        t: 'CDP',                         obliga: false, nota: 'Solo primera cuenta', grupo: 'primera' },
    { k: 'rp',         t: 'RP',                          obliga: false, nota: 'Solo primera cuenta', grupo: 'primera' },
    { k: 'rutNatural', t: 'RUT persona natural',         obliga: false, nota: 'Solo primera cuenta', grupo: 'primera' },
    { k: 'arl',        t: 'Certificado ARL',             obliga: false, nota: 'Primera cuenta, adición incluida', grupo: 'primera' },
    { k: 'otrosi',     t: 'Otrosí',                      obliga: false, nota: 'Si aplica', grupo: 'primera' },
    { k: 'cdpAdicion', t: 'CDP adición',                 obliga: false, nota: 'Solo primera cuenta de adición', grupo: 'primera' },
    { k: 'rpAdicion',  t: 'RP adición',                  obliga: false, nota: 'Solo primera cuenta de adición', grupo: 'primera' }
  ];

  /* 10/10 · Pestañas de documentos opcionales, en el orden pedido por Oss. */
  var PESTANAS = [
    { k: 'anexa',        t: 'Adjuntaré planilla anexa' },
    { k: 'arl',          t: 'La Alcaldía realiza mis aportes a ARL' },
    { k: 'otro',         t: 'Mi supervisor(a) solicitó un documento' },
    { k: 'iva',          t: 'En mi RUT SÍ soy responsable de IVA' },
    { k: 'factura',      t: 'Manejo factura electrónica' },
    { k: 'parafiscales', t: 'Presento certificado de aportes parafiscales' },
    { k: 'pension',      t: 'No aporto a pensión' }
  ];

  /* ══════════════ entrada ══════════════ */

  function abrir(sub) {
    app.innerHTML = '';
    EDITANDO = sub === 'editar';
    var caja = K.nodo('<div class="kit-ancho vista cuenta"></div>');
    app.appendChild(caja);

    /* 01/10 · CANDADO DE LA PRIMERA CUENTA. Si el arranque ya dice que la
       próxima es la cuenta 1 y que faltan datos del contrato, la puerta se
       pinta YA, sin viaje y antes de llenar nada. El CORE tiene el mismo
       candado (puerta 'contrato'), así que esto solo ahorra la espera. */
    var cand = candado();
    if (cand) {
      E = { puerta: 'contrato', informe: 1, faltanContrato: cand.faltan, faltanDeContratacion: cand.deContratacion };
      D = {};
      BLOQUE = null;
      if (K.piezas.banner) K.piezas.banner.vista('INGRESAR CUENTA');
      pintar(caja);
      return;
    }

    K.piezas.esqueletos.mientras(caja, cargar(), { forma: 'texto', cuantos: 5 })
      .then(function () {
        BLOQUE = sub && porId(sub) ? sub : null;
        /* El rótulo del banner dice lo que de verdad toca hoy: ingresar o
           corregir. Son dos opciones distintas del menú de siempre. */
        if (K.piezas.banner) {
          K.piezas.banner.vista(rotulo());
        }
        pintar(caja);
      })
      ['catch'](function (e) { caja.appendChild(error(e)); });
  }

  /* Lo que sabe la app (app.js) del contrato y de si la próxima es la cuenta 1. */
  function candado() {
    var c = window.CONTRATISTA_CANDADO;
    return (c && c.estado) ? c.estado() : null;
  }

  /* El candado escrito por la app y no por el CORE: con un CORE sin desplegar,
     la cuenta 1 por ingresar y el contrato sin diligenciar se cierran igual. */
  function candadoLocal(d) {
    if (!d || d.puerta !== 'ingresar' || d.nueva || Number(d.informe) !== 1) return;
    var c = window.CONTRATISTA_CANDADO && window.CONTRATISTA_CANDADO.contrato();
    if (!c || c.yaDiligenciado !== false) return;
    d.puerta = 'contrato';
    d.faltanContrato = c.faltanContrato || [];
    d.faltanDeContratacion = !!c.faltanDeContratacion;
  }

  /* 10/10 · el rótulo de la vista: ingresar, corregir o editar */
  function rotulo() {
    if (E && E.edicion) return E.puerta === 'corregir' ? 'EDITAR CORRECCIÓN' : 'EDITAR CUENTA';
    return E && E.puerta === 'corregir' ? 'CORREGIR CUENTA' : 'INGRESAR CUENTA';
  }

  function cargar() {
    return K.pedir('cuentaEstado', conEd()).then(function (d) {
      /* un CORE que aún no sabe editar responde la puerta de siempre: se sigue sin el modo */
      if (EDITANDO && !d.edicion) EDITANDO = false;
      candadoLocal(d);
      E = d;
      D = {};
      /* Lo que ya esté en la hoja manda sobre el respaldo del teléfono:
         si se guardó, es lo bueno. El respaldo solo rellena los huecos. */
      var guardado = K.guardar.leer(RESPALDO + '.' + E.idContrato, null);
      if (guardado && guardado.informe === E.informe) D = guardado.datos || {};
      Object.keys(E.campos || {}).forEach(function (k) {
        if (String(E.campos[k] || '').trim()) D[k] = E.campos[k];
      });
      if (!D.saldo && E.saldoSugerido) D.saldo = E.saldoSugerido;
      /* 5.2 · contrato cedido: el RP de la cesión es obligatorio en la
         cuenta mientras Contabilidad no lo haya usado. Se propone el que
         ya escribió en una cuenta anterior. */
      var pago = porId('pago');
      var pide = !!(E.rpCesion && E.rpCesion.pedir);
      var i = pago.campos.indexOf('rpCesion');
      if (pide && i < 0) pago.campos.push('rpCesion');
      if (!pide && i >= 0) pago.campos.splice(i, 1);
      if (pide && !D.rpCesion && E.rpCesion.final) D.rpCesion = E.rpCesion.final;
      return E;
    });
  }

  function porId(id) {
    for (var i = 0; i < BLOQUES.length; i++) if (BLOQUES[i].id === id) return BLOQUES[i];
    return null;
  }

  function recordar() {
    K.guardar.escribir(RESPALDO + '.' + E.idContrato, { informe: E.informe, datos: D });
  }

  /* ══════════════ pintado ══════════════ */

  function pintar(caja) {
    caja.innerHTML = '';

    if (E.puerta !== 'ingresar' && E.puerta !== 'corregir') {
      caja.appendChild(puertaCerrada());
      K.piezas.creditos.montar(caja);
      return;
    }

    if (BLOQUE) { caja.appendChild(pintarBloque(caja)); return; }

    caja.appendChild(cabecera());
    caja.appendChild(indice(caja));
    caja.appendChild(pieDeAccion(caja));
    K.piezas.creditos.montar(caja);
  }

  /* 01/10 · la puerta del contrato: qué falta y el botón que lleva a llenarlo.
     Los textos se arman aquí también, para el caso en que se pinta sin haber
     preguntado al CORE. */
  function puertaContrato() {
    var faltan = E.faltanContrato || [];
    var deContr = !!E.faltanDeContratacion;
    var s = K.nodo('<section class="kit-tarjeta cta-cerrada cta-candado"></section>');
    s.appendChild(K.nodo('<p class="cta-candado__ico" aria-hidden="true">' + K.icono('candado', 30) + '</p>'));
    s.appendChild(K.nodo('<h3 class="grupo__t">Primero completa los datos de tu contrato</h3>'));
    s.appendChild(K.nodo('<p class="cta-cerrada__p">Para ingresar tu primera cuenta tienen que estar todos los datos ' +
      'del contrato: van impresos en los formatos de tus cuentas.' +
      (deContr ? ' Algunos los registra Contratación: pídeselos.' : '') + '</p>'));
    if (faltan.length) {
      var l = K.nodo('<div class="cta-candado__faltan" aria-label="Lo que falta"></div>');
      l.appendChild(K.nodo('<span class="cta-candado__rot">' + (faltan.length === 1 ? 'Te falta' : 'Te faltan') + '</span>'));
      faltan.forEach(function (f) {
        l.appendChild(K.nodo('<span class="kit-pastilla kit-pastilla--aviso">' + K.esc(f) + '</span>'));
      });
      s.appendChild(l);
    }
    var b = K.nodo('<button type="button" class="kit-btn kit-btn--marca">' +
      K.icono(deContr ? 'enviar' : 'lapiz', 17) + ' ' +
      (deContr ? 'Ir a SOLICITUD CONTRATACIÓN' : 'Completar DATOS DEL CONTRATO') + '</button>');
    b.addEventListener('click', function () {
      K.vibrar(8);
      location.hash = deContr ? '#/contratacion' : '#/proceso/completar';
    });
    s.appendChild(b);
    return s;
  }

  function puertaCerrada() {
    if (E.puerta === 'contrato') return puertaContrato();
    var s = K.nodo('<section class="kit-tarjeta cta-cerrada"></section>');
    /* 4.4: ya no hay puerta 'faltan'. Desde esta entrega se ENTRA a la
       cuenta con el borrador a medias, igual que en la app vieja, y lo que
       falta se avisa en el índice y bloquea el botón de radicar. Aquí solo
       quedan los casos en los que de verdad no hay nada que hacer. */
    /* 28/09 · el título y el paso siguiente los da el CORE según el estado
       real de la cuenta (INGRESADA → reportarla, REPORTADA → la revisa el
       supervisor…). Antes todo lo que no fuera ingresar decía "ya está
       radicada" y hablaba de la cuenta siguiente. */
    var titulos = {
      sinBorrador: 'Primero empieza tu borrador',
      espera: 'Tu cuenta sigue en trámite',
      turno: 'Tu cuenta anterior sigue en trámite'
    };
    s.appendChild(K.nodo('<h3 class="grupo__t">' + K.esc(E.titulo || titulos[E.puerta] || 'Todavía no') + '</h3>'));
    s.appendChild(K.nodo('<p class="cta-cerrada__p">' + K.esc(E.motivo || '') + '</p>'));
    var destino = E.puerta === 'sinBorrador' ? 'borrador' : E.ir;
    if (destino) {
      var texto = E.puerta === 'sinBorrador' ? 'Ir a BORRADOR ACTIVIDADES' : (E.boton || 'Ir a ESTADO DE CUENTA');
      var b = K.nodo('<button type="button" class="kit-btn kit-btn--marca">' + K.esc(texto) + '</button>');
      b.addEventListener('click', function () { K.vibrar(8); location.hash = '#/' + destino; });
      s.appendChild(b);
    }
    /* 10/10 · guardada y sin reportar: todavía se puede editar */
    if (E.editable) {
      var be = K.nodo('<button type="button" class="kit-btn cta-editar">' + K.icono('lapiz', 16) + ' ' + K.esc(E.editable.boton || 'EDITAR CUENTA') + '</button>');
      be.addEventListener('click', function () { K.vibrar(8); location.hash = '#/cuenta/editar'; });
      s.appendChild(be);
    }
    return s;
  }

  function cabecera() {
    var s = K.nodo('<section class="cta-cab"></section>');
    var corrige = E.puerta === 'corregir';
    s.appendChild(K.nodo(
      '<div class="cta-cab__fila">' +
      '  <span class="kit-pastilla ' + (corrige ? 'kit-pastilla--aviso' : 'kit-pastilla--ok') + '">' +
      rotulo() + '</span>' +
      '  <span class="cta-cab__inf">Informe ' + K.esc(E.informe) + (E.total ? ' de ' + K.esc(E.total) : '') + '</span>' +
      '</div>'
    ));
    if (corrige && E.observaciones) {
      s.appendChild(K.nodo(
        '<div class="cta-devuelta">' +
        '  <b>' + (E.incompleta ? 'Lo que te pidieron completar' : 'Lo que te pidieron corregir') + '</b>' +
        '  <p>' + K.esc(E.observaciones) + '</p>' +
        '</div>'
      ));
    }
    /* F11 · cuenta siguiente ingresada directo (la anterior ya llegó al
       umbral): todavía no tiene fila; nace al subir el primer archivo o al
       radicar. Las actividades se escriben en el borrador cuando quiera. */
    if (E.nueva) {
      s.appendChild(K.nodo('<p class="cta-cab__nota">' + K.esc(E.motivo || '') + '</p>'));
    }
    if (corrige) {
      s.appendChild(K.nodo('<p class="cta-cab__nota">' + (E.incompleta
        ? 'Adjunta lo que te pidieron y guarda la corrección; la fecha de radicación la eliges al final.'
        : 'Cambia solo lo que haga falta y reemplaza los archivos que te indicaron; la fecha de radicación la eliges al final.') +
        ' Después repórtala en <b>ESTADO DE CUENTA</b> eligiendo <b>CORRECCIÓN</b>.</p>'));
    }
    return s;
  }

  /* El índice: de un vistazo, qué falta. Es lo que la app vieja no tenía. */
  function indice(caja) {
    var ul = K.nodo('<ul class="cta-indice"></ul>');
    /* 4.4: las actividades son el primer renglón. En la app vieja estaban
       DENTRO de esta misma pantalla; aquí viven en el borrador, así que lo
       que se enseña es cómo van y un atajo para ir a terminarlas. */
    ul.appendChild(renglonActividades());
    BLOQUES.forEach(function (b) {
      var est = estadoBloque(b);
      var li = K.nodo(
        '<li class="cta-idx cta-idx--' + est.clase + '">' +
        '  <button type="button" class="cta-idx__btn">' +
        '    <span class="cta-idx__marca" aria-hidden="true">' + est.icono + '</span>' +
        '    <span class="cta-idx__txt">' +
        '      <span class="cta-idx__t">' + K.esc(b.titulo) + '</span>' +
        '      <span class="cta-idx__p">' + K.esc(est.detalle || b.pista) + '</span>' +
        '    </span>' +
        '  </button>' +
        '</li>'
      );
      li.querySelector('button').addEventListener('click', function () {
        K.vibrar(8);
        BLOQUE = b.id;
        pintar(caja);
        window.scrollTo(0, 0);
      });
      ul.appendChild(li);
    });
    return ul;
  }

  function estadoBloque(b) {
    if (b.id === 'documentos') {
      var faltan = ARCHIVOS.filter(function (a) { return a.obliga && !tieneArchivo(a.k); });
      if (!faltan.length) {
        var n = ARCHIVOS.filter(function (a) { return tieneArchivo(a.k); }).length;
        return { clase: 'ok', icono: K.icono('check', 15), detalle: n + (n === 1 ? ' documento cargado' : ' documentos cargados') };
      }
      return {
        clase: 'falta', icono: '!',
        detalle: 'Faltan ' + faltan.length + ' de los tres obligatorios'
      };
    }
    var vacios = b.campos.filter(function (c) { return !String(D[c] || '').trim(); });
    if (!vacios.length) return { clase: 'ok', icono: K.icono('check', 15), detalle: resumenBloque(b) };
    return {
      clase: 'falta', icono: '!',
      detalle: vacios.length === b.campos.length ? b.pista : ('Te faltan ' + vacios.length + ' datos')
    };
  }

  function resumenBloque(b) {
    if (b.id === 'fechas') return D.inicioPeriodo + ' a ' + D.finPeriodo;
    if (b.id === 'pago') return 'Cobras ' + K.pesos(D.cobro) + ' · queda ' + K.pesos(nuevoSaldo()) +
      (E.rpCesion && E.rpCesion.pedir ? ' · RP cesión ' + rpCesionCompleto() : '');
    if (b.id === 'planilla') return 'Planilla ' + D.planilla + ' de ' + D.mesPlanilla;
    return '';
  }

  function nuevoSaldo() {
    return K.aNumero(D.saldo) - K.aNumero(D.cobro);
  }

  function tieneArchivo(k) {
    return !!(E.archivos && E.archivos[k]);
  }

  /* ══════════════ el pie: guardar ══════════════ */

  function pieDeAccion(caja) {
    var s = K.nodo('<section class="cta-pie"></section>');
    var falta = loQueFalta();

    if (falta.length) {
      s.appendChild(K.nodo(
        '<p class="cta-pie__falta">Para radicar te falta: <b>' + K.esc(falta.join(', ')) + '</b></p>'
      ));
    }

    /* 28/09 · en la corrección se dice antes qué va a pasar: si solo cambió
       documentos, se guarda en segundos; si cambió datos del informe, se
       rehacen los formatos. El que decide de verdad es el CORE. */
    if (E.puerta === 'corregir' && !falta.length) {
      var rapida = caminoRapido();
      s.appendChild(K.nodo('<p class="cta-pie__camino cta-pie__camino--' + (rapida ? 'rapido' : 'completo') + '">' +
        K.icono(rapida ? 'cohete' : 'reloj', 15) + ' ' + (rapida
          ? 'Solo cambiaste documentos: tu corrección se guarda en segundos.'
          : 'Cambiaste datos del informe: se rehacen tus formatos (de medio minuto a dos minutos).') + '</p>'));
    }
    var b = K.nodo('<button type="button" class="kit-btn kit-btn--marca cta-pie__btn">' +
      (E.puerta === 'corregir' ? 'Guardar la corrección' : 'Radicar mi cuenta') + '</button>');
    if (falta.length) b.disabled = true;
    b.addEventListener('click', function () { confirmar(caja); });
    s.appendChild(b);
    return s;
  }

  /* 28/09 · lo mismo que compara el CORE (FC_cambioTexto_): la fecha de
     radicación no cuenta, porque cambia siempre y va en los dos formatos
     que se rehacen también en la corrección rápida. */
  var TEXTO_CORRECCION = ['inicioPeriodo', 'finPeriodo', 'saldo', 'cobro', 'planilla', 'mesPlanilla',
    'base', 'salud', 'pension', 'riesgos', 'caja', 'sena', 'icbf', 'facturaNum',
    'planillaA', 'mesPlanillaA', 'baseA', 'saludA', 'pensionA', 'riesgosA', 'cajaA', 'senaA', 'icbfA', 'rpCesion'];
  function caminoRapido() {
    if (E.puerta !== 'corregir' || E.rehacerActividades) return false;
    var antes = E.campos || {};
    return !TEXTO_CORRECCION.some(function (k) {
      if (D[k] === undefined) return false;
      var a = String(antes[k] === undefined || antes[k] === null ? '' : antes[k]).trim().toUpperCase();
      var n = String(D[k] === undefined || D[k] === null ? '' : D[k]).trim().toUpperCase();
      if (/^[\d.$ ,]+$/.test(a + n) && (a || n)) { a = String(K.aNumero(a)); n = String(K.aNumero(n)); }
      return a !== n;
    });
  }

  /* Cuántas actividades faltan, según lo que dijo el CORE al abrir. */
  function faltanActividades() {
    return (E.faltanActividades || []).length;
  }

  function renglonActividades() {
    /* 28/09 (2) · al corregir, BORRADOR ACTIVIDADES se abre sobre esta misma
       cuenta devuelta (Oss: las actividades son lo que más se devuelve). */
    var corrige = E.puerta === 'corregir';
    var n = faltanActividades();
    var ok = n === 0;
    var li = K.nodo(
      '<li class="cta-idx cta-idx--' + (ok ? 'ok' : 'falta') + '">' +
      '  <button type="button" class="cta-idx__btn">' +
      '    <span class="cta-idx__marca" aria-hidden="true">' +
           (ok ? K.icono('check', 15) : '!') + '</span>' +
      '    <span class="cta-idx__txt">' +
      '      <span class="cta-idx__t">Actividades del informe</span>' +
      '      <span class="cta-idx__p">' +
           (ok ? (corrige ? 'Toca para revisarlas o corregirlas, con sus evidencias' : 'Todas escritas')
               : (n === 1 ? 'Falta 1 obligación por escribir'
                          : 'Faltan ' + n + ' obligaciones por escribir')) +
      '      </span>' +
      '    </span>' +
      '  </button>' +
      '</li>'
    );
    li.querySelector('button').addEventListener('click', function () {
      K.vibrar(8);
      location.hash = '#/borrador';
    });
    return li;
  }

  function loQueFalta() {
    var falta = [];
    /* Sin las actividades escritas el CORE no deja radicar (lo comprueba
       FC_validarCuenta_), así que aquí se dice antes y no se deja pulsar. */
    if (faltanActividades()) falta.push('escribir tus actividades');
    BLOQUES.forEach(function (b) {
      var e = estadoBloque(b);
      if (e.clase !== 'ok') falta.push(b.titulo.toLowerCase());
    });
    return falta;
  }

  /* ══════════════ un bloque a pantalla completa ══════════════ */

  function pintarBloque(caja) {
    var b = porId(BLOQUE);
    var s = K.nodo('<section class="cta-bloque"></section>');

    var cab = K.nodo(
      '<header class="cta-bloque__cab">' +
      '  <button type="button" class="cta-bloque__volver">‹ Volver</button>' +
      '  <h3 class="cta-bloque__t">' + K.esc(b.titulo) + '</h3>' +
      '</header>'
    );
    cab.querySelector('button').addEventListener('click', function () {
      BLOQUE = null;
      recordar();
      pintar(caja);
      window.scrollTo(0, 0);
    });
    s.appendChild(cab);

    if (b.id === 'fechas') bloqueFechas(s);
    if (b.id === 'pago') bloquePago(s);
    if (b.id === 'planilla') bloquePlanilla(s);
    if (b.id === 'documentos') bloqueDocumentos(s);

    var sig = K.nodo('<button type="button" class="kit-btn kit-btn--marca cta-bloque__ok">Listo</button>');
    sig.addEventListener('click', function () {
      BLOQUE = null;
      recordar();
      pintar(caja);
      window.scrollTo(0, 0);
    });
    s.appendChild(sig);
    return s;
  }

  /* ---------- bloque 1: fechas ---------- */

  function bloqueFechas(s) {
    /* La fecha de radicación NO es un calendario libre: solo valen hoy y los
       dos hábiles siguientes, y eso lo decide el CORE. Enseñar un calendario
       entero para después rechazar 364 días es hacer perder el tiempo. */
    /* 28/09 · la fecha de radicación se elige al final, al guardar
       (fechasRadicacion más abajo). Aquí queda solo el periodo. */
    campoFecha(s, 'inicioPeriodo', 'Inicio del periodo', 'El primer día que estás cobrando');
    campoFecha(s, 'finPeriodo', 'Fin del periodo', 'El último día que estás cobrando');
  }

  function diaSemana(ddmmyyyy) {
    var p = String(ddmmyyyy).split('/');
    var d = new Date(+p[2], +p[1] - 1, +p[0]);
    return ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][d.getDay()];
  }

  function campoFecha(s, clave, titulo, pista) {
    var g = grupo(s, titulo, pista);
    var inp = K.nodo('<input type="text" class="cta-inp" readonly data-kit-fecha ' +
      'data-titulo="' + K.esc(titulo) + '" value="' + K.esc(D[clave] || '') + '" placeholder="dd/mm/aaaa">');
    inp.addEventListener('change', function () {
      /* La rueda del kit deja el valor en ISO (2026-09-21) y el texto de
         pantalla en dd/mm/aaaa. A la hoja va SIEMPRE dd/mm/aaaa, que es
         como está escrito el resto de CUENTAS: guardar el ISO aquí haría
         que el periodo se viera de una forma en la app y de otra en el
         formato de actividades. */
      D[clave] = K.fecha(inp.value.trim());
      recordar();
    });
    g.appendChild(inp);
    if (K.piezas.fechas) K.piezas.fechas.montar(g);
  }

  /* ---------- bloque 2: pago ---------- */

  function bloquePago(s) {
    campoPesos(s, 'saldo', 'Saldo actual',
      E.informe === 1 ? 'En tu primera cuenta es el valor del contrato. Revísalo.' : 'Lo que quedaba después de tu cuenta anterior.');
    campoPesos(s, 'cobro', 'Valor por cobrar', 'Lo que estás cobrando en esta cuenta.');

    var g = grupo(s, 'Nuevo saldo', 'Se calcula solo: saldo menos lo que cobras.');
    var out = K.nodo('<output class="cta-calc">' + K.esc(K.pesos(nuevoSaldo())) + '</output>');
    g.appendChild(out);

    K.$$('.cta-inp', s).forEach(function (i) {
      i.addEventListener('input', function () {
        var n = nuevoSaldo();
        out.textContent = n < 0 ? 'Revisa: cobras más de lo que te queda' : K.pesos(n);
        out.classList.toggle('cta-calc--mal', n < 0);
      });
    });

    campoTexto(s, 'facturaNum', 'N° de factura electrónica',
      'Solo si facturas electrónicamente. Si no, déjalo vacío: no escribas "no".');

    if (E.rpCesion && E.rpCesion.pedir) campoRpCesion(s);
  }

  /**
   * 5.2 · RP DE LA CESIÓN. Tu contrato lo recibiste por cesión: el pago sale
   * con el RP nuevo, no con el del contrato. Se escribe el final (el año lo
   * pone la app) y va a su propia columna: el RP original no se toca. Deja
   * de pedirse cuando Contabilidad lo usa en una orden de pago.
   */
  function campoRpCesion(s) {
    var anio = String(E.rpCesion.anio || new Date().getFullYear());
    var g = grupo(s, 'RP de la cesión (obligatorio)',
      'El Registro Presupuestal que se expidió para ti al ceder el contrato' +
      (E.rpCesion.cedente ? ' de ' + E.rpCesion.cedente : '') + '. Escribe solo los últimos dígitos.');
    var caja = K.nodo('<div class="rp cta-rp"><span class="rp__anio" aria-hidden="true">' + K.esc(anio) + '</span></div>');
    var inp = K.nodo('<input type="text" inputmode="numeric" class="rp__final cta-inp" data-campo="rpCesion" ' +
      'autocomplete="off" maxlength="6" placeholder="Ej: 87">');
    inp.value = D.rpCesion || '';
    caja.appendChild(inp);
    g.appendChild(caja);
    var eco = K.nodo('<p class="rp__eco" aria-live="polite"></p>');
    g.appendChild(eco);
    function repintar() {
      inp.value = inp.value.replace(/\D/g, '').slice(0, 6);
      D.rpCesion = inp.value;
      eco.textContent = inp.value ? 'Va a quedar como ' + rpCesionCompleto() : '';
      g.classList.toggle('campo--ok', !!inp.value);
      recordar();
    }
    inp.addEventListener('input', repintar);
    caja.querySelector('.rp__anio').addEventListener('click', function () { inp.focus(); });
    repintar();
  }

  function rpCesionCompleto() {
    var anio = String((E.rpCesion && E.rpCesion.anio) || new Date().getFullYear());
    return D.rpCesion ? anio + ('000000' + D.rpCesion).slice(-6) : '';
  }

  /* ---------- bloque 3: planilla ---------- */

  function bloquePlanilla(s) {
    campoTexto(s, 'planilla', 'N° de planilla', 'La planilla que YA pagaste.', 'numeric');

    var g = grupo(s, 'Mes relacionado en la planilla', 'El mes que aparece en tu planilla.');
    var sel = K.nodo('<select class="cta-inp"><option value="">Selecciona</option></select>');
    (E.meses || []).forEach(function (m) {
      var o = K.nodo('<option value="' + K.esc(m) + '">' + K.esc(m) + '</option>');
      if (K.norm(D.mesPlanilla) === m) o.selected = true;
      sel.appendChild(o);
    });
    sel.addEventListener('change', function () { D.mesPlanilla = sel.value; recordar(); });
    g.appendChild(sel);

    campoPesos(s, 'base', 'Base de cotización', 'El IBC, tal como aparece en tu planilla.');

    /* El fondo de solidaridad no se pregunta: es el 1% del IBC cuando pasa
       del umbral. Se enseña para que nadie se lleve la sorpresa en el pago. */
    var av = K.nodo('<p class="cta-aviso" hidden></p>');
    s.appendChild(av);
    var pintarSolidario = function () {
      var b = K.aNumero(D.base);
      if (b >= (E.umbralSolidario || 0) && b > 0) {
        av.hidden = false;
        av.innerHTML = 'Con esa base se te descuenta el <b>1% al fondo de solidaridad</b>: ' +
          K.esc(K.pesos(Math.round(b * 0.01))) + '.';
      } else { av.hidden = true; }
    };

    campoPesos(s, 'salud', 'Aportes a salud', 'Sin intereses.');
    campoPesos(s, 'pension', 'Aportes a pensión', 'Sin intereses. Si no aportas, escribe 0.');
    campoPesos(s, 'riesgos', 'Aportes a ARL', 'Sin intereses. Si los paga la entidad, escribe el valor del aporte.');
    campoPesos(s, 'caja', 'Caja de compensación', 'Solo si aportas.');
    campoPesos(s, 'sena', 'SENA', 'Solo si aportas.');
    campoPesos(s, 'icbf', 'ICBF', 'Solo si aportas.');

    var baseInp = K.$$('.cta-inp', s).filter(function (i) { return i.dataset.campo === 'base'; })[0];
    if (baseInp) baseInp.addEventListener('input', pintarSolidario);
    pintarSolidario();

    /* La planilla anexa se abre solo si hace falta: son otros nueve campos
       que el 90% de la gente no usa nunca. */
    var det = K.nodo('<details class="cta-anexa"><summary>Tengo una planilla anexa</summary></details>');
    if (String(D.planillaA || '').trim()) det.open = true;
    s.appendChild(det);

    campoTexto(det, 'planillaA', 'N° de planilla anexa', '', 'numeric');
    var g2 = grupo(det, 'Mes de la planilla anexa', '');
    var sel2 = K.nodo('<select class="cta-inp"><option value="">Selecciona</option></select>');
    (E.meses || []).forEach(function (m) {
      var o = K.nodo('<option value="' + K.esc(m) + '">' + K.esc(m) + '</option>');
      if (K.norm(D.mesPlanillaA) === m) o.selected = true;
      sel2.appendChild(o);
    });
    sel2.addEventListener('change', function () { D.mesPlanillaA = sel2.value; recordar(); });
    g2.appendChild(sel2);
    campoPesos(det, 'baseA', 'Base de cotización (anexa)', '');
    campoPesos(det, 'saludA', 'Aportes a salud (anexa)', '');
    campoPesos(det, 'pensionA', 'Aportes a pensión (anexa)', '');
    campoPesos(det, 'riesgosA', 'Aportes a ARL (anexa)', '');
    campoPesos(det, 'cajaA', 'Caja de compensación (anexa)', '');
    campoPesos(det, 'senaA', 'SENA (anexa)', '');
    campoPesos(det, 'icbfA', 'ICBF (anexa)', '');

    var limpiar = K.nodo('<button type="button" class="kit-btn kit-btn--plano cta-limpiar">Limpiar la planilla anexa</button>');
    limpiar.addEventListener('click', function () {
      ['planillaA', 'mesPlanillaA', 'baseA', 'saludA', 'pensionA', 'riesgosA', 'cajaA', 'senaA', 'icbfA']
        .forEach(function (k) { D[k] = ''; });
      recordar();
      K.$$('.cta-inp', det).forEach(function (i) { i.value = ''; });
      sel2.value = '';
      K.aviso('Planilla anexa vacía. Se guardará así.', 'info');
    });
    det.appendChild(limpiar);
  }

  /* ---------- bloque 4: documentos ---------- */

  function bloqueDocumentos(s) {
    s.appendChild(K.nodo('<p class="cta-nota">Cada archivo se guarda solo, apenas lo eliges. Si se te va la señal, lo que ya subiste ahí se queda.</p>'));

    var primera = [], porPestana = {};
    ARCHIVOS.forEach(function (a) {
      if (!admitido(a)) return;
      if (a.grupo === 'primera') { primera.push(a); return; }
      if (a.pestana) { (porPestana[a.pestana] = porPestana[a.pestana] || []).push(a); return; }
      s.appendChild(ficha(a));
    });

    /* 10/10 · una pestaña por caso; ninguna obliga, se abre y se cierra libre. */
    PESTANAS.forEach(function (p) {
      var lista = porPestana[p.k];
      if (!lista || !lista.length) return;
      var d = K.nodo('<details class="cta-anexa cta-pestana" data-pestana="' + p.k + '"><summary>' + K.esc(p.t) + '</summary></details>');
      if (lista.some(function (a) { return tieneArchivo(a.k); })) d.open = true;
      lista.forEach(function (a) { d.appendChild(ficha(a)); });
      s.appendChild(d);
    });

    var det = K.nodo('<details class="cta-anexa"><summary>Documentos de primera cuenta, adición y novedades</summary></details>');
    if (primera.some(function (a) { return tieneArchivo(a.k); })) det.open = true;
    primera.forEach(function (a) { det.appendChild(ficha(a)); });
    s.appendChild(det);
  }

  /* 30/09 · Una casilla NUEVA (nuevo:true) solo se pinta si el CORE ya la
     admite (cuentaEstado.tiposArchivo). Con un CORE sin desplegar no sale y
     nadie ve el error "No se reconoce el archivo"; front y CORE se suben en
     cualquier orden. */
  function admitido(a) {
    if (a.viejo) return !(E && E.archivoEvidencia);   /* 05/10 */
    if (!a.nuevo) return true;
    return !!(E && E.tiposArchivo && E.tiposArchivo.indexOf(a.k) >= 0);
  }

  function ficha(a) {
    var caja = K.nodo('<div class="cta-doc' + (a.obliga ? ' cta-doc--obliga' : '') + '"></div>');
    caja.appendChild(K.nodo(
      '<div class="cta-doc__cab">' +
      '  <span class="cta-doc__t">' + K.esc(a.t) + (a.obliga ? ' <em>obligatorio</em>' : '') + '</span>' +
      (a.nota ? '<span class="cta-doc__n">' + K.esc(a.nota) + '</span>' : '') +
      '</div>'
    ));

    var cuerpo = K.nodo('<div class="cta-doc__cuerpo"></div>');
    caja.appendChild(cuerpo);
    pintarFicha(cuerpo, a);
    return caja;
  }

  function pintarFicha(cuerpo, a) {
    cuerpo.innerHTML = '';
    var url = E.archivos ? E.archivos[a.k] : '';

    if (url) {
      var listo = K.nodo(
        '<div class="cta-doc__listo">' +
        '  <button type="button" class="cta-doc__ver">' +
             (K.icono ? K.icono('ojo', 16) : '') + 'Ver el archivo cargado</button>' +
        '  <button type="button" class="kit-btn kit-btn--plano cta-doc__quitar">Quitar</button>' +
        '</div>'
      );
      /* 4.6.1 · SE ABRE AQUÍ, NO EN OTRA PESTAÑA.
         Revisar una cuenta es comparar: si cada documento se va a una
         pestaña, se pierde el hilo y volver cuesta. El visor del kit ya
         hacía esto para Contratación; ahora también para el contratista.
         Convierte el enlace de Drive a /preview, que es el único que se
         deja incrustar — un /view dentro de un marco sale en blanco. */
      listo.querySelector('.cta-doc__ver').addEventListener('click', function () {
        if (!K.piezas.visor) { window.open(url, '_blank', 'noopener'); return; }
        K.piezas.visor.abrir([{ titulo: a.t, url: url }]);
      });
      listo.querySelector('.cta-doc__quitar').addEventListener('click', function () {
        /* 4.5: sin cuadros del sistema. La pregunta es de la app. */
        K.piezas.confirmar.preguntar({
          titulo: 'Quitar el archivo',
          texto: 'Vas a quitar ' + a.t + '. Se borra también de tu carpeta de Drive y tendrás que volver a subirlo.',
          si: 'Sí, quitarlo',
          no: 'Dejarlo',
          peligro: true
        }).then(function (ok) {
          if (!ok) return;
          K.piezas.guardado.abrir({ titulo: 'Quitando el archivo', sub: 'Un momento.' });
          K.pedir('cuentaArchivoQuitar', conEd({ archivo: a.k }))
            .then(function () {
              delete E.archivos[a.k];
              K.piezas.guardado.listo({ sub: 'Quitado' });
              pintarFicha(cuerpo, a);
            })
            ['catch'](function (e) {
              K.piezas.guardado.fallo();
              K.aviso(e.message || 'No se pudo quitar', 'malo', 5000);
            });
        });
      });
      cuerpo.appendChild(listo);
      return;
    }

    var zona = K.nodo('<div class="cta-doc__zona"></div>');
    cuerpo.appendChild(zona);
    var adj = K.piezas.adjuntos.montar(zona, {
      acepta: a.acepta || SOLO_PDF,
      etiqueta: a.t,
      varios: false,
      maximo: 1,
      maximoMB: a.mb || 2,
      alCambiar: function (lista) {
        if (!lista.length) return;
        subir(adj, cuerpo, a);
      }
    });
  }

  function subir(adj, cuerpo, a) {
    K.piezas.guardado.abrir({
      titulo: 'Subiendo ' + a.t,
      sub: 'Se guarda ahora mismo en tu carpeta de Drive.'
    });
    adj.aBase64()
      .then(function (arch) {
        if (!arch.length) throw K.problema('ARCHIVO', 'No se pudo leer el archivo.');
        /* 4.6.1 · VIAJA TAMBIÉN EL TIPO Y EL NOMBRE.
           Antes solo iba el contenido y el CORE lo guardaba SIEMPRE como
           PDF. Una foto del baucher acababa en Drive llamada
           "Baucher Planilla.pdf" con bytes de JPG dentro, y no había
           forma de verla. Ahora el CORE respeta el formato de origen. */
        return K.pedir('cuentaArchivo', conEd({
          archivo: a.k,
          pdf: arch[0].datos,
          tipo: arch[0].tipo || '',
          nombre: arch[0].nombre || ''
        }), { ms: 120000 });
      })
      .then(function (r) {
        E.archivos = E.archivos || {};
        E.archivos[a.k] = r.url;
        K.piezas.guardado.listo({ sub: a.t + ' quedó guardado.' });
        pintarFicha(cuerpo, a);
      })
      ['catch'](function (e) {
        K.piezas.guardado.fallo();
        K.aviso(e.message || 'No se pudo subir el archivo', 'malo', 6000);
        adj.limpiar();
      });
  }

  /* ══════════════ campos ══════════════ */

  function grupo(destino, titulo, pista) {
    var g = K.nodo(
      '<div class="cta-campo">' +
      '  <span class="cta-campo__t">' + K.esc(titulo) + '</span>' +
      (pista ? '<span class="cta-campo__p">' + K.esc(pista) + '</span>' : '') +
      '</div>'
    );
    destino.appendChild(g);
    return g;
  }

  function campoTexto(destino, clave, titulo, pista, modo) {
    var g = grupo(destino, titulo, pista);
    var inp = K.nodo('<input type="text" class="cta-inp" data-campo="' + clave + '"' +
      (modo === 'numeric' ? ' inputmode="numeric"' : '') +
      ' value="' + K.esc(D[clave] || '') + '">');
    inp.addEventListener('input', function () { D[clave] = inp.value.trim(); recordar(); });
    g.appendChild(inp);
    return inp;
  }

  /**
   * Un campo de pesos. Se escribe en números y se enseña con los puntos de
   * aquí; guarda siempre el número pelado, que es lo que espera el CORE.
   * En agosto, un formateador que leía "2.500" como dos y medio dejó una
   * cuenta de dos millones y medio en tres pesos.
   */
  function campoPesos(destino, clave, titulo, pista) {
    var g = grupo(destino, titulo, pista);
    /* El signo va FUERA del campo, en su propia caja: dentro del value
       estorba al escribir y al poner el cursor. Lo que ve la persona es
       "$ 2.500.000" desde el primer dígito. */
    var caja = K.nodo('<div class="cta-pesos"><span class="cta-pesos__signo" aria-hidden="true">$</span></div>');
    var inp = K.nodo('<input type="tel" inputmode="numeric" class="cta-inp cta-inp--pesos" ' +
      'data-campo="' + clave + '" autocomplete="off" ' +
      'value="' + (D[clave] ? K.esc(K.numero(D[clave])) : '') + '">');
    caja.appendChild(inp);
    /* 4.5: se formatea MIENTRAS se escribe, sin mover el cursor de sitio.
       Ver K.pesosEnVivo en kit/kit.js: es el punto 6 del pliego. */
    K.pesosEnVivo(inp, function (limpio) {
      D[clave] = limpio;
      recordar();
    });
    g.appendChild(caja);
    return inp;
  }

  /* ══════════════ guardar de verdad ══════════════ */

  /* 28/09 · LA FECHA DE RADICACIÓN, AL FINAL (Oss). La misma regla de
     siempre (la decide el CORE: hoy o los hábiles siguientes, después de
     las 4 p. m. el siguiente, pasado el corte los primeros del mes
     siguiente), pero se elige en el último paso, igual al ingresar y al
     corregir. Así nadie entra a otro bloque solo para cambiar la fecha. */
  function fechasRadicacion(hoja, boton) {
    var cuerpo = hoja && hoja.querySelector('.kit-capa__cuerpo');
    if (!cuerpo) return;
    var opciones = E.fechasRadicacion || [];
    if (opciones.indexOf(D.fechaRadicacion) < 0) D.fechaRadicacion = '';
    var g = K.nodo('<div class="cta-radica"><p class="cta-radica__t">¿Qué día radicas?</p>' +
      '<p class="cta-radica__p">Es el día en que Contratación recibe tu cuenta.</p><div class="cta-fechas"></div></div>');
    var fila = g.querySelector('.cta-fechas');
    opciones.forEach(function (f) {
      var b = K.nodo('<button type="button" class="cta-fecha' + (D.fechaRadicacion === f ? ' cta-fecha--on' : '') + '">' +
        '<span class="cta-fecha__d">' + K.esc(f.slice(0, 5)) + '</span>' +
        '<span class="cta-fecha__n">' + K.esc(diaSemana(f)) + '</span></button>');
      b.addEventListener('click', function () {
        D.fechaRadicacion = f;
        recordar();
        K.$$('.cta-fecha', fila).forEach(function (x) { x.classList.remove('cta-fecha--on'); });
        b.classList.add('cta-fecha--on');
        K.vibrar(8);
        boton.disabled = false;
      });
      fila.appendChild(b);
    });
    /* 10.1: el CORE explica por qué salen esas fechas o por qué no sale
       ninguna (cerró la radicación de la vigencia). Lo dice ADMIN. */
    if (E.avisoRadicacion || !opciones.length) {
      var av = K.nodo('<p class="formulario__nota formulario__nota--fuerte cta-fechas__aviso"></p>');
      av.textContent = E.avisoRadicacion || 'Hoy no hay fechas de radicación disponibles.';
      g.appendChild(av);
    }
    cuerpo.insertBefore(g, cuerpo.firstChild);
    boton.disabled = !D.fechaRadicacion;
  }

  function confirmar(caja) {
    /* 4.5: era un confirm del navegador con cinco lineas pegadas con saltos
       de linea. Radicar es lo mas serio que hace esta app: ahora sale el
       Resumen de cambios del kit, con cada dato en su fila y en pesos. */
    var promesa = K.piezas.confirmar.abrir({
      titulo: E.puerta === 'corregir' ? 'Revisa antes de guardar la corrección' : 'Revisa antes de radicar',
      lista: [
        ['Informe', String(E.informe) + (E.total ? ' de ' + E.total : '')],
        ['Periodo', D.inicioPeriodo + ' a ' + D.finPeriodo],
        ['Cobras', K.pesos(D.cobro)],
        E.rpCesion && E.rpCesion.pedir ? ['RP de la cesión', rpCesionCompleto()] : null,
        ['Te queda', K.pesos(nuevoSaldo())],
        ['Planilla', String(D.planilla) + ' de ' + D.mesPlanilla]
      ].filter(Boolean),
      nota: 'Después de guardarla, repórtala en ESTADO DE CUENTA para que tu supervisor(a) la revise.',
      si: E.puerta === 'corregir' ? 'Guardar corrección' : 'Radicar',
      no: 'Revisar'
    });
    /* la capa ya está en la página: se le ponen las fechas encima del resumen */
    var capas = document.querySelectorAll('.kit-conf');
    var hoja = capas[capas.length - 1];
    fechasRadicacion(hoja, hoja && hoja.querySelector('.kit-conf__si'));
    promesa.then(function (ok) {
      if (ok && D.fechaRadicacion) guardar(caja);
    });
  }

  function guardar(caja) {
    /* Mientras se guarda, la pieza de versión no puede recargar la app por
       debajo: se perdería lo escrito justo cuando más duele. */
    K.ocupado = true;

    var rapida = caminoRapido();
    K.piezas.guardado.abrir({
      titulo: E.puerta === 'corregir' ? 'Guardando tu corrección' : 'Guardando tu cuenta',
      sub: rapida ? 'Solo cambiaste documentos: esto toma unos segundos.' : 'Primero los datos, después tus documentos.',
      pasos: ['Guardando los datos', rapida ? 'Poniendo la fecha en tus formatos' : 'Creando tus documentos', 'Terminando']
    });

    K.pedir('cuentaGuardar', conEd({ campos: D, total: E.total }), { ms: 120000 })
      .then(function (g) {
        /* 28/09 · el camino lo decidió el CORE: rápido = solo los formatos
           que llevan la fecha de radicación */
        if (g && g.modoDocs === 'rapido') {
          K.piezas.guardado.abrir({
            titulo: 'Actualizando tus formatos',
            sub: 'Solo cambia la fecha de radicación. Unos segundos.',
            pasos: ['Formato equivalente', 'Formato de exoneración', 'Listo']
          });
        } else {
          K.piezas.guardado.abrir({
            titulo: 'Creando tus documentos',
            sub: 'Esto tarda entre <b>medio minuto y dos minutos</b>. No cierres la app.',
            pasos: ['Armando el formato de actividades', 'Metiendo tus evidencias', 'Pasando todo a PDF']
          });
        }
        return K.pedir('cuentaDocumentos', conEd({}), { ms: 300000 });
      })
      .then(function (r) {
        K.ocupado = false;
        K.guardar.borrar(RESPALDO + '.' + E.idContrato);
        K.piezas.guardado.listo({ sub: E.puerta === 'corregir' ? 'Tu corrección quedó guardada. Ahora revísala y repórtala.' : 'Tu cuenta quedó guardada. Ahora revísala y repórtala.' });
        avisarGuardada();
        irAReportar(caja, r);
      })
      ['catch'](function (e) {
        K.ocupado = false;
        K.piezas.guardado.fallo();
        /* Si el fallo es de red, el servidor pudo terminar igual: preguntar
           antes de asustar a nadie es lo que evita el reenvío que duplica
           archivos en Drive. */
        if (e && (e.codigo === 'SIN_RED' || e.codigo === 'TIEMPO' || e.codigo === 'RESPUESTA_NO_JSON')) {
          comprobar(caja);
          return;
        }
        K.aviso(e.message || 'No se pudo guardar', 'malo', 8000);
      });
  }

  function comprobar(caja) {
    K.piezas.guardado.abrir({ titulo: 'Comprobando', sub: 'Se perdió la respuesta. Estamos verificando cómo quedó tu cuenta.' });
    K.pedir('cuentaComo', conEd({}), { ms: 60000 })
      .then(function (r) {
        K.piezas.guardado.cerrar();
        if (r.quedo === 'completa') {
          K.guardar.borrar(RESPALDO + '.' + E.idContrato);
          avisarGuardada();
          irAReportar(caja, r);
          return;
        }
        if (r.quedo === 'a_medias') {
          /* 4.5: los tres alert del navegador pasan a ser capas de la app.
             Este es el aviso mas delicado de toda la aplicacion — si la
             persona vuelve a radicar se le duplican los archivos —, y salia
             en un cuadro gris con el dominio de GitHub arriba. */
          K.piezas.confirmar.avisar({
            titulo: 'Quedó a medias',
            texto: 'Tus datos y tus archivos SÍ quedaron guardados, pero los documentos no ' +
                   'terminaron de crearse.',
            nota: 'NO vuelvas a radicar desde cero: se duplicarían los archivos. Entra otra vez ' +
                  'a ' + (E.puerta === 'corregir' ? 'CORREGIR CUENTA' : 'INGRESAR CUENTA') + ' y toca otra vez el botón de guardar; solo se rehacen los documentos.',
            si: 'Entendido'
          }).then(function () { abrir(); });
          return;
        }
        K.piezas.confirmar.avisar({
          titulo: 'No alcanzó a guardarse',
          texto: 'La conexión se cayó antes de guardar.',
          nota: 'Lo que escribiste sigue aquí: puedes volver a intentarlo sin ningún riesgo.',
          si: 'Volver a intentar'
        });
      })
      ['catch'](function () {
        K.piezas.guardado.cerrar();
        K.piezas.confirmar.avisar({
          titulo: 'No pudimos comprobarlo',
          texto: 'No logramos verificar cómo quedó tu cuenta.',
          nota: 'NO vuelvas a radicar todavía. Revisa en un rato si tus documentos ya están en ' +
                'tu carpeta de Drive; si están, la cuenta quedó radicada.',
          si: 'Entendido',
          peligro: true
        });
      });
  }

  /* 28/09 · el inicio deja de mostrar CORREGIR CUENTA sin volver al servidor */
  function avisarGuardada() {
    if (K.disparar) K.disparar('kit:cuentaGuardada', { informe: E.informe, corregida: E.puerta === 'corregir' });
  }

  /* 28/09 · guardada la cuenta, se lleva a ESTADO DE CUENTA con una guía:
     revisar los documentos y, al final, tocar CORRECCIÓN o REPORTE INICIAL
     (Oss: sin botón de reportar aquí, donde se suben archivos). La pantalla
     de éxito queda solo de respaldo por si esa vista no está. */
  function irAReportar(caja, r) {
    if (!window.SEGUIMIENTO || !window.SEGUIMIENTO.guiar) { exito(caja, r); return; }
    window.SEGUIMIENTO.guiar({ informe: E.informe, corregida: E.puerta === 'corregir', errores: (r && r.errores) || [] });
    setTimeout(function () { location.hash = '#/seguimiento'; }, 1400);
  }

  function exito(caja, r) {
    caja.innerHTML = '';
    var corregida = E.puerta === 'corregir';
    var s = K.nodo('<section class="kit-tarjeta cta-exito"></section>');
    /* 28/09 · guardar no es terminar: la cuenta queda INGRESADA y falta
       reportarla. Se dice aquí, con el botón, para que nadie vuelva a
       INGRESAR/CORREGIR CUENTA creyendo que ya la radicó. */
    s.appendChild(K.nodo('<h3 class="grupo__t">' + (corregida ? 'Corrección guardada' : 'Cuenta guardada') + '</h3>'));
    s.appendChild(K.nodo('<p>' + (corregida
      ? 'Guardaste la corrección de tu cuenta ' + K.esc(E.informe) + '. Te falta <b>reportarla</b>: en ESTADO DE CUENTA toca <b>CORRECCIÓN</b> para que tu supervisor(a) la vuelva a revisar.'
      : 'Guardaste tu cuenta ' + K.esc(E.informe) + '. Te falta <b>reportarla</b>: en ESTADO DE CUENTA toca <b>REPORTE INICIAL</b> para que tu supervisor(a) la revise.') + '</p>'));
    if (r && r.documentos && r.documentos.length) {
      s.appendChild(K.nodo('<p class="cta-exito__docs">Se crearon: ' + K.esc(r.documentos.join(', ')) + '.</p>'));
    }
    if (r && r.errores && r.errores.length) {
      s.appendChild(K.nodo('<p class="cta-exito__aviso">Ojo: ' + K.esc(r.errores.join(' · ')) +
        '. Avisa a Contratación antes de reportar.</p>'));
    }
    if (r && r.carpeta) {
      s.appendChild(K.nodo('<a class="kit-btn kit-btn--plano" target="_blank" rel="noopener" href="' +
        K.esc(r.carpeta) + '">Ver mi carpeta en Drive</a>'));
    }
    var b = K.nodo('<button type="button" class="kit-btn kit-btn--marca">Ir a ESTADO DE CUENTA</button>');
    b.addEventListener('click', function () { location.hash = '#/seguimiento'; });
    s.appendChild(b);
    var bi = K.nodo('<button type="button" class="kit-btn kit-btn--plano">Volver al inicio</button>');
    bi.addEventListener('click', function () { location.hash = '#/inicio'; });
    s.appendChild(bi);
    caja.appendChild(s);
    K.piezas.creditos.montar(caja);
  }

  function error(e) {
    var msg = (e && e.message) ? e.message : 'No se pudo cargar.';
    var c = K.nodo(
      '<section class="kit-tarjeta error">' +
      '  <p class="error__t">' + K.esc(msg) + '</p>' +
      '  <button type="button" class="kit-btn kit-btn--plano">Reintentar</button>' +
      '</section>'
    );
    c.querySelector('button').addEventListener('click', function () { abrir(); });
    return c;
  }

  window.CUENTA = { abrir: abrir };
}());
