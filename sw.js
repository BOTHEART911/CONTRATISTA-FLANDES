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

/* La ruta exacta del version.js de la raíz, para distinguirlo de
   kit/version.js sin jugar con expresiones regulares. */
var RUTA_VERSION = new URL('./version.js', self.location.href).pathname;

var ARMAZON = [
  './',
  './index.html',
  './app.js',
  './borrador.js',
  './styles.css',
  './marca.js',
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
  './cuenta.js',
  /* 4.7 · el estado de cuenta y el exportador de los egresos */
  './seguimiento.js',
  './kit/exportar.js', './kit/exportar.css',
  /* 4.8 · trámites (prensa y tesorería) e institucional */
  './kit/pastillas.js',
  './tramites.js',
  './institucional.js',
  /* 4.9 · caras, foto de perfil y la ayuda de cada vista */
  './kit/personas.js', './kit/personas.css',
  './kit/perfil.js',
  './ayuda.js'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(VERSION).then(function (c) {
      /* addAll aborta entero si un solo archivo falla; se guarda uno a uno
         para que un recurso perdido no deje la app sin caché. */
      return Promise.all(ARMAZON.map(function (u) {
        return c.add(u)['catch'](function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) {
      return Promise.all(ks.map(function (k) {
        return k === VERSION ? null : caches.delete(k);
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
    e.respondWith(fetch(req, { cache: 'no-store' })['catch'](function () {
      return caches.match(req).then(function (r) { return r || Response.error(); });
    }));
    return;
  }

  /* El HTML primero de la red: si no, un cambio de versión se queda
     escondido detrás del caché y la gente sigue viendo la app vieja. */
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(function (r) {
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
      return fetch(req).then(function (r) {
        if (r && r.status === 200 && r.type === 'basic') {
          var copia = r.clone();
          caches.open(VERSION).then(function (c) { c.put(req, copia); });
        }
        return r;
      });
    })
  );
});
