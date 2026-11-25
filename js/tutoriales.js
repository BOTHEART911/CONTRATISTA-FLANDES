/* ============================================================
   CONTRATISTA-FLANDES · TUTORIALES EN VIDEO (22/11/2026)

   #/tutoriales        la lista: tu avance, «Sigue con», la guía rápida,
                       los temas y los 14 tutoriales.
   #/tutoriales/ID     el tutorial: en el CELULAR el Short a pantalla
                       completa (como YouTube Shorts); en el PC el video
                       horizontal con sus comentarios y «Siguientes».

   Los videos están en YouTube (no listados). La miniatura horizontal la da
   YouTube; la vertical (YouTube no la entrega para los Shorts) viene del
   repo (img/tutoriales) o de la que suba ADMIN.

   UN VIAJE: 'tutoriales' trae la lista, mis me gusta y lo que ya vi. La
   cabecera de un tutorial se pinta antes de ese viaje con el índice que
   viene en el arranque (CONFIG TUTORIALES_INDICE): el asistente lleva aquí
   y el video ya está puesto. Los comentarios se piden al abrirlos.
   El reproductor de YouTube no se carga hasta que la persona toca el
   video: son MB que no gasta quien solo entró a mirar.

   Reemplaza la parte de tutoriales de institucional.js (videos de Drive).
   Pareja de estilos: la sección «tutoriales en video» de styles.css.
   ============================================================ */
(function () {
  'use strict';

  var K = window.KIT;
  var app = K.id('app');

  var TUT = null;          /* {categorias, temas, videos} */
  var CARGA = null;
  var FILTRO = '';
  var TEMAS = { pasos: 'Primeros pasos', borrador: 'Tu borrador', cuenta: 'Tu cuenta', plan: 'Plan de pagos', ayuda: 'Ayuda' };

  /* de dónde vino la persona: «atrás» la devuelve ahí (p. ej. al asistente de su vista) */
  var ULTIMO = location.hash, PREVIO = '';
  window.addEventListener('hashchange', function () { PREVIO = ULTIMO; ULTIMO = location.hash; });

  /* ══════════════ utilidades ══════════════ */

  function tema(c) { return TEMAS[c] || (TUT && TUT.temas && TUT.temas[c]) || ''; }
  function plural(n, uno, varios) { return K.numero ? K.numero(n) + ' ' + (n === 1 ? uno : varios) : n + ' ' + (n === 1 ? uno : varios); }

  /** Celular → Short; PC → video. Si falta uno, el otro. */
  function esMovil() {
    try { return window.matchMedia('(max-width: 767px), (pointer: coarse) and (max-width: 1024px)').matches; }
    catch (e) { return window.innerWidth < 768; }
  }
  function modo(v) {
    var m = esMovil();
    if (m && v.short) return 'short';
    if (!m && v.youtube) return 'video';
    return v.short ? 'short' : 'video';
  }

  function cfg() { try { return (window.CONTRATISTA_CANDADO && window.CONTRATISTA_CANDADO.config()) || {}; } catch (e) { return {}; } }

  /* ---------- sin sesión (pantalla de entrada) ----------
     El tutorial 1 («Entra a la app») tiene que poderse ver ANTES de entrar:
     quien no sabe iniciar sesión lo pide al asistente de la entrada. Sin
     sesión no hay arranque, así que el índice sale de:
       1. la configuración de la sesión, si la hay;
       2. la configuración PÚBLICA del CORE ('config', sin token), que el pie
          de la entrada ya pide: esta lectura se le pega a esa misma;
       3. lo último que vio este teléfono (se recuerda al entrar).
     Sin sesión el video se ve suelto: sin me gusta ni comentarios. */
  var PUB = null, IDX_K = 'tutoriales.indice.v1';
  function aLista(l) { if (typeof l === 'string') { try { l = JSON.parse(l); } catch (e) { l = []; } } return l instanceof Array ? l : []; }
  function siNo(v) { return v === true || K.norm(String(v === undefined || v === null ? '' : v)) === 'SI'; }
  function fuente() {
    var c = cfg();
    if (c.TUTORIALES_INDICE !== undefined) {
      var g = { activo: siNo(c.TUTORIALES_ACTIVO), indice: aLista(c.TUTORIALES_INDICE) };
      try { K.guardar.escribir(IDX_K, g); } catch (e) {}
      return g;
    }
    if (PUB) return PUB;
    var m = null;
    try { m = K.guardar.leer(IDX_K, null); } catch (e) {}
    return (m && m.indice) ? m : { activo: false, indice: [] };
  }
  function precargarSinSesion() {
    if (PUB || (K.token && K.token()) || !K.pedir) return;
    K.pedir('config', {}, { sinToken: true, app: 'CORE', fondo: true }).then(function (c) {
      if (!c || c.TUTORIALES_INDICE === undefined) return;
      PUB = { activo: siNo(c.TUTORIALES_ACTIVO), indice: aLista(c.TUTORIALES_INDICE) };
      try { K.guardar.escribir(IDX_K, PUB); } catch (e) {}
    })['catch'](function () {});
  }

  /** El índice del arranque con la forma de un video (sin me gusta: llegan con la lista). */
  function delIndice(id) {
    var l = fuente().indice;
    for (var i = 0; i < l.length; i++) {
      var x = l[i];
      if (x.id === id) return { id: x.id, n: x.n, titulo: x.t, categoria: x.c, youtube: x.yt, short: x.sh, shortImg: x.img, duracion: x.d, parcial: true };
    }
    return null;
  }

  function fuentesH(v) {
    var id = v.youtube || v.short;
    return id ? ['https://i.ytimg.com/vi/' + id + '/maxresdefault.jpg', 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg'] : [];
  }
  function fuentesV(v) {
    var l = [];
    if (v.shortImg) l.push(v.shortImg);
    if (v.short) l.push('https://i.ytimg.com/vi/' + v.short + '/oar2.jpg');
    return l.concat(fuentesH(v));
  }

  /** Imagen con su tamaño fijo y respaldo: si una fuente no carga, la siguiente. */
  function imagen(fuentes, clase, ancho, alto) {
    var img = K.nodo('<img class="' + clase + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" width="' + ancho + '" height="' + alto + '">');
    var i = 0;
    img.addEventListener('error', function () {
      i++;
      if (i < fuentes.length) img.src = fuentes[i];
      else img.classList.add('tv-img--sin');
    });
    /* maxresdefault inexistente devuelve una imagen gris de 120×90 sin error */
    img.addEventListener('load', function () {
      if (img.naturalWidth === 120 && /maxresdefault/.test(img.src) && i < fuentes.length - 1) { i++; img.src = fuentes[i]; }
    });
    if (fuentes.length) img.src = fuentes[0]; else img.classList.add('tv-img--sin');
    return img;
  }

  function embed(id) {
    return 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) +
      '?autoplay=1&playsinline=1&rel=0&modestbranding=1&iv_load_policy=3';
  }
  function enlace(v, m) { return m === 'short' ? 'https://youtube.com/shorts/' + v.short : 'https://youtu.be/' + v.youtube; }

  function cargar(forzar) {
    if (TUT && !forzar) return Promise.resolve(TUT);
    if (CARGA && !forzar) return CARGA;
    CARGA = K.pedir('tutoriales').then(function (r) {
      CARGA = null;
      TUT = r || { categorias: [], videos: [] };
      TUT.videos = (TUT.videos || []).slice().sort(function (a, b) { return (a.n || 0) - (b.n || 0); });
      return TUT;
    }, function (e) { CARGA = null; throw e; });
    return CARGA;
  }

  function buscar(id) {
    var l = TUT ? TUT.videos : [];
    for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i];
    return null;
  }
  function siguienteDe(v) {
    var l = TUT ? TUT.videos : [];
    for (var i = 0; i < l.length; i++) if (l[i].id === v.id) return l[i + 1] || null;
    return null;
  }

  function errorCaja(e, reintentar) {
    var c = K.nodo('<section class="kit-tarjeta error"><p class="error__t">' + K.esc((e && e.message) || 'No se pudo cargar.') + '</p>' +
      '<button type="button" class="kit-btn kit-btn--plano">Reintentar</button></section>');
    c.querySelector('button').addEventListener('click', reintentar);
    return c;
  }

  function rehacer() { window.dispatchEvent(new HashChangeEvent('hashchange')); }

  function caja() {
    var c = K.nodo('<div class="kit-ancho vista tv"></div>');
    app.appendChild(c);
    return c;
  }

  /* ══════════════ la vista ══════════════ */

  function vista(sub) {
    cerrarPantalla();
    var id = sub ? decodeURIComponent(String(sub).split('/')[0]) : '';
    var c = caja();
    if (id) {
      K.piezas.banner.atras(volver);
      detalle(c, id);
      return;
    }
    K.piezas.esqueletos.mientras(c, cargar(false), { forma: 'tarjetas', cuantos: 4, espera: 'Trayendo los tutoriales' })
      .then(function () { lista(c); })
      ['catch'](function (e) {
        if (e && e.codigo === 'CANCELADA') return;
        c.appendChild(errorCaja(e, function () { TUT = null; rehacer(); }));
        K.piezas.creditos.montar(c);
      });
  }

  function volver() {
    var p = PREVIO;
    if (p && !/^#\/tutoriales/.test(p)) { location.hash = p; return; }
    location.hash = '#/tutoriales';
  }

  /* ---------- la lista ---------- */

  function lista(c) {
    c.innerHTML = '';
    var L = TUT.videos;
    var movil = esMovil();

    /* tu avance + sigue con + guía rápida */
    var vistos = L.filter(function (v) { return v.visto; }).length;
    var pct = L.length ? Math.round(vistos * 100 / L.length) : 0;
    var sigue = L.filter(function (v) { return !v.visto; })[0] || null;
    var av = K.nodo(
      '<section class="kit-tarjeta tv-avance" aria-label="Tu avance">' +
      '  <div class="tv-avance__cab"><div><p class="tv-eti">Tu avance</p>' +
      '    <h2 class="tv-avance__t">' + (vistos === L.length && L.length ? 'Ya viste los ' + L.length + ' tutoriales' : 'Viste ' + vistos + ' de ' + L.length + ' tutoriales') + '</h2></div>' +
      '    <b class="tv-avance__pct">' + pct + ' %</b></div>' +
      '  <div class="tv-barra" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><span style="width:' + pct + '%"></span></div>' +
      '  <div class="tv-avance__acc"></div>' +
      '</section>'
    );
    var acc = av.querySelector('.tv-avance__acc');
    if (sigue) {
      var s = K.nodo('<a class="tv-sigue" href="#/tutoriales/' + encodeURIComponent(sigue.id) + '">' +
        '<span class="tv-sigue__img"></span>' +
        '<span class="tv-sigue__txt"><small>Sigue con · Tutorial ' + sigue.n + '</small><b>' + K.esc(sigue.titulo) + '</b>' +
        (sigue.duracion ? '<small>' + K.esc(sigue.duracion) + '</small>' : '') + '</span>' +
        '<span class="tv-sigue__play" aria-hidden="true">' + K.icono('play', 18) + '</span></a>');
      s.querySelector('.tv-sigue__img').appendChild(movil ? imagen(fuentesV(sigue), 'tv-img', 54, 96) : imagen(fuentesH(sigue), 'tv-img', 96, 54));
      s.classList.add(movil ? 'tv-sigue--v' : 'tv-sigue--h');
      acc.appendChild(s);
    }
    if (K.piezas.guia) {
      var g = K.nodo('<button type="button" class="kit-btn kit-btn--plano tv-guia">' + K.icono('pdf', 18) + ' Guía rápida en PDF</button>');
      g.addEventListener('click', function () { K.vibrar(6); K.piezas.guia.descargar('CONTRATISTA'); });
      acc.appendChild(g);
    }
    c.appendChild(av);

    /* temas */
    var fila = K.nodo('<div class="tv-temas"></div>');
    c.appendChild(fila);
    var rej = K.nodo('<div class="tv-rejilla ' + (movil ? 'tv-rejilla--v' : 'tv-rejilla--h') + '"></div>');
    c.appendChild(rej);
    var cats = TUT.categorias || [];
    if (FILTRO && cats.indexOf(FILTRO) < 0) FILTRO = '';
    var conteos = { '': L.length };
    L.forEach(function (v) { conteos[v.categoria] = (conteos[v.categoria] || 0) + 1; });
    var p = K.piezas.pastillas.montar(fila, {
      opciones: [{ valor: '', texto: 'Todos' }].concat(cats.map(function (x) { return { valor: x, texto: tema(x) }; })),
      valor: FILTRO,
      alCambiar: function (v) { FILTRO = v || ''; pintar(); }
    });
    if (p && p.conteos) p.conteos(conteos);

    function pintar() {
      rej.innerHTML = '';
      L.filter(function (v) { return !FILTRO || v.categoria === FILTRO; })
        .forEach(function (v) { rej.appendChild(movil ? tarjetaShort(v) : tarjetaVideo(v)); });
      if (!rej.children.length) rej.appendChild(K.nodo('<p class="tv-nada">Todavía no hay tutoriales.</p>'));
    }
    pintar();
    K.piezas.creditos.montar(c);
  }

  function marcaVisto(v) {
    return v.visto ? '<span class="tv-visto">' + K.icono('check', 13) + ' Visto</span><span class="tv-hecho" aria-hidden="true"></span>' : '';
  }

  function tarjetaShort(v) {
    var a = K.nodo('<a class="tv-short-t" href="#/tutoriales/' + encodeURIComponent(v.id) + '">' +
      '<span class="tv-short-t__img">' + (v.duracion ? '<span class="tv-dur">' + K.esc(v.duracion) + '</span>' : '') + marcaVisto(v) + '</span>' +
      '<b>' + K.esc(v.titulo) + '</b><small>' + K.esc(tema(v.categoria)) + ' · Tutorial ' + v.n + '</small></a>');
    var z = a.querySelector('.tv-short-t__img');
    z.insertBefore(imagen(fuentesV(v), 'tv-img', 270, 480), z.firstChild);
    return a;
  }

  function tarjetaVideo(v) {
    var a = K.nodo('<a class="tv-video-t" href="#/tutoriales/' + encodeURIComponent(v.id) + '">' +
      '<span class="tv-video-t__img">' + (v.duracion ? '<span class="tv-dur">' + K.esc(v.duracion) + '</span>' : '') + marcaVisto(v) + '</span>' +
      '<span class="tv-video-t__pie"><span class="tv-num" aria-hidden="true">' + v.n + '</span>' +
      '<span class="tv-video-t__txt"><b>' + K.esc(v.titulo) + '</b><small>' + K.esc(tema(v.categoria)) +
      (v.likes || v.comentarios ? ' · ' + [v.likes ? plural(v.likes, 'me gusta', 'me gusta') : '', v.comentarios ? plural(v.comentarios, 'comentario', 'comentarios') : ''].filter(Boolean).join(' · ') : '') +
      '</small></span></span></a>');
    var z = a.querySelector('.tv-video-t__img');
    z.insertBefore(imagen(fuentesH(v), 'tv-img', 480, 270), z.firstChild);
    return a;
  }

  /* ---------- un tutorial ---------- */

  function detalle(c, id) {
    var v = buscar(id) || delIndice(id);
    if (!v) {
      /* sin lista ni índice: se espera la lista */
      K.piezas.esqueletos.mientras(c, cargar(false), { forma: 'tarjetas', cuantos: 1, espera: 'Trayendo el tutorial' })
        .then(function () {
          if (buscar(id)) { pintarDetalle(c, buscar(id)); return; }
          c.appendChild(K.nodo('<section class="kit-tarjeta"><p>Ese tutorial ya no está.</p><a class="kit-btn kit-btn--marca" href="#/tutoriales">Ver los tutoriales</a></section>'));
          K.piezas.creditos.montar(c);
        })['catch'](function (e) {
          if (e && e.codigo === 'CANCELADA') return;
          c.appendChild(errorCaja(e, function () { TUT = null; rehacer(); }));
        });
      return;
    }
    pintarDetalle(c, v);
    /* lo que falta (me gusta, visto, siguientes) llega con la lista */
    if (v.parcial) {
      cargar(false).then(function () {
        var x = buscar(id);
        if (x && String(location.hash).indexOf(encodeURIComponent(id)) >= 0) completar(x);
      })['catch'](function () {});
    }
  }

  var ACTUAL = null;   /* {v, el, modo, completar} */

  function completar(v) { if (ACTUAL && ACTUAL.completar) ACTUAL.completar(v); }

  function pintarDetalle(c, v) {
    c.innerHTML = '';
    var m = modo(v);
    if (m === 'short') pantallaShort(c, v);
    else verVideo(c, v);
  }

  /** La vista se cuenta en el servidor (una por persona y video cada 6 h) y queda como vista. */
  function contarVista(v) {
    if (v._contada || !(K.token && K.token())) return;
    v._contada = true;
    K.pedir('tutorialVista', { id: v.id }).then(function (r) {
      var x = buscar(v.id) || v;
      x.visto = true;
      if (r && r.contada) x.vistas = r.vistas;
    })['catch'](function () { v._contada = false; });
  }

  /* --- PC: video horizontal, comentarios y siguientes --- */

  function verVideo(c, v) {
    var w = K.nodo(
      '<div class="tv-ver">' +
      '  <div class="tv-ver__pri">' +
      '    <div class="tv-rep"></div>' +
      '    <h1 class="tv-ver__t">' + K.esc(v.titulo) + '</h1>' +
      '    <div class="tv-ver__barra">' +
      '      <span class="tv-autor"><span class="tv-autor__ini" aria-hidden="true">OP</span><span><b>Oscar Polanía</b><small>Tutorial ' + (v.n || '') + (TUT ? ' de ' + TUT.videos.length : '') + (tema(v.categoria) ? ' · ' + K.esc(tema(v.categoria)) : '') + '</small></span></span>' +
      '      <span class="tv-ver__acc"></span>' +
      '    </div>' +
      '    <div class="tv-ver__desc"></div>' +
      '    <section class="tv-coms" aria-label="Comentarios"></section>' +
      '  </div>' +
      '  <aside class="tv-ver__sig" aria-label="Siguientes"></aside>' +
      '</div>'
    );
    c.appendChild(w);
    reproductor(w.querySelector('.tv-rep'), v, 'video');
    var acc = w.querySelector('.tv-ver__acc');
    var like = botonLike(v, false);
    acc.appendChild(like);
    var sh = K.nodo('<button type="button" class="kit-btn kit-btn--plano tv-pildora">' + K.icono('compartir-ios', 18) + ' Compartir</button>');
    sh.addEventListener('click', function () { compartir(v, 'video'); });
    acc.appendChild(sh);
    var desc = w.querySelector('.tv-ver__desc');
    var coms = w.querySelector('.tv-coms');
    var sig = w.querySelector('.tv-ver__sig');

    function completarVista(x) {
      v = x;
      pintarLike(like, !!x.meGusta, x.likes || 0, x);
      desc.innerHTML = '<b>' + plural(x.vistas || 0, 'vista', 'vistas') + (x.duracion ? ' · ' + K.esc(x.duracion) : '') + '</b>' +
        (x.descripcion ? '<p>' + K.esc(x.descripcion) + '</p>' : '');
      sig.innerHTML = '<h2 class="tv-sub">Siguientes</h2>';
      /* primero los que siguen en orden; luego los de antes */
      var desde = TUT.videos.indexOf(x);
      var otros = TUT.videos.slice(desde + 1).concat(TUT.videos.slice(0, Math.max(desde, 0)));
      otros.slice(0, 8).forEach(function (y) {
        var f = K.nodo('<a class="tv-fila" href="#/tutoriales/' + encodeURIComponent(y.id) + '"><span class="tv-fila__img">' +
          (y.duracion ? '<span class="tv-dur">' + K.esc(y.duracion) + '</span>' : '') + marcaVisto(y) + '</span>' +
          '<span class="tv-fila__txt"><b>' + K.esc(y.titulo) + '</b><small>' + K.esc(tema(y.categoria)) + ' · Tutorial ' + y.n + '</small></span></a>');
        var z = f.querySelector('.tv-fila__img');
        z.insertBefore(imagen(fuentesH(y), 'tv-img', 168, 94), z.firstChild);
        sig.appendChild(f);
      });
    }
    ACTUAL = { v: v, completar: completarVista };
    if (!v.parcial) completarVista(v);
    else desc.innerHTML = '<b>' + (v.duracion ? K.esc(v.duracion) : '') + '</b>';
    comentarios(coms, v, false);
    K.piezas.creditos.montar(c);
    try { window.scrollTo(0, 0); } catch (e) {}
  }

  function reproductor(zona, v, m) {
    zona.innerHTML = '';
    var id = m === 'short' ? v.short : v.youtube;
    var poster = K.nodo('<button type="button" class="tv-rep__poster" aria-label="Reproducir ' + K.esc(v.titulo) + '">' +
      '<span class="tv-rep__boton" aria-hidden="true">' + K.icono('play', 34) + '</span></button>');
    poster.insertBefore(m === 'short' ? imagen(fuentesV(v), 'tv-img', 540, 960) : imagen(fuentesH(v), 'tv-img', 1280, 720), poster.firstChild);
    poster.addEventListener('click', function () {
      K.vibrar(6);
      zona.innerHTML = '<iframe class="tv-rep__marco" src="' + embed(id) + '" title="' + K.esc(v.titulo) + '" ' +
        'allow="autoplay; encrypted-media; picture-in-picture; fullscreen" referrerpolicy="strict-origin-when-cross-origin"></iframe>';
      contarVista(v);
    });
    zona.appendChild(poster);
  }

  /* --- celular: el Short a pantalla completa --- */

  var PANTALLA = null;

  function cerrarPantalla() {
    if (PANTALLA) { PANTALLA.remove(); PANTALLA = null; }
    document.documentElement.classList.remove('tv-en-short');
    document.removeEventListener('keydown', teclaHoja);
  }

  function pantallaShort(c, v) {
    cerrarPantalla();
    var total = TUT ? TUT.videos.length : 0;
    var p = K.nodo(
      '<div class="tv-pantalla" role="dialog" aria-modal="true" aria-label="' + K.esc(v.titulo) + '">' +
      '  <div class="tv-pantalla__rep"></div>' +
      '  <div class="tv-pantalla__arriba">' +
      '    <button type="button" class="tv-redondo" aria-label="Volver">' + K.icono('atras', 20) + '</button>' +
      '    <span class="tv-pantalla__n">' + (v.n ? 'Tutorial ' + v.n + (total ? ' de ' + total : '') : 'Tutorial') + '</span>' +
      '  </div>' +
      '  <div class="tv-pantalla__riel"></div>' +
      '  <div class="tv-pantalla__abajo">' +
      '    <span class="tv-pantalla__autor"><span class="tv-autor__ini" aria-hidden="true">OP</span><b>Oscar Polanía</b>' +
      (tema(v.categoria) ? '<span class="tv-pantalla__tema">' + K.esc(tema(v.categoria)) + '</span>' : '') + '</span>' +
      '    <h1 class="tv-pantalla__t">' + K.esc(v.titulo) + '</h1>' +
      '    <div class="tv-pantalla__sig"></div>' +
      '  </div>' +
      '</div>'
    );
    document.body.appendChild(p);
    PANTALLA = p;
    document.documentElement.classList.add('tv-en-short');
    reproductor(p.querySelector('.tv-pantalla__rep'), v, 'short');
    p.querySelector('.tv-redondo').addEventListener('click', function () { K.vibrar(6); volver(); });

    var riel = p.querySelector('.tv-pantalla__riel');
    var like = botonLike(v, true);
    riel.appendChild(like);
    var bc = K.nodo('<button type="button" class="tv-riel" aria-label="Comentarios"><span class="tv-riel__c">' + K.icono('comentario', 24) + '</span><span class="tv-riel__n">' + (v.comentarios || 0) + '</span></button>');
    bc.addEventListener('click', function () { K.vibrar(6); abrirHoja(v, bc); });
    riel.appendChild(bc);
    var bs = K.nodo('<button type="button" class="tv-riel" aria-label="Compartir"><span class="tv-riel__c">' + K.icono('compartir-ios', 22) + '</span><span class="tv-riel__n">Compartir</span></button>');
    bs.addEventListener('click', function () { compartir(v, 'short'); });
    riel.appendChild(bs);

    var zSig = p.querySelector('.tv-pantalla__sig');
    function completarShort(x) {
      v = x;
      pintarLike(like, !!x.meGusta, x.likes || 0, x);
      bc.querySelector('.tv-riel__n').textContent = x.comentarios || 0;
      p.querySelector('.tv-pantalla__n').textContent = 'Tutorial ' + x.n + ' de ' + TUT.videos.length;
      var s = siguienteDe(x);
      zSig.innerHTML = '';
      if (s) {
        var b = K.nodo('<a class="tv-pantalla__sigb" href="#/tutoriales/' + encodeURIComponent(s.id) + '">' + K.icono('arriba', 16) +
          '<span>Siguiente: ' + K.esc(s.titulo) + '</span></a>');
        zSig.appendChild(b);
      }
    }
    ACTUAL = { v: v, completar: completarShort };
    if (!v.parcial) completarShort(v);

    /* deslizar hacia arriba sobre la franja de abajo = el siguiente */
    var y0 = null;
    var abajo = p.querySelector('.tv-pantalla__abajo');
    abajo.addEventListener('touchstart', function (e) { y0 = e.touches[0].clientY; }, { passive: true });
    abajo.addEventListener('touchend', function (e) {
      if (y0 === null) return;
      var dy = y0 - e.changedTouches[0].clientY; y0 = null;
      var s = siguienteDe(v);
      if (dy > 60 && s) location.hash = '#/tutoriales/' + encodeURIComponent(s.id);
    }, { passive: true });
    /* debajo queda la página de siempre, por si se cierra la pantalla */
    c.appendChild(K.nodo('<section class="kit-tarjeta tv-tras"><p>' + K.esc(v.titulo) + '</p><a class="kit-btn kit-btn--marca" href="#/tutoriales">Ver todos los tutoriales</a></section>'));
  }

  /** Sin sesión: el video a pantalla completa, sin me gusta ni comentarios.
      En el celular el Short; en el PC el video horizontal centrado. */
  function verSuelto(id) {
    var v = delIndice(id);
    if (!v) { K.aviso('El video no está disponible ahora. Inténtalo en un momento.', 'aviso', 4000); return; }
    cerrarPantalla();
    var m = modo(v);
    var p = K.nodo(
      '<div class="tv-pantalla' + (m === 'video' ? ' tv-pantalla--h' : '') + '" role="dialog" aria-modal="true" aria-label="' + K.esc(v.titulo) + '">' +
      '  <div class="tv-pantalla__rep"></div>' +
      '  <div class="tv-pantalla__arriba">' +
      '    <button type="button" class="tv-redondo" aria-label="Cerrar el video">' + K.icono('cerrar', 20) + '</button>' +
      '    <span class="tv-pantalla__n">Tutorial ' + (v.n || '') + '</span>' +
      '  </div>' +
      '  <div class="tv-pantalla__abajo tv-pantalla__abajo--suelto">' +
      '    <h1 class="tv-pantalla__t">' + K.esc(v.titulo) + '</h1>' +
      '    <p class="tv-pantalla__nota">' + ((K.token && K.token()) ? 'En Tutoriales de uso están todos los videos.' : 'Cuando entres, en Tutoriales de uso están todos los videos.') + '</p>' +
      '  </div>' +
      '</div>');
    document.body.appendChild(p);
    PANTALLA = p;
    document.documentElement.classList.add('tv-en-short');
    reproductor(p.querySelector('.tv-pantalla__rep'), v, m);
    var cerrar = p.querySelector('.tv-redondo');
    function fuera(e) { if (e.key === 'Escape') salir(); }
    function salir() { document.removeEventListener('keydown', fuera); cerrarPantalla(); }
    cerrar.addEventListener('click', function () { K.vibrar(6); salir(); });
    document.addEventListener('keydown', fuera);
    try { cerrar.focus(); } catch (e) {}
  }

  /* --- comentarios en hoja (celular) --- */

  var HOJA = null;
  function teclaHoja(e) { if (e.key === 'Escape' && HOJA) cerrarHoja(); }
  function cerrarHoja() {
    if (!HOJA) return;
    var o = HOJA.origen;
    HOJA.el.remove(); HOJA = null;
    document.removeEventListener('keydown', teclaHoja);
    try { if (o) o.focus(); } catch (e) {}
  }
  function abrirHoja(v, origen) {
    cerrarHoja();
    var h = K.nodo('<div class="tv-hoja-velo"><section class="tv-hoja" role="dialog" aria-modal="true" aria-label="Comentarios">' +
      '<span class="tv-hoja__asa" aria-hidden="true"></span>' +
      '<header class="tv-hoja__cab"><h2>Comentarios <span class="tv-hoja__n">' + (v.comentarios || 0) + '</span></h2>' +
      '<button type="button" class="tv-redondo tv-redondo--claro" aria-label="Cerrar comentarios">' + K.icono('cerrar', 20) + '</button></header>' +
      '<div class="tv-hoja__cuerpo tv-coms"></div></section></div>');
    (PANTALLA || document.body).appendChild(h);
    HOJA = { el: h, origen: origen };
    h.addEventListener('click', function (e) { if (e.target === h) cerrarHoja(); });
    h.querySelector('.tv-redondo').addEventListener('click', cerrarHoja);
    document.addEventListener('keydown', teclaHoja);
    comentarios(h.querySelector('.tv-coms'), v, true, function (n) {
      h.querySelector('.tv-hoja__n').textContent = n;
      var rn = PANTALLA && PANTALLA.querySelector('.tv-riel[aria-label="Comentarios"] .tv-riel__n');
      if (rn) rn.textContent = n;
    });
    try { h.querySelector('.tv-redondo').focus(); } catch (e) {}
  }

  /* ---------- me gusta y compartir ---------- */

  function botonLike(v, enRiel) {
    var b = enRiel
      ? K.nodo('<button type="button" class="tv-riel tv-like" aria-pressed="' + (v.meGusta ? 'true' : 'false') + '" aria-label="Me gusta"><span class="tv-riel__c">' + K.icono('corazon', 24) + '</span><span class="tv-riel__n tv-like__n">' + (v.likes || 0) + '</span></button>')
      : K.nodo('<button type="button" class="kit-btn tv-pildora tv-like" aria-pressed="' + (v.meGusta ? 'true' : 'false') + '">' + K.icono('corazon', 18) + ' <span class="tv-like__n">' + (v.likes || 0) + '</span><span class="tv-like__txt"> · Me gusta</span></button>');
    b.addEventListener('click', function () { tocarLike(buscar(v.id) || v, b); });
    return b;
  }

  var EN_VUELO = {};
  function tocarLike(v, b) {
    if (EN_VUELO[v.id]) return;
    if (v.parcial) { K.aviso('Un momento: estoy trayendo tus me gusta.', 'info', 1800); return; }
    var quiero = !v.meGusta;
    pintarLike(b, quiero, (v.likes || 0) + (quiero ? 1 : -1));
    K.vibrar(8);
    EN_VUELO[v.id] = true;
    b.setAttribute('aria-busy', 'true');
    K.pedir('tutorialLike', { id: v.id, quiero: quiero })
      .then(function (r) { v.meGusta = !!r.meGusta; v.likes = r.likes; pintarLike(b, v.meGusta, v.likes); })
      ['catch'](function (e) { pintarLike(b, !!v.meGusta, v.likes || 0); K.aviso((e && e.message) || 'No se pudo guardar tu me gusta.', 'malo'); })
      .then(function () { delete EN_VUELO[v.id]; b.removeAttribute('aria-busy'); });
  }
  function pintarLike(b, si, n) {
    b.setAttribute('aria-pressed', si ? 'true' : 'false');
    var z = b.querySelector('.tv-like__n');
    if (z) z.textContent = Math.max(0, n);
    var t = b.querySelector('.tv-like__txt');
    if (t) t.textContent = si ? ' · Te gusta' : ' · Me gusta';
  }

  function compartir(v, m) {
    var u = enlace(v, m);
    if (navigator.share) { navigator.share({ title: v.titulo, text: v.titulo, url: u })['catch'](function () {}); return; }
    var p = (navigator.clipboard && navigator.clipboard.writeText) ? navigator.clipboard.writeText(u) : Promise.reject();
    p.then(function () { K.aviso('Enlace copiado ✓', 'ok', 2000); }, function () { K.aviso(u, 'info', 6000); });
  }

  /* ---------- comentarios ---------- */

  function comentarios(zona, v, enHoja, alContar) {
    zona.innerHTML = (enHoja ? '' : '<h2 class="tv-sub tv-coms__t">Comentarios</h2>');
    var lista = K.nodo('<div class="tv-coms__lista"></div>');
    var form = formComentario(v, '', 'Escribe tu duda o comentario…', function () { comentarios(zona, v, enHoja, alContar); });
    if (enHoja) { zona.appendChild(lista); zona.parentNode.appendChild(form); form.classList.add('tv-cform--pie'); }
    else { zona.appendChild(form); zona.appendChild(lista); }
    K.piezas.esqueletos.mientras(lista, K.pedir('tutorialComentarios', { id: v.id }), { forma: 'filas', cuantos: 2 })
      .then(function (r) {
        var x = buscar(v.id);
        if (x) x.comentarios = r.total || 0;
        if (alContar) alContar(r.total || 0);
        var t = zona.querySelector('.tv-coms__t');
        if (t) t.textContent = r.total ? r.total + (r.total === 1 ? ' comentario' : ' comentarios') : 'Comentarios';
        if (!r.comentarios.length) { lista.appendChild(K.nodo('<p class="tv-nada">Sé el primero en preguntar.</p>')); return; }
        r.comentarios.forEach(function (y) { lista.appendChild(comentario(y, v, function () { comentarios(zona, v, enHoja, alContar); }, false)); });
      })
      ['catch'](function (e) {
        if (e && e.codigo === 'CANCELADA') return;
        lista.appendChild(errorCaja(e, function () { comentarios(zona, v, enHoja, alContar); }));
      });
  }

  function formComentario(v, respuestaA, marcador, alTerminar, textoInicial, comentarioId) {
    var f = K.nodo(
      '<form class="tv-cform" novalidate>' +
      '  <label class="tv-cform__l"><span class="kit-solo-lector">' + K.esc(marcador) + '</span>' +
      '  <textarea rows="1" maxlength="1000" placeholder="' + K.esc(marcador) + '"></textarea></label>' +
      '  <div class="tv-cform__pie"><small class="tv-cform__n">0 / 1000</small>' +
      '    <button type="button" class="kit-btn kit-btn--plano tv-cform__no">Cancelar</button>' +
      '    <button type="submit" class="kit-btn kit-btn--marca" disabled>' + K.icono('enviar', 15) + ' ' + (comentarioId ? 'Guardar' : (respuestaA ? 'Responder' : 'Comentar')) + '</button>' +
      '  </div>' +
      '</form>'
    );
    var ta = f.querySelector('textarea'), enviar = f.querySelector('[type=submit]'), n = f.querySelector('.tv-cform__n'), no = f.querySelector('.tv-cform__no');
    var pie = f.querySelector('.tv-cform__pie');
    if (!respuestaA && !comentarioId) { no.hidden = true; pie.hidden = true; }
    ta.value = textoInicial || '';
    function contar() {
      n.textContent = ta.value.length + ' / 1000';
      enviar.disabled = !ta.value.trim() || ta.value.trim() === String(textoInicial || '').trim();
      ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
      if (!respuestaA && !comentarioId) pie.hidden = !ta.value && document.activeElement !== ta;
    }
    ta.addEventListener('input', contar);
    ta.addEventListener('focus', function () { pie.hidden = false; });
    ta.addEventListener('blur', function () { setTimeout(contar, 150); });
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

  function textoRico(t) {
    return K.esc(t || '')
      .replace(/https?:\/\/[^\s<]+/g, function (u) {
        var cola = (u.match(/(?:[).,;:!?]|&quot;|&#39;)+$/) || [''])[0];
        var limpio = u.slice(0, u.length - cola.length);
        return '<a href="' + limpio + '" target="_blank" rel="noopener noreferrer">' + limpio + '</a>' + cola;
      })
      .replace(/\n/g, '<br>');
  }

  function cara(x, tam) {
    if (x.dev) return K.nodo('<span class="tv-autor__ini tv-autor__ini--' + tam + '" aria-hidden="true">OP</span>');
    if (K.piezas.personas) return K.piezas.personas.avatar(x.nombre, { tam: tam, foto: x.foto || K.piezas.personas.foto(x.nombre) });
    return K.nodo('<span class="tv-autor__ini tv-autor__ini--claro" aria-hidden="true">' + K.esc(String(x.nombre || '·').charAt(0)) + '</span>');
  }

  function comentario(x, v, recargar, esRespuesta) {
    var el = K.nodo(
      '<div class="tv-cmt' + (esRespuesta ? ' tv-cmt--resp' : '') + '">' +
      '  <div class="tv-cmt__cuerpo">' +
      '    <p class="tv-cmt__cab"><b>' + K.esc(x.dev ? 'Oscar Polanía' : (K.piezas.personas ? K.piezas.personas.nombrePropio(x.nombre) : x.nombre)) + '</b>' +
      (x.dev ? '<span class="tv-dev">DEV</span>' : '') + (x.mio ? '<span class="tv-tu">tú</span>' : '') +
      '      <small>' + K.esc([x.dev ? '' : x.secretaria, x.fecha].filter(Boolean).join(' · ')) + (x.editado ? ' · editado' : '') + '</small></p>' +
      '    <p class="tv-cmt__txt">' + textoRico(x.texto) + '</p>' +
      '    <div class="tv-cmt__acc"></div>' +
      '  </div>' +
      '</div>'
    );
    el.insertBefore(cara(x, esRespuesta ? 30 : 38), el.firstChild);
    var acc = el.querySelector('.tv-cmt__acc'), cuerpo = el.querySelector('.tv-cmt__cuerpo');
    function accion(icono, texto, fn, peligro) {
      var b = K.nodo('<button type="button" class="tv-cmt__b' + (peligro ? ' tv-cmt__b--malo' : '') + '">' + K.icono(icono, 15) + ' ' + texto + '</button>');
      b.addEventListener('click', fn);
      acc.appendChild(b);
    }
    if (!esRespuesta) {
      accion('responder', 'Responder', function () {
        if (cuerpo.querySelector('.tv-cform')) return;
        var f = formComentario(v, x.id, 'Responde a ' + (x.dev ? 'Oscar' : String(x.nombre || '').split(' ')[0]) + '…', function (cancelado) {
          f.remove(); if (!cancelado) recargar();
        });
        cuerpo.appendChild(f);
        f.querySelector('textarea').focus();
      });
    }
    if (x.mio) {
      accion('lapiz', 'Editar', function () {
        if (cuerpo.querySelector('.tv-cform')) return;
        var txt = el.querySelector('.tv-cmt__txt');
        txt.hidden = true; acc.hidden = true;
        var f = formComentario(v, '', 'Edita tu comentario', function (cancelado) {
          f.remove(); txt.hidden = false; acc.hidden = false;
          if (!cancelado) recargar();
        }, x.texto, x.id);
        cuerpo.insertBefore(f, acc);
        f.querySelector('textarea').focus();
      });
      accion('basura', 'Borrar', function () {
        K.piezas.confirmar.abrir({
          titulo: '¿Borrar tu comentario?', texto: esRespuesta ? 'Se quita para todos. No se puede deshacer.' : 'Se quita para todos, con sus respuestas. No se puede deshacer.',
          si: 'Borrar', no: 'Cancelar', peligro: true
        }).then(function (ok) {
          if (!ok) return;
          K.ocupado = true;
          K.pedir('tutorialComentarioBorrar', { comentarioId: x.id })
            .then(function () { K.ocupado = false; K.aviso('Comentario borrado', 'ok', 2000); recargar(); })
            ['catch'](function (e) { K.ocupado = false; K.aviso((e && e.message) || 'No se pudo borrar.', 'malo'); });
        });
      }, true);
    }
    var resp = x.respuestas || [];
    if (resp.length) {
      var caja = K.nodo('<div class="tv-cmt__resps"></div>');
      var tog = K.nodo('<button type="button" class="tv-cmt__ver" aria-expanded="true"></button>');
      function rotulo() {
        var ab = tog.getAttribute('aria-expanded') === 'true';
        tog.innerHTML = K.icono(ab ? 'arriba' : 'abajo', 15) + ' <span>' + (ab ? 'Ocultar ' : 'Ver ') + resp.length + (resp.length === 1 ? ' respuesta' : ' respuestas') + '</span>';
      }
      tog.addEventListener('click', function () { var ab = tog.getAttribute('aria-expanded') === 'true'; tog.setAttribute('aria-expanded', ab ? 'false' : 'true'); caja.hidden = ab; rotulo(); });
      resp.forEach(function (r) { caja.appendChild(comentario(r, v, recargar, true)); });
      cuerpo.appendChild(tog);
      cuerpo.appendChild(caja);
      rotulo();
    }
    return el;
  }

  /* al cambiar de vista, la pantalla del Short no se queda encima */
  window.addEventListener('hashchange', function () {
    if (!/^#\/tutoriales\/./.test(location.hash)) { cerrarHoja(); cerrarPantalla(); }
  });

  /* en la entrada, la configuración pública se pide una vez (se pega a la del pie) */
  setTimeout(precargarSinSesion, 1200);

  window.TUTORIALES = {
    vista: vista,
    /* para el asistente: los tutoriales activos (con o sin sesión) */
    indice: function () { return fuente().indice; },
    activo: function () { return fuente().activo; },
    verSuelto: verSuelto,
    precargar: precargarSinSesion,
    _olvidar: function () { TUT = null; CARGA = null; FILTRO = ''; cerrarPantalla(); }
  };
}());
