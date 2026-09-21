/* ============================================================
   CONTRATISTA-FLANDES · APP
   Ecosistema Flandes · Fase 4, entrega 4.1

   Lo que entra en esta entrega
     · Entrada con Firebase silencioso (el teléfono queda registrado
       para los avisos apenas se inicia sesión, sin preguntar nada).
     · Inicio nuevo: sin menú lateral y sin banner dinámico.
     · Datos del proceso (el contrato) y datos personales.

   Lo que NO entra todavía (va en 4.2, 4.3 y 4.4)
     Borrador de actividades, ingresar y corregir cuenta, trámites,
     estado de cuenta, tutoriales y soporte por vista.

   Reglas que se respetan aquí
     · Todo dato de la hoja pasa por KIT.esc antes de entrar al HTML.
     · La app no conoce ninguna URL: todo sale de marca.js.
     · Modo oscuro incluido de serie (el botón vive en el banner).
   ============================================================ */
(function () {
  'use strict';

  var K = window.KIT;
  var M = window.MARCA || {};
  var app = K.id('app');

  var YO = null;          /* quién entró */
  var CONTRATO = null;    /* su contrato, tal como lo da el CORE */

  /* ══════════════ arranque ══════════════ */

  K.listo(function () {
    registrarSW();
    if (K.piezas.instalar) K.piezas.instalar.vigilar();

    /* Lo primero de todo es la puerta: instalar o seguir en el navegador.
       Solo sale la primera vez y solo si la app no está ya instalada. */
    var puerta = K.piezas.bienvenida
      ? K.piezas.bienvenida.abrir({
          titulo: 'Contratista',
          sub: M.MUNICIPIO || 'Alcaldía de Flandes',
          imagen: K.medio(M.APP_ICON || 'img/contratista.webp')
        })
      : Promise.resolve('saltada');

    puerta.then(function () {
      K.piezas.sesion.entrar({
        titulo: 'CONTRATISTA',
        sub: 'Ingresa con tu documento y contraseña',
        imagen: K.medio(M.APP_ICON || 'img/contratista.webp'),
        alEntrar: arrancar
      });
    });
  });

  /**
   * El service worker del caché (sw.js) va en el scope de la app.
   * El de los avisos tiene el suyo y lo registra kit/avisos.js: si los
   * dos pidieran './', el segundo reemplazaría al primero.
   */
  function registrarSW() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('sw.js')['catch'](function () {});
  }

  function arrancar(yo) {
    YO = yo || {};
    montarBanner();

    /* Los avisos: si el permiso ya está dado, el token se renueva en
       silencio. Si no, sale NUESTRA hoja explicando de qué va, y el cuadro
       del sistema aparece después, colgando del toque de la persona. */
    if (K.piezas.avisos) {
      /* Solo desde el inicio. Quien entra con un enlace directo a una
         obligación (por ejemplo desde un aviso) estaría escribiendo cuando
         la hoja de permisos le tapa la pantalla a los 1,6 s. */
      if (enInicio()) K.piezas.avisos.autoActivar({ espera: 1600 });
      K.piezas.avisos.alLlegar(function (a) {
        K.aviso(a.titulo ? (a.titulo + ': ' + a.cuerpo) : a.cuerpo, 'info', 6000);
      });
    }

    window.addEventListener('hashchange', enrutar);
    enrutar();
  }

  function montarBanner() {
    K.piezas.banner.montar({
      titulo: 'Contratista',
      nombre: YO.nombre || '',
      rol: YO.rol || 'CONTRATISTA',
      foto: YO.imagen || '',
      menu: [
        { texto: 'Mis datos', al: function () { irA('personales'); } },
        { texto: 'Cambiar contraseña', al: function () { K.piezas.sesion.cambiarClave(); } },
        { texto: 'Instalar la app', al: function () { K.piezas.instalar.abrir(); } },
        { texto: 'Soporte', al: function () { if (K.piezas.soporte) K.piezas.soporte.abrir(); } },
        { texto: 'Cerrar sesión', al: salir, peligro: true }
      ]
    });
  }

  function salir() {
    if (K.piezas.avisos) K.piezas.avisos.olvidar();
    K.piezas.sesion.salir();
    location.hash = '';
  }

  /* ══════════════ vistas ══════════════ */

  var VISTAS = {
    inicio: vistaInicio,
    proceso: vistaProceso,
    personales: vistaPersonales,
    borrador: vistaBorrador,
    avisos: vistaAvisos
  };

  function irA(v) { location.hash = '#/' + v; }

  function enInicio() {
    var v = String(location.hash || '').replace(/^#\/?/, '').split('/')[0];
    return !v || v === 'inicio';
  }

  function enrutar() {
    /* La ruta puede traer un tramo más (#/borrador/7). El primero elige la
       vista; el segundo se lo queda ella. */
    var partes = String(location.hash || '').replace(/^#\/?/, '').split('/');
    var v = partes[0] || 'inicio';
    if (!VISTAS[v]) v = 'inicio';

    K.piezas.banner.vista(v === 'inicio' ? 'Contratista' : titulos[v]);
    K.piezas.banner.atras(v === 'inicio' ? null : function () { irA('inicio'); });

    /* El borrador pinta su propia pantalla y se encarga de avisar si hay
       algo sin guardar; el enrutador no le vacía el sitio por debajo. */
    if (v !== 'borrador') app.innerHTML = '';
    VISTAS[v](partes[1]);
  }

  var titulos = {
    inicio: 'Contratista',
    proceso: 'Datos del proceso',
    personales: 'Mis datos',
    borrador: 'Mi informe',
    avisos: 'Mis avisos'
  };

  /* ---------- inicio ---------- */

  function vistaInicio() {
    var caja = K.nodo('<div class="kit-ancho vista"></div>');
    caja.appendChild(K.nodo(
      '<section class="saludo">' +
      '  <p class="saludo__hola">Hola,</p>' +
      '  <h2 class="saludo__nombre">' + K.esc(nombreCorto(YO.nombre)) + '</h2>' +
      '  <p class="saludo__doc">Documento ' + K.esc(YO.documento || '') + '</p>' +
      '</section>'
    ));

    var rejilla = K.nodo('<div class="kit-rejilla kit-rejilla--auto accesos"></div>');
    rejilla.appendChild(acceso('Mi informe', 'Escribe tus actividades y sube las evidencias', 'img/datos_de_procesos.webp', function () { irA('borrador'); }));

    /* La burbuja de sin leer va aquí y no en una campana aparte: es donde
       la persona mira al entrar, y así el aviso guardado se ve aunque el
       push se haya perdido. El número lo trae la misma llamada del inicio. */
    var tarjetaAvisos = acceso('Mis avisos', 'Todo lo que te hemos avisado', 'img/notificacion.webp', function () { irA('avisos'); });
    rejilla.appendChild(tarjetaAvisos);
    pintarBurbuja(tarjetaAvisos);

    rejilla.appendChild(acceso('Datos del proceso', 'Tu contrato, su valor y quién lo supervisa', 'img/datos_de_procesos.webp', function () { irA('proceso'); }));
    rejilla.appendChild(acceso('Mis datos', 'Teléfono, dirección y correo', 'img/user.png', function () { irA('personales'); }));
    rejilla.appendChild(acceso('Avisos al teléfono', textoAvisos(), 'img/notificacion.webp', tocarAvisos));
    caja.appendChild(rejilla);

    app.appendChild(caja);
    K.piezas.creditos.montar(caja);

    /* El resumen del contrato se trae en una sola llamada. */
    var destino = K.nodo('<section class="resumen"></section>');
    caja.insertBefore(destino, rejilla);

    K.piezas.esqueletos.mientras(destino, cargarInicio(), { forma: 'ficha', cuantos: 1 })
      .then(function () { pintarResumen(destino); })
      ['catch'](function (e) { destino.appendChild(errorCaja(e)); });
  }

  function cargarInicio() {
    if (CONTRATO) return Promise.resolve(CONTRATO);
    return K.pedir('inicio').then(function (d) {
      YO = d.yo || YO;
      CONTRATO = d.contrato;
      return CONTRATO;
    });
  }

  function pintarResumen(destino) {
    var c = CONTRATO || {};
    destino.innerHTML =
      '<div class="kit-tarjeta resumen__caja">' +
      '  <div class="resumen__fila"><span>Contrato</span><b>' + K.esc(c.contrato || '—') + '</b></div>' +
      '  <div class="resumen__fila"><span>Secretaría</span><b>' + K.esc(c.secretaria || '—') + '</b></div>' +
      '  <div class="resumen__fila"><span>Estado</span>' + pastillaEstado(c.estado) + '</div>' +
      '</div>';
  }

  function acceso(titulo, texto, medio, al) {
    var b = K.nodo(
      '<button type="button" class="kit-tarjeta acceso">' +
      '  <img class="acceso__img" src="' + K.esc(K.medio(medio)) + '" alt="" loading="lazy">' +
      '  <span class="acceso__txt">' +
      '    <span class="acceso__t">' + K.esc(titulo) + '</span>' +
      '    <span class="acceso__p">' + K.esc(texto) + '</span>' +
      '  </span>' +
      '</button>'
    );
    b.addEventListener('click', function () { K.vibrar(8); al(); });
    return b;
  }

  /* ---------- mi informe (borrador) ---------- */

  function vistaBorrador(sub) {
    window.BORRADOR.abrir(sub);
  }

  /* ---------- mis avisos ---------- */

  function vistaAvisos() {
    var caja = K.nodo('<div class="kit-ancho vista"></div>');
    app.appendChild(caja);

    var zona = K.nodo('<section id="buzon"></section>');
    caja.appendChild(zona);

    var b = K.piezas.buzon.montar(zona, {
      pedir: function () { return K.pedir('misAvisos'); },
      marcar: function (ids) { return K.pedir('avisoLeido', { ids: ids }); },
      alContar: function (n) { K.piezas.buzon.recordar(n); },
      /* Un aviso de cuenta lleva al informe: leerlo y no poder hacer nada
         desde ahí obliga a volver al inicio y buscar. */
      alTocar: function (aviso) {
        if (/CUENTA|INFORME|DEVUEL/i.test(aviso.tipo || '')) irA('borrador');
      }
    });

    K.piezas.esqueletos.mientras(zona, b.cargar(), { forma: 'tarjetas', cuantos: 3 })
      ['catch'](function (e) { caja.appendChild(errorCaja(e)); });

    K.piezas.creditos.montar(caja);
  }

  /* El número rojo de avisos sin leer. Se pide aparte y en segundo plano:
     si tarda o falla, el inicio ya está pintado y nadie se queda mirando
     una pantalla en blanco por una burbuja. */
  function pintarBurbuja(tarjeta) {
    var ya = K.piezas.buzon ? K.piezas.buzon.noLeidos() : 0;
    if (ya) poner(ya);

    K.pedir('misAvisos', { cuantos: 1 })
      .then(function (d) {
        var n = (d && d.noLeidos) || 0;
        if (K.piezas.buzon) K.piezas.buzon.recordar(n);
        poner(n);
      })
      ['catch'](function () {});

    function poner(n) {
      var vieja = tarjeta.querySelector('.acceso__burbuja');
      if (vieja) vieja.remove();
      if (!n) return;
      tarjeta.appendChild(K.nodo(
        '<span class="acceso__burbuja">' + (n > 9 ? '9+' : n) + '</span>'
      ));
    }
  }

  function textoAvisos() {
    if (!K.piezas.avisos) return 'Avisos de tus cuentas';
    var e = K.piezas.avisos.estado();
    if (e === 'listo') return 'Este teléfono ya recibe avisos';
    if (e === 'bloqueado') return 'Están bloqueados: toca para ver cómo se desbloquean';
    if (e === 'ios-sin-instalar') return 'Instala la app para recibirlos';
    if (e === 'no-soportado') return 'Este navegador no los permite';
    return 'Toca para activarlos en este teléfono';
  }

  function tocarAvisos() {
    if (!K.piezas.avisos) return;
    var e = K.piezas.avisos.estado();
    /* Si nunca se le preguntó, se le explica antes; si ya dijo que sí o el
       caso no tiene arreglo desde aquí (iPhone sin instalar, bloqueado),
       activar() ya enseña la hoja que corresponde. */
    var paso = (e === 'sin-permiso')
      ? K.piezas.avisos.proponer()
      : K.piezas.avisos.activar({ forzar: true });
    paso.then(function () { enrutar(); });
  }

  /* ---------- datos del proceso ---------- */

  function vistaProceso() {
    var caja = K.nodo('<div class="kit-ancho vista"></div>');
    app.appendChild(caja);

    K.piezas.esqueletos.mientras(caja, cargarInicio(), { forma: 'texto', cuantos: 6 })
      .then(function () {
        var c = CONTRATO || {};

        caja.appendChild(grupo('El contrato', [
          dato('Número', c.contrato),
          dato('Tipo', c.tipo),
          dato('Objeto', c.objeto, true),
          dato('Secretaría', c.secretaria),
          dato('Supervisor', c.supervisor),
          dato('Fecha del contrato', c.fechaContrato),
          dato('Tramo', c.tramo),
          dato('Régimen', c.regimen)
        ]));

        caja.appendChild(grupo('La plata', [
          dato('Valor inicial', plata(c.valorInicial)),
          dato('1ª adición', plata(c.adicion1)),
          dato('2ª adición', plata(c.adicion2)),
          dato('Valor final', plata(c.valorFinal)),
          dato('Informes del primario', c.totalInformesPrimario),
          dato('Informes de la 1ª adición', c.totalInformesAdicion1)
        ]));

        caja.appendChild(grupo('Respaldos presupuestales', [
          dato('CDP', c.cdp),
          dato('RP', c.rp),
          dato('CDP adición', c.cdpAdicion),
          dato('RP adición', c.rpAdicion),
          dato('CDP 2ª adición', c.cdpAdicion2),
          dato('RP 2ª adición', c.rpAdicion2)
        ]));

        if (K.norm(c.cesion) === 'SI' || c.nombreCedente) {
          caja.appendChild(grupo('Cesión', [
            dato('Fecha', c.fechaCesion),
            dato('Cedente', c.nombreCedente),
            dato('Documento del cedente', c.documentoCedente),
            dato('Inicio del cesionario', c.inicioCesionario)
          ]));
        }

        K.piezas.creditos.montar(caja);
      })
      ['catch'](function (e) { caja.appendChild(errorCaja(e)); });
  }

  function plata(v) {
    if (!v) return '';
    return v.texto ? ('$ ' + v.texto) : '';
  }

  /* Solo se pintan los campos con contenido: una ficha llena de rayas
     no informa, y en la hoja hay columnas vacías a propósito. */
  function grupo(titulo, filas) {
    var vivas = filas.filter(function (f) { return !!f; });
    if (!vivas.length) return document.createComment('');
    var g = K.nodo('<section class="kit-tarjeta grupo"><h3 class="grupo__t">' + K.esc(titulo) + '</h3></section>');
    vivas.forEach(function (f) { g.appendChild(f); });
    return g;
  }

  function dato(etiqueta, valor, largo) {
    var v = String(valor === null || valor === undefined ? '' : valor).trim();
    if (!v) return null;
    return K.nodo(
      '<div class="dato' + (largo ? ' dato--largo' : '') + '">' +
      '  <span class="dato__e">' + K.esc(etiqueta) + '</span>' +
      '  <span class="dato__v">' + K.esc(v) + '</span>' +
      '</div>'
    );
  }

  function pastillaEstado(estado) {
    var e = K.norm(estado);
    var clase = e === 'ACTIVO' ? 'kit-pastilla--ok' : 'kit-pastilla--aviso';
    return '<span class="kit-pastilla ' + clase + '">' + K.esc(estado || '—') + '</span>';
  }

  /* ---------- mis datos ---------- */

  function vistaPersonales() {
    var caja = K.nodo('<div class="kit-ancho vista"></div>');
    app.appendChild(caja);

    K.piezas.esqueletos.mientras(caja, K.pedir('misDatos'), { forma: 'texto', cuantos: 4 })
      .then(function (d) { pintarFormulario(caja, d); })
      ['catch'](function (e) { caja.appendChild(errorCaja(e)); });
  }

  function pintarFormulario(caja, d) {
    var f = K.nodo(
      '<form class="kit-tarjeta formulario" novalidate>' +
      '  <h3 class="grupo__t">Mis datos</h3>' +
      '  <p class="formulario__nota">El nombre y el documento los cambia Contratación, no la app.</p>' +
      '  <div class="dato"><span class="dato__e">Nombre</span><span class="dato__v">' + K.esc(d.nombre || '') + '</span></div>' +
      '  <div class="dato"><span class="dato__e">Documento</span><span class="dato__v">' + K.esc(d.documento || '') + '</span></div>' +
      '  <label class="campo"><span>Teléfono</span>' +
      '    <input name="telefono" type="tel" inputmode="numeric" autocomplete="tel" value="' + K.esc(d.telefono || '') + '">' +
      '  </label>' +
      '  <label class="campo"><span>Dirección</span>' +
      '    <input name="direccion" type="text" autocomplete="street-address" value="' + K.esc(d.direccion || '') + '">' +
      '  </label>' +
      '  <label class="campo"><span>Correo</span>' +
      '    <input name="correo" type="email" inputmode="email" autocomplete="email" value="' + K.esc(d.correo || '') + '">' +
      '  </label>' +
      '  <p class="formulario__nota">Al correo llegan los avisos de orden de pago y de pago. Si lo cambias, cámbialo bien.</p>' +
      '  <button type="submit" class="kit-btn kit-btn--marca">Guardar</button>' +
      '</form>'
    );

    f.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var campos = {
        telefono: f.telefono.value.trim(),
        direccion: f.direccion.value.trim(),
        correo: f.correo.value.trim()
      };

      K.piezas.guardado.abrir({ titulo: 'Guardando tus datos' });
      K.pedir('guardarMisDatos', { campos: campos })
        .then(function () {
          if (YO) YO.telefono = campos.telefono;
          K.piezas.guardado.listo({ sub: 'Tus datos quedaron al día 🎉' });
        })
        ['catch'](function (e) {
          /* fallo() solo cierra el cohete; el porqué se dice con un aviso,
             que es donde el usuario está mirando. */
          K.piezas.guardado.fallo();
          K.aviso(e && e.message ? e.message : 'No se pudo guardar', 'malo', 5000);
        });
    });

    caja.appendChild(f);
    K.piezas.creditos.montar(caja);
  }

  /* ══════════════ auxiliares ══════════════ */

  function nombreCorto(n) {
    var p = String(n || '').trim().split(/\s+/);
    if (!p[0]) return '';
    return p.length > 1 ? (p[0] + ' ' + p[1]) : p[0];
  }

  function errorCaja(e) {
    var msg = (e && e.message) ? e.message : 'No se pudo cargar.';
    var c = K.nodo(
      '<section class="kit-tarjeta error">' +
      '  <p class="error__t">' + K.esc(msg) + '</p>' +
      '  <button type="button" class="kit-btn kit-btn--plano">Reintentar</button>' +
      '</section>'
    );
    c.querySelector('button').addEventListener('click', function () { CONTRATO = null; enrutar(); });
    return c;
  }
}());
