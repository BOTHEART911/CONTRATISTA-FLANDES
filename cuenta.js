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
  var RESPALDO = 'cuenta.borrador';

  /* ══════════════ los cuatro bloques ══════════════ */

  var BLOQUES = [
    {
      id: 'fechas', titulo: 'Fechas y periodo',
      pista: 'Cuándo radicas y qué periodo estás cobrando',
      campos: ['fechaRadicacion', 'inicioPeriodo', 'finPeriodo']
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

  /* Los PDF, en el orden en que se piden. 'obliga' son los tres sin los
     que Contratación no recibe la cuenta. */
  var ARCHIVOS = [
    { k: 'bancaria',   t: 'Certificación bancaria',      obliga: true,  nota: 'Sin contraseña' },
    { k: 'baucher1',   t: 'Baucher de la planilla',      obliga: true,  nota: '' },
    { k: 'planilla1',  t: 'Planilla',                    obliga: true,  nota: 'Sin contraseña' },
    { k: 'baucher2',   t: 'Baucher planilla anexa',      obliga: false, nota: 'Solo si presentas planilla adicional' },
    { k: 'planilla2',  t: 'Planilla anexa',              obliga: false, nota: 'Solo si presentas planilla adicional' },
    { k: 'anexos',     t: 'Anexos de actividades',       obliga: false, nota: 'Todo en un solo PDF', mb: 10 },
    { k: 'rutSimple',  t: 'RUT (Régimen Simple)',        obliga: false, nota: 'Solo Régimen Simple' },
    { k: 'facturaPdf', t: 'Factura electrónica',         obliga: false, nota: 'Solo si facturas electrónicamente' },
    { k: 'parafiscales', t: 'Certificado parafiscales',  obliga: false, nota: 'Solo personas jurídicas' },
    { k: 'noPension',  t: 'Certificado NO aportes a pensión', obliga: false, nota: 'Solo pensionados' },
    { k: 'actaInicio', t: 'Acta de inicio',              obliga: false, nota: 'Solo primera cuenta', grupo: 'primera' },
    { k: 'clausulados', t: 'Clausulados del contrato',   obliga: false, nota: 'Solo primera cuenta', grupo: 'primera' },
    { k: 'cdp',        t: 'CDP',                         obliga: false, nota: 'Solo primera cuenta', grupo: 'primera' },
    { k: 'rp',         t: 'RP',                          obliga: false, nota: 'Solo primera cuenta', grupo: 'primera' },
    { k: 'rutNatural', t: 'RUT persona natural',         obliga: false, nota: 'Solo primera cuenta', grupo: 'primera' },
    { k: 'arl',        t: 'Certificado ARL',             obliga: false, nota: 'Primera cuenta, adición incluida', grupo: 'primera' },
    { k: 'otrosi',     t: 'Otrosí',                      obliga: false, nota: 'Si aplica', grupo: 'primera' },
    { k: 'cdpAdicion', t: 'CDP adición',                 obliga: false, nota: 'Solo primera cuenta de adición', grupo: 'primera' },
    { k: 'rpAdicion',  t: 'RP adición',                  obliga: false, nota: 'Solo primera cuenta de adición', grupo: 'primera' },
    { k: 'otroR',      t: 'Otro documento requerido',    obliga: false, nota: 'Si te lo piden', grupo: 'primera' }
  ];

  /* ══════════════ entrada ══════════════ */

  function abrir(sub) {
    app.innerHTML = '';
    var caja = K.nodo('<div class="kit-ancho vista cuenta"></div>');
    app.appendChild(caja);

    K.piezas.esqueletos.mientras(caja, cargar(), { forma: 'texto', cuantos: 5 })
      .then(function () {
        BLOQUE = sub && porId(sub) ? sub : null;
        /* El rótulo del banner dice lo que de verdad toca hoy: ingresar o
           corregir. Son dos opciones distintas del menú de siempre. */
        if (K.piezas.banner) {
          K.piezas.banner.vista(E.puerta === 'corregir' ? 'CORREGIR CUENTA' : 'INGRESAR CUENTA');
        }
        pintar(caja);
      })
      ['catch'](function (e) { caja.appendChild(error(e)); });
  }

  function cargar() {
    return K.pedir('cuentaEstado').then(function (d) {
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

  function puertaCerrada() {
    var s = K.nodo('<section class="kit-tarjeta cta-cerrada"></section>');
    var titulos = {
      sinBorrador: 'Primero escribe tus actividades',
      faltan: 'Te faltan actividades por escribir',
      espera: 'Esta cuenta ya está radicada'
    };
    s.appendChild(K.nodo('<h3 class="grupo__t">' + K.esc(titulos[E.puerta] || 'Todavía no') + '</h3>'));
    s.appendChild(K.nodo('<p class="cta-cerrada__p">' + K.esc(E.motivo || '') + '</p>'));
    if (E.puerta === 'sinBorrador' || E.puerta === 'faltan') {
      var b = K.nodo('<button type="button" class="kit-btn kit-btn--marca">Ir a BORRADOR ACTIVIDADES</button>');
      b.addEventListener('click', function () { location.hash = '#/borrador'; });
      s.appendChild(b);
    }
    return s;
  }

  function cabecera() {
    var s = K.nodo('<section class="cta-cab"></section>');
    var corrige = E.puerta === 'corregir';
    s.appendChild(K.nodo(
      '<div class="cta-cab__fila">' +
      '  <span class="kit-pastilla ' + (corrige ? 'kit-pastilla--aviso' : 'kit-pastilla--ok') + '">' +
      (corrige ? 'CORREGIR CUENTA' : 'INGRESAR CUENTA') + '</span>' +
      '  <span class="cta-cab__inf">Informe ' + K.esc(E.informe) + (E.total ? ' de ' + K.esc(E.total) : '') + '</span>' +
      '</div>'
    ));
    if (corrige && E.observaciones) {
      s.appendChild(K.nodo(
        '<div class="cta-devuelta">' +
        '  <b>Lo que te pidieron corregir</b>' +
        '  <p>' + K.esc(E.observaciones) + '</p>' +
        '</div>'
      ));
    }
    if (corrige) {
      s.appendChild(K.nodo('<p class="cta-cab__nota">Cambia solo lo que haga falta. <b>Vuelve a elegir la fecha de radicación</b> y reemplaza los archivos que te indicaron.</p>'));
    }
    return s;
  }

  /* El índice: de un vistazo, qué falta. Es lo que la app vieja no tenía. */
  function indice(caja) {
    var ul = K.nodo('<ul class="cta-indice"></ul>');
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
        return { clase: 'ok', icono: '✓', detalle: n + (n === 1 ? ' documento cargado' : ' documentos cargados') };
      }
      return {
        clase: 'falta', icono: '!',
        detalle: 'Faltan ' + faltan.length + ' de los tres obligatorios'
      };
    }
    var vacios = b.campos.filter(function (c) { return !String(D[c] || '').trim(); });
    if (!vacios.length) return { clase: 'ok', icono: '✓', detalle: resumenBloque(b) };
    return {
      clase: 'falta', icono: '!',
      detalle: vacios.length === b.campos.length ? b.pista : ('Te faltan ' + vacios.length + ' datos')
    };
  }

  function resumenBloque(b) {
    if (b.id === 'fechas') return D.inicioPeriodo + ' a ' + D.finPeriodo + ' · radica el ' + D.fechaRadicacion;
    if (b.id === 'pago') return 'Cobras ' + K.pesos(D.cobro) + ' · queda ' + K.pesos(nuevoSaldo());
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

    var b = K.nodo('<button type="button" class="kit-btn kit-btn--marca cta-pie__btn">' +
      (E.puerta === 'corregir' ? 'Guardar la corrección' : 'Radicar mi cuenta') + '</button>');
    if (falta.length) b.disabled = true;
    b.addEventListener('click', function () { confirmar(caja); });
    s.appendChild(b);
    return s;
  }

  function loQueFalta() {
    var falta = [];
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
    var g = grupo(s, 'Fecha de radicación', 'Es el día en que Contratación recibe tu cuenta.');
    var fila = K.nodo('<div class="cta-fechas"></div>');
    (E.fechasRadicacion || []).forEach(function (f) {
      var b = K.nodo('<button type="button" class="cta-fecha' + (D.fechaRadicacion === f ? ' cta-fecha--on' : '') + '">' +
        '<span class="cta-fecha__d">' + K.esc(f.slice(0, 5)) + '</span>' +
        '<span class="cta-fecha__n">' + K.esc(diaSemana(f)) + '</span>' +
        '</button>');
      b.addEventListener('click', function () {
        D.fechaRadicacion = f;
        recordar();
        K.$$('.cta-fecha', fila).forEach(function (x) { x.classList.remove('cta-fecha--on'); });
        b.classList.add('cta-fecha--on');
        K.vibrar(8);
      });
      fila.appendChild(b);
    });
    g.appendChild(fila);

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

    var primera = [];
    ARCHIVOS.forEach(function (a) {
      if (a.grupo === 'primera') { primera.push(a); return; }
      s.appendChild(ficha(a));
    });

    var det = K.nodo('<details class="cta-anexa"><summary>Documentos de primera cuenta, adición y novedades</summary></details>');
    if (primera.some(function (a) { return tieneArchivo(a.k); })) det.open = true;
    primera.forEach(function (a) { det.appendChild(ficha(a)); });
    s.appendChild(det);
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
        '  <a class="cta-doc__ver" href="' + K.esc(url) + '" target="_blank" rel="noopener">Ver el archivo cargado</a>' +
        '  <button type="button" class="kit-btn kit-btn--plano cta-doc__quitar">Quitar</button>' +
        '</div>'
      );
      listo.querySelector('.cta-doc__quitar').addEventListener('click', function () {
        if (!confirm('¿Quitar ' + a.t + '? Se borra de tu carpeta de Drive.')) return;
        K.piezas.guardado.abrir({ titulo: 'Quitando el archivo', sub: 'Un momento 🚀' });
        K.pedir('cuentaArchivoQuitar', { archivo: a.k })
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
      cuerpo.appendChild(listo);
      return;
    }

    var zona = K.nodo('<div class="cta-doc__zona"></div>');
    cuerpo.appendChild(zona);
    var adj = K.piezas.adjuntos.montar(zona, {
      acepta: 'application/pdf',
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
      sub: 'Se guarda ahora mismo en tu carpeta de Drive 🚀'
    });
    adj.aBase64()
      .then(function (arch) {
        if (!arch.length) throw K.problema('ARCHIVO', 'No se pudo leer el archivo.');
        return K.pedir('cuentaArchivo', { archivo: a.k, pdf: arch[0].datos }, { ms: 120000 });
      })
      .then(function (r) {
        E.archivos = E.archivos || {};
        E.archivos[a.k] = r.url;
        K.piezas.guardado.listo({ sub: a.t + ' quedó guardado 🎉' });
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
    var inp = K.nodo('<input type="tel" inputmode="numeric" class="cta-inp cta-inp--pesos" ' +
      'data-campo="' + clave + '" value="' + (D[clave] ? K.esc(K.numero(D[clave])) : '') + '">');
    inp.addEventListener('input', function () {
      var n = K.aNumero(inp.value);
      D[clave] = n ? String(n) : '';
      recordar();
    });
    inp.addEventListener('blur', function () {
      inp.value = D[clave] ? K.numero(D[clave]) : '';
    });
    g.appendChild(inp);
    return inp;
  }

  /* ══════════════ guardar de verdad ══════════════ */

  function confirmar(caja) {
    var lineas = [
      'Informe ' + E.informe + (E.total ? ' de ' + E.total : ''),
      'Periodo ' + D.inicioPeriodo + ' a ' + D.finPeriodo,
      'Radicas el ' + D.fechaRadicacion,
      'Cobras ' + K.pesos(D.cobro) + ' y te quedan ' + K.pesos(nuevoSaldo()),
      'Planilla ' + D.planilla + ' de ' + D.mesPlanilla
    ];
    if (!confirm(lineas.join('\n') + '\n\n¿Lo mando así?')) return;
    guardar(caja);
  }

  function guardar(caja) {
    /* Mientras se guarda, la pieza de versión no puede recargar la app por
       debajo: se perdería lo escrito justo cuando más duele. */
    K.ocupado = true;

    K.piezas.guardado.abrir({
      titulo: 'Guardando tu cuenta',
      sub: 'Primero los datos, después tus documentos 🚀',
      pasos: ['Guardando los datos', 'Creando tus documentos', 'Terminando']
    });

    K.pedir('cuentaGuardar', { campos: D, total: E.total }, { ms: 120000 })
      .then(function () {
        K.piezas.guardado.abrir({
          titulo: 'Creando tus documentos',
          sub: 'Esto tarda entre <b>medio minuto y dos minutos</b>. No cierres la app.',
          pasos: ['Armando el formato de actividades', 'Metiendo tus evidencias', 'Pasando todo a PDF']
        });
        return K.pedir('cuentaDocumentos', {}, { ms: 300000 });
      })
      .then(function (r) {
        K.ocupado = false;
        K.guardar.borrar(RESPALDO + '.' + E.idContrato);
        K.piezas.guardado.listo({ sub: 'Tu cuenta quedó radicada 🎉' });
        exito(caja, r);
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
    K.piezas.guardado.abrir({ titulo: 'Comprobando', sub: 'Se perdió la respuesta. Miramos cómo quedó tu cuenta 🚀' });
    K.pedir('cuentaComo', {}, { ms: 60000 })
      .then(function (r) {
        K.piezas.guardado.cerrar();
        if (r.quedo === 'completa') {
          K.guardar.borrar(RESPALDO + '.' + E.idContrato);
          exito(caja, r);
          return;
        }
        if (r.quedo === 'a_medias') {
          alert('Tus datos y tus archivos SÍ quedaron guardados, pero los documentos no terminaron de crearse.\n\n' +
                'No vuelvas a radicar: se duplicarían los archivos.\n\n' +
                'Entra otra vez a INGRESAR CUENTA y toca Radicar: solo se rehacen los documentos.');
          abrir();
          return;
        }
        alert('La conexión se cayó antes de guardar. Lo que escribiste sigue aquí: puedes volver a intentarlo sin riesgo.');
      })
      ['catch'](function () {
        K.piezas.guardado.cerrar();
        alert('No pudimos comprobar cómo quedó tu cuenta.\n\nNO vuelvas a radicar todavía. Revisa en un rato si tus documentos ya están en tu carpeta de Drive.');
      });
  }

  function exito(caja, r) {
    caja.innerHTML = '';
    var s = K.nodo('<section class="kit-tarjeta cta-exito"></section>');
    s.appendChild(K.nodo('<h3 class="grupo__t">Cuenta radicada</h3>'));
    s.appendChild(K.nodo('<p>Tu informe ' + K.esc(E.informe) + ' quedó ingresado y Contratación ya lo puede ver.</p>'));
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
    var b = K.nodo('<button type="button" class="kit-btn kit-btn--marca">Volver al inicio</button>');
    b.addEventListener('click', function () { location.hash = '#/inicio'; });
    s.appendChild(b);
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
