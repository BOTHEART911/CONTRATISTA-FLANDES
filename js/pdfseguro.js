/* ============================================================
   CONTRATISTA-FLANDES · PDF PROTEGIDOS (26/10/2026)

   El problema
     La Certificación bancaria de Davivienda llega protegida (sin clave
     de apertura, pero con permisos). Las planillas de los operadores
     suelen venir con la cédula como clave. Un PDF así no se puede unir
     en "Unificar y descargar" ni revisar bien en Contratación.

   Qué hace
     PDFSEGURO.revisar(file, {campo, maxMB}) → Promise<File|null>
       · No es PDF, o no está protegido → devuelve el mismo archivo.
       · Protegido → capa con dos salidas:
           "Quitar la protección aquí": lo abre en el teléfono (pide la
             clave si hace falta), dibuja cada página y arma un PDF
             nuevo, limpio, que es el que se sube.
           "Lo arreglo yo": pasos de Imprimir → Guardar como PDF.
         Devuelve el PDF limpio, o null si la persona no lo arregla aquí.

   Cómo detecta
     Todo PDF protegido lleva /Encrypt en su trailer o en el diccionario
     del xref stream, que nunca va comprimido. Se busca en los bytes que
     igual se leen para subir: sin librerías ni viajes (< 50 ms con 2 MB).
     El CORE hace la misma búsqueda al recibir (respaldo).
   ============================================================ */
(function () {
  'use strict';

  var K = window.KIT;
  if (!K) return;

  var PDFLIB_URL = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';
  var RE = /\/Encrypt\s*(?:\d+\s+\d+\s+R|<<)/;
  /* Calidades de mayor a menor: si el PDF limpio no cabe en el tope del
     campo, se rehace con la siguiente. */
  var NIVELES = [
    { px: 1700, q: 0.86 },
    { px: 1400, q: 0.78 },
    { px: 1150, q: 0.70 },
    { px: 950,  q: 0.62 }
  ];
  var LIB = null;

  function medir(que, t0, extra) {
    var ms = Date.now() - t0;
    try { (window.__MEDIDAS = window.__MEDIDAS || []).push({ que: que, ms: ms, datos: extra || null }); } catch (e) {}
    try { if (K.medir) K.medir(que, ms); } catch (e2) {}
  }

  /* ══════════════ detectar ══════════════ */

  function esPdf(file) {
    if (!file) return false;
    return /\.pdf$/i.test(file.name || '') || /pdf/i.test(file.type || '');
  }

  function latin1(u8) {
    try { return new TextDecoder('latin1').decode(u8); } catch (e) {}
    var s = '', paso = 32768;
    for (var i = 0; i < u8.length; i += paso) s += String.fromCharCode.apply(null, u8.subarray(i, i + paso));
    return s;
  }

  function protegidoBytes(u8) {
    if (!u8 || u8.length < 8) return false;
    var s = latin1(u8), i = s.indexOf('%PDF-');
    return i >= 0 && i < 1024 && RE.test(s);
  }

  function leer(file) {
    if (file.arrayBuffer) return file.arrayBuffer().then(function (b) { return new Uint8Array(b); });
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { res(new Uint8Array(r.result)); };
      r.onerror = function () { rej(new Error('No se pudo leer el archivo.')); };
      r.readAsArrayBuffer(file);
    });
  }

  /* ══════════════ quitar la protección ══════════════ */

  function cargarPdfLib() {
    if (window.PDFLib) return Promise.resolve(window.PDFLib);
    if (LIB) return LIB;
    LIB = new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = PDFLIB_URL; s.async = true; s.crossOrigin = 'anonymous';
      s.onload = function () { window.PDFLib ? res(window.PDFLib) : rej(new Error('No cargó la librería de PDF.')); };
      s.onerror = function () { LIB = null; rej(new Error('No se pudo cargar la librería de PDF. Revisa tu conexión.')); };
      document.head.appendChild(s);
    });
    return LIB;
  }

  function cargarPdfjs() {
    var v = K.piezas && K.piezas.visor;
    if (!v || !v.precalentar) return Promise.reject(new Error('No se pudo abrir el lector de PDF.'));
    return v.precalentar().then(function (lib) {
      if (!lib) throw new Error('No se pudo abrir el lector de PDF. Revisa tu conexión.');
      return lib;
    });
  }

  /** Abre el PDF. Si pide clave y no hay, rechaza con {clave:1}; si la clave no sirve, {clave:2}. */
  function abrir(lib, bytes, clave) {
    return lib.getDocument({ data: bytes.slice(0), password: clave || '' }).promise['catch'](function (e) {
      if (e && e.name === 'PasswordException') {
        var x = new Error(e.code === 2 ? 'Esa clave no abre el PDF.' : 'Este PDF pide clave para abrirlo.');
        x.clave = e.code === 2 ? 2 : 1;
        throw x;
      }
      throw new Error('El PDF está dañado y no se puede abrir.');
    });
  }

  function pagina(pdf, i, nivel) {
    return pdf.getPage(i).then(function (pg) {
      var v1 = pg.getViewport({ scale: 1 });
      var esc = Math.min(2.4, nivel.px / Math.max(v1.width, v1.height));
      var vp = pg.getViewport({ scale: esc });
      var c = document.createElement('canvas');
      c.width = Math.round(vp.width); c.height = Math.round(vp.height);
      var ctx = c.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
      return pg.render({ canvasContext: ctx, viewport: vp }).promise.then(function () {
        return new Promise(function (res, rej) {
          c.toBlob(function (b) {
            c.width = c.height = 0;   /* suelta la memoria del lienzo en el teléfono */
            b ? b.arrayBuffer().then(res, rej) : rej(new Error('No se pudo dibujar la página.'));
          }, 'image/jpeg', nivel.q);
        });
      }).then(function (ab) {
        try { pg.cleanup(); } catch (e) {}
        return { bytes: new Uint8Array(ab), w: v1.width, h: v1.height };
      });
    });
  }

  function armar(L, pdf, nivel, alAvanzar) {
    return L.PDFDocument.create().then(function (out) {
      var n = pdf.numPages;
      function una(i) {
        if (i > n) return out.save({ useObjectStreams: true });
        if (alAvanzar) alAvanzar(i, n);
        return pagina(pdf, i, nivel).then(function (p) {
          return out.embedJpg(p.bytes).then(function (img) {
            out.addPage([p.w, p.h]).drawImage(img, { x: 0, y: 0, width: p.w, height: p.h });
            return una(i + 1);
          });
        });
      }
      return una(1);
    });
  }

  /** bytes protegidos → File limpio que cabe en maxBytes. */
  function limpiar(bytes, clave, nombre, maxBytes, alAvanzar) {
    var t0 = Date.now();
    return Promise.all([cargarPdfjs(), cargarPdfLib()]).then(function (a) {
      var lib = a[0], L = a[1];
      return abrir(lib, bytes, clave).then(function (pdf) {
        var k = 0;
        function intento() {
          var nivel = NIVELES[k];
          return armar(L, pdf, nivel, alAvanzar).then(function (out) {
            if (out.length > maxBytes && k < NIVELES.length - 1) { k++; return intento(); }
            try { pdf.cleanup(); } catch (e) {}
            if (out.length > maxBytes) {
              throw new Error('El PDF limpio pesa ' + (out.length / 1048576).toFixed(1).replace('.', ',') +
                ' MB y el tope de este campo es ' + String(maxBytes / 1048576 | 0) + ' MB. Arréglalo tú con Imprimir → Guardar como PDF.');
            }
            if (protegidoBytes(out)) throw new Error('No se pudo quitar la protección.');
            medir('pdfSinProteccion', t0, { paginas: pdf.numPages, kbAntes: Math.round(bytes.length / 1024), kbDespues: Math.round(out.length / 1024), nivel: k });
            var base = String(nombre || 'documento').replace(/\.pdf$/i, '');
            return new File([out], base + '.pdf', { type: 'application/pdf', lastModified: Date.now() });
          });
        }
        return intento();
      });
    });
  }

  /* ══════════════ la capa ══════════════ */

  function capa(file, bytes, o) {
    return new Promise(function (resolver) {
      var hecho = false, ocupado = false;
      var maxBytes = (o.maxMB || 2) * 1048576;
      var h = K.nodo(
        '<div class="kit-capa pdfs" role="dialog" aria-modal="true" aria-labelledby="pdfs-t">' +
        '  <div class="kit-capa__velo"></div>' +
        '  <section class="kit-capa__hoja pdfs__hoja">' +
        '    <header class="kit-capa__h" id="pdfs-t">' + K.icono('candado', 18) + ' Este PDF está protegido' +
        '      <button type="button" class="kit-capa__x" aria-label="Cerrar">' + K.icono('cerrar', 18) + '</button>' +
        '    </header>' +
        '    <div class="kit-capa__cuerpo">' +
        '      <p class="pdfs__texto"><b>' + K.esc(o.campo || 'El archivo') + '</b> viene con protección (clave o permisos). ' +
        '      Así Contratación no lo puede revisar ni unir al plan de pagos, y no se puede guardar.</p>' +
        '      <form class="pdfs__clave" hidden novalidate>' +
        '        <label class="edi__lab" for="pdfs-in">Clave para abrirlo</label>' +
        '        <p class="pdfs__pista">En las planillas suele ser tu número de cédula. No se guarda en ningún lado.</p>' +
        '        <div class="pdfs__fila"><input id="pdfs-in" class="edi__area" type="password" autocomplete="off" inputmode="text">' +
        '        <button type="submit" class="kit-btn kit-btn--marca">Abrir</button></div>' +
        '        <p class="pdfs__err" role="alert" hidden></p>' +
        '      </form>' +
        '      <p class="pdfs__avance" aria-live="polite" hidden></p>' +
        '      <details class="pdfs__pasos">' +
        '        <summary>Cómo quitarla tú mismo</summary>' +
        '        <ol>' +
        '          <li><b>En el celular:</b> abre el PDF, toca <b>Compartir</b> o <b>⋮</b> → <b>Imprimir</b> → <b>Guardar como PDF</b>, y sube esa copia.</li>' +
        '          <li><b>En el computador:</b> ábrelo en Chrome, pulsa <b>Ctrl+P</b> → Destino <b>Guardar como PDF</b> → Guardar.</li>' +
        '          <li>Si al abrirlo te pide clave, escríbela primero (en las planillas suele ser tu cédula).</li>' +
        '          <li>Si nada de eso funciona, pídelo de nuevo sin contraseña al banco o al operador de la planilla.</li>' +
        '        </ol>' +
        '      </details>' +
        '    </div>' +
        '    <div class="kit-capa__pie pdfs__pie">' +
        '      <button type="button" class="kit-btn kit-btn--plano pdfs__yo">Lo arreglo yo</button>' +
        '      <button type="button" class="kit-btn kit-btn--marca pdfs__si">' + K.icono('llave', 17) + ' Quitar la protección aquí</button>' +
        '    </div>' +
        '  </section>' +
        '</div>'
      );
      document.body.appendChild(h);
      var bSi = h.querySelector('.pdfs__si'), bYo = h.querySelector('.pdfs__yo');
      var form = h.querySelector('.pdfs__clave'), inp = h.querySelector('#pdfs-in');
      var err = h.querySelector('.pdfs__err'), av = h.querySelector('.pdfs__avance');

      function cerrar(resultado) {
        if (hecho) return;
        hecho = true;
        document.removeEventListener('keydown', conEscape);
        h.classList.remove('kit-capa--on');
        setTimeout(function () { h.remove(); }, 200);
        resolver(resultado || null);
      }
      function conEscape(ev) { if (ev.key === 'Escape' && !ocupado) cerrar(null); }
      document.addEventListener('keydown', conEscape);
      h.querySelector('.kit-capa__x').addEventListener('click', function () { if (!ocupado) cerrar(null); });
      h.querySelector('.kit-capa__velo').addEventListener('click', function () { if (!ocupado) cerrar(null); });
      bYo.addEventListener('click', function () {
        if (ocupado) return;
        var d = h.querySelector('.pdfs__pasos');
        if (!d.open) { d.open = true; bYo.textContent = 'Entendido'; return; }
        cerrar(null);
      });

      function ocupar(si, txt) {
        ocupado = si;
        bSi.disabled = si; bYo.disabled = si;
        bSi.classList.toggle('kit-btn--ocupado', si);
        av.classList.remove('pdfs__avance--malo');
        av.hidden = !txt; av.textContent = txt || '';
      }

      function intentar(clave) {
        if (ocupado) return;
        err.hidden = true;
        ocupar(true, 'Abriendo el PDF…');
        limpiar(bytes, clave, file.name, maxBytes, function (i, n) {
          av.textContent = 'Preparando la página ' + i + ' de ' + n + '…';
        }).then(function (limpio) {
          ocupar(false, '');
          K.aviso('Listo: quedó un PDF sin protección (' + (limpio.size / 1048576).toFixed(1).replace('.', ',') + ' MB). Se sube ahora.', 'ok', 4500);
          cerrar(limpio);
        }, function (e) {
          ocupar(false, '');
          if (e && e.clave) {
            form.hidden = false;
            bSi.hidden = true;
            if (e.clave === 2) { err.textContent = e.message; err.hidden = false; }
            setTimeout(function () { try { inp.focus(); inp.select(); } catch (x) {} }, 40);
            return;
          }
          /* otro problema (archivo dañado, sin red, no cabe): se dice y se
             abren los pasos para que lo arregle por su cuenta */
          av.hidden = false;
          av.textContent = (e && e.message) || 'No se pudo quitar la protección.';
          av.classList.add('pdfs__avance--malo');
          h.querySelector('.pdfs__pasos').open = true;
        });
      }

      bSi.addEventListener('click', function () { intentar(''); });
      form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var c = inp.value;
        if (!c) { err.textContent = 'Escribe la clave.'; err.hidden = false; inp.focus(); return; }
        intentar(c);
      });

      /* las librerías se bajan mientras la persona lee */
      cargarPdfjs()['catch'](function () {}); cargarPdfLib()['catch'](function () {});
      setTimeout(function () { h.classList.add('kit-capa--on'); try { bSi.focus(); } catch (e) {} }, 10);
    });
  }

  /* ══════════════ la puerta ══════════════ */

  function revisar(file, o) {
    o = o || {};
    if (!esPdf(file)) return Promise.resolve(file);
    var t0 = Date.now();
    return leer(file).then(function (bytes) {
      var prot = protegidoBytes(bytes);
      medir('pdfRevisar', t0, { kb: Math.round(bytes.length / 1024), protegido: prot });
      return prot ? capa(file, bytes, o) : file;
    }, function () { return file; });   /* si no se pudo leer aquí, decide el CORE */
  }

  window.PDFSEGURO = { revisar: revisar, protegidoBytes: protegidoBytes, limpiar: limpiar };
}());
