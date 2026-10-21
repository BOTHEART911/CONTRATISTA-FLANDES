/* ============================================================
   CONTRATISTA-FLANDES · SERVICE WORKER DE LOS AVISOS
   Entrega 4.1

   Va APARTE de sw.js, que sigue encargado del caché y de la
   instalación. Dos service workers no pueden compartir scope, así
   que este se registra en un scope propio
   (./firebase-cloud-messaging-push-scope), que es el que usa el
   propio SDK de FCM. Registrarlo en './' se llevaría por delante
   la PWA entera.

   Aquí NO se pueden usar imports de módulos: el SDK entra con
   importScripts, en su versión compat.
   ============================================================ */

try { importScripts('./js/marca.js'); } catch (e) {}

var NS_FB = (self.STORAGE_NS || 'contratista.');
var MARCA_FB = (self.MARCA || {});

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp(MARCA_FB.FIREBASE || {});

var ICONO = 'img/icono-192.png';
var messaging = firebase.messaging();

/* La vista que abre un aviso que no dice a cuál ir. En CONTRATISTA casi
   todos son de su cuenta (radicada, revisada, aprobada, devuelta, orden,
   pago): se abren en ESTADO DE CUENTA. */
var VISTA_AVISO = 'seguimiento';

/* 19/10 · UN SOLO AVISO POR EVENTO (Oss: llegaban dos, el de la app y uno
   genérico con la campana y la letra B).
   La causa: el CORE mandaba el mensaje con `notification` + `data`. Con
   `notification`, el SDK de Firebase pinta SU aviso (sin icono: Chrome pone
   la campana y la inicial del sitio, botheart911 → "B") y ADEMÁS llama a
   este handler, que pintaba el nuestro con otra etiqueta: dos avisos.
   Ahora el CORE manda SOLO `data` (titulo, cuerpo, tipo, referencia…) y
   el único que pinta es este handler. Si llega un mensaje viejo con
   `notification`, el SDK ya lo pintó: aquí no se pinta otro. */
messaging.onBackgroundMessage(function (payload) {
  if (payload && payload.notification) return;
  var d = (payload && payload.data) || {};
  var titulo = d.titulo || 'Alcaldía de Flandes';
  return self.registration.showNotification(titulo, {
    body: d.cuerpo || '',
    icon: ICONO,
    badge: ICONO,
    /* La etiqueta lleva el prefijo de la app: sin él, un aviso de otra app
       del mismo origen reemplazaría este en el mismo teléfono. */
    tag: NS_FB + 'aviso-' + (d.referencia || d.tipo || ''),
    renotify: true,
    data: { vista: d.vista || String(d.ruta || '').replace(/^#\/?/, '') || VISTA_AVISO, tipo: d.tipo || '' }
  });
});

/* Tocar el aviso abre la app en la vista del aviso.
   21/10 · Con la app abierta o en segundo plano, antes solo se traía al
   frente: navigate() únicamente funciona en ventanas que controla ESTE
   service worker, y la app la controla sw.js (otro scope), así que fallaba
   en silencio. Ahora se le pide a la propia app que cambie de vista
   (kit/avisos.js escucha el mensaje). Con la app cerrada se abre ya en la
   vista. */
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var base = new URL('./', self.location.href).href;
  var vista = (e.notification.data && e.notification.data.vista) || '';
  var destino = base + 'index.html' + (vista ? '#/' + vista : '');

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (lista) {
      for (var i = 0; i < lista.length; i++) {
        var c = lista[i];
        if (c.url.indexOf(base) === 0 && 'focus' in c) {
          if (vista) { try { c.postMessage({ kitAviso: 'ir', vista: vista }); } catch (err) {} }
          return c.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(destino);
    })
  );
});
