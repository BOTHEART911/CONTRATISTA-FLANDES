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
      devuelta: 'Esta cuenta está devuelta',
      espera: 'Todavía no',
      completa: 'Ya terminaste tu contrato'
    };
    var c = K.nodo(
      '<section class="kit-tarjeta puerta">' +
      '  <p class="puerta__ico">' + K.icono(iconos[E.puerta] || 'aviso', 34) + '</p>' +
      '  <h3 class="puerta__t">' + K.esc(titulos[E.puerta] || 'Aviso') + '</h3>' +
      '  <p class="puerta__p">' + K.esc(E.motivo || '') + '</p>' +
      '</section>'
    );
    return c;
  }

  /* El total de pagos: se pregunta una sola vez por contrato y de ahí sale
     cuántos informes va a radicar. Va en su propia pantalla porque
     equivocarse aquí descuadra todas las cuentas del contrato. */
  function pedirTotal(caja) {
    var f = K.nodo(
      '<form class="kit-tarjeta total" novalidate>' +
      '  <h3 class="total__t">Antes de empezar</h3>' +
      '  <p class="total__p">¿Cuántos pagos tendrá este contrato? Es el número de ' +
      '  informes que vas a radicar en total. Si no estás seguro, míralo en tu ' +
      '  contrato o pregúntale a tu supervisor: este número ordena todas tus cuentas.</p>' +
      '  <label class="campo"><span>Número de pagos</span>' +
      '    <input name="total" type="number" inputmode="numeric" min="1" max="24" required>' +
      '  </label>' +
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
    var conFoto = evidencias.filter(function (u) { return u && u.length; }).length;
    var total = E.obligaciones.length;
    var pct = total ? Math.round(escritas * 100 / total) : 0;

    var c = K.nodo(
      '<section class="kit-tarjeta resumen-inf">' +
      '  <div class="resumen-inf__alto">' +
      '    <div>' +
      '      <p class="resumen-inf__e">Informe</p>' +
      '      <p class="resumen-inf__n">' + E.informe +
             (E.total ? ' <span>de ' + K.esc(E.total) + '</span>' : '') + '</p>' +
      '    </div>' +
      '    <span class="kit-pastilla ' + (E.puerta === 'editar' ? 'kit-pastilla--aviso' : 'kit-pastilla--ok') +
         '" aria-pressed="true">' + (E.puerta === 'editar' ? 'Borrador' : 'Nuevo') + '</span>' +
      '  </div>' +
      '  <div class="barra"><i style="width:' + Math.max(4, pct) + '%"></i></div>' +
      '  <p class="resumen-inf__p">' + escritas + ' de ' + total + ' obligaciones escritas' +
         ' · ' + conFoto + ' con evidencia</p>' +
      '</section>'
    );
    return c;
  }

  function tarjetaObligacion(o, i, caja) {
    var escrito = String(textos[i] || '').trim();
    var foto = (evidencias[i] || []).length;
    var estado = escrito ? (foto ? 'lista' : 'escrita') : 'pendiente';
    var rotulos = { lista: 'Completa', escrita: 'Falta la evidencia', pendiente: 'Sin diligenciar' };

    var t = K.nodo(
      '<button type="button" class="obl obl--' + estado + '">' +
      '  <span class="obl__n">' + o.n + '</span>' +
      '  <span class="obl__cuerpo">' +
      '    <span class="obl__txt">' + K.esc(recortar(o.texto, 110)) + '</span>' +
      '    <span class="obl__pie">' +
      '      <span class="obl__estado">' + rotulos[estado] + '</span>' +
           (foto ? '<span class="obl__foto">' + K.icono('clip', 14) + ' ' + foto +
             (foto === 1 ? ' evidencia' : ' evidencias') + '</span>' : '') +
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
    if (K.piezas.insights) K.piezas.insights.quitar();

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
      '  <div class="kit-tarjeta edi__evi">' +
      '    <p class="edi__e">Evidencias del cumplimiento</p>' +
      '    <div id="edi-zona"></div>' +
      '  </div>' +
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
    if (!window.confirm('¿Quitar la evidencia ' + ranura + ' de esta obligación?')) return;
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
            sub: r.escritas + ' de ' + r.obligaciones + ' obligaciones escritas'
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
    if (sucio) {
      if (!window.confirm('Tienes cambios sin guardar. ¿Salir de todos modos?')) return;
    }
    location.hash = '#/inicio';
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
    K.piezas.insights.montar({
      vista: 'Mi informe ' + E.informe,
      filas: function () {
        return E.obligaciones.map(function (o, i) {
          var txt = String(textos[i] || '').trim();
          var palabras = txt ? txt.split(/\s+/).filter(Boolean).length : 0;
          return {
            n: o.n,
            escrita: txt ? 'Sí' : 'No',
            evidencias: (evidencias[i] || []).length,
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
        { titulo: 'Evidencias en total', calcula: function (f) {
            return f.reduce(function (s, x) { return s + x.evidencias; }, 0); } },
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
            var sinFoto = f.filter(function (x) { return x.escrita === 'Sí' && !x.evidencias; })
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
              s += 'Escritas pero sin evidencia (' + sinFoto.length + '): ' + sinFoto.join(', ') + '.\n' +
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

  /* Si se sale de la app con algo sin guardar, el navegador pregunta. El
     respaldo local ya protege el texto, pero avisar evita el susto. */
  window.addEventListener('beforeunload', function (ev) {
    if (!sucio) return;
    ev.preventDefault();
    ev.returnValue = '';
  });

  window.BORRADOR = {
    abrir: abrir,
    olvidar: function () { E = null; sucio = false; },
    haySinGuardar: function () { return sucio; }
  };
}());
