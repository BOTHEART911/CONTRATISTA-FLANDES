/* ============================================================
   KIT-FLANDES · PIEZA 22 · EL CIELO
   Fase 4, entrega 4.6.1 · una sola copia en los 7 fronts.

   Qué hace
     Le mete a un elemento el fondo vivo de la portada de bienvenida: la
     aurora que respira por detrás y las burbujas que suben. Nada más.

   Por qué es una pieza y no CSS suelto
     Porque hacen falta nodos (las burbujas son elementos, no se pueden
     pintar con un solo pseudo-elemento sin renunciar a que cada una lleve
     su tamaño y su ritmo). Ponerlos a mano en cada vista obligaría a
     acordarse del orden y del z-index en siete sitios distintos.

   Cómo se usa

     KIT.piezas.cielo.poner('.saludo');
     KIT.piezas.cielo.poner(nodo, { burbujas: 3, luz: 'suave', franja: true });
     KIT.piezas.cielo.quitar(nodo);

   Opciones
     burbujas  cuántas suben (0 a 4). Por defecto 3.
     luz       'suave' baja la aurora, para franjas pequeñas.
     franja    true en barras bajitas: burbujas más chicas.

   Es idempotente: llamarla dos veces sobre lo mismo no duplica nada, así
   que se puede invocar cada vez que se repinta una vista sin llevar la
   cuenta.

   Pareja: kit/cielo.css
   ============================================================ */
(function () {
  'use strict';

  var K = window.KIT;
  if (!K) { try { console.warn('[kit/cielo] falta kit.js'); } catch (e) {} return; }

  function poner(destino, opciones) {
    var el = (typeof destino === 'string') ? K.$(destino) : destino;
    if (!el) return null;
    opciones = opciones || {};

    /* ya lo tiene: se deja como está y no se pinta otra vez */
    if (el.querySelector(':scope > .kit-cielo__capa')) return el;

    var cuantas = opciones.burbujas === undefined ? 3 : Number(opciones.burbujas);
    if (!(cuantas >= 0)) cuantas = 3;
    if (cuantas > 4) cuantas = 4;

    el.classList.add('kit-cielo');
    if (opciones.luz === 'suave') el.classList.add('kit-cielo--suave');
    if (opciones.franja) el.classList.add('kit-cielo--franja');

    var burbujas = '';
    for (var i = 0; i < cuantas; i++) burbujas += '<i></i>';

    var capa = K.nodo(
      '<div class="kit-cielo__capa" aria-hidden="true">' +
      '  <div class="kit-cielo__aurora"></div>' +
      (cuantas ? '  <div class="kit-cielo__burbujas">' + burbujas + '</div>' : '') +
      '</div>'
    );

    /* SIEMPRE el primero: lo que ya estaba pintado se queda encima sin que
       haya que tocarle el z-index a nada. */
    el.insertBefore(capa, el.firstChild);
    return el;
  }

  function quitar(destino) {
    var el = (typeof destino === 'string') ? K.$(destino) : destino;
    if (!el) return;
    var capa = el.querySelector(':scope > .kit-cielo__capa');
    if (capa) capa.remove();
    el.classList.remove('kit-cielo', 'kit-cielo--suave', 'kit-cielo--franja');
  }

  K.piezas.cielo = { poner: poner, quitar: quitar };
}());
