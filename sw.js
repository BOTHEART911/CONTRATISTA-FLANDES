/* ============================================================
   CONTRATISTA-FLANDES · SERVICE WORKER DEL CACHÉ
   Entrega 4.3

   Solo el armazón de la app: HTML, CSS, JS e iconos. NADA de datos.

   Por qué NO se cachea la llamada al CORE
     En agosto, el service worker del repo viejo de contratista se
     metió en medio de la llamada a Apps Script y devolvió el HTML de
     una redirección de Google en vez del JSON: ese fue el famoso
     "Unexpected token '<'" al iniciar sesión. Aquí las peticiones que
     no sean del propio sitio se dejan pasar sin tocarlas.

   El otro service worker, firebase-messaging-sw.js, vive en su
   propio scope y no tiene nada que ver con este.
   ============================================================ */

/* El número de versión lo pone la app en un solo sitio, version.js, y de
   ahí sale también el nombre del caché: cada publicación estrena caché y
   la de antes se borra sola en 'activate'. Antes el número estaba escrito
   a mano aquí y había que acordarse de subirlo en dos archivos.

   Los navegadores revisan los scripts importados cuando comprueban si hay
   service worker nuevo, así que cambiar version.js basta para que este
   archivo se dé por cambiado. */
importScripts('./version.js');

var VERSION = 'contratista-v' + APP_VERSION;
/* 10.1: las siete apps comparten origen (botheart911.github.io) y por tanto el
   almacén de cachés. Antes 'activate' borraba TODA caché que no fuera la suya:
   publicar una app le vaciaba la caché a las otras seis (y a las viejas de
   producción). Ahora solo se borran las de esta app. */
var PREFIJO_CACHE = 'contratista-v20';   /* '-v20': la vieja de producción usa 'contratista-v3' y no es de esta */

/* La ruta exacta del version.js de la raíz, para distinguirlo de
   kit/version.js sin jugar con expresiones regulares. */
var RUTA_VERSION = new URL('./version.js', self.location.href).pathname;

var ARMAZON = [
  './',
  './index.html',
  './js/app.js',
  './js/borrador.js',
  './styles.css',
  './js/marca.js',
  './manifest.json',
  './img/icono-32.png',
  './img/icono-180.png',
  './img/icono-192.png',
  './img/icono-512.png',
  './img/icono-mask-512.png',
  './kit/kit.js',
  './kit/base.css',
  './kit/banner.js', './kit/banner.css',
  './kit/sesion.js', './kit/sesion.css',
  './kit/esqueletos.js', './kit/esqueletos.css',
  './kit/guardado.js', './kit/guardado.css',
  './kit/fechas.js', './kit/fechas.css',
  './kit/conexion.js', './kit/conexion.css',
  './kit/instalar.js', './kit/instalar.css',
  './kit/soporte.js', './kit/soporte.css',
  './kit/antidoble.js', './kit/antidoble.css',
  './kit/creditos.js', './kit/creditos.css',
  './kit/guia.js',
  './kit/avisos.js',
  './kit/bienvenida.js', './kit/bienvenida.css',
  './kit/adjuntos.js', './kit/adjuntos.css',
  './kit/imagenes.js',
  './kit/carrusel.js', './kit/carrusel.css',
  './kit/insights.js', './kit/insights.css',
  './kit/buzon.js', './kit/buzon.css',
  './kit/version.js',
  /* 4.6.1 · el cielo de las franjas y el visor de documentos */
  './kit/cielo.js', './kit/cielo.css',
  './kit/visor.js', './kit/visor.css',
  /*
   * 4.6.1 · ESTOS DOS FALTABAN DESDE SIEMPRE, y era un fallo de verdad.
   *
   * index.html los carga, pero el armazón no los guardaba. Con red no se
   * nota, porque lo que no está en la caché se pide a internet. Sin red —o
   * con la red mala, que es lo normal en un municipio— la app arrancaba de
   * la caché, se quedaba sin iconos.js, y K.icono() dejaba de existir: eso
   * revienta CUALQUIER vista que pinte un icono, que son todas.
   */
  './kit/iconos.js',
  './kit/confirmar.js',
  './js/cuenta.js',
  /* 4.7 · el estado de cuenta y el exportador de los egresos */
  './js/seguimiento.js',
  './kit/exportar.js', './kit/exportar.css',
  /* 4.8 · trámites (comunicaciones y tesorería) e institucional */
  './kit/pastillas.js',
  './js/tramites.js',
  './js/institucional.js',
  /* 4.9 · caras, foto de perfil y la ayuda de cada vista */
  './kit/personas.js', './kit/personas.css',
  './kit/perfil.js',
  './js/ayuda.js'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(VERSION).then(function (c) {
      /* addAll aborta entero si un solo archivo falla; se guarda uno a uno
         para que un recurso perdido no deje la app sin caché. */
      return Promise.all(ARMAZON.map(function (u) {
        /* 25/09 · 'reload': se baja de GitHub, no de la caché del navegador.
           Pages deja cada archivo 10 minutos en esa caché y el armazón NUEVO
           se llenaba con copias VIEJAS (comprobado). */
        return c.add(new Request(u, { cache: 'reload' }))['catch'](function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) {
      return Promise.all(ks.map(function (k) {
        return (k === VERSION || String(k).indexOf(PREFIJO_CACHE) !== 0) ? null : caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  var url;
  try { url = new URL(req.url); } catch (err) { return; }

  /* Todo lo de fuera —el CORE, los medios, el SDK de Firebase— va directo
     a la red. El service worker no se mete en medio. */
  if (url.origin !== self.location.origin) return;

  /* El version.js de la RAÍZ nunca pasa por el caché: es el archivo con el
     que la app pregunta "¿hay algo nuevo publicado?", y servírselo desde el
     caché sería contestarle siempre que no. Ojo, es solo ese: kit/version.js
     es la pieza del kit y se cachea como cualquier otro script. */
  if (url.pathname === RUTA_VERSION) {
    /* 25/09 · La página lo carga con <script src="version.js"> para saber QUÉ
       versión está corriendo. Ese número tiene que ser el del armazón que
       este service worker sirve, no el de GitHub: si no, tras publicar, la
       primera apertura mostraba el número nuevo con el código viejo del
       caché y la app creía estar al día (hacía falta abrirla dos veces).
       La pregunta "¿hay algo nuevo?" de kit/version.js lleva ?t= y sí va a
       la red. */
    if (url.search.indexOf('t=') < 0) {
      e.respondWith(new Response('var APP_VERSION = "' + APP_VERSION + '";',
        { headers: { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-store' } }));
      return;
    }
    e.respondWith(fetch(req, { cache: 'no-store' })['catch'](function () {
      return caches.match(req).then(function (r) { return r || Response.error(); });
    }));
    return;
  }

  /* El HTML primero de la red: si no, un cambio de versión se queda
     escondido detrás del caché y la gente sigue viendo la app vieja. */
  if (req.mode === 'navigate') {
    e.respondWith(
      /* 25/09 · 'no-cache': se le pregunta a GitHub si cambió (responde 304
         si no) en vez de fiarse de la copia de 10 minutos del navegador. */
      fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }).then(function (r) {
        var copia = r.clone();
        caches.open(VERSION).then(function (c) { c.put('./index.html', copia); });
        return r;
      })['catch'](function () {
        return caches.match('./index.html').then(function (r) { return r || Response.error(); });
      })
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit;
      /* 25/09 · Lo que no está en el armazón también se confirma con GitHub:
         tras publicar, la caché del navegador todavía guarda lo viejo. */
      return fetch(req, { cache: 'no-cache' }).then(function (r) {
        if (r && r.status === 200 && r.type === 'basic') {
          var copia = r.clone();
          caches.open(VERSION).then(function (c) { c.put(req, copia); });
        }
        return r;
      });
    })
  );
});
