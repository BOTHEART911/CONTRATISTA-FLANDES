/* ============================================================
   CONTRATISTA-FLANDES · INSTITUCIONAL Y AYUDA
   Ecosistema Flandes · Fase 4, entrega 4.8

   Cuatro vistas del menú viejo, rehechas:

     #/comunicados[/ID]  COMUNICADOS y su detalle
     #/directorio        DIRECTORIO INSTITUCIONAL
     #/tutoriales[/ID]   TUTORIALES DE USO (video, me gusta, comentarios)
     #/sitios            SITIOS WEB

   Lo que hacía la app vieja y lo que cambia (medido el 22/09 en la copia)

     COMUNICADOS. La hoja NOTICIAS (5 comunicados). Lo leído se guardaba
       con el NÚMERO DE FILA de la hoja: borrar o reordenar una fila
       marcaba como leído el comunicado equivocado. Aquí va con el
       ID_NOTICIA. La lista viaja dentro de la llamada de arranque, así
       que el número de sin leer del inicio no cuesta un viaje más. En el
       detalle se pueden tocar TODOS los enlaces (la vieja solo el
       primero) y los PDF se abren en el visor del kit, no en otra pestaña.

     DIRECTORIO. 14 contactos. Se le quita el espacio que traían al final
       varios correos, se marca el que no sirve (uno tiene tilde) y se
       añade buscador y compartir con el sistema del teléfono.

     TUTORIALES. 14 videos en 11 temas. Pastillas con el conteo, video
       dentro de la app, me gusta con candado en el servidor (un doble
       toque ya no duplica), comentarios con respuestas, edición y borrado
       de lo propio. La miniatura cae a la que saca Drive del video si la
       de la hoja (Cloudinary) no carga.

     SITIOS WEB. Los 6 enlaces salen de la llave SITIOS_WEB de CONFIG, no
       del código. Son páginas de terceros que no se dejan mostrar dentro
       de otra app: se abren en el navegador, y se dice.

   Pareja de estilos: la sección "4.8" de styles.css
   ============================================================ */
(function () {
  'use strict';

  var K = window.KIT;
  var app = K.id('app');

  var DOC = '';            /* de quién es la marca de "leído" */
  var COM = null;          /* comunicados */
  var DIR = null;          /* directorio */
  var TUT = null;          /* tutoriales {categorias, videos} */
  var SITIOS = null;       /* de CONFIG, vía el arranque */
  var FILTRO_TUT = '';     /* la pastilla elegida se recuerda al volver */
  var MAPA = null;         /* mapa-cloudinary.json de ALCALDIA-MEDIOS */

  /* ══════════════ utilidades ══════════════ */

  function caja(clase) {
    var c = K.nodo('<div class="kit-ancho vista ' + (clase || '') + '"></div>');
    app.appendChild(c);
    return c;
  }

  function iniciales(nombre) {
    var p = String(nombre || '').trim().split(/\s+/).filter(Boolean);
    if (!p.length) return '·';
    return (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
  }

  /** Foto redonda con respaldo a las iniciales si no hay o no carga. */
  function avatar(foto, nombre, clase) {
    var a = K.nodo('<span class="ins-avatar ' + (clase || '') + '" aria-hidden="true"><b>' + K.esc(iniciales(nombre)) + '</b></span>');
    if (foto) {
      var img = K.nodo('<img alt="" loading="lazy" referrerpolicy="no-referrer">');
      img.addEventListener('error', function () { img.remove(); });
      img.src = foto;
      a.appendChild(img);
    }
    return a;
  }

  /** Texto de la hoja a HTML: escapado, con saltos de línea y enlaces tocables. */
  function textoRico(t) {
    return K.esc(t || '')
      .replace(/https?:\/\/[^\s<]+/g, function (u) {
        var cola = (u.match(/(?:[).,;:!?]|&quot;|&#39;)+$/) || [''])[0];
        var limpio = u.slice(0, u.length - cola.length);
        return '<a href="' + limpio + '" target="_blank" rel="noopener noreferrer">' + limpio + '</a>' + cola;
      })
      .replace(/\n/g, '<br>');
  }

  function host(u) {
    try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return u; }
  }

  function esPdf(u) { return /\.pdf(?:[?#]|$)/i.test(u); }

  /** Un enlace viejo de Cloudinary pasa a ALCALDIA-MEDIOS si ya está allá. */
  function resolverMedio(u) {
    if (!/res\.cloudinary\.com/.test(u)) return Promise.resolve(u);
    var mapa = MAPA ? Promise.resolve(MAPA)
      : fetch(K.medio('mapa-cloudinary.json')).then(function (r) { return r.json(); })
          .then(function (j) { MAPA = (j && j.mapa) || {}; return MAPA; })
          ['catch'](function () { return {}; });
    return mapa.then(function (m) { return m[u] ? K.medio(m[u]) : u; });
  }

  function copiar(texto, etiqueta) {
    var p = (navigator.clipboard && navigator.clipboard.writeText)
      ? navigator.clipboard.writeText(texto) : Promise.reject();
    p.then(function () { K.aviso((etiqueta || 'Copiado') + ' ✓', 'ok', 2000); },
           function () { K.aviso(texto, 'info', 6000); });
  }

  function compartir(titulo, texto) {
    if (navigator.share) {
      navigator.share({ title: titulo, text: texto })['catch'](function () {});
    } else {
      copiar(texto, 'Copiado para compartir');
    }
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

  function rehacer() {
    /* vuelve a pintar la ruta actual sin tocar el historial */
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }

  function cabecera(icono, titulo, texto) {
    return K.nodo(
      '<section class="kit-tarjeta ins-cab">' +
      '  <span class="ins-cab__ico">' + K.icono(icono, 24) + '</span>' +
      '  <div class="ins-cab__txt"><h2 class="ins-cab__t">' + K.esc(titulo) + '</h2>' +
      '  <p class="ins-cab__p">' + texto + '</p></div>' +
      '</section>'
    );
  }

  function plural(n, uno, varios) { return n + ' ' + (n === 1 ? uno : varios); }

  /* ══════════════ COMUNICADOS ══════════════ */

  function leidosK() { return 'comunicados.leidos.' + (DOC || 'anon'); }
  function leidos() {
    var m = K.guardar.leer(leidosK(), null);
    return (m && typeof m === 'object') ? m : {};
  }
  function marcarLeido(ids) {
    var m = leidos(), cambio = false;
    ids.forEach(function (id) { if (!m[id]) { m[id] = Date.now(); cambio = true; } });
    if (cambio) K.guardar.escribir(leidosK(), m);
    anunciar();
  }
  function noLeidos() {
    if (!COM) return 0;
    var m = leidos();
    return COM.filter(function (c) { return !m[c.id]; }).length;
  }
  function anunciar() { K.disparar('kit:comunicados', { noLeidos: noLeidos() }); }

  function cargarComunicados() {
    if (COM) return Promise.resolve(COM);
    return K.pedir('comunicados').then(function (l) { COM = l || []; anunciar(); return COM; });
  }

  function vistaComunicados(sub) {
    var c = caja('ins');
    var id = sub ? decodeURIComponent(sub) : '';
    if (id) K.piezas.banner.atras(function () { location.hash = '#/comunicados'; });
    K.piezas.esqueletos.mientras(c, cargarComunicados(), { forma: 'tarjetas', cuantos: 3, espera: 'Trayendo los comunicados' })
      .then(function () {
        if (id) detalleComunicado(c, id); else listaComunicados(c);
      })
      ['catch'](function (e) {
        c.appendChild(errorCaja(e, function () { COM = null; rehacer(); }));
        K.piezas.creditos.montar(c);
      });
  }

  function listaComunicados(c) {
    c.innerHTML = '';
    var n = noLeidos();
    var cab = cabecera('megafono', 'COMUNICADOS',
      'Lo que te informan la Alcaldía, Contratación, Contabilidad, Tesorería y tu supervisor(a).' +
      (n ? ' <b class="ins-nuevos">' + plural(n, 'sin leer', 'sin leer') + '</b>' : ''));
    if (n) {
      var todos = K.nodo('<button type="button" class="kit-btn kit-btn--plano ins-cab__accion">' + K.icono('check', 16) + ' Marcar todos como leídos</button>');
      todos.addEventListener('click', function () {
        marcarLeido(COM.map(function (x) { return x.id; }));
        listaComunicados(c);
      });
      cab.appendChild(todos);
    }
    c.appendChild(cab);

    if (!COM.length) {
      c.appendChild(K.nodo('<section class="kit-tarjeta ins-vacio"><p>No hay comunicados por ahora.</p></section>'));
      K.piezas.creditos.montar(c);
      return;
    }

    var lista = K.nodo('<div class="ins-com-lista" role="list"></div>');
    var vistos = leidos();
    COM.forEach(function (x) {
      var nuevo = !vistos[x.id];
      var a = K.nodo(
        '<a role="listitem" class="kit-tarjeta ins-com' + (nuevo ? ' ins-com--nuevo' : '') + '" href="#/comunicados/' + encodeURIComponent(x.id) + '">' +
        '  <span class="ins-com__cuerpo">' +
        '    <span class="ins-com__cab"><b class="ins-com__de">' + K.esc(x.emisor || 'Alcaldía de Flandes') + '</b>' +
        (nuevo ? '<span class="ins-com__nuevo">Nuevo</span>' : '') + '</span>' +
        '    <span class="ins-com__area">' + K.esc(x.area || '') + '</span>' +
        '    <span class="ins-com__txt">' + K.esc(resumen(x.texto, 150)) + '</span>' +
        '  </span>' +
        '</a>'
      );
      a.insertBefore(avatar(x.foto, x.emisor), a.firstChild);
      lista.appendChild(a);
    });
    c.appendChild(lista);
    K.piezas.creditos.montar(c);
  }

  function resumen(t, n) {
    var s = String(t || '').replace(/\s+/g, ' ').trim();
    return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s;
  }

  function detalleComunicado(c, id) {
    c.innerHTML = '';
    var k = -1;
    COM.forEach(function (x, i) { if (x.id === id) k = i; });
    if (k < 0) {
      c.appendChild(K.nodo('<section class="kit-tarjeta ins-vacio"><p>Ese comunicado ya no está.</p>' +
        '<a class="kit-btn kit-btn--marca" href="#/comunicados">Ver los comunicados</a></section>'));
      K.piezas.creditos.montar(c);
      return;
    }
    var x = COM[k];
    marcarLeido([x.id]);

    var t = K.nodo(
      '<article class="kit-tarjeta ins-det">' +
      '  <header class="ins-det__cab">' +
      '    <div><b class="ins-det__de">' + K.esc(x.emisor || 'Alcaldía de Flandes') + '</b>' +
      '    <span class="ins-com__area">' + K.esc(x.area || '') + '</span></div>' +
      '  </header>' +
      '  <div class="ins-det__txt">' + textoRico(x.texto) + '</div>' +
      '</article>'
    );
    t.querySelector('.ins-det__cab').insertBefore(avatar(x.foto, x.emisor, 'ins-avatar--grande'), t.querySelector('.ins-det__cab').firstChild);

    if ((x.enlaces || []).length) {
      var zona = K.nodo('<div class="ins-enlaces"><p class="ins-enlaces__t">Enlaces del comunicado</p></div>');
      x.enlaces.forEach(function (u) {
        var fila = K.nodo(
          '<div class="ins-enlace">' +
          '  <span class="ins-enlace__ico">' + K.icono(esPdf(u) ? 'pdf' : 'globo', 18) + '</span>' +
          '  <span class="ins-enlace__txt"><b>' + K.esc(esPdf(u) ? 'Documento PDF' : host(u)) + '</b><small>' + K.esc(u) + '</small></span>' +
          '</div>'
        );
        if (esPdf(u)) {
          var ver = K.nodo('<button type="button" class="kit-btn kit-btn--marca">' + K.icono('documento', 16) + ' Ver</button>');
          ver.addEventListener('click', function () {
            resolverMedio(u).then(function (url) {
              K.piezas.visor.abrir([{ titulo: 'Documento del comunicado', url: url, tipo: 'pdf' }]);
            });
          });
          fila.appendChild(ver);
        } else {
          fila.appendChild(K.nodo('<a class="kit-btn kit-btn--marca" target="_blank" rel="noopener noreferrer" href="' +
            K.esc(u) + '">' + K.icono('abrir-pestana', 16) + ' Abrir</a>'));
        }
        var cp = K.nodo('<button type="button" class="kit-btn kit-btn--plano ins-enlace__copiar" aria-label="Copiar el enlace" title="Copiar el enlace">' + K.icono('copiar', 16) + '</button>');
        cp.addEventListener('click', function () { copiar(u, 'Enlace copiado'); });
        fila.appendChild(cp);
        zona.appendChild(fila);
      });
      t.appendChild(zona);
    }
    c.appendChild(t);

    /* pasar al siguiente sin volver a la lista */
    var nav = K.nodo('<nav class="ins-det__nav" aria-label="Otros comunicados"></nav>');
    if (k < COM.length - 1) nav.appendChild(K.nodo('<a class="kit-btn kit-btn--plano" href="#/comunicados/' + encodeURIComponent(COM[k + 1].id) + '">' + K.icono('atras', 16) + ' Anterior</a>'));
    else nav.appendChild(K.nodo('<span></span>'));
    if (k > 0) nav.appendChild(K.nodo('<a class="kit-btn kit-btn--plano" href="#/comunicados/' + encodeURIComponent(COM[k - 1].id) + '">Más reciente ' + K.icono('adelante', 16) + '</a>'));
    c.appendChild(nav);
    K.piezas.creditos.montar(c);
  }

  /* ══════════════ DIRECTORIO ══════════════ */

  function vistaDirectorio() {
    var c = caja('ins');
    var p = DIR ? Promise.resolve(DIR) : K.pedir('directorio').then(function (l) { DIR = l || []; return DIR; });
    K.piezas.esqueletos.mientras(c, p, { forma: 'filas', cuantos: 6, espera: 'Trayendo el directorio' })
      .then(function () { pintarDirectorio(c); })
      ['catch'](function (e) {
        c.appendChild(errorCaja(e, function () { DIR = null; rehacer(); }));
        K.piezas.creditos.montar(c);
      });
  }

  function pintarDirectorio(c) {
    c.innerHTML = '';
    c.appendChild(cabecera('ubicacion', 'DIRECTORIO INSTITUCIONAL',
      'Las dependencias de la Alcaldía: dónde quedan, su correo y sus líneas. Toca para escribir, llamar o llegar.'));

    var buscar = K.nodo(
      '<label class="ins-buscar">' + K.icono('buscar', 18) +
      '<input type="search" placeholder="Buscar dependencia o dirección" aria-label="Buscar en el directorio" autocomplete="off"></label>'
    );
    c.appendChild(buscar);
    var lista = K.nodo('<div class="ins-dir" role="list"></div>');
    c.appendChild(lista);
    var cuenta = K.nodo('<p class="ins-conteo" aria-live="polite"></p>');
    c.appendChild(cuenta);

    function pintar(q) {
      var n = K.norm(q || '');
      var vivos = DIR.filter(function (d) { return !n || K.norm(d.lugar + ' ' + d.direccion + ' ' + d.correo).indexOf(n) >= 0; });
      lista.innerHTML = '';
      vivos.forEach(function (d) { lista.appendChild(tarjetaContacto(d)); });
      cuenta.textContent = vivos.length === DIR.length ? plural(DIR.length, 'dependencia', 'dependencias')
        : (vivos.length ? plural(vivos.length, 'resultado', 'resultados') : 'Nada coincide con "' + q + '".');
    }
    buscar.querySelector('input').addEventListener('input', K.debounce(function (ev) { pintar(ev.target.value); }, 120));
    pintar('');
    K.piezas.creditos.montar(c);
  }

  function tarjetaContacto(d) {
    var t = K.nodo(
      '<article role="listitem" class="kit-tarjeta ins-contacto">' +
      '  <h3 class="ins-contacto__t">' + K.esc(d.lugar) + '</h3>' +
      '  <p class="ins-contacto__dir">' + K.icono('ubicacion', 15) + ' ' + K.esc(d.direccion || 'Sin dirección registrada') + '</p>' +
      (d.correo ? '  <p class="ins-contacto__dato">' + K.icono('sobre', 15) + ' ' + K.esc(d.correo) + '</p>' : '') +
      (d.correoMalo ? '  <p class="ins-contacto__malo">' + K.icono('aviso', 15) + ' El correo registrado (' + K.esc(d.correoMalo) + ') no es válido.</p>' : '') +
      '  <div class="ins-contacto__acciones"></div>' +
      '</article>'
    );
    var zona = t.querySelector('.ins-contacto__acciones');
    function boton(icono, texto, href, externo) {
      zona.appendChild(K.nodo('<a class="ins-accion" href="' + K.esc(href) + '"' +
        (externo ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' + K.icono(icono, 18) + '<span>' + K.esc(texto) + '</span></a>'));
    }
    if (d.ubicacion) boton('ubicacion', 'Cómo llegar', d.ubicacion, true);
    if (d.correo) boton('sobre', 'Correo', 'mailto:' + d.correo, false);
    if (d.whatsapp) boton('whatsapp', 'WhatsApp', 'https://wa.me/57' + d.whatsapp, true);
    if (d.telefono) boton('llamar', 'Llamar', 'tel:' + (d.telefono.length === 10 ? '+57' : '') + d.telefono, false);
    var sh = K.nodo('<button type="button" class="ins-accion">' + K.icono('compartir-ios', 18) + '<span>Compartir</span></button>');
    sh.addEventListener('click', function () {
      compartir(d.lugar, [d.lugar, d.direccion, d.correo, d.whatsapp ? 'WhatsApp ' + d.whatsapp : '',
        d.telefono && d.telefono !== d.whatsapp ? 'Tel. ' + d.telefono : '', d.ubicacion].filter(Boolean).join('\n'));
    });
    zona.appendChild(sh);
    return t;
  }

  /* ══════════════ TUTORIALES ══════════════ */

  var TEMAS = {
    primera: 'Primera cuenta', personales: 'Datos personales', contrato: 'Datos del contrato',
    borrador: 'Borrador', ingresar: 'Ingresar cuenta', corregir: 'Corregir cuenta',
    reportes: 'Reportes', estados: 'Estados de cuenta', tramites: 'Trámites',
    institucional: 'Institucional', adicion: 'Adiciones'
  };
  function tema(c) { return TEMAS[c] || (c ? c.charAt(0).toUpperCase() + c.slice(1) : 'Otros'); }

  function cargarTutoriales(forzar) {
    if (TUT && !forzar) return Promise.resolve(TUT);
    return K.pedir('tutoriales').then(function (r) { TUT = r || { categorias: [], videos: [] }; return TUT; });
  }

  function vistaTutoriales(sub) {
    var c = caja('ins');
    var id = sub ? decodeURIComponent(sub) : '';
    if (id) K.piezas.banner.atras(function () { location.hash = '#/tutoriales'; });
    K.piezas.esqueletos.mientras(c, cargarTutoriales(false), { forma: 'tarjetas', cuantos: 4, espera: 'Trayendo los tutoriales' })
      .then(function () { if (id) detalleTutorial(c, id); else listaTutoriales(c); })
      ['catch'](function (e) {
        c.appendChild(errorCaja(e, function () { TUT = null; rehacer(); }));
        K.piezas.creditos.montar(c);
      });
  }

  function miniatura(v, clase) {
    var img = K.nodo('<img class="' + (clase || '') + '" alt="" loading="lazy" referrerpolicy="no-referrer">');
    var fuentes = [v.miniatura, v.miniaturaDrive].filter(Boolean), i = 0;
    img.addEventListener('error', function () {
      i++;
      if (i < fuentes.length) img.src = fuentes[i];
      else img.classList.add('ins-mini--sin');
    });
    if (fuentes.length) img.src = fuentes[0]; else img.classList.add('ins-mini--sin');
    return img;
  }

  function metaVideo(v) {
    return [plural(v.vistas || 0, 'vista', 'vistas'), plural(v.likes || 0, 'me gusta', 'me gusta'),
            plural(v.comentarios || 0, 'comentario', 'comentarios')].join(' · ');
  }

  function listaTutoriales(c) {
    c.innerHTML = '';
    c.appendChild(cabecera('play', 'TUTORIALES DE USO',
      'Videos cortos que te enseñan cada paso de la app. Dale me gusta y deja tus dudas en los comentarios.'));

    var conteos = { '': TUT.videos.length };
    TUT.videos.forEach(function (v) { conteos[v.categoria] = (conteos[v.categoria] || 0) + 1; });
    var fila = K.nodo('<div class="ins-temas"></div>');
    c.appendChild(fila);
    var rejilla = K.nodo('<div class="kit-rejilla kit-rejilla--auto ins-videos"></div>');
    c.appendChild(rejilla);

    if (FILTRO_TUT && TUT.categorias.indexOf(FILTRO_TUT) < 0) FILTRO_TUT = '';
    var p = K.piezas.pastillas.montar(fila, {
      opciones: [{ valor: '', texto: 'Todos' }].concat(TUT.categorias.map(function (x) { return { valor: x, texto: tema(x) }; })),
      valor: FILTRO_TUT,
      alCambiar: function (v) { FILTRO_TUT = v || ''; pintar(); }
    });
    if (p && p.conteos) p.conteos(conteos);

    function pintar() {
      rejilla.innerHTML = '';
      TUT.videos.filter(function (v) { return !FILTRO_TUT || v.categoria === FILTRO_TUT; })
        .forEach(function (v) { rejilla.appendChild(tarjetaVideo(v)); });
    }
    pintar();
    if (!TUT.videos.length) rejilla.appendChild(K.nodo('<p class="ins-conteo">Todavía no hay tutoriales.</p>'));
    K.piezas.creditos.montar(c);
  }

  function tarjetaVideo(v) {
    var a = K.nodo(
      '<a class="kit-tarjeta ins-video" href="#/tutoriales/' + encodeURIComponent(v.id) + '">' +
      '  <span class="ins-video__mini">' +
      '    <span class="ins-video__play">' + K.icono('play', 22) + '</span>' +
      (v.duracion ? '<span class="ins-video__dur">' + K.esc(v.duracion) + '</span>' : '') +
      '  </span>' +
      '  <span class="ins-video__txt">' +
      '    <span class="ins-video__tema">' + K.esc(tema(v.categoria)) + (v.meGusta ? ' <span class="ins-video__tuyo" title="Te gusta">' + K.icono('corazon', 13) + '</span>' : '') + '</span>' +
      '    <b class="ins-video__t">' + K.esc(v.titulo) + '</b>' +
      '    <small class="ins-video__meta">' + K.esc(metaVideo(v)) + '</small>' +
      '  </span>' +
      '</a>'
    );
    a.querySelector('.ins-video__mini').insertBefore(miniatura(v, 'ins-mini'), a.querySelector('.ins-video__play'));
    return a;
  }

  function detalleTutorial(c, id) {
    c.innerHTML = '';
    var v = null;
    TUT.videos.forEach(function (x) { if (x.id === id) v = x; });
    if (!v) {
      c.appendChild(K.nodo('<section class="kit-tarjeta ins-vacio"><p>Ese tutorial ya no está.</p>' +
        '<a class="kit-btn kit-btn--marca" href="#/tutoriales">Ver los tutoriales</a></section>'));
      K.piezas.creditos.montar(c);
      return;
    }

    var t = K.nodo(
      '<article class="kit-tarjeta ins-ver">' +
      '  <div class="ins-reproductor"></div>' +
      '  <div class="ins-ver__cuerpo">' +
      '    <span class="ins-video__tema">' + K.esc(tema(v.categoria)) + '</span>' +
      '    <h2 class="ins-ver__t">' + K.esc(v.titulo) + '</h2>' +
      '    <p class="ins-ver__meta">' + K.esc([plural(v.vistas || 0, 'vista', 'vistas'), v.duracion, v.fecha].filter(Boolean).join(' · ')) + '</p>' +
      '    <div class="ins-ver__acciones"></div>' +
      (v.descripcion ? '<p class="ins-ver__desc">' + K.esc(v.descripcion) + '</p>' : '') +
      '  </div>' +
      '</article>'
    );
    c.appendChild(t);
    montarReproductor(t.querySelector('.ins-reproductor'), v);

    var acc = t.querySelector('.ins-ver__acciones');
    var like = K.nodo('<button type="button" class="ins-like" aria-pressed="' + (v.meGusta ? 'true' : 'false') + '">' +
      K.icono('corazon', 18) + '<span class="ins-like__n">' + (v.likes || 0) + '</span><span class="kit-solo-lector"> me gusta</span></button>');
    like.addEventListener('click', function () { tocarLike(v, like); });
    acc.appendChild(like);
    var sh = K.nodo('<button type="button" class="kit-btn kit-btn--plano">' + K.icono('compartir-ios', 16) + ' Compartir</button>');
    sh.addEventListener('click', function () {
      compartir(v.titulo, v.titulo + '\n' + (v.descripcion || '') + '\nhttps://drive.google.com/file/d/' + v.drive + '/view');
    });
    acc.appendChild(sh);

    var com = K.nodo('<section class="kit-tarjeta ins-coms" aria-label="Comentarios"></section>');
    c.appendChild(com);
    comentarios(com, v);

    /* lo que sigue: primero lo del mismo tema, después el resto */
    var otros = TUT.videos.filter(function (x) { return x.id !== v.id; });
    otros.sort(function (a, b) { return (a.categoria === v.categoria ? 0 : 1) - (b.categoria === v.categoria ? 0 : 1); });
    if (otros.length) {
      var mas = K.nodo('<section class="kit-tarjeta ins-mas"><h3 class="seg-sec__t">Otros tutoriales</h3><div class="ins-mas__lista"></div></section>');
      otros.slice(0, 6).forEach(function (x) {
        var fila = K.nodo('<a class="ins-mas__i" href="#/tutoriales/' + encodeURIComponent(x.id) + '"><span class="ins-mas__mini"></span>' +
          '<span><b>' + K.esc(x.titulo) + '</b><small>' + K.esc(tema(x.categoria) + (x.duracion ? ' · ' + x.duracion : '')) + '</small></span></a>');
        fila.querySelector('.ins-mas__mini').appendChild(miniatura(x, 'ins-mini'));
        mas.querySelector('.ins-mas__lista').appendChild(fila);
      });
      c.appendChild(mas);
    }
    K.piezas.creditos.montar(c);
    try { window.scrollTo(0, 0); } catch (e) {}
  }

  /* El video de Drive NO se carga hasta que se pide: son MB que no tiene
     por qué gastar quien solo entró a leer los comentarios. */
  function montarReproductor(zona, v) {
    zona.innerHTML = '';
    var poster = K.nodo('<button type="button" class="ins-reproductor__poster" aria-label="Reproducir ' + K.esc(v.titulo) + '">' +
      '<span class="ins-reproductor__boton">' + K.icono('play', 30) + '</span>' +
      (v.duracion ? '<span class="ins-video__dur">' + K.esc(v.duracion) + '</span>' : '') + '</button>');
    poster.insertBefore(miniatura(v, 'ins-mini'), poster.firstChild);
    poster.addEventListener('click', function () {
      if (!v.drive) { K.aviso('Este video no tiene archivo en Drive.', 'malo'); return; }
      zona.innerHTML = '<iframe class="ins-reproductor__marco" src="https://drive.google.com/file/d/' + encodeURIComponent(v.drive) +
        '/preview" title="' + K.esc(v.titulo) + '" allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowfullscreen></iframe>';
      /* la vista se cuenta en el servidor una vez por persona y video */
      K.pedir('tutorialVista', { id: v.id }).then(function (r) {
        if (r && r.contada) v.vistas = r.vistas;
      })['catch'](function () {});
    });
    zona.appendChild(poster);
  }

  var EN_VUELO_LIKE = {};
  function tocarLike(v, boton) {
    if (EN_VUELO_LIKE[v.id]) return;
    var quiero = !v.meGusta;
    /* se ve de una: esperar 2 s al servidor para pintar un corazón es lento */
    pintarLike(boton, quiero, (v.likes || 0) + (quiero ? 1 : -1));
    K.vibrar(8);
    EN_VUELO_LIKE[v.id] = true;
    K.pedir('tutorialLike', { id: v.id, quiero: quiero })
      .then(function (r) {
        v.meGusta = !!r.meGusta; v.likes = r.likes;
        pintarLike(boton, v.meGusta, v.likes);
      })
      ['catch'](function (e) {
        pintarLike(boton, v.meGusta, v.likes || 0);
        K.aviso((e && e.message) || 'No se pudo guardar tu me gusta.', 'malo');
      })
      .then(function () { delete EN_VUELO_LIKE[v.id]; });
  }
  function pintarLike(b, si, n) {
    b.setAttribute('aria-pressed', si ? 'true' : 'false');
    b.querySelector('.ins-like__n').textContent = Math.max(0, n);
  }

  /* ---------- comentarios ---------- */

  function comentarios(zona, v) {
    zona.innerHTML = '<h3 class="seg-sec__t">Comentarios</h3>';
    zona.appendChild(formComentario(v, '', 'Escribe tu duda o comentario…', function () { comentarios(zona, v); }));
    var lista = K.nodo('<div class="ins-coms__lista"></div>');
    zona.appendChild(lista);
    K.piezas.esqueletos.mientras(lista, K.pedir('tutorialComentarios', { id: v.id }), { forma: 'filas', cuantos: 2 })
      .then(function (r) {
        v.comentarios = r.total || 0;
        zona.querySelector('.seg-sec__t').textContent = 'Comentarios' + (r.total ? ' (' + r.total + ')' : '');
        if (!r.comentarios.length) {
          lista.appendChild(K.nodo('<p class="ins-conteo">Sé el primero en comentar.</p>'));
          return;
        }
        r.comentarios.forEach(function (x) { lista.appendChild(comentario(x, v, zona, false)); });
      })
      ['catch'](function (e) {
        lista.appendChild(errorCaja(e, function () { comentarios(zona, v); }));
      });
  }

  function formComentario(v, respuestaA, marcador, alTerminar, textoInicial, comentarioId) {
    var f = K.nodo(
      '<form class="ins-cform" novalidate>' +
      '  <textarea rows="2" maxlength="1000" placeholder="' + K.esc(marcador) + '" aria-label="' + K.esc(marcador) + '"></textarea>' +
      '  <div class="ins-cform__pie"><small class="ins-cform__n">0 / 1000</small>' +
      '    <button type="button" class="kit-btn kit-btn--plano ins-cform__no">Cancelar</button>' +
      '    <button type="submit" class="kit-btn kit-btn--marca" disabled>' + K.icono('enviar', 15) + ' ' + (comentarioId ? 'Guardar' : (respuestaA ? 'Responder' : 'Comentar')) + '</button>' +
      '  </div>' +
      '</form>'
    );
    var ta = f.querySelector('textarea'), enviar = f.querySelector('[type=submit]'), n = f.querySelector('.ins-cform__n');
    var no = f.querySelector('.ins-cform__no');
    if (!respuestaA && !comentarioId) no.hidden = true;
    ta.value = textoInicial || '';
    function contar() {
      n.textContent = ta.value.length + ' / 1000';
      enviar.disabled = !ta.value.trim() || ta.value.trim() === String(textoInicial || '').trim();
    }
    ta.addEventListener('input', contar);
    contar();
    no.addEventListener('click', function () { alTerminar(true); });
    f.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var texto = ta.value.trim();
      if (!texto || enviar.disabled) return;
      enviar.disabled = true; ta.disabled = true; K.ocupado = true;
      var p = comentarioId
        ? K.pedir('tutorialComentarioEditar', { comentarioId: comentarioId, texto: texto })
        : K.pedir('tutorialComentar', { id: v.id, texto: texto, respuestaA: respuestaA || '' });
      p.then(function () {
        K.ocupado = false;
        K.aviso(comentarioId ? 'Comentario editado ✓' : (respuestaA ? 'Respuesta publicada ✓' : 'Comentario publicado ✓'), 'ok', 2200);
        alTerminar(false);
      })['catch'](function (e) {
        K.ocupado = false; ta.disabled = false; contar();
        K.aviso((e && e.message) || 'No se pudo publicar.', 'malo', 6000);
      });
    });
    return f;
  }

  function comentario(x, v, zona, esRespuesta) {
    var el = K.nodo(
      '<div class="ins-cmt' + (esRespuesta ? ' ins-cmt--resp' : '') + '">' +
      '  <div class="ins-cmt__cuerpo">' +
      '    <p class="ins-cmt__cab"><b>' + K.esc(x.nombre) + '</b>' + (x.mio ? ' <span class="ins-cmt__tu">tú</span>' : '') +
      '      <small>' + K.esc([x.secretaria, x.fecha].filter(Boolean).join(' · ')) + (x.editado ? ' · editado' : '') + '</small></p>' +
      '    <p class="ins-cmt__txt">' + textoRico(x.texto) + '</p>' +
      '    <div class="ins-cmt__acc"></div>' +
      '  </div>' +
      '</div>'
    );
    el.insertBefore(avatar(x.foto, x.nombre, 'ins-avatar--chico'), el.firstChild);
    var acc = el.querySelector('.ins-cmt__acc');
    var cuerpo = el.querySelector('.ins-cmt__cuerpo');
    function accion(icono, texto, fn, peligro) {
      var b = K.nodo('<button type="button" class="ins-cmt__b' + (peligro ? ' ins-cmt__b--malo' : '') + '">' + K.icono(icono, 14) + ' ' + texto + '</button>');
      b.addEventListener('click', fn);
      acc.appendChild(b);
    }
    if (!esRespuesta) {
      accion('responder', 'Responder', function () {
        if (cuerpo.querySelector('.ins-cform')) return;
        var f = formComentario(v, x.id, 'Responde a ' + x.nombre.split(' ')[0] + '…', function (cancelado) {
          f.remove(); if (!cancelado) comentarios(zona, v);
        });
        cuerpo.appendChild(f);
        f.querySelector('textarea').focus();
      });
    }
    if (x.mio) {
      accion('lapiz', 'Editar', function () {
        if (cuerpo.querySelector('.ins-cform')) return;
        var txt = el.querySelector('.ins-cmt__txt');
        txt.hidden = true; acc.hidden = true;
        var f = formComentario(v, '', 'Edita tu comentario', function (cancelado) {
          f.remove(); txt.hidden = false; acc.hidden = false;
          if (!cancelado) comentarios(zona, v);
        }, x.texto, x.id);
        cuerpo.insertBefore(f, acc);
        f.querySelector('textarea').focus();
      });
      accion('basura', 'Borrar', function () {
        K.piezas.confirmar.abrir({
          titulo: '¿Borrar tu comentario?', texto: 'Se quita de la lista para todos. No se puede deshacer.',
          si: 'Borrar', no: 'Cancelar', peligro: true
        }).then(function (ok) {
          if (!ok) return;
          K.ocupado = true;
          K.pedir('tutorialComentarioBorrar', { comentarioId: x.id })
            .then(function () { K.ocupado = false; K.aviso('Comentario borrado', 'ok', 2000); comentarios(zona, v); })
            ['catch'](function (e) { K.ocupado = false; K.aviso((e && e.message) || 'No se pudo borrar.', 'malo'); });
        });
      }, true);
    }
    (x.respuestas || []).forEach(function (r) { el.appendChild(comentario(r, v, zona, true)); });
    return el;
  }

  /* ══════════════ SITIOS WEB ══════════════ */

  function vistaSitios() {
    var c = caja('ins');
    c.appendChild(cabecera('globo', 'SITIOS WEB',
      'Las páginas que más usas para tu contrato. Son de otras entidades y no se dejan mostrar dentro de la app: se abren en tu navegador.'));
    var lista = SITIOS || [];
    if (!lista.length) {
      c.appendChild(K.nodo('<section class="kit-tarjeta ins-vacio"><p>No hay sitios configurados. Avísale a la oficina de Contratación.</p></section>'));
    } else {
      var rej = K.nodo('<div class="kit-rejilla kit-rejilla--auto ins-sitios"></div>');
      lista.forEach(function (s) {
        var t = K.nodo(
          '<article class="kit-tarjeta ins-sitio">' +
          '  <header class="ins-sitio__cab"><span class="ins-sitio__ico">' + K.icono('globo', 20) + '</span>' +
          '  <div><h3 class="ins-sitio__t">' + K.esc(s.titulo) + '</h3><small>' + K.esc(host(s.url)) + '</small></div></header>' +
          '  <p class="ins-sitio__p">' + K.esc(s.texto || '') + '</p>' +
          '  <div class="ins-sitio__acc">' +
          '    <a class="kit-btn kit-btn--marca" target="_blank" rel="noopener noreferrer" href="' + K.esc(s.url) + '">' + K.icono('abrir-pestana', 16) + ' Abrir</a>' +
          '    <button type="button" class="kit-btn kit-btn--plano">' + K.icono('copiar', 16) + ' Copiar enlace</button>' +
          '  </div>' +
          '</article>'
        );
        t.querySelector('button').addEventListener('click', function () { copiar(s.url, 'Enlace copiado'); });
        rej.appendChild(t);
      });
      c.appendChild(rej);
    }
    K.piezas.creditos.montar(c);
  }

  /* ══════════════ salida ══════════════ */

  window.INSTITUCIONAL = {
    /** El arranque entrega los comunicados, los sitios y de quién es la sesión. */
    configurar: function (o) {
      o = o || {};
      if (o.documento) DOC = String(o.documento);
      if (Array.isArray(o.comunicados)) COM = o.comunicados;
      if (Array.isArray(o.sitios)) SITIOS = o.sitios;
      anunciar();
    },
    noLeidos: noLeidos,
    comunicados: vistaComunicados,
    directorio: vistaDirectorio,
    tutoriales: vistaTutoriales,
    sitios: vistaSitios,
    /* para el banco de pruebas */
    _olvidar: function () { COM = null; DIR = null; TUT = null; SITIOS = null; FILTRO_TUT = ''; MAPA = null; },
    _textoRico: textoRico
  };
}());
