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
        evidencias = (d.evidencias || []).slice();
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
    var iconos = { devuelta: '↩️', espera: '⏳', completa: '🎉' };
    var titulos = {
      devuelta: 'Esta cuenta está devuelta',
      espera: 'Todavía no',
      completa: 'Ya terminaste tu contrato'
    };
    var c = K.nodo(
      '<section class="kit-tarjeta puerta">' +
      '  <p class="puerta__ico">' + (iconos[E.puerta] || 'ℹ️') + '</p>' +
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
    var conFoto = evidencias.filter(function (u) { return u; }).length;
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
    var foto = evidencias[i];
    var estado = escrito ? (foto ? 'lista' : 'escrita') : 'pendiente';
    var rotulos = { lista: 'Lista', escrita: 'Falta la foto', pendiente: 'Sin escribir' };

    var t = K.nodo(
      '<button type="button" class="obl obl--' + estado + '">' +
      '  <span class="obl__n">' + o.n + '</span>' +
      '  <span class="obl__cuerpo">' +
      '    <span class="obl__txt">' + K.esc(recortar(o.texto, 110)) + '</span>' +
      '    <span class="obl__pie">' +
      '      <span class="obl__estado">' + rotulos[estado] + '</span>' +
           (foto ? '<span class="obl__foto">📎 con foto</span>' : '') +
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
      '    <p class="edi__e">Lo que dice tu contrato</p>' +
      '    <p class="edi__texto">' + K.esc(o.texto) + '</p>' +
      '  </div>' +
      '  <div class="kit-tarjeta edi__campo">' +
      '    <label class="edi__lab" for="edi-act">Qué hiciste para cumplirla</label>' +
      '    <textarea id="edi-act" class="edi__area" rows="8" ' +
      '      placeholder="Cuenta con tus palabras las actividades que realizaste."></textarea>' +
      '    <p class="edi__cuenta"><span id="edi-cuenta">0</span> caracteres</p>' +
      '  </div>' +
      '  <div class="kit-tarjeta edi__evi">' +
      '    <p class="edi__e">Evidencia</p>' +
      '    <div id="edi-zona"></div>' +
      '  </div>' +
      '  <div class="edi__nav">' +
      '    <button type="button" class="kit-btn kit-btn--plano" id="edi-ant">← Anterior</button>' +
      '    <button type="button" class="kit-btn kit-btn--marca" id="edi-sig">Siguiente →</button>' +
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
    if (n >= E.obligaciones.length) sig.textContent = 'Terminar';

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

  /* ══════════════ evidencia ══════════════ */

  function zonaEvidencia(destino, i) {
    destino.innerHTML = '';

    if (evidencias[i]) {
      var ver = K.nodo(
        '<div class="evi-ok">' +
        '  <img class="evi-ok__mini" src="' + K.esc(miniatura(evidencias[i])) + '" alt="Evidencia cargada">' +
        '  <div class="evi-ok__txt">' +
        '    <p class="evi-ok__t">Evidencia cargada</p>' +
        '    <p class="evi-ok__p">Ya quedó guardada.</p>' +
        '  </div>' +
        '  <div class="evi-ok__btns">' +
        '    <button type="button" class="kit-btn evi-ok__b" data-a="ver">Ver</button>' +
        '    <button type="button" class="kit-btn evi-ok__b" data-a="cambiar">Cambiar</button>' +
        '    <button type="button" class="kit-btn kit-btn--malo evi-ok__b" data-a="quitar">Quitar</button>' +
        '  </div>' +
        '</div>'
      );
      ver.querySelector('[data-a="ver"]').addEventListener('click', function () {
        K.piezas.carrusel.abrir([{ url: verEnGrande(evidencias[i]), titulo: 'Obligación ' + (i + 1) }]);
      });
      ver.querySelector('[data-a="cambiar"]').addEventListener('click', function () {
        elegir(destino, i);
      });
      ver.querySelector('[data-a="quitar"]').addEventListener('click', function () {
        quitar(destino, i);
      });
      destino.appendChild(ver);
      return;
    }

    var zona = K.nodo('<div id="evi-caja-' + i + '"></div>');
    destino.appendChild(zona);

    K.piezas.adjuntos.montar(zona, {
      acepta: 'image/*',
      varios: true,
      maximo: 4,
      maximoMB: 25,
      alCambiar: function (archivos) {
        if (archivos && archivos.length) subir(destino, i, archivos);
      }
    });

    destino.appendChild(K.nodo(
      '<p class="evi-nota">Una foto por obligación. Si tienes varias, súbelas todas: ' +
      'las juntamos en una sola imagen.</p>'
    ));
  }

  function elegir(destino, i) {
    evidencias[i] = '';
    zonaEvidencia(destino, i);
  }

  function subir(destino, i, archivos) {
    var preparar = archivos.length > 1
      ? K.piezas.imagenes.collage(archivos)
      : K.piezas.imagenes.preparar(archivos[0]);

    K.piezas.guardado.abrir({
      titulo: archivos.length > 1 ? 'Juntando tus fotos' : 'Subiendo tu evidencia',
      sub: 'No cierres esta ventana 🚀',
      pasos: ['Preparando la imagen…', 'Subiéndola a tu carpeta…', 'Dejándola guardada…']
    });

    preparar
      .then(function (img) {
        return K.pedir('evidenciaSubir', {
          obligacion: i + 1,
          imagen: img.dataUrl,
          total: E.total || ''
        });
      })
      .then(function (r) {
        evidencias[i] = r.url;
        if (r.informe) E.informe = r.informe;
        K.piezas.guardado.listo({ sub: 'Evidencia guardada 🎉' });
        zonaEvidencia(destino, i);
      })
      ['catch'](function (e) {
        K.piezas.guardado.fallo();
        K.aviso(e && e.message ? e.message : 'No se pudo subir la foto.', 'malo', 6000);
        zonaEvidencia(destino, i);
      });
  }

  function quitar(destino, i) {
    if (!window.confirm('¿Quitar la evidencia de esta obligación?')) return;
    K.piezas.guardado.abrir({ titulo: 'Quitando la evidencia' });
    K.pedir('evidenciaQuitar', { obligacion: i + 1 })
      .then(function () {
        evidencias[i] = '';
        K.piezas.guardado.listo({ sub: 'Ya la quitamos' });
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
        sub: 'No cierres esta ventana hasta que termine 🚀',
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

  function montarInsights() {
    if (!K.piezas.insights) return;
    K.piezas.insights.montar({
      vista: 'Mi informe ' + E.informe,
      filas: function () {
        return E.obligaciones.map(function (o, i) {
          return {
            n: o.n,
            escrita: String(textos[i] || '').trim() ? 'Sí' : 'No',
            evidencia: evidencias[i] ? 'Sí' : 'No',
            palabras: String(textos[i] || '').trim().split(/\s+/).filter(Boolean).length
          };
        });
      },
      medidas: [
        { titulo: 'Obligaciones', calcula: function (f) { return f.length; } },
        { titulo: 'Escritas', calcula: function (f) {
            return f.filter(function (x) { return x.escrita === 'Sí'; }).length; } },
        { titulo: 'Con evidencia', calcula: function (f) {
            return f.filter(function (x) { return x.evidencia === 'Sí'; }).length; } }
      ],
      botones: [
        { texto: '¿Qué me falta?', responde: function (f) {
            var sinTexto = f.filter(function (x) { return x.escrita === 'No'; })
                            .map(function (x) { return x.n; });
            var sinFoto = f.filter(function (x) { return x.escrita === 'Sí' && x.evidencia === 'No'; })
                           .map(function (x) { return x.n; });
            if (!sinTexto.length && !sinFoto.length) {
              return 'No te falta nada: todas las obligaciones están escritas y con su evidencia.';
            }
            var s = '';
            if (sinTexto.length) s += 'Sin escribir: ' + sinTexto.join(', ') + '.\n';
            if (sinFoto.length) s += 'Escritas pero sin foto: ' + sinFoto.join(', ') + '.';
            return s;
          } },
        { texto: '¿Voy muy corto de texto?', responde: function (f) {
            var cortas = f.filter(function (x) { return x.escrita === 'Sí' && x.palabras < 12; })
                          .map(function (x) { return x.n; });
            if (!cortas.length) return 'Todas las que escribiste tienen un texto con cuerpo.';
            return 'Estas quedaron con menos de doce palabras y puede que al supervisor ' +
                   'le sepan a poco: ' + cortas.join(', ') + '.';
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
