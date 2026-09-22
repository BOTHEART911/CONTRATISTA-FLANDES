/* ============================================================
   CONTRATISTA-FLANDES · APP
   Ecosistema Flandes · Fase 4, entrega 4.3

   Lo que entra en esta entrega
     · Ingresar y corregir cuenta (vive en cuenta.js).
     · Los rótulos de siempre: BORRADOR ACTIVIDADES, DATOS DEL
       CONTRATO y DATOS PERSONALES. Son los términos con los que la
       gente lleva años trabajando; los de la 4.1 me los inventé yo.
     · El archivo de versión: la app se actualiza sola en todos los
       teléfonos cuando se publica algo nuevo.

   Lo que NO entra todavía (va en 4.4)
     Trámites, estado de cuenta y tutoriales.

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

  /* ══════════════ el arranque, en UNA sola llamada ══════════════
   *
   * PUNTO 5 DEL PLIEGO. Abrir la app eran CINCO viajes seguidos a Apps
   * Script: 'yo' para validar la sesión, 'config' del kit, 'configPush'
   * para los avisos, 'inicio' para el contrato y 'misAvisos' para la
   * burbuja. Medido: cada viaje cuesta entre 2 y 3 segundos de red aunque
   * el servidor conteste en 50 ms, porque Apps Script obliga a una
   * redirección. Diez o doce segundos hasta ver la pantalla, y de ahí el
   * aviso de "el servidor tarda demasiado".
   *
   * Ahora la ruta 'inicio' del CORE devuelve las cinco cosas juntas y esto
   * las reparte. El catálogo de municipios solo viaja si el teléfono no lo
   * tiene ya: se manda el sello que guardó y el servidor decide.
   */
  var ARRANQUE = null;
  var MUNI_K = 'municipios.v2';

  function selloMunicipiosGuardado() {
    var g = K.guardar.leer(MUNI_K, null);
    return (g && g.sello) || '';
  }

  /** El catálogo que usa el cascadeo departamento → municipio. */
  function catalogoMunicipios() {
    if (ARRANQUE && ARRANQUE.municipios && ARRANQUE.municipios.mapa) return ARRANQUE.municipios;
    return K.guardar.leer(MUNI_K, null);
  }

  function arranque() {
    return K.pedir('inicio', {
      avisos: 1,
      selloMunicipios: selloMunicipiosGuardado()
    }).then(function (d) {
      ARRANQUE = d;
      YO = d.yo || YO;
      CONTRATO = d.contrato;
      LISTAS = d.listas || LISTAS;

      /* Los municipios se quedan en el teléfono. Son 1.121 con su
         departamento: viajan una vez y no vuelven a viajar nunca, salvo
         que cambie la hoja (entonces cambia el sello). */
      if (d.municipios && d.municipios.mapa) {
        K.guardar.escribir(MUNI_K, d.municipios);
      } else if (d.municipios && d.municipios.sinCambios) {
        ARRANQUE.municipios = K.guardar.leer(MUNI_K, null) || d.municipios;
      }

      /* Los avisos: la burbuja ya no necesita su propia llamada. */
      if (d.avisos && K.piezas.buzon) K.piezas.buzon.recordar(d.avisos.noLeidos || 0);

      /* Y la configuración de Firebase tampoco: se le entrega hecha a la
         pieza de avisos para que no pida 'configPush' por su cuenta. */
      if (d.push && K.piezas.avisos && K.piezas.avisos.configurar) {
        K.piezas.avisos.configurar(d.push);
      }

      /* Lo mismo con el pie de la firma, que pedía 'config' en la primera
         vista que se pintara. Con esto, abrir la app es UNA llamada y no
         hay ninguna más escondida detrás. */
      if (d.config && K.piezas.creditos && K.piezas.creditos.configurar) {
        K.piezas.creditos.configurar(d.config);
      }
      return d;
    });
  }

  /* ══════════════ arranque ══════════════ */

  K.listo(function () {
    registrarSW();
    if (K.piezas.instalar) K.piezas.instalar.vigilar();

    /* El vigilante de la versión: cuando se publica algo nuevo, la app lo
       nota al volver a ella, borra SUS cachés y se recarga. Sin esto, lo
       publicado se veía a la segunda apertura. */
    if (K.piezas.version) K.piezas.version.vigilar();

    /* Lo primero de todo es la puerta: instalar o seguir en el navegador.
       Solo sale la primera vez y solo si la app no está ya instalada. */
    var puerta = K.piezas.bienvenida
      ? K.piezas.bienvenida.abrir({
          titulo: 'Contratista',
          sub: M.MUNICIPIO || 'Alcaldía de Flandes',
          imagen: M.APP_ICON || 'img/icono-512.png'
        })
      : Promise.resolve('saltada');

    puerta.then(function () {
      K.piezas.sesion.entrar({
        titulo: 'CONTRATISTA',
        sub: 'Ingresa con tu documento y contraseña',
        imagen: M.APP_ICON || 'img/icono-512.png',
        /* 4.5: la comprobación de la sesión y la carga del inicio son la
           MISMA llamada. Ver `arranque()` aquí arriba. Se le devuelve a la
           pieza de sesión SOLO el usuario, que es lo que ella guarda. */
        comprobar: function () { return arranque().then(function (d) { return d.yo; }); },
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
        { texto: 'Datos personales', al: function () { irA('personales'); } },
        { texto: 'Actualizar contraseña', al: function () { K.piezas.sesion.cambiarClave(); } },
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
    cuenta: vistaCuenta,
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

    /* El rótulo de la cuenta cambia según lo que toque hacer hoy, y eso
       solo lo sabe el CORE: se ajusta cuando la vista lo averigua. */
    VISTAS[v](partes[1]);
  }

  /* Los rótulos son los de la app de siempre, no invenciones nuevas: la
     gente lleva años oyendo "borrador de actividades" y "corregir cuenta",
     y en la migración lo que no se puede perder es el vocabulario. */
  var titulos = {
    inicio: 'Contratista',
    proceso: 'DATOS DEL CONTRATO',
    personales: 'DATOS PERSONALES',
    borrador: 'BORRADOR ACTIVIDADES',
    cuenta: 'INGRESAR CUENTA',
    avisos: 'MIS NOTIFICACIONES'
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
    rejilla.appendChild(acceso('BORRADOR ACTIVIDADES', 'Escribe tus actividades y sube las evidencias', 'img/datos_de_procesos.webp', function () { irA('borrador'); }));
    rejilla.appendChild(acceso('INGRESAR CUENTA', 'Fechas, planilla y documentos para radicar', 'img/datos_de_procesos.webp', function () { irA('cuenta'); }));

    /* La burbuja de sin leer va aquí y no en una campana aparte: es donde
       la persona mira al entrar, y así el aviso guardado se ve aunque el
       push se haya perdido. El número lo trae la misma llamada del inicio. */
    var tarjetaAvisos = acceso('MIS NOTIFICACIONES', 'Todo lo que te hemos avisado', 'img/notificacion.webp', function () { irA('avisos'); });
    rejilla.appendChild(tarjetaAvisos);
    pintarBurbuja(tarjetaAvisos);

    rejilla.appendChild(acceso('DATOS DEL CONTRATO', 'Tu contrato, su valor y quién lo supervisa', 'img/datos_de_procesos.webp', function () { irA('proceso'); }));
    /* 4.5 · punto 8 · DATOS PERSONALES estaba DOS veces: aquí y en el menú
       del banner, arriba a la derecha. Se queda el de arriba, que es el que
       pidió Oss y el que está siempre a mano desde cualquier vista. */
    rejilla.appendChild(acceso('AVISOS AL TELÉFONO', textoAvisos(), 'img/notificacion.webp', tocarAvisos));
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
    /* Normalmente ya viene del arranque y esto no llega a viajar. Se queda
       por si la sesión se recuperó por otro camino (un enlace directo a
       una vista concreta, por ejemplo). */
    return arranque().then(function () { return CONTRATO; });
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

  /* ---------- borrador actividades ---------- */

  function vistaBorrador(sub) {
    window.BORRADOR.abrir(sub);
  }

  /* ---------- ingresar y corregir cuenta ---------- */

  function vistaCuenta(sub) {
    window.CUENTA.abrir(sub);
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
    /* 4.5: el número ya viene en el arranque, así que esto no pide nada.
       Era la quinta llamada de las cinco que costaba abrir la app. */
    var delArranque = (ARRANQUE && ARRANQUE.avisos) ? (ARRANQUE.avisos.noLeidos || 0) : null;
    var ya = (delArranque === null && K.piezas.buzon) ? K.piezas.buzon.noLeidos() : delArranque;
    poner(ya || 0);

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

  /* ---------- datos del contrato ---------- */
  /*
   * 4.4: esta vista era solo lectura y le faltaban nueve campos que sí
   * enseña la app vieja. Ahora enseña el contrato completo y, debajo, deja
   * DILIGENCIARLO, que es lo que el contratista tiene que hacer al empezar:
   * el N° de proceso, las fechas del acta de inicio, el RP y las tres
   * preguntas del RUT (régimen simple, factura electrónica y costos).
   *
   * Lo que se puede editar NO lo decide esta vista: lo decide el CORE con
   * la columna CONTRACTUAL y lo manda en `modoEdicion`. En un contrato
   * cedido o adicionado, lo único que se toca es el RP que corresponde.
   */

  function vistaProceso() {
    var caja = K.nodo('<div class="kit-ancho vista"></div>');
    app.appendChild(caja);

    /* Las listas hacen falta para las tres preguntas de si/no del
       formulario: se piden de una vez con el contrato. */
    var todo = Promise.all([cargarInicio(), listas()]);
    K.piezas.esqueletos.mientras(caja, todo, { forma: 'texto', cuantos: 6 })
      .then(function () { pintarContrato(caja); })
      ['catch'](function (e) { caja.appendChild(errorCaja(e)); });
  }

  function pintarContrato(caja) {
    caja.innerHTML = '';
    var c = CONTRATO || {};

    caja.appendChild(grupo('El contrato', [
      dato('Número', c.contrato),
      dato('N° de proceso SECOP II', c.numProceso),
      dato('Tipo', c.tipo),
      dato('Objeto', c.objeto, true),
      dato('Secretaría', c.secretaria),
      dato('Supervisor', c.supervisor),
      dato('Fecha del contrato', c.fechaContrato),
      dato('Tramo', c.tramo),
      dato('Régimen simple', c.regimen),
      dato('Factura electrónica', c.factura),
      dato('Costos o deducciones', c.costos)
    ]));

    caja.appendChild(grupo('El plazo', [
      dato('Fecha de inicio', c.fechaInicio),
      dato('Fecha de terminación', c.fechaTermino),
      dato('Tiempo de ejecución', c.ejecucion)
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

    /* Las obligaciones son el contrato de verdad: es lo que el supervisor
       revisa una por una y lo que hay que responder en el informe. */
    if ((c.obligaciones || []).length) {
      var g = K.nodo('<section class="kit-tarjeta grupo"><h3 class="grupo__t">Tus obligaciones (' +
        c.obligaciones.length + ')</h3></section>');
      c.obligaciones.forEach(function (o) {
        g.appendChild(K.nodo(
          '<div class="obl-lista__i">' +
          '  <span class="obl-lista__n">' + o.n + '</span>' +
          '  <span class="obl-lista__t">' + K.esc(o.texto) + '</span>' +
          '</div>'
        ));
      });
      caja.appendChild(g);
    }

    caja.appendChild(zonaEditarContrato(caja, c));
    K.piezas.creditos.montar(caja);
  }

  /* Lo que se puede tocar, dicho en el idioma de cada caso. */
  var ROTULO_MODO = {
    primario: 'Actualizar los datos de mi contrato',
    adicion1: 'Actualizar el RP de la 1ª adición',
    adicion2: 'Actualizar el RP de la 2ª adición',
    cedido: 'Actualizar el RP de mi contrato'
  };

  function zonaEditarContrato(caja, c) {
    var s = K.nodo('<section class="kit-tarjeta grupo"></section>');

    if (!c.yaDiligenciado) {
      s.appendChild(K.nodo(
        '<p class="formulario__nota formulario__nota--fuerte">Todavía te faltan datos ' +
        'obligatorios del contrato. Sin ellos no se pueden generar los formatos de tu ' +
        'primera cuenta.</p>'
      ));
    }

    var b = K.nodo('<button type="button" class="kit-btn kit-btn--marca">' +
      K.icono('llave', 17) + ' ' + K.esc(ROTULO_MODO[c.modoEdicion] || ROTULO_MODO.primario) +
      '</button>');
    b.addEventListener('click', function () {
      b.disabled = true;
      s.appendChild(formularioContrato(caja, c, function () { b.disabled = false; }));
      s.querySelector('.formulario').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    s.appendChild(b);
    return s;
  }

  function formularioContrato(caja, c, alCerrar) {
    var f = K.nodo('<form class="formulario" novalidate></form>');
    var D = {};

    if (c.modoEdicion === 'primario') {
      f.appendChild(K.nodo('<h3 class="grupo__t">Datos de tu contrato</h3>'));
      f.appendChild(K.nodo(
        '<p class="formulario__nota">Estos datos salen de tu <b>clausulado</b> y de tu ' +
        '<b>acta de inicio</b>. Ténlos a la mano: van impresos en todos los formatos de tus cuentas.</p>'
      ));

      campoTexto(f, D, 'numProceso', 'N° de proceso SECOP II',
        'En el clausulado, el número que va en CPS-(aquí)-' + (new Date().getFullYear()) + '. Ejemplo: 021',
        { valor: (c.numProceso || '').replace(/\D/g, '').slice(-3), numerico: 3, marcador: 'Ej: 021' });

      campoFecha(f, D, 'fechaInicio', 'Fecha de inicio',
        'La que dice tu ACTA DE INICIO.', c.fechaInicio);
      campoFecha(f, D, 'fechaTermino', 'Fecha de terminación',
        'Corrobórala en el acta de inicio.', c.fechaTermino);

      /* El plazo lo calcula el CORE con las dos fechas. Aquí solo se
         enseña, y se deja editar para el caso de siempre: que el acta diga
         otra cosa. */
      var plazo = K.nodo(
        '<div class="campo"><span>Tiempo de ejecución</span>' +
        '  <input type="text" class="campo--quieto" readonly value="' + K.esc(c.ejecucion || '') + '">' +
        '  <p class="campo__ayuda">Se calcula con las dos fechas. Edita los meses o los días ' +
        '     <b>solo si no coincide</b> con tu acta de inicio.</p>' +
        '</div>'
      );
      f.appendChild(plazo);

      var fila = K.nodo('<div class="campo-fila"></div>');
      campoTexto(fila, D, 'meses', 'Meses', '', { valor: c.meses || '', numerico: 3, marcador: 'Automático' });
      campoTexto(fila, D, 'dias', 'Días', '', { valor: c.dias || '', numerico: 3, marcador: 'Automático' });
      f.appendChild(fila);

      campoRP(f, D, 'rp', 'Registro Presupuestal (RP)',
        'Escribe <b>solo los últimos dígitos</b>, los que trae tu RP después de los ceros. ' +
        'El año y los ceros los pone el sistema.',
        { final: c.rpFinal || '', anio: c.rpAnio });

      campoSiNo(f, D, 'regimen', '¿Perteneces al Régimen Simple de Tributación?',
        'Revisa tu RUT. Si aparece que perteneces al “Régimen Simple de Tributación”, marca SÍ.',
        c.regimen);
      campoSiNo(f, D, 'factura', '¿Estás obligado a facturar electrónicamente?',
        'Revisa tu RUT. Si dice que estás obligado, o ya facturas electrónicamente ante la DIAN, marca SÍ.',
        c.factura);
      campoSiNo(f, D, 'costos', '¿Tomarás costos y deducciones en tu declaración de renta?',
        'Es si vas a descontar gastos de este contrato: arriendo de oficina, internet, equipos, ' +
        'transporte, software o personal de apoyo.',
        c.costos);

    } else {
      var rotulo = c.modoEdicion === 'adicion1' ? 'RP de la 1ª adición'
                 : c.modoEdicion === 'adicion2' ? 'RP de la 2ª adición'
                 : 'Registro Presupuestal (RP)';
      var explica = c.modoEdicion === 'cedido'
        ? 'Tu contrato es <b>cedido</b>: lo único que tienes que actualizar es el RP.'
        : 'Tu contrato tiene <b>adición</b>: lo único que tienes que actualizar es el RP de la adición.';
      f.appendChild(K.nodo('<h3 class="grupo__t">' + K.esc(rotulo) + '</h3>'));
      f.appendChild(K.nodo('<p class="formulario__nota">' + explica + '</p>'));
      campoRP(f, D, 'rp', rotulo,
        'Escribe <b>solo los últimos dígitos</b>. El año y los ceros los pone el sistema.', {
        final: (c.modoEdicion === 'adicion1' ? c.rpAdicionFinal
              : c.modoEdicion === 'adicion2' ? c.rpAdicion2Final
              : c.rpFinal) || '',
        anio: c.rpAnio
      });
    }

    var botones = K.nodo('<div class="campo-fila campo-fila--botones"></div>');
    var cancelar = K.nodo('<button type="button" class="kit-btn kit-btn--plano">Cancelar</button>');
    var guardar = K.nodo('<button type="submit" class="kit-btn kit-btn--marca">Guardar cambios</button>');
    botones.appendChild(cancelar);
    botones.appendChild(guardar);
    f.appendChild(botones);

    cancelar.addEventListener('click', function () {
      f.remove();
      if (alCerrar) alCerrar();
    });

    f.addEventListener('submit', function (ev) {
      ev.preventDefault();
      mandarContrato(caja, c, D);
    });

    /* La rueda de fechas se engancha una vez, con el formulario ya montado. */
    if (K.piezas.fechas) K.piezas.fechas.montar(f);
    return f;
  }

  /* El resumen antes de guardar. La app vieja lo tenía y no era adorno: un
     dedazo en el RP se descubre cuando el pago no sale. */
  function mandarContrato(caja, c, D) {
    var ROTULOS = {
      numProceso: 'N° de proceso', fechaInicio: 'Fecha de inicio',
      fechaTermino: 'Fecha de terminación', meses: 'Meses', dias: 'Días',
      rp: 'RP', regimen: 'Régimen simple', factura: 'Factura electrónica',
      costos: 'Costos o deducciones'
    };
    var lista = [];
    Object.keys(ROTULOS).forEach(function (k) {
      var v = String(D[k] === undefined || D[k] === null ? '' : D[k]).trim();
      if (!v) return;
      if (k === 'numProceso') v = 'CPS-' + ('00' + v).slice(-3) + '-' + (new Date().getFullYear());
      /* 4.5: en el campo se escribe el final, pero en el resumen tiene que
         salir el número entero, que es lo que va a quedar en la hoja. */
      if (k === 'rp') v = String(c.rpAnio || new Date().getFullYear()) + ('000000' + v).slice(-6);
      lista.push([ROTULOS[k], v]);
    });

    if (!lista.length) {
      K.aviso('No cambiaste ningún dato.', 'info', 4000);
      return;
    }

    K.piezas.confirmar.abrir({
      titulo: 'Resumen de cambios',
      lista: lista,
      nota: 'Revísalo con calma: estos datos van impresos en los formatos de todas tus cuentas.',
      si: 'Confirmar', no: 'Editar'
    }).then(function (ok) {
      if (!ok) return;
      K.piezas.guardado.abrir({
        titulo: 'Guardando los datos de tu contrato',
        sub: 'No cierres esta ventana hasta que termine.'
      });
      K.pedir('guardarContrato', D)
        .then(function (r) {
          CONTRATO = r.contrato;
          K.piezas.guardado.listo({ sub: 'Tu contrato quedó al día.' });
          pintarContrato(caja);
        })
        ['catch'](function (e) {
          K.piezas.guardado.fallo();
          K.aviso(e && e.message ? e.message : 'No se pudo guardar.', 'malo', 7000);
        });
    });
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
  /*
   * 4.4: pasa de tres campos a los trece de la app vieja. Los diez que
   * faltaban (municipio de expedición, residencia, cuenta bancaria, EPS,
   * AFP, ARL, firma y fecha de nacimiento) son justo los que salen
   * impresos en los formatos de la cuenta: un banco mal escrito o una
   * cuenta sin el cero de la izquierda devuelve el pago.
   */

  var LISTAS = null;

  function listas() {
    /* 4.5: las listas (bancos, EPS, AFP, ARL, tipos de cuenta) llegan en el
       arranque. Esto solo viaja si alguien entró sin pasar por ahí. */
    if (LISTAS) return Promise.resolve(LISTAS);
    return K.pedir('listasDatos').then(function (l) { LISTAS = l; return l; });
  }

  function vistaPersonales() {
    var caja = K.nodo('<div class="kit-ancho vista"></div>');
    app.appendChild(caja);

    var todo = Promise.all([K.pedir('misDatos'), listas()]);
    K.piezas.esqueletos.mientras(caja, todo, { forma: 'texto', cuantos: 6 })
      .then(function (r) { pintarFormulario(caja, r[0]); })
      ['catch'](function (e) { caja.appendChild(errorCaja(e)); });
  }

  function pintarFormulario(caja, d) {
    caja.innerHTML = '';
    var D = {};
    var f = K.nodo('<form class="kit-tarjeta formulario" novalidate></form>');

    f.appendChild(K.nodo('<h3 class="grupo__t">DATOS PERSONALES</h3>'));
    f.appendChild(K.nodo(
      '<p class="formulario__nota">El nombre y el documento los cambia Contratación, no la app. ' +
      'Todo lo demás lo puedes corregir tú, y queda al día en todos tus contratos a la vez.</p>'
    ));
    f.appendChild(K.nodo('<div class="dato"><span class="dato__e">Nombre</span>' +
      '<span class="dato__v">' + K.esc(d.nombre || '') + '</span></div>'));
    f.appendChild(K.nodo('<div class="dato"><span class="dato__e">Documento</span>' +
      '<span class="dato__v">' + K.esc(d.documento || '') + '</span></div>'));

    campoMunicipio(f, D, 'expedida', 'Municipio de expedición del documento',
      'Escribe y elige de la lista. No aplica para personas jurídicas.', d.expedida);
    campoTexto(f, D, 'telefono', 'Teléfono (línea de WhatsApp)',
      'Diez dígitos. Por aquí te llegan los avisos de tus cuentas.',
      { valor: d.telefono || '', numerico: 10, marcador: '3XXXXXXXXX' });
    campoTexto(f, D, 'direccion', 'Dirección de residencia',
      'Usa abreviaciones y no escribas el municipio. Ejemplo: Mz 5 Casa 16 B/ Orquídeas II',
      { valor: d.direccion || '', area: true });
    campoMunicipio(f, D, 'municipio', 'Municipio de residencia',
      'Escribe y elige de la lista.', d.municipio);
    campoTexto(f, D, 'correo', 'Correo personal',
      'Uno que sea tuyo, no el institucional. Aquí llegan la orden de pago y el pago.',
      { valor: d.correo || '', marcador: 'tucorreo@gmail.com' });

    f.appendChild(K.nodo('<h3 class="grupo__t grupo__t--sub">Para el pago</h3>'));
    campoLista(f, D, 'tipoCuenta', 'Tipo de cuenta', '', LISTAS.tiposCuenta, d.tipoCuenta);
    campoTexto(f, D, 'numeroCuenta', 'Número de cuenta',
      'Sin puntos ni guiones. Si empieza por cero, escríbelo: hace falta.',
      { valor: d.numeroCuenta || '', numerico: 16 });
    campoLista(f, D, 'banco', 'Banco', '', LISTAS.bancos, d.banco);

    f.appendChild(K.nodo('<h3 class="grupo__t grupo__t--sub">Seguridad social</h3>'));
    campoLista(f, D, 'eps', 'EPS', '', LISTAS.eps, d.eps);
    campoLista(f, D, 'pension', 'Fondo de pensiones (AFP)',
      'Si eres pensionado(a) elige N/A. Eso implica que en cada cuenta tienes que presentar ' +
      'la certificación de pensionado, la resolución de pensión o la certificación de ' +
      'devolución de saldo por vejez.', LISTAS.afp, d.pension);
    campoLista(f, D, 'arl', 'ARL', '', LISTAS.arl, d.arl);

    f.appendChild(K.nodo('<h3 class="grupo__t grupo__t--sub">Firma y nacimiento</h3>'));
    campoFirma(f, D, d);
    campoFecha(f, D, 'nacimiento', 'Fecha de nacimiento',
      'No aplica para personas jurídicas.', d.nacimiento, { desde: 1930, hastaHoy: true });

    var botones = K.nodo('<div class="campo-fila campo-fila--botones"></div>');
    var guardar = K.nodo('<button type="submit" class="kit-btn kit-btn--marca">Guardar cambios</button>');
    botones.appendChild(guardar);
    f.appendChild(botones);

    f.addEventListener('submit', function (ev) {
      ev.preventDefault();
      mandarMisDatos(caja, d, D);
    });

    caja.appendChild(f);
    if (K.piezas.fechas) K.piezas.fechas.montar(f);
    K.piezas.creditos.montar(caja);
  }

  function mandarMisDatos(caja, d, D) {
    var ROTULOS = {
      expedida: 'Municipio de expedición', telefono: 'Teléfono',
      direccion: 'Dirección', municipio: 'Municipio de residencia',
      correo: 'Correo', tipoCuenta: 'Tipo de cuenta',
      numeroCuenta: 'Número de cuenta', banco: 'Banco', eps: 'EPS',
      pension: 'Fondo de pensiones', arl: 'ARL', nacimiento: 'Fecha de nacimiento'
    };

    /* Solo lo que CAMBIÓ de verdad: mandar los trece campos cada vez
       escribiría en trece columnas por gusto y llenaría la traza. */
    var campos = {}, lista = [];
    Object.keys(ROTULOS).forEach(function (k) {
      if (D[k] === undefined) return;
      var v = String(D[k]).trim();
      if (!v || v === String(d[k] || '').trim()) return;
      campos[k] = v;
      lista.push([ROTULOS[k], v]);
    });
    if (D.firma) { campos.firma = D.firma; lista.push(['Firma', 'una imagen nueva']); }

    if (!lista.length) {
      K.aviso('No cambiaste ningún dato.', 'info', 4000);
      return;
    }

    K.piezas.confirmar.abrir({
      titulo: 'Resumen de cambios',
      lista: lista,
      nota: 'Estos datos salen impresos en los formatos de tus cuentas.',
      si: 'Confirmar', no: 'Editar'
    }).then(function (ok) {
      if (!ok) return;
      K.piezas.guardado.abrir({
        titulo: 'Guardando tus datos',
        sub: 'No cierres esta ventana hasta que termine.'
      });
      K.pedir('guardarMisDatos', { campos: campos })
        .then(function (r) {
          if (YO && campos.telefono) YO.telefono = campos.telefono;
          K.piezas.guardado.listo({ sub: 'Tus datos quedaron al día.' });
          pintarFormulario(caja, r.datos || d);
        })
        ['catch'](function (e) {
          /* fallo() solo cierra el cohete; el porqué se dice con un aviso,
             que es donde el usuario está mirando. */
          K.piezas.guardado.fallo();
          K.aviso(e && e.message ? e.message : 'No se pudo guardar', 'malo', 7000);
        });
    });
  }

  /* ══════════════ piezas de formulario ══════════════ */

  function conAyuda(campo, ayuda) {
    if (ayuda) campo.appendChild(K.nodo('<p class="campo__ayuda">' + ayuda + '</p>'));
    return campo;
  }

  function campoTexto(donde, D, clave, titulo, ayuda, o) {
    o = o || {};
    var c = K.nodo('<label class="campo"><span>' + K.esc(titulo) + '</span></label>');
    var inp = o.area
      ? K.nodo('<textarea rows="2" placeholder="' + K.esc(o.marcador || '') + '"></textarea>')
      : K.nodo('<input type="text" ' +
          (o.numerico ? 'inputmode="numeric" ' : '') +
          'placeholder="' + K.esc(o.marcador || '') + '">');
    inp.value = o.valor || '';
    c.appendChild(inp);
    conAyuda(c, ayuda);

    inp.addEventListener('input', function () {
      if (o.numerico) {
        inp.value = inp.value.replace(/\D/g, '').slice(0, o.numerico);
      }
      /* El borde verde del RP: la señal que la gente ya conoce de la app
         vieja de que el número tiene la pinta correcta. */
      if (o.rp) {
        var v = inp.value;
        inp.classList.toggle('campo--ok', v.length === 10 && v.indexOf(String(new Date().getFullYear())) === 0);
      }
      D[clave] = inp.value.trim();
    });
    if (o.rp && (o.valor || '').length === 10) inp.classList.add('campo--ok');

    donde.appendChild(c);
    return inp;
  }

  /**
   * 4.5 · PUNTO 7 · EL RP SE ESCRIBE POR EL FINAL
   *
   * Regla de Oss, dictada el 22/09: el RP tiene SIEMPRE 10 dígitos —
   * el año, ceros de relleno y al final lo que registra el contratista.
   * Si teclea 87, se guarda 2026000087.
   *
   * Hasta la 4.4 había que escribir los diez, y eso es pedirle a la
   * persona que teclee "2026" y siete ceros cada vez, contándolos. Ahora:
   *
   *     en la vista de lectura ..... 2026000087   (completo)
   *     en este campo .............. [2026] 87    (solo el final)
   *
   * El año no se escribe ni se puede tocar: lo pone el servidor, que es
   * quien sabe si el RP ya traía año (ver FC_rpCompleto_ en el CORE). Aquí
   * solo se ENSEÑA, para que la persona vea el número que va a quedar
   * mientras lo escribe y no tenga que fiarse.
   */
  function campoRP(donde, D, clave, titulo, ayuda, o) {
    o = o || {};
    var anio = String(o.anio || new Date().getFullYear());
    var c = K.nodo('<label class="campo campo--rp"><span>' + K.esc(titulo) + '</span></label>');
    var caja = K.nodo('<div class="rp"></div>');
    var pre = K.nodo('<span class="rp__anio" aria-hidden="true">' + K.esc(anio) + '</span>');
    var inp = K.nodo('<input type="text" inputmode="numeric" class="rp__final" ' +
      'autocomplete="off" maxlength="6" placeholder="Ej: 87">');
    inp.value = String(o.final || '');
    caja.appendChild(pre);
    caja.appendChild(inp);
    c.appendChild(caja);

    var eco = K.nodo('<p class="rp__eco" aria-live="polite"></p>');
    c.appendChild(eco);
    conAyuda(c, ayuda);

    function completo() {
      var d = inp.value.replace(/\D/g, '');
      if (!d) return '';
      return anio + ('000000' + d).slice(-6);
    }

    function repintar() {
      inp.value = inp.value.replace(/\D/g, '').slice(0, 6);
      var full = completo();
      D[clave] = inp.value;            /* al CORE va SOLO el final */
      c.classList.toggle('campo--ok', full.length === 10);
      eco.textContent = full ? 'Va a quedar como ' + full : '';
    }

    inp.addEventListener('input', repintar);
    /* tocar el año lleva el foco al sitio donde de verdad se escribe */
    pre.addEventListener('click', function () { inp.focus(); });
    repintar();

    donde.appendChild(c);
    return inp;
  }

  function campoLista(donde, D, clave, titulo, ayuda, opciones, valor) {
    var c = K.nodo('<label class="campo"><span>' + K.esc(titulo) + '</span></label>');
    var sel = K.nodo('<select><option value="">Selecciona</option></select>');
    (opciones || []).forEach(function (op) {
      var o = K.nodo('<option></option>');
      o.value = op;
      o.textContent = op;
      if (K.norm(op) === K.norm(valor || '')) o.selected = true;
      sel.appendChild(o);
    });
    c.appendChild(sel);
    conAyuda(c, ayuda);
    sel.addEventListener('change', function () { D[clave] = sel.value; });
    donde.appendChild(c);
    return sel;
  }

  /* Sí / No que guarda la frase completa que espera la hoja. */
  function campoSiNo(donde, D, clave, titulo, ayuda, valor) {
    var opciones = (LISTAS && LISTAS[clave]) || [];
    var c = K.nodo('<label class="campo"><span>' + K.esc(titulo) + '</span></label>');
    var sel = K.nodo('<select><option value="">Selecciona</option></select>');
    opciones.forEach(function (op) {
      var o = K.nodo('<option></option>');
      o.value = op.valor;
      o.textContent = op.etiqueta;
      if (K.norm(op.valor) === K.norm(valor || '')) o.selected = true;
      sel.appendChild(o);
    });
    c.appendChild(sel);
    conAyuda(c, ayuda);
    sel.addEventListener('change', function () { D[clave] = sel.value; });
    donde.appendChild(c);
    return sel;
  }

  function campoFecha(donde, D, clave, titulo, ayuda, valor, o) {
    o = o || {};
    var c = K.nodo('<label class="campo"><span>' + K.esc(titulo) + '</span></label>');
    var inp = K.nodo('<input type="text" readonly data-kit-fecha placeholder="dd/mm/aaaa" ' +
      'data-titulo="' + K.esc(titulo) + '"' +
      (o.desde ? ' data-desde="' + o.desde + '"' : '') +
      (o.hastaHoy ? ' max="' + isoDeHoy() + '"' : '') + '>');
    inp.value = valor || '';
    c.appendChild(inp);
    conAyuda(c, ayuda);
    inp.addEventListener('change', function () {
      /* La rueda del kit deja el valor en ISO y el texto en dd/mm/aaaa.
         A la hoja va SIEMPRE dd/mm/aaaa: es como está escrito el resto de
         CONTRATISTAS. Es el mismo cabo que se cazó en la 4.3. */
      D[clave] = K.fecha(inp.value.trim());
    });
    donde.appendChild(c);
    return inp;
  }

  /* Municipio con sugerencias del CORE. La lista son 1.121 nombres: no se
     bajan al teléfono, se pregunta a medida que se escribe. */
  /**
   * 4.5 · PUNTO 9 · DEPARTAMENTO Y DESPUÉS MUNICIPIO
   *
   * Antes esto era un autocompletar que VIAJABA AL SERVIDOR por cada
   * búsqueda: 871 ms de media solo del servidor, más dos o tres segundos
   * de transporte, y eso por cada palabra que se teclea. Buscar "Flandes"
   * eran cuatro viajes.
   *
   * Ahora es como la vista Comercial de SEP-GROUP, que fue lo que Oss
   * mandó mirar: el catálogo entero (1.121 municipios con su departamento)
   * llega UNA vez dentro de la llamada de arranque, se guarda en este
   * teléfono y el cascadeo pasa aquí dentro. Cero viajes.
   *
   * Lo que se guarda en la hoja es SOLO el municipio, con su nombre
   * propio tal como está escrito en la hoja MUNICIPIOS. El departamento
   * no se guarda: solo sirve para no tener que buscar entre mil.
   */
  function campoMunicipio(donde, D, clave, titulo, ayuda, valor) {
    var cat = catalogoMunicipios();
    var c = K.nodo('<div class="campo campo--ubic"><span>' + K.esc(titulo) + '</span></div>');
    var fila = K.nodo('<div class="ubic"></div>');

    var selD = K.nodo('<select class="ubic__depto" aria-label="Departamento"><option value="">Departamento</option></select>');
    var selM = K.nodo('<select class="ubic__mun" aria-label="Municipio"><option value="">Municipio</option></select>');
    fila.appendChild(selD);
    fila.appendChild(selM);
    c.appendChild(fila);
    conAyuda(c, ayuda);
    donde.appendChild(c);

    /* Si no hay catálogo (un arranque viejo en caché, o el CORE caído) se
       deja el campo escribible y el servidor sigue validando: vale más un
       campo de texto que un desplegable vacío. */
    if (!cat || !cat.departamentos || !cat.departamentos.length) {
      fila.innerHTML = '';
      var suelto = K.nodo('<input type="text" autocomplete="off" placeholder="Escribe el municipio">');
      suelto.value = valor || '';
      fila.appendChild(suelto);
      suelto.addEventListener('input', function () { D[clave] = suelto.value.trim(); });
      return suelto;
    }

    cat.departamentos.forEach(function (dp) {
      var o = K.nodo('<option></option>');
      o.value = dp;
      o.textContent = nombrePropio(dp);
      selD.appendChild(o);
    });

    function llenarMunicipios(dp, marcar) {
      selM.innerHTML = '';
      var vacio = K.nodo('<option value="">' + (dp ? 'Municipio' : 'Elige el departamento') + '</option>');
      selM.appendChild(vacio);
      selM.disabled = !dp;
      if (!dp) return;
      (cat.mapa[dp] || []).forEach(function (m) {
        var o = K.nodo('<option></option>');
        o.value = m;
        o.textContent = m;
        if (K.norm(m) === K.norm(marcar || '')) o.selected = true;
        selM.appendChild(o);
      });
    }

    /* Al abrir, el municipio que ya está guardado manda: se busca en qué
       departamento vive y se dejan los dos desplegables puestos. El
       departamento no está en la hoja de contratistas, así que se deduce
       del catálogo; es exactamente para lo que sirve. */
    var deptoDe = '';
    if (valor) {
      var objetivo = K.norm(valor);
      for (var i = 0; i < cat.departamentos.length && !deptoDe; i++) {
        var lista = cat.mapa[cat.departamentos[i]] || [];
        for (var j = 0; j < lista.length; j++) {
          if (K.norm(lista[j]) === objetivo) { deptoDe = cat.departamentos[i]; break; }
        }
      }
    }
    if (deptoDe) selD.value = deptoDe;
    llenarMunicipios(deptoDe, valor);

    /* Si el municipio guardado no aparece en el catálogo (un nombre viejo
       escrito a mano), no se pierde: se enseña y se avisa. */
    if (valor && !deptoDe) {
      c.classList.add('campo--ojo');
      conAyuda(c, 'Tienes guardado <b>' + K.esc(valor) + '</b>, que no está en la lista oficial. ' +
                  'Elige el departamento y el municipio para dejarlo al día.');
    }

    selD.addEventListener('change', function () {
      llenarMunicipios(selD.value, '');
      delete D[clave];
      c.classList.remove('campo--ok');
    });
    selM.addEventListener('change', function () {
      D[clave] = selM.value;                 /* SOLO el municipio va al CORE */
      c.classList.toggle('campo--ok', !!selM.value);
    });

    if (valor && deptoDe) c.classList.add('campo--ok');
    return selM;
  }

  /** ANTIOQUIA → Antioquia. Los desplegables no se gritan. */
  function nombrePropio(s) {
    return String(s || '').toLowerCase().replace(/(^|[\s(.\u2010-\u2015/-])([a-záéíóúñü])/g,
      function (todo, antes, letra) { return antes + letra.toUpperCase(); })
      .replace(/\bD\.c\./i, 'D.C.');
  }

  /* La firma: una imagen que va impresa en los formatos. Se comprime en el
     teléfono antes de subirla, como las evidencias. */
  function campoFirma(donde, D, d) {
    var c = K.nodo('<div class="campo"><span>Firma</span></div>');
    if (d.firma) {
      c.appendChild(K.nodo('<img class="campo__firma" alt="Tu firma actual" src="' +
        K.esc(miniaturaDrive(d.firma)) + '">'));
    }
    var zona = K.nodo('<div></div>');
    c.appendChild(zona);
    conAyuda(c, d.firma
      ? 'Si subes otra, reemplaza la que está. Tiene que ser una imagen clara y sin marcas de agua.'
      : 'Todavía no tienes firma cargada. Sin ella, los formatos salen sin firmar.');

    K.piezas.adjuntos.montar(zona, {
      acepta: 'image/*', varios: false, maximo: 1, maximoMB: 10,
      alCambiar: function (archivos) {
        if (!archivos || !archivos.length) { delete D.firma; return; }
        K.piezas.imagenes.preparar(archivos[0])
          .then(function (img) {
            D.firma = img.dataUrl;
            K.aviso('Firma lista. Toca Guardar cambios para dejarla.', 'info', 4000);
          })
          ['catch'](function (e) {
            K.aviso(e && e.message ? e.message : 'No se pudo preparar la imagen.', 'malo', 5000);
          });
      }
    });

    donde.appendChild(c);
  }

  function isoDeHoy() {
    var h = new Date();
    return h.getFullYear() + '-' + ('0' + (h.getMonth() + 1)).slice(-2) + '-' + ('0' + h.getDate()).slice(-2);
  }

  function miniaturaDrive(url) {
    var m = String(url || '').match(/(?:\/d\/|id=)([a-zA-Z0-9_-]{15,})/);
    var id = m ? m[1] : (/^[a-zA-Z0-9_-]{20,}$/.test(String(url || '').trim()) ? String(url).trim() : '');
    return id ? ('https://drive.google.com/thumbnail?id=' + id + '&sz=w480') : url;
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
