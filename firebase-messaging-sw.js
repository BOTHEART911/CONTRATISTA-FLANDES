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

/* Aviso con la app CERRADA o en segundo plano.
   El CORE manda notification + data, así que en la mayoría de navegadores
   la pinta el SDK solo; este handler cubre el resto y deja el destino
   listo en data.vista. */
messaging.onBackgroundMessage(function (payload) {
  var n = payload.notification || {};
  var d = payload.data || {};
  self.registration.showNotification(n.title || 'Alcaldía de Flandes', {
    body: n.body || '',
    icon: ICONO,
    badge: ICONO,
    /* La etiqueta lleva el prefijo de la app: sin él, un aviso de otra app
       del mismo origen reemplazaría este en el mismo teléfono. */
    tag: NS_FB + 'aviso-' + (d.referencia || d.tipo || ''),
    renotify: true,
    data: { vista: d.vista || '', tipo: d.tipo || '' }
  });
});

/* Tocar el aviso abre la app donde toca; si ya está abierta, la enfoca. */
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
          if (c.navigate) { c.navigate(destino)['catch'](function () {}); }
          return c.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(destino);
    })
  );
});
