/* ============================================================
   CONTRATISTA-FLANDES · ¿TU CONTRATO TIENE ADICIÓN? (26/11/2026)

   En la penúltima y en la última cuenta, si al contrato le falta una
   adición por registrar (1ª o 2ª), el CORE manda `preguntarAdicion` en el
   mismo viaje del borrador (borradorEstado) y de la cuenta (cuentaEstado).

     · NO  -> una sola petición (adicionRespuesta) que guarda el NO y trae la
              vista ya recalculada; sigue con su cuenta como hoy.
     · SÍ  -> no se pide nada más: se va a SOLICITUD CONTRATACIÓN con la
              ADICIÓN marcada (#/contratacion/adicion). Mientras la solicitud
              esté abierta, la ÚLTIMA cuenta espera (lo decide el CORE).

   Lo usan js/borrador.js y js/cuenta.js.
   ============================================================ */
(function () {
  'use strict';
  var K = window.KIT;

  /**
   * p = preguntarAdicion del CORE; op = { vista: 'borrador'|'cuenta', alResponder(estado) }.
   * Devuelve la tarjeta lista para montar.
   */
  function tarjeta(p, op) {
    op = op || {};
    var s = K.nodo(
      '<section class="kit-tarjeta adi" aria-labelledby="adi-t">' +
      '  <p class="adi__etq">' + K.icono('mas', 16) + ' ' + (p.ultima ? 'Tu última cuenta' : 'Tu penúltima cuenta') +
      '    <span class="adi__n">' + K.esc(p.informe) + ' de ' + K.esc(p.total) + '</span></p>' +
      '  <h3 class="adi__t" id="adi-t"></h3>' +
      '  <p class="adi__p"></p>' +
      '  <div class="adi__botones">' +
      '    <button type="button" class="kit-btn kit-btn--marca adi__si">' + K.icono('enviar', 17) + ' Sí, pedir la adición</button>' +
      '    <button type="button" class="kit-btn adi__no">' + K.icono('adelante', 17) + ' No, seguir con mi cuenta</button>' +
      '  </div>' +
      '</section>'
    );
    s.querySelector('.adi__t').textContent = p.texto || '¿Tu contrato tiene adición?';
    s.querySelector('.adi__p').textContent = p.nota || '';
    var si = s.querySelector('.adi__si'), no = s.querySelector('.adi__no');

    si.addEventListener('click', function () {
      K.vibrar(8);
      location.hash = '#/contratacion/adicion';
    });

    no.addEventListener('click', function () {
      if (no.disabled) return;
      K.vibrar(8);
      /* escudo desde el primer toque: nada de doble envío */
      no.disabled = true; si.disabled = true;
      no.setAttribute('aria-busy', 'true');
      no.lastChild.textContent = ' Guardando…';
      K.pedir('adicionRespuesta', { respuesta: 'NO', vista: op.vista === 'cuenta' ? 'cuenta' : 'borrador' }, { ms: 30000 })
        .then(function (r) {
          if (op.alResponder) op.alResponder((r && r.estado) || null);
        })
        ['catch'](function (e) {
          no.disabled = false; si.disabled = false;
          no.removeAttribute('aria-busy');
          no.lastChild.textContent = ' No, seguir con mi cuenta';
          K.aviso((e && e.message) || 'No se pudo guardar tu respuesta. Inténtalo otra vez.', 'malo', 6000);
        });
    });
    return s;
  }

  window.ADICION = { tarjeta: tarjeta };
}());
