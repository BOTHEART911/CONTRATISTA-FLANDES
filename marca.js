/* ============================================================
   CONTRATISTA-FLANDES · MARCA
   Ecosistema Flandes · Fase 4, entrega 4.1

   El ÚNICO archivo que se toca al replicar la app o al mover el
   despliegue del CORE. El resto del front no conoce ninguna URL.

   Ojo con FIREBASE: aquí va una copia de arranque para que el
   service worker de los avisos pueda encenderse antes de que haya
   sesión (un service worker no puede pedirle nada al CORE con el
   token del usuario). Con la sesión abierta, la app pide
   CONTRATISTA.configPush y manda lo que diga la hoja CONFIG, que
   es la fuente de verdad.

   NO lleva measurementId ni se carga firebase-analytics: al crear
   el proyecto quedó una propiedad de Google Analytics vinculada y
   se decidió el 21/09 dejarla inerte. Si se añade el id, empieza
   a recibir datos.
   ============================================================ */
(function (raiz) {
  'use strict';

  raiz.MARCA = {
    APP: 'CONTRATISTA',
    TITULO: 'Contratista',
    MUNICIPIO: 'Alcaldía de Flandes',

    /* El despliegue del CORE. Una sola línea que cambiar si se publica otro. */
    API_URL: 'https://script.google.com/macros/s/AKfycbzzjZSH_cW4k_FQGnl4gjoj67PUrIUlaO4vq4OQbiXrFa3VnOzEM12EBYPLMRGCBj5gBw/exec',

    MEDIOS_BASE: 'https://botheart911.github.io/ALCALDIA-MEDIOS/',

    /* Las 7 apps viven en el mismo origen de GitHub Pages y comparten
       localStorage: sin este prefijo, la sesión de una pisa la de otra. */
    STORAGE_NS: 'contratista.',

    APP_ICON: 'img/contratista.webp',
    APP_BANNER: 'img/contratista_2.webp',

    FIREBASE: {
      apiKey: 'AIzaSyDdGOATvG-tZ5ii5n_U6ExtKzh1CvNTVUE',
      authDomain: 'flandes-avisos.firebaseapp.com',
      projectId: 'flandes-avisos',
      storageBucket: 'flandes-avisos.firebasestorage.app',
      messagingSenderId: '338805824673',
      appId: '1:338805824673:web:bb6702d4e72859d07ee4e0'
    },

    /* Pública por diseño: identifica al remitente, no autoriza a enviar. */
    FIREBASE_VAPID: 'BPTmdr1z6ESU0ESNE5N8XniYogAsRWMxa5L6Ws0xgVbwAzEVTEsuNVPYXoWfJ9mDmH7XUvbGlW00HPxHcU3owHg'
  };

  /* El service worker de los avisos importa este mismo archivo, y allí
     no existe window: por eso se cuelga del objeto global que haya. */
  raiz.STORAGE_NS = raiz.MARCA.STORAGE_NS;
}(typeof self !== 'undefined' ? self : this));
