/* ============================================================
   CONTRATISTA-FLANDES · SERVICE WORKER DEL CACHÉ
   Entrega 4.1

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

var VERSION = 'contratista-v4.1.3';

var ARMAZON = [
  './',
  './index.html',
  './app.js',
  './styles.css',
  './marca.js',
  './manifest.json',
  './img/icono-192.png',
  './img/icono-512.png',
  './img/icono-mask-512.png',
  './kit/kit.js',
  './kit/base.css',
  './kit/banner.js', './kit/banner.css',
  './kit/sesion.js', './kit/sesion.css',
  './kit/esqueletos.js', './kit/esqueletos.css',
  './kit/guardado.js', './kit/guardado.css',
  './kit/fechas.css',
  './kit/conexion.js', './kit/conexion.css',
  './kit/instalar.js', './kit/instalar.css',
  './kit/soporte.js', './kit/soporte.css',
  './kit/antidoble.js', './kit/antidoble.css',
  './kit/creditos.js', './kit/creditos.css',
  './kit/avisos.js',
  './kit/bienvenida.js', './kit/bienvenida.css'
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
