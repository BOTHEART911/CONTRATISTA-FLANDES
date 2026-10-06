/* ============================================================
   CONTRATISTA-FLANDES · BORRADOR DE ACTIVIDADES Y EVIDENCIAS
   Entrega 4.2

   QUÉ SE ARREGLA DE LA APP VIEJA
     La vieja pintaba las 26 obligaciones una debajo de otra, cada una con
     su cuadro de texto. En un teléfono eso es una pantalla de tres metros
     en la que nadie sabe por dónde va, cuántas lleva ni cuál se saltó, y
     donde cerrar sin querer borraba todo lo escrito.

   CÓMO QUEDA
     Dos pantallas, como el formulario de SEP-AGENDA que ya funcionó bien:

       1. TABLERO  una tarjeta por obligación, con su estado de un vistazo.
          Se entra por donde se quiera: no hay orden obligatorio, porque
          estas no son secciones de un trámite sino obligaciones de un
          contrato y cada quien redacta por donde puede.

       2. EDITOR   una obligación a pantalla completa, con su texto
          delante, el cuadro de actividades y su evidencia, y flechas para
          pasar a la siguiente sin volver al tablero.

   LO QUE SE AÑADE Y ANTES NO EXISTÍA
     · Progreso real: cuántas escritas y cuántas con evidencia.
     · Respaldo en el propio teléfono mientras se escribe, para que una
       llamada entrante o un cierre accidental no se lleve el trabajo.
     · Las evidencias suben solas y quedan guardadas en el acto.
     · Varias fotos para una misma obligación se juntan solas en una (la
       hoja guarda una por obligación; antes el collage lo tenía que armar
       la persona a mano, y por eso muchos subían solo una).
   ============================================================ */
(function () {
  'use strict';

  var K = window.KIT;
  var app = K.id('app');

  var E = null;        /* lo que devolvió borradorEstado */
  var textos = [];     /* lo que hay escrito ahora mismo, por obligación */
  var evidencias = []; /* url de la evidencia de cada obligación */
  /* 05/10 · ARCHIVO DE EVIDENCIA por obligación ({nombre, id, ext} o null).
     ARCH_ON solo si el CORE ya lo sabe manejar (borradorEstado.archivosEv):
     con un CORE viejo el bloque no sale y nada se rompe. */
  var archivos = [], ARCH_ON = false;
  var subiendoArch = {};  /* i -> {nombre} mientras sube (no bloquea nada) */
  var localArch = {};     /* i -> File recién subido: Ver lo abre sin viaje */
  var sucio = false;   /* hay cambios sin mandar al CORE */
  var guardando = false;

  /* ── respaldo en el aparato ──
     No sustituye al guardado: es la red por si el teléfono se apaga a
     media redacción. Se borra en cuanto el CORE confirma. */

  function llaveRespaldo() {
    return 'borrador:' + (E ? E.idContrato : '') + ':' + (E ? E.informe : '');
  }

  function respaldar() {
    try { K.guardar.escribir(llaveRespaldo(), { textos: textos, cuando: Date.now() }); }
    catch (e) {}
  }

  function recuperarRespaldo() {
    try {
      var r = K.guardar.leer(llaveRespaldo(), null);
      if (!r || !r.textos || r.textos.length !== textos.length) return false;
      var distinto = false;
      for (var i = 0; i < r.textos.length; i++) {
        if ((r.textos[i] || '') !== (textos[i] || '')) { distinto = true; break; }
      }
      if (!distinto) return false;
      textos = r.textos.slice();
      sucio = true;
      return true;
    } catch (e) { return false; }
  }

  function olvidarRespaldo() {
    try { K.guardar.borrar(llaveRespaldo()); } catch (e) {}
  }

  /* ══════════════ entrada ══════════════ */

  function abrir(sub) {
    app.innerHTML = '';
    var caja = K.nodo('<div class="kit-ancho vista"></div>');
    app.appendChild(caja);

    if (E) { pintar(caja, sub); return; }

    K.piezas.esqueletos.mientras(caja, K.pedir('borradorEstado'), { forma: 'tarjetas', cuantos: 4 })
      .then(function (d) {
        E = d;
        textos = (d.actividades || []).slice();
        evidencias = (d.evidencias || []).map(listaEvi);
        ARCH_ON = Object.prototype.toString.call(d.archivosEv) === '[object Array]';
        archivos = ARCH_ON ? d.archivosEv.slice() : [];
        if (recuperarRespaldo()) {
          K.aviso('Recuperamos lo que estabas escribiendo la última vez.', 'info', 5000);
        }
        pintar(caja, sub);
      })
      ['catch'](function (e) { caja.appendChild(errorCaja(e)); });
  }

  function pintar(caja, sub) {
    caja.innerHTML = '';
    /* Las puertas cerradas se explican y no se pinta nada más: enseñar un
       tablero que no se puede usar solo confunde. */
    if (E.puerta === 'devuelta' || E.puerta === 'espera' || E.puerta === 'completa') {
      caja.appendChild(puertaCerrada());
      K.piezas.creditos.montar(caja);
      return;
    }
    if (E.preguntarTotal && !E.total) { caja.appendChild(pedirTotal(caja)); return; }

    var n = parseInt(String(sub || ''), 10);
    if (n >= 1 && n <= E.obligaciones.length) editor(caja, n);
    else tablero(caja);
  }

  /* ══════════════ puertas ══════════════ */

  function puertaCerrada() {
    var iconos = { devuelta: 'atras', espera: 'reloj', completa: 'check' };
    var titulos = {
      devuelta: 'Tu cuenta fue devuelta',
      espera: 'Tu cuenta sigue en trámite',
      completa: 'Ya terminaste tu contrato'
    };
    /* 28/09 · una sola cosa que hacer, con su botón: con una cuenta DEVUELTA
       o INCOMPLETA, corregirla (aunque ya exista el borrador de la
       siguiente); si la cuenta está en trámite, en qué va y qué sigue. El
       título y el destino los manda el CORE. */
    var c = K.nodo(
      '<section class="kit-tarjeta puerta">' +
      '  <p class="puerta__ico">' + K.icono(iconos[E.puerta] || 'aviso', 34) + '</p>' +
      '  <h3 class="puerta__t">' + K.esc(E.titulo || titulos[E.puerta] || 'Aviso') + '</h3>' +
      '  <p class="puerta__p">' + K.esc(E.motivo || '') + '</p>' +
      '</section>'
    );
    if (E.ir) {
      var b = K.nodo('<button type="button" class="kit-btn kit-btn--marca">' +
        K.esc(E.boton || (E.ir === 'cuenta' ? 'Ir a CORREGIR CUENTA' : 'Ir a ESTADO DE CUENTA')) + '</button>');
      b.addEventListener('click', function () { K.vibrar(8); location.hash = '#/' + E.ir; });
      c.appendChild(b);
    }
    return c;
  }

  /* El total de pagos: se pregunta una sola vez por contrato y de ahí sale
     cuántos informes va a radicar. Va en su propia pantalla porque
     equivocarse aquí descuadra todas las cuentas del contrato. */
  function pedirTotal(caja) {
    var f = K.nodo(
      '<form class="kit-tarjeta total" novalidate>' +
      '  <h3 class="total__t">Antes de empezar</h3>' +
      '  <p class="total__p">Escribe el total de informes o pagos que fija el clausulado ' +
      '  de tu contrato. Si no estás seguro, míralo en tu contrato o pregúntale a tu ' +
      '  supervisor: este número ordena todas tus cuentas.</p>' +
      '  <label class="campo"><span>Total de informes o pagos según el clausulado del contrato</span>' +
      '    <input name="total" type="number" inputmode="numeric" min="1" max="24" required>' +
      '  </label>' +
      '  <p class="total__aviso" role="note">Revisa bien porque no podrás corregir después.</p>' +
      '  <button type="submit" class="kit-btn kit-btn--marca">Empezar mi informe</button>' +
      '</form>'
    );

    f.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var v = parseInt(f.total.value, 10);
      if (!v || v < 1 || v > 24) {
        K.aviso('Escribe un número entre 1 y 24.', 'malo', 4000);
        return;
      }
      E.total = String(v);
      E.preguntarTotal = false;
      pintar(caja);
    });
    return f;
  }

  /* ══════════════ tablero ══════════════ */

  function tablero(caja) {
    K.piezas.banner.vista('Mi informe ' + E.informe);
    K.piezas.banner.atras(function () { salir(); });

    caja.appendChild(cabecera());

    var rejilla = K.nodo('<div class="obl-rejilla"></div>');
    E.obligaciones.forEach(function (o, i) {
      rejilla.appendChild(tarjetaObligacion(o, i, caja));
    });
    caja.appendChild(rejilla);

    var pie = K.nodo(
      '<div class="obl-pie">' +
      '  <button type="button" class="kit-btn kit-btn--marca" id="obl-guardar">Guardar mi avance</button>' +
      '  <p class="obl-pie__p">Las fotos ya quedaron guardadas al subirlas. ' +
      '  Este botón guarda lo que escribiste.</p>' +
      '</div>'
    );
    pie.querySelector('#obl-guardar').addEventListener('click', function () {
      guardar(true);
    });
    caja.appendChild(pie);

    montarInsights();
    K.piezas.creditos.montar(caja);
  }

  function cabecera() {
    var escritas = textos.filter(function (t) { return String(t || '').trim(); }).length;
    var conFoto = E.obligaciones.filter(function (o, k) { return (evidencias[k] && evidencias[k].length) || archivos[k]; }).length;
    var total = E.obligaciones.length;
    var pct = total ? Math.round(escritas * 100 / total) : 0;

    /* 28/09 (2) · corrigiendo la cuenta devuelta: se dice qué cuenta es, qué
       pidieron y que se termina en CORREGIR CUENTA (rehace los formatos). */
    var corr = null;
    if (E.puerta === 'corregir') {
      corr = K.nodo(
        '<section class="kit-tarjeta obl-corrige">' +
        '  <h3 class="obl-corrige__t">' + K.esc(E.titulo || ('Corrige tu cuenta ' + E.informe)) + '</h3>' +
        (E.observaciones ? '  <div class="cta-devuelta"><b>' + (E.incompleta ? 'Lo que te pidieron completar' : 'Lo que te pidieron corregir') +
          '</b><p>' + K.esc(E.observaciones) + '</p></div>' : '') +
        '  <p class="obl-corrige__p">' + K.esc(E.motivo || '') + '</p>' +
        '  <button type="button" class="kit-btn kit-btn--plano">Ir a CORREGIR CUENTA</button>' +
        '</section>'
      );
      corr.querySelector('button').addEventListener('click', function () {
        K.vibrar(8);
        if (!sucio) { location.hash = '#/cuenta'; return; }
        guardar(false).then(function () { location.hash = '#/cuenta'; }, function () {});
      });
    }
    var c = K.nodo(
      '<section class="kit-tarjeta resumen-inf">' +
      '  <div class="resumen-inf__alto">' +
      '    <div>' +
      '      <p class="resumen-inf__e">Informe</p>' +
      '      <p class="resumen-inf__n">' + E.informe +
             (E.total ? ' <span>de ' + K.esc(E.total) + '</span>' : '') + '</p>' +
      '    </div>' +
      '    <span class="kit-pastilla ' + (E.puerta === 'editar' || E.puerta === 'corregir' ? 'kit-pastilla--aviso' : 'kit-pastilla--ok') +
         '" aria-pressed="true">' + (E.puerta === 'corregir' ? 'Corrección' : E.puerta === 'editar' ? 'Borrador' : 'Nuevo') + '</span>' +
      '  </div>' +
      '  <div class="barra"><i style="width:' + Math.max(4, pct) + '%"></i></div>' +
      '  <p class="resumen-inf__p">' + escritas + ' de ' + total + ' obligaciones escritas' +
         ' · ' + conFoto + ' con evidencia</p>' +
      '</section>'
    );
    if (!corr) return c;
    var f = document.createDocumentFragment();
    f.appendChild(corr); f.appendChild(c);
    return f;
  }

  function tarjetaObligacion(o, i, caja) {
    var escrito = String(textos[i] || '').trim();
    var foto = (evidencias[i] || []).length;
    var arch = archivos[i] || subiendoArch[i];
    var estado = escrito ? (foto || arch ? 'lista' : 'escrita') : 'pendiente';
    var rotulos = { lista: 'Completa', escrita: 'Falta la evidencia', pendiente: 'Sin diligenciar' };

    var t = K.nodo(
      '<button type="button" class="obl obl--' + estado + '">' +
      '  <span class="obl__n">' + o.n + '</span>' +
      '  <span class="obl__cuerpo">' +
      '    <span class="obl__txt">' + K.esc(recortar(o.texto, 110)) + '</span>' +
      '    <span class="obl__pie">' +
      '      <span class="obl__estado">' + rotulos[estado] + '</span>' +
           (foto ? '<span class="obl__foto">' + K.icono('clip', 14) + ' ' + foto +
             (foto === 1 ? ' imagen' : ' imágenes') + '</span>' : '') +
           (arch ? '<span class="obl__foto">' + K.icono(iconoArch(arch), 14) + ' 1 archivo</span>' : '') +
      '    </span>' +
      '  </span>' +
      '  <span class="obl__flecha">›</span>' +
      '</button>'
    );

    t.addEventListener('click', function () {
      K.vibrar(8);
      location.hash = '#/borrador/' + o.n;
    });
    return t;
  }

  function recortar(s, n) {
    var t = String(s || '').trim();
    return t.length > n ? (t.slice(0, n - 1) + '…') : t;
  }

  /* ══════════════ editor de una obligación ══════════════ */

  function editor(caja, n) {
    var i = n - 1;
    var o = E.obligaciones[i];

    K.piezas.banner.vista('Obligación ' + n + ' de ' + E.obligaciones.length);
    K.piezas.banner.atras(function () { location.hash = '#/borrador'; });

    /* El botón flotante de Insights es del tablero, no de aquí: en un
       teléfono se planta encima del botón Siguiente y hay que pelearse con
       él para pasar de obligación. Además, dentro de una obligación no hay
       nada que analizar. */
    /* 4.9 · Oss pidió Insights en TODAS las vistas, también aquí. Se
       queda, pero con su guía de redacción y SUBIDO (alto): así no tapa
       el Siguiente. Y con el clic sostenido se mueve adonde estorbe menos. */
    if (window.AYUDA) window.AYUDA.montar('borradorObligacion', { vista: 'Obligación ' + n });

    var v = K.nodo(
      '<section class="edi">' +
      '  <div class="kit-tarjeta edi__obl">' +
      '    <p class="edi__e">Obligación contractual</p>' +
      '    <p class="edi__texto">' + K.esc(o.texto) + '</p>' +
      '  </div>' +
      '  <div class="kit-tarjeta edi__campo">' +
      '    <label class="edi__lab" for="edi-act">Actividades ejecutadas para su cumplimiento</label>' +
      '    <textarea id="edi-act" class="edi__area" rows="8" ' +
      '      placeholder="Redacta de forma cuantitativa y usando verbos en pasado, las ' +
      '      actividades que realizaste en este periodo."></textarea>' +
      '    <p class="edi__cuenta"><span id="edi-cuenta">0</span> caracteres</p>' +
      '  </div>' +
      '  <div class="kit-tarjeta edi__evi edi__bloque">' +
      '    <p class="edi__bt">' + K.icono('imagen', 20) + '<span>IMÁGENES DE EVIDENCIAS DEL CUMPLIMIENTO</span></p>' +
      '    <p class="edi__bs">Opcional · hasta 3 imágenes</p>' +
      '    <div id="edi-zona"></div>' +
      '  </div>' +
      (ARCH_ON
        ? '  <div class="kit-tarjeta edi__evi edi__bloque edi__bloque--arch">' +
          '    <p class="edi__bt">' + K.icono('documento', 20) + '<span>ARCHIVO DE EVIDENCIA DEL CUMPLIMIENTO</span></p>' +
          '    <p class="edi__bs">Opcional · un archivo PDF, Word o Excel de hasta 10 MB</p>' +
          '    <div id="edi-arch"></div>' +
          '  </div>'
        : '') +
      '  <div class="edi__nav">' +
      '    <button type="button" class="kit-btn kit-btn--plano" id="edi-ant">' + K.icono('atras', 17) + ' Anterior</button>' +
      '    <button type="button" class="kit-btn kit-btn--marca" id="edi-sig">Siguiente ' + K.icono('adelante', 17) + '</button>' +
      '  </div>' +
      '</section>'
    );
    caja.appendChild(v);

    var area = v.querySelector('#edi-act');
    var cuenta = v.querySelector('#edi-cuenta');
    area.value = textos[i] || '';
    cuenta.textContent = area.value.length;

    area.addEventListener('input', function () {
      textos[i] = area.value;
      cuenta.textContent = area.value.length;
      sucio = true;
      respaldar();
    });

    zonaEvidencia(v.querySelector('#edi-zona'), i);
    if (ARCH_ON) zonaArchivo(v.querySelector('#edi-arch'), i);

    var ant = v.querySelector('#edi-ant'), sig = v.querySelector('#edi-sig');
    ant.disabled = n <= 1;
    if (n >= E.obligaciones.length) sig.innerHTML = 'Terminar ' + K.icono('check', 17);

    ant.addEventListener('click', function () { mover(n - 1); });
    sig.addEventListener('click', function () {
      if (n >= E.obligaciones.length) { guardar(true).then(function () { location.hash = '#/borrador'; }); }
      else mover(n + 1);
    });

    K.piezas.creditos.montar(caja);

    /* En el teléfono conviene empezar escribiendo; en el computador no, que
       el salto del teclado virtual no existe y el foco roba el scroll. */
    if (window.matchMedia('(max-width: 720px)').matches) setTimeout(function () { area.focus(); }, 320);
  }

  /* Pasar de obligación guarda por el camino, en silencio. Es lo que hace
     que cerrar la app a mitad no duela: cada salto deja lo anterior a
     salvo sin que nadie tenga que acordarse de pulsar nada. */
  function mover(n) {
    guardar(false)['catch'](function () {});
    location.hash = '#/borrador/' + n;
  }

  /* ══════════════ evidencia ══════════════
     4.4: hasta TRES por obligación. Antes era una sola, y cuando la
     persona elegía varias fotos el navegador las pegaba en un collage
     para que cupieran en la única celda que había. El collage salía
     borroso y ya no se podía separar. Ahora cada foto sube entera y por
     su cuenta, y el formato de evidencias las acomoda lado a lado. */

  var EVI_TOPE = 3;

  /* El CORE devuelve una lista; las cuentas viejas traen una sola url en
     texto. Se admiten las dos formas para que un borrador de ayer siga
     abriéndose. */
  function listaEvi(v) {
    if (!v) return [];
    if (Object.prototype.toString.call(v) === '[object Array]') {
      return v.filter(function (u) { return !!u; });
    }
    return String(v).split(/\s*\|\s*|\s+/).filter(function (u) { return !!u; });
  }

  function evisDe(i) {
    if (!evidencias[i]) evidencias[i] = [];
    return evidencias[i];
  }

  function zonaEvidencia(destino, i) {
    destino.innerHTML = '';
    var lista = evisDe(i);

    lista.forEach(function (url, k) {
      destino.appendChild(fichaEvidencia(destino, i, url, k + 1, lista.length));
    });

    if (lista.length < EVI_TOPE) {
      var zona = K.nodo('<div id="evi-caja-' + i + '"></div>');
      destino.appendChild(zona);

      K.piezas.adjuntos.montar(zona, {
        acepta: 'image/*',
        varios: true,
        maximo: EVI_TOPE - lista.length,
        maximoMB: 25,
        alCambiar: function (archivos) {
          if (archivos && archivos.length) subir(destino, i, archivos);
        }
      });

      destino.appendChild(K.nodo(
        '<p class="evi-nota">' +
        (lista.length
          ? 'Puedes añadir ' + (EVI_TOPE - lista.length) +
            (EVI_TOPE - lista.length === 1 ? ' evidencia más.' : ' evidencias más.')
          : 'Hasta ' + EVI_TOPE + ' imágenes por obligación. El formato las acomoda ' +
            'solo: ya no tienes que juntarlas en una sola foto.') +
        '</p>'
      ));
    }
  }

  /* Cada evidencia ya cargada, con su número y sus tres acciones. */
  function fichaEvidencia(destino, i, url, ranura, cuantas) {
    var f = K.nodo(
      '<div class="evi-ok">' +
      '  <img class="evi-ok__mini" src="' + K.esc(miniatura(url)) + '" alt="Evidencia ' + ranura + '">' +
      '  <div class="evi-ok__txt">' +
      '    <p class="evi-ok__t">Evidencia ' + ranura + (cuantas > 1 ? ' de ' + cuantas : '') + '</p>' +
      '    <p class="evi-ok__p">Ya quedó guardada.</p>' +
      '  </div>' +
      '  <div class="evi-ok__btns">' +
      '    <button type="button" class="kit-btn evi-ok__b" data-a="ver">' + K.icono('buscar', 16) + ' Ver</button>' +
      '    <button type="button" class="kit-btn evi-ok__b" data-a="cambiar">' + K.icono('recargar', 16) + ' Cambiar</button>' +
      '    <button type="button" class="kit-btn kit-btn--malo evi-ok__b" data-a="quitar">' + K.icono('basura', 16) + ' Quitar</button>' +
      '  </div>' +
      '</div>'
    );

    f.querySelector('[data-a="ver"]').addEventListener('click', function () {
      /* El carrusel recibe TODAS las de la obligación y se abre en esta:
         así se comparan sin salir y sin volver a cargar. */
      var lista = evisDe(i);
      K.piezas.carrusel.abrir(lista.map(function (u, k) {
        return { url: verEnGrande(u), titulo: 'Obligación ' + (i + 1) + ' · evidencia ' + (k + 1) };
      }), { indice: ranura - 1 });
    });
    f.querySelector('[data-a="cambiar"]').addEventListener('click', function () {
      cambiar(destino, i, ranura);
    });
    f.querySelector('[data-a="quitar"]').addEventListener('click', function () {
      quitar(destino, i, ranura);
    });

    return f;
  }

  /* Cambiar una: se pide la foto nueva y se manda a ESA ranura. La vieja
     la borra el CORE cuando la nueva ya está arriba, no antes. */
  function cambiar(destino, i, ranura) {
    var caja = K.nodo('<div class="evi-cambiar"><p class="evi-nota">Elige la imagen que reemplaza a la ' + ranura + '.</p></div>');
    destino.innerHTML = '';
    destino.appendChild(caja);
    var zona = K.nodo('<div></div>');
    caja.appendChild(zona);

    K.piezas.adjuntos.montar(zona, {
      acepta: 'image/*', varios: false, maximo: 1, maximoMB: 25,
      alCambiar: function (archivos) {
        if (archivos && archivos.length) subir(destino, i, [archivos[0]], ranura);
      }
    });

    var no = K.nodo('<button type="button" class="kit-btn kit-btn--plano">Dejarla como está</button>');
    no.addEventListener('click', function () { zonaEvidencia(destino, i); });
    caja.appendChild(no);
  }

  /* Las fotos suben de una en una y en fila: cada una queda guardada en su
     ranura antes de empezar la siguiente. Si la tercera falla, las dos
     primeras ya están a salvo. */
  function subir(destino, i, archivos, ranuraFija) {
    var lista = evisDe(i);
    var cupo = ranuraFija ? 1 : Math.max(0, EVI_TOPE - lista.length);
    var tanda = archivos.slice(0, cupo);
    if (!tanda.length) {
      K.aviso('Esta obligación ya tiene sus ' + EVI_TOPE + ' evidencias.', 'info', 4000);
      zonaEvidencia(destino, i);
      return;
    }

    K.piezas.guardado.abrir({
      titulo: tanda.length > 1 ? 'Subiendo tus evidencias' : 'Subiendo tu evidencia',
      sub: 'No cierres esta ventana hasta que termine.',
      pasos: ['Preparando la imagen…', 'Subiéndola a tu carpeta…', 'Dejándola guardada…']
    });

    var puestas = 0;

    function siguiente(k) {
      if (k >= tanda.length) {
        K.piezas.guardado.listo({
          sub: puestas > 1 ? 'Las ' + puestas + ' evidencias quedaron guardadas.'
                           : 'La evidencia quedó guardada.'
        });
        zonaEvidencia(destino, i);
        return;
      }
      K.piezas.imagenes.preparar(tanda[k])
        .then(function (img) {
          return K.pedir('evidenciaSubir', {
            obligacion: i + 1,
            imagen: img.dataUrl,
            ranura: ranuraFija || (evisDe(i).length + 1),
            total: E.total || ''
          });
        })
        .then(function (r) {
          evidencias[i] = listaEvi(r.urls && r.urls.length ? r.urls : r.url);
          if (r.informe) E.informe = r.informe;
          puestas++;
          siguiente(k + 1);
        })
        ['catch'](function (e) {
          K.piezas.guardado.fallo();
          K.aviso(e && e.message ? e.message : 'No se pudo subir la foto.', 'malo', 6000);
          zonaEvidencia(destino, i);
        });
    }

    siguiente(0);
  }

  function quitar(destino, i, ranura) {
    /* 4.5: era un window.confirm, con el dominio de GitHub de título.
       Ahora la pregunta es de la app, y se ve de qué obligación habla. */
    K.piezas.confirmar.preguntar({
      titulo: 'Quitar la evidencia',
      texto: 'Vas a quitar la evidencia ' + ranura + ' de la obligación ' + (i + 1) +
             '. Se borra también de tu carpeta de Drive y esto no se puede deshacer.',
      si: 'Sí, quitarla',
      no: 'Dejarla',
      peligro: true
    }).then(function (ok) {
      if (!ok) return;
      K.piezas.guardado.abrir({ titulo: 'Quitando la evidencia' });
      K.pedir('evidenciaQuitar', { obligacion: i + 1, ranura: ranura })
        .then(function (r) {
          evidencias[i] = listaEvi(r && r.urls);
          K.piezas.guardado.listo({ sub: 'Ya la quitamos.' });
          zonaEvidencia(destino, i);
        })
        ['catch'](function (e) {
          K.piezas.guardado.fallo();
          K.aviso(e && e.message ? e.message : 'No se pudo quitar.', 'malo', 5000);
        });
    });
  }

  /* Drive entrega el enlace /view, que dentro de un <img> no pinta nada.
     La miniatura tiene su propia dirección y la vista grande, otra. */
  function miniatura(url) {
    var id = idDrive(url);
    return id ? ('https://drive.google.com/thumbnail?id=' + id + '&sz=w320') : url;
  }

  function verEnGrande(url) {
    var id = idDrive(url);
    return id ? ('https://drive.google.com/thumbnail?id=' + id + '&sz=w1600') : url;
  }

  function idDrive(url) {
    var m = String(url || '').match(/(?:\/d\/|id=)([a-zA-Z0-9_-]{15,})/);
    return m ? m[1] : '';
  }


  /* ══════════════ archivo de evidencia (05/10) ══════════════
     Un archivo por obligación (PDF, Word o Excel, hasta 10 MB) con el
     nombre que escribe la persona. Sube DE FONDO: se puede seguir
     escribiendo o pasar a otra obligación mientras tanto. Reemplazarlo o
     quitarlo borra el anterior de Drive para siempre (lo hace el CORE, en
     cola). El archivo es privado: no se comparte por enlace. */

  var ARCH_ACEPTA = '.pdf,.doc,.docx,.xls,.xlsx,application/pdf,application/msword,' +
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document,' +
    'application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  var ARCH_EXT = { pdf: 1, doc: 1, docx: 1, xls: 1, xlsx: 1 };

  function extDe(nombre) {
    var m = /\.([a-z0-9]{2,5})$/i.exec(String(nombre || ''));
    var e = m ? m[1].toLowerCase() : '';
    return ARCH_EXT[e] ? e : '';
  }

  function iconoArch(a) {
    var e = (a && (a.ext || extDe(a.nombre))) || '';
    return e === 'pdf' ? 'pdf' : (e === 'xls' || e === 'xlsx') ? 'hoja' : 'documento';
  }

  /* Lo mismo que limpia el CORE (FCEV_limpiarNombre_), para que lo que la
     persona ve en el campo sea lo que va a quedar en Drive. */
  function limpiarNombre(s) {
    var t = String(s || '').replace(/\.(pdf|docx?|xlsx?)$/i, '');
    t = t.replace(/[\\\/:*?"<>|#%{}~&·\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
    t = t.replace(/^[.\-\s]+|[.\-\s]+$/g, '');
    return t.length > 80 ? t.slice(0, 80).trim() : t;
  }

  /* Repinta el bloque solo si la persona sigue en esa obligación. */
  function repintarArch(i) {
    var d = document.getElementById('edi-arch');
    if (d && location.hash === '#/borrador/' + (i + 1)) zonaArchivo(d, i);
  }

  function zonaArchivo(destino, i) {
    destino.innerHTML = '';
    var a = archivos[i], sub = subiendoArch[i];

    if (sub) {
      destino.appendChild(K.nodo(
        '<div class="arch-ok arch-ok--sube" aria-live="polite">' +
        '  <span class="arch-ok__ico">' + K.icono(iconoArch(sub), 22) + '</span>' +
        '  <div class="arch-ok__txt"><p class="arch-ok__t">' + K.esc(sub.nombre) + '</p>' +
        '  <p class="arch-ok__p"><span class="arch-giro"></span> Subiendo <b class="arch-pct">' + (sub.pct || 0) + ' %</b> · puedes seguir escribiendo.</p></div>' +
        '</div>'));
      return;
    }

    if (a) {
      var f = K.nodo(
        '<div class="arch-ok">' +
        '  <span class="arch-ok__ico">' + K.icono(iconoArch(a), 22) + '</span>' +
        '  <div class="arch-ok__txt"><p class="arch-ok__t">' + K.esc(a.nombre) + '</p>' +
        '  <p class="arch-ok__p">Guardado en tu carpeta de la cuenta.</p></div>' +
        '  <div class="evi-ok__btns">' +
        '    <button type="button" class="kit-btn evi-ok__b" data-a="ver">' + K.icono('buscar', 16) + ' Ver</button>' +
        '    <button type="button" class="kit-btn evi-ok__b" data-a="cambiar">' + K.icono('recargar', 16) + ' Reemplazar</button>' +
        '    <button type="button" class="kit-btn kit-btn--malo evi-ok__b" data-a="quitar">' + K.icono('basura', 16) + ' Quitar</button>' +
        '  </div>' +
        '</div>');
      f.querySelector('[data-a="ver"]').addEventListener('click', function () { verArchivo(i); });
      if (K.piezas.visor && K.piezas.visor.precalentarOficina && a.ext !== 'pdf') K.piezas.visor.precalentarOficina(a.ext || extDe(a.nombre));
      else if (K.drive && K.drive.precargar && !localArch[i]) K.drive.precargar(a.id);
      f.querySelector('[data-a="cambiar"]').addEventListener('click', function () { elegirArchivo(destino, i, true); });
      f.querySelector('[data-a="quitar"]').addEventListener('click', function () { quitarArchivo(destino, i); });
      destino.appendChild(f);
      return;
    }
    elegirArchivo(destino, i, false);
  }

  /* Elegir (o reemplazar): la zona de siempre, y en cuanto hay archivo, el
     campo del nombre, que es obligatorio. */
  function elegirArchivo(destino, i, reemplaza) {
    destino.innerHTML = '';
    var zona = K.nodo('<div></div>');
    destino.appendChild(zona);
    var adj = K.piezas.adjuntos.montar(zona, {
      acepta: ARCH_ACEPTA, varios: false, maximo: 1, maximoMB: 10,
      etiqueta: 'El archivo de evidencia',
      alCambiar: function (lista) {
        if (!lista.length) return;
        var file = lista[0];
        if (!extDe(file.name) && !/pdf|msword|wordprocessingml|ms-excel|spreadsheetml/.test(file.type || '')) {
          K.aviso('Solo se admiten PDF, Word (.doc, .docx) o Excel (.xls, .xlsx).', 'malo', 5000);
          adj.limpiar();
          return;
        }
        pedirNombre(destino, i, file, reemplaza);
      }
    });
    destino.appendChild(K.nodo('<p class="evi-nota">' + (reemplaza
      ? 'Elige el archivo que reemplaza al actual. El anterior se borra de tu carpeta para siempre.'
      : 'Arrástralo aquí o tócalo para elegirlo. Luego le pones nombre.') + '</p>'));
    if (reemplaza) {
      var no = K.nodo('<button type="button" class="kit-btn kit-btn--plano arch-no">Dejarlo como está</button>');
      no.addEventListener('click', function () { zonaArchivo(destino, i); });
      destino.appendChild(no);
    }
  }

  function pedirNombre(destino, i, file, reemplaza) {
    destino.innerHTML = '';
    var ext = extDe(file.name) || (/pdf/.test(file.type) ? 'pdf' : '');
    var f = K.nodo(
      '<form class="arch-nombre" novalidate>' +
      '  <div class="arch-ok arch-ok--elegido">' +
      '    <span class="arch-ok__ico">' + K.icono(iconoArch({ ext: ext }), 22) + '</span>' +
      '    <div class="arch-ok__txt"><p class="arch-ok__t">' + K.esc(file.name) + '</p>' +
      '    <p class="arch-ok__p">' + (file.size / 1048576).toFixed(1).replace('.', ',') + ' MB</p></div>' +
      '  </div>' +
      '  <label class="edi__lab" for="arch-n-' + i + '">Nombre del archivo <em class="arch-oblig">obligatorio</em></label>' +
      '  <div class="arch-nombre__fila"><input id="arch-n-' + i + '" class="edi__area arch-nombre__in" maxlength="80" autocomplete="off" ' +
      '    placeholder="Ej.: Informe de visitas de septiembre">' + (ext ? '<span class="arch-nombre__ext">.' + ext + '</span>' : '') + '</div>' +
      '  <p class="arch-nombre__err" hidden>Escribe el nombre del archivo.</p>' +
      '  <div class="arch-nombre__btns">' +
      '    <button type="button" class="kit-btn kit-btn--plano" data-a="no">Cancelar</button>' +
      '    <button type="submit" class="kit-btn kit-btn--marca">' + K.icono('nube', 17) + ' Guardar archivo</button>' +
      '  </div>' +
      '</form>');
    var inp = f.querySelector('input'), err = f.querySelector('.arch-nombre__err');
    inp.value = limpiarNombre(file.name);
    f.querySelector('[data-a="no"]').addEventListener('click', function () { zonaArchivo(destino, i); });
    f.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var nombre = limpiarNombre(inp.value);
      if (!nombre) { err.hidden = false; inp.focus(); return; }
      subirArchivo(i, file, nombre);
    });
    destino.appendChild(f);
    setTimeout(function () { try { inp.focus(); inp.select(); } catch (e) {} }, 60);
  }

  /* 05/10 noche · SUBIDA DIRECTA A DRIVE. Medido en producción: pasar el
     archivo por Apps Script costaba 10,4 s de servidor y las respuestas
     grandes se cortaban. Ahora:
       1. evidenciaArchivoPreparar (respuesta < 1 KB): nombre libre y sesión.
       2. El teléfono sube los bytes DIRECTO a Drive, con su avance.
       3. evidenciaArchivoListo: el CORE lo registra (y lo comparte).
     Con un CORE que no tenga la ruta nueva se sube como antes.
     El escudo cubre SOLO el toque: el formulario sigue libre mientras sube. */
  function subirArchivo(i, file, nombre) {
    if (subiendoArch[i]) return;
    var fin = K.piezas.antidoble ? K.piezas.antidoble.escudo() : function () {};
    var ext = extDe(file.name) || (/pdf/.test(file.type) ? 'pdf' : '');
    subiendoArch[i] = { nombre: nombre + (ext ? '.' + ext : ''), ext: ext, pct: 0 };
    repintarArch(i);
    /* el botón ya no existe (lo reemplazó la ficha de subida): el escudo se
       suelta ya y la persona sigue escribiendo mientras sube */
    fin(); fin = function () {};
    var t0 = Date.now(), tm = {};
    var meta = { obligacion: i + 1, nombre: nombre, tipo: file.type || '', nombreOriginal: file.name || '', bytes: file.size, total: E.total || '' };

    K.pedir('evidenciaArchivoPreparar', meta, { ms: 60000 })
      .then(function (p) {
        fin(); fin = function () {};
        tm.preparar = Date.now() - t0;
        if (subiendoArch[i]) subiendoArch[i].nombre = p.nombre;
        repintarArch(i);
        var t1 = Date.now();
        return ponerEnDrive(p.sesion, file, p.mime, i).then(function (id) {
          tm.drive = Date.now() - t1;
          var t2 = Date.now();
          return K.pedir('evidenciaArchivoListo', { obligacion: i + 1, id: id, total: E.total || '' }, { ms: 60000 })
            .then(function (r) { tm.listo = Date.now() - t2; return r; });
        });
      }, function (e) {
        /* CORE sin la ruta nueva: el camino de antes */
        if (e && /no tiene la accion/i.test(e.message || '')) { fin(); fin = function () {}; return subirPorCore(i, file, nombre); }
        throw e;
      })
      .then(function (r) {
        delete subiendoArch[i];
        archivos[i] = r.archivo;
        localArch[i] = file;
        if (r.informe) E.informe = r.informe;
        medir('subirArchivo', t0, file.size, tm);
        K.aviso('El archivo de la obligación ' + (i + 1) + ' quedó guardado como «' + r.archivo.nombre + '».', 'ok', 4500);
        repintarArch(i);
      })
      ['catch'](function (e) {
        fin();
        delete subiendoArch[i];
        K.aviso((e && e.message) || 'No se pudo subir el archivo.', 'malo', 6000);
        repintarArch(i);
      });
  }

  /* Los bytes van del teléfono a Drive (sin Apps Script), con su avance. Si
     la red se corta, se pregunta a Drive cuánto llegó y se sigue desde ahí
     (subida reanudable), hasta 3 veces. */
  function ponerEnDrive(sesion, file, mime, i) {
    var intentos = 0;
    function enviar(desde) {
      return new Promise(function (res, rej) {
        var x = new XMLHttpRequest();
        x.open('PUT', sesion, true);
        if (desde > 0) x.setRequestHeader('Content-Range', 'bytes ' + desde + '-' + (file.size - 1) + '/' + file.size);
        x.upload.onprogress = function (ev) {
          if (!ev.lengthComputable || !subiendoArch[i]) return;
          var pct = Math.min(99, Math.round((desde + ev.loaded) * 100 / file.size));
          if (pct !== subiendoArch[i].pct) { subiendoArch[i].pct = pct; pintarAvance(i); }
        };
        x.onload = function () {
          if (x.status === 200 || x.status === 201) {
            var j = {}; try { j = JSON.parse(x.responseText || '{}'); } catch (e) {}
            if (j.id) { res(j.id); return; }
          }
          rej({ red: x.status === 0 || x.status >= 500, status: x.status });
        };
        x.onerror = function () { rej({ red: true, status: 0 }); };
        x.send(desde > 0 ? file.slice(desde) : file);
      });
    }
    function cuanto() {
      return new Promise(function (res) {
        var x = new XMLHttpRequest();
        x.open('PUT', sesion, true);
        x.setRequestHeader('Content-Range', 'bytes */' + file.size);
        x.onload = function () {
          if (x.status === 200 || x.status === 201) { var j = {}; try { j = JSON.parse(x.responseText || '{}'); } catch (e) {} res({ id: j.id }); return; }
          var r = x.getResponseHeader('Range'); var m = r && /bytes=0-(\d+)/.exec(r);
          res({ desde: m ? Number(m[1]) + 1 : 0 });
        };
        x.onerror = function () { res({ desde: 0 }); };
        x.send();
      });
    }
    function intentar(desde) {
      return enviar(desde)['catch'](function (e) {
        if (!(e && e.red) || ++intentos > 3) throw new Error('No se pudo subir el archivo a Drive. Revisa tu internet e inténtalo otra vez.');
        return new Promise(function (r) { setTimeout(r, 800 * intentos); })
          .then(cuanto).then(function (c) { return c.id ? c.id : intentar(c.desde || 0); });
      });
    }
    return intentar(0);
  }

  function pintarAvance(i) {
    var d = document.getElementById('edi-arch');
    var p = d && d.querySelector('.arch-ok--sube .arch-pct');
    if (p && subiendoArch[i]) p.textContent = subiendoArch[i].pct + ' %';
  }

  /* El camino de antes (CORE sin la ruta nueva): el archivo viaja por Apps Script. */
  function subirPorCore(i, file, nombre) {
    return new Promise(function (res, rej) {
      var lector = new FileReader();
      lector.onload = function () {
        var s = String(lector.result || '');
        K.pedir('evidenciaArchivoSubir', {
          obligacion: i + 1, nombre: nombre, archivo: s.slice(s.indexOf(',') + 1),
          tipo: file.type || '', nombreOriginal: file.name || '', total: E.total || ''
        }, { ms: 180000 }).then(res, rej);
      };
      lector.onerror = function () { rej(new Error('No se pudo leer el archivo. Intenta elegirlo otra vez.')); };
      lector.readAsDataURL(file);
    });
  }

  /* Ver: si se acaba de subir desde aquí y es PDF, sale del teléfono sin
     viaje; si no, directo de Drive (PDF con la llave, ~0,5 s) o con el visor
     de Google (Word y Excel). Nunca pasa por Apps Script. */
  function verArchivo(i) {
    var a = archivos[i];
    if (!a || !K.piezas.visor) return;
    var file = localArch[i];
    var ext = a.ext || extDe(a.nombre);
    var titulo = 'Obligación ' + (i + 1) + ' · ' + a.nombre;
    var url = 'https://drive.google.com/file/d/' + a.id + '/view';
    var t0 = Date.now();
    /* recién subido desde aquí: sale del teléfono, sin viaje */
    if (file) {
      K.piezas.visor.abrir([{ titulo: titulo, ext: ext, tipo: ext === 'pdf' ? 'pdf' : undefined, cargar: function () {
        return new Promise(function (res, rej) {
          var l = new FileReader();
          l.onload = function () { medir('verArchivoLocal', t0); res({ bytes: new Uint8Array(l.result), mime: file.type || (ext === 'pdf' ? 'application/pdf' : 'application/octet-stream'), nombre: a.nombre, tipo: ext === 'pdf' ? 'pdf' : 'otro' }); };
          l.onerror = function () { rej(new Error('No se pudo leer el archivo.')); };
          l.readAsArrayBuffer(file);
        });
      } }]);
      return;
    }
    /* si no, directo de Drive con la llave (Word y Excel los pinta el teléfono) */
    K.piezas.visor.abrir([{ titulo: titulo, url: url, ext: ext, tipo: ext === 'pdf' ? 'pdf' : undefined }]);
  }

  function quitarArchivo(destino, i) {
    var a = archivos[i];
    if (!a) return;
    K.piezas.confirmar.preguntar({
      titulo: 'Quitar el archivo',
      texto: 'Vas a quitar «' + a.nombre + '» de la obligación ' + (i + 1) +
             '. Se borra de tu carpeta de Drive para siempre y no se puede deshacer.',
      si: 'Sí, quitarlo', no: 'Dejarlo', peligro: true
    }).then(function (ok) {
      if (!ok) return;
      K.piezas.guardado.abrir({ titulo: 'Quitando el archivo' });
      K.pedir('evidenciaArchivoQuitar', { obligacion: i + 1 })
        .then(function () {
          archivos[i] = null;
          delete localArch[i];
          K.piezas.guardado.listo({ sub: 'Ya lo quitamos.' });
          zonaArchivo(destino, i);
        })
        ['catch'](function (e) {
          K.piezas.guardado.fallo();
          K.aviso((e && e.message) || 'No se pudo quitar.', 'malo', 5000);
        });
    });
  }

  /* Medición de pantalla (regla 15): queda en la consola y en K.medidas si existe. */
  function medir(que, t0, bytes, partes) {
    var ms = Date.now() - t0;
    try { (window.__MEDIDAS = window.__MEDIDAS || []).push({ que: que, ms: ms, kb: bytes ? Math.round(bytes / 1024) : 0, partes: partes || null }); } catch (e) {}
    try { if (K.medir) K.medir(que, ms); } catch (e2) {}
  }

  /* ══════════════ guardar ══════════════ */

  function guardar(conAviso) {
    if (guardando) return Promise.resolve();
    if (!sucio) {
      if (conAviso) K.aviso('No hay cambios nuevos que guardar.', 'info', 3000);
      return Promise.resolve();
    }
    guardando = true;

    var paso = K.pedir('borradorGuardar', {
      actividades: textos,
      total: E.total || ''
    });

    if (conAviso) {
      K.piezas.guardado.abrir({
        titulo: 'Guardando tu informe',
        sub: 'No cierres esta ventana hasta que termine.',
        pasos: ['Revisando lo que escribiste…', 'Enviando al servidor…', 'Guardando en tu cuenta…']
      });
    }

    return paso
      .then(function (r) {
        sucio = false;
        guardando = false;
        olvidarRespaldo();
        if (r && r.informe) E.informe = r.informe;
        if (conAviso) {
          K.piezas.guardado.listo({
            titulo: '¡Guardado!',
            sub: E.puerta === 'corregir'
              ? 'Ahora ve a CORREGIR CUENTA y toca Guardar la corrección para rehacer tus formatos.'
              : r.escritas + ' de ' + r.obligaciones + ' obligaciones escritas'
          });
          /* El tablero se repinta para que el progreso refleje lo guardado. */
          if (location.hash.indexOf('/borrador/') < 0) abrirDeNuevo();
        }
        return r;
      })
      ['catch'](function (e) {
        guardando = false;
        if (conAviso) K.piezas.guardado.fallo();
        K.aviso(e && e.message ? e.message : 'No se pudo guardar.', 'malo', 6000);
        throw e;
      });
  }

  function abrirDeNuevo() {
    app.innerHTML = '';
    var caja = K.nodo('<div class="kit-ancho vista"></div>');
    app.appendChild(caja);
    pintar(caja);
  }

  function salir() {
    if (!sucio) { location.hash = '#/inicio'; return; }
    K.piezas.confirmar.preguntar({
      titulo: 'Tienes cambios sin guardar',
      texto: 'Lo que escribiste queda guardado en este teléfono, así que no lo vas a ' +
             'perder, pero todavía no está en el servidor y tu supervisor no lo ve.',
      si: 'Salir de todos modos',
      no: 'Seguir escribiendo'
    }).then(function (ok) {
      if (ok) location.hash = '#/inicio';
    });
  }

  /* ══════════════ insights ══════════════ */

  /* 4.4 · Insights que sirven para algo.
     Lo de antes contaba tres cosas (obligaciones, escritas, con evidencia)
     y eso ya se ve en la barra de arriba: era repetir la pantalla con
     otras palabras. Ahora responde lo que de verdad decide si la cuenta
     pasa o la devuelven: si la redacción es CUANTITATIVA (que es lo que
     pide el formato), si hay obligaciones flacas de texto, cuántas
     evidencias lleva cada una y qué falta exactamente para radicar. */

  function cifrasDe(txt) {
    return (String(txt || '').match(/\d+([.,]\d+)?/g) || []).length;
  }

  function montarInsights() {
    if (!K.piezas.insights) return;
    /* 4.9 · la guía de la vista (ayuda.js) + las cifras de aquí */
    (window.AYUDA ? function (c) { window.AYUDA.montar('borrador', c); } : K.piezas.insights.montar)({
      vista: 'Mi informe ' + E.informe,
      filas: function () {
        return E.obligaciones.map(function (o, i) {
          var txt = String(textos[i] || '').trim();
          var palabras = txt ? txt.split(/\s+/).filter(Boolean).length : 0;
          return {
            n: o.n,
            escrita: txt ? 'Sí' : 'No',
            evidencias: (evidencias[i] || []).length,
            archivo: archivos[i] ? archivos[i].nombre : '',
            palabras: palabras,
            cifras: cifrasDe(txt),
            /* "verbos en pasado" no se puede comprobar de verdad sin
               analizar la frase; lo que sí se puede es avisar de que no
               hay NINGUNA cifra, que es el error que se repite. */
            cuantitativa: (txt && cifrasDe(txt) > 0) ? 'Sí' : 'No'
          };
        });
      },
      medidas: [
        { titulo: 'Obligaciones', calcula: function (f) { return f.length; } },
        { titulo: 'Escritas', calcula: function (f) {
            return f.filter(function (x) { return x.escrita === 'Sí'; }).length; } },
        { titulo: 'Con evidencia', calcula: function (f) {
            return f.filter(function (x) { return x.evidencias > 0; }).length; } },
        { titulo: 'Imágenes en total', calcula: function (f) {
            return f.reduce(function (s, x) { return s + x.evidencias; }, 0); } },
        { titulo: 'Con archivo de evidencia', calcula: function (f) {
            return f.filter(function (x) { return !!x.archivo; }).length; } },
        { titulo: 'Palabras por obligación', calcula: function (f) {
            var e = f.filter(function (x) { return x.escrita === 'Sí'; });
            if (!e.length) return 0;
            return Math.round(e.reduce(function (s, x) { return s + x.palabras; }, 0) / e.length); } },
        { titulo: 'Con cifras', calcula: function (f) {
            return f.filter(function (x) { return x.cuantitativa === 'Sí'; }).length; } }
      ],
      botones: [
        { texto: '¿Qué me falta para radicar?', responde: function (f) {
            var sinTexto = f.filter(function (x) { return x.escrita === 'No'; })
                            .map(function (x) { return x.n; });
            var sinFoto = f.filter(function (x) { return x.escrita === 'Sí' && !x.evidencias && !x.archivo; })
                           .map(function (x) { return x.n; });
            if (!sinTexto.length && !sinFoto.length) {
              return 'Nada: las ' + f.length + ' obligaciones están escritas y con su evidencia. ' +
                     'Ya puedes ir a INGRESAR CUENTA.';
            }
            var s = '';
            if (sinTexto.length) {
              s += 'Sin escribir (' + sinTexto.length + '): ' + sinTexto.join(', ') + '.\n' +
                   'Sin estas no se puede radicar.\n';
            }
            if (sinFoto.length) {
              s += 'Escritas pero sin imágenes ni archivo de evidencia (' + sinFoto.length + '): ' + sinFoto.join(', ') + '.\n' +
                   'La cuenta se radica igual, pero el formato de evidencias sale con esos campos en N/A.';
            }
            return s;
          } },
        { texto: '¿Estoy redactando en cuantitativo?', responde: function (f) {
            var escritas = f.filter(function (x) { return x.escrita === 'Sí'; });
            if (!escritas.length) return 'Todavía no has escrito ninguna obligación.';
            var sinCifras = escritas.filter(function (x) { return x.cuantitativa === 'No'; })
                                    .map(function (x) { return x.n; });
            if (!sinCifras.length) {
              return 'Bien: las ' + escritas.length + ' que escribiste traen cifras. ' +
                     'Es lo que pide el formato: cuántos, cuánto, en cuántos días.';
            }
            return 'Estas ' + sinCifras.length + ' no tienen ni una cifra: ' + sinCifras.join(', ') + '.\n' +
                   'El informe se lee mejor con números: cuántas visitas, cuántos expedientes, ' +
                   'cuántos días. Y es lo que el supervisor busca cuando revisa.';
          } },
        { texto: '¿Voy corto de texto?', responde: function (f) {
            var escritas = f.filter(function (x) { return x.escrita === 'Sí'; });
            if (!escritas.length) return 'Todavía no has escrito ninguna obligación.';
            var cortas = escritas.filter(function (x) { return x.palabras < 12; });
            var media = Math.round(escritas.reduce(function (s, x) { return s + x.palabras; }, 0) / escritas.length);
            if (!cortas.length) {
              return 'Todas las que escribiste tienen cuerpo. Promedio: ' + media + ' palabras.';
            }
            return 'Promedio: ' + media + ' palabras por obligación.\n' +
                   'Estas ' + cortas.length + ' quedaron por debajo de doce y puede que al ' +
                   'supervisor le sepan a poco: ' +
                   cortas.map(function (x) { return x.n + ' (' + x.palabras + ')'; }).join(', ') + '.';
          } },
        { texto: '¿Cómo van mis evidencias?', responde: function (f) {
            var con = f.filter(function (x) { return x.evidencias > 0; });
            if (!con.length) return 'Todavía no has subido ninguna evidencia.';
            var una = f.filter(function (x) { return x.evidencias === 1; }).length;
            var dos = f.filter(function (x) { return x.evidencias === 2; }).length;
            var tres = f.filter(function (x) { return x.evidencias === 3; }).length;
            var total = f.reduce(function (s, x) { return s + x.evidencias; }, 0);
            return total + (total === 1 ? ' evidencia' : ' evidencias') + ' en ' + con.length +
                   ' obligaciones.\n' +
                   'Con una: ' + una + ' · con dos: ' + dos + ' · con tres: ' + tres + '.\n' +
                   'Desde esta versión el formato acomoda hasta tres por obligación y las reparte ' +
                   'solo: ya no tienes que juntarlas en una sola foto.';
          } }
      ]
    });
  }


  function errorCaja(e) {
    var msg = (e && e.message) ? e.message : 'No se pudo cargar.';
    var c = K.nodo(
      '<section class="kit-tarjeta error">' +
      '  <p class="error__t">' + K.esc(msg) + '</p>' +
      '  <button type="button" class="kit-btn kit-btn--plano">Reintentar</button>' +
      '</section>'
    );
    c.querySelector('button').addEventListener('click', function () { E = null; abrir(); });
    return c;
  }

  /*
   * 4.5 · AQUÍ ESTABA EL CUADRO DEL SISTEMA
   *
   * Había un beforeunload para que el navegador preguntara al cerrar la
   * pestaña con algo sin guardar. Esa es la captura que mandó Oss:
   *
   *     botheart911.github.io dice
   *     Tienes cambios sin guardar. ¿Salir de todos modos?
   *
   * El navegador no deja vestir ese cuadro: pone el dominio, escribe en el
   * idioma del sistema y no admite el texto que se le pase. Se quita.
   *
   * Y no hace falta, que es la clave: lo que la persona escribe se guarda
   * en ESTE aparato en cuanto lo teclea (el respaldo local de más arriba),
   * así que cerrar la pestaña no le pierde una palabra; al volver a entrar
   * se le ofrece recuperarlo. Lo único que quedaba pendiente era avisar de
   * que no está en el servidor, y eso ya lo dice la capa de salir() con
   * las palabras de la app.
   */

  window.BORRADOR = {
    abrir: abrir,
    olvidar: function () { E = null; sucio = false; },
    haySinGuardar: function () { return sucio; }
  };
}());
