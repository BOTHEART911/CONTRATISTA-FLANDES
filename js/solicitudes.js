/* ============================================================
   CONTRATISTA-FLANDES · SOLICITUDES A CONTRATACIÓN (26/09/2026)

   Tres caminos, todos los hace SOLO el contratista:

   DESDE LA ENTRADA (todavía sin acceso a la app)
     El login que falla ya trae el caso en la MISMA respuesta (CORE,
     codigo SIN_ACCESO): no hay viaje extra para saberlo.
       · CASO 1 · tiene contrato(s) pero todos INACTIVO:
           ¿Ya aceptaste un nuevo contrato en el SECOP II?  SÍ / NO
           NO  → "Debes esperar la aceptación…"
           SÍ  → confirmación con su nombre (para evitar reprocesos)
                 NO → el mismo aviso · SÍ → se envía con sus datos.
       · CASO 2 · no tiene ningún registro:
           ¿Ya aceptaste tu contrato en el SECOP II? y la misma
           confirmación; después, los datos para unificar la solicitud
           (nombre, celular OBLIGATORIO, secretaría…), el resumen y enviar.
     Al terminar: Contratación responde oportunamente por WhatsApp y,
     cuando tenga acceso, lo ve en SOLICITUD CONTRATACIÓN.

   DENTRO DE LA APP · vista SOLICITUD CONTRATACIÓN (caso 3)
     Solo para recordar o pedir ADICIÓN, CESIÓN, MODIFICACIÓN O
     CORRECCIÓN y SUSPENSIÓN. Ahí mismo ve sus solicitudes (también las
     que hizo desde la entrada), las respuestas y las GESTIONES que
     Contratación registre.

   Rutas del CORE: CORE.solicitudAcceso (pública), CONTRATISTA.
   solicitudesContratacion (lectura) y CONTRATISTA.solicitudContratacion.
   ============================================================ */
(function () {
  'use strict';

  var K = window.KIT;
  var app = K.id('app');
  var DATA = null;

  var TXT_ESPERA = 'Debes esperar la aceptación del nuevo contrato en el SECOP para que Contratación te dé acceso o puedas solicitarlo.';

  function nombrePropio(s) {
    return String(s || '').toLowerCase().replace(/(^|[\s,])([a-záéíóúñü])/g, function (t, a, l) { return a + l.toUpperCase(); });
  }

  /* Los textos del CORE van sin tildes a propósito; aquí se arreglan las
     pocas palabras que usa este módulo. */
  function tildes(s) {
    return String(s || '')
      .replace(/\bContratacion\b/g, 'Contratación').replace(/\bcontrasena\b/g, 'contraseña')
      .replace(/\bnumero\b/g, 'número').replace(/\bdigitos\b/g, 'dígitos').replace(/\bsecretaria\b/g, 'secretaría')
      .replace(/\besta\b/g, 'está').replace(/\bminimo\b/g, 'mínimo').replace(/\bmaximo\b/g, 'máximo')
      .replace(/\badicion\b/g, 'adición').replace(/\bcesion\b/g, 'cesión').replace(/\bsuspension\b/g, 'suspensión')
      .replace(/\bmodificacion\b/g, 'modificación').replace(/\bcorreccion\b/g, 'corrección')
      .replace(/\bCuentale\b/g, 'Cuéntale').replace(/\bque necesitas\b/g, 'qué necesitas').replace(/\bpor ahi\b/g, 'por ahí')
      .replace(/\baqui\b/g, 'aquí').replace(/\bmas\b/g, 'más');
  }

  /* ════════════════ 1. DESDE LA ENTRADA ════════════════ */

  function sinAcceso(datos, documento) {
    datos = datos || {};
    var caso = datos.caso === 'INACTIVO' ? 'INACTIVO' : 'SIN_REGISTRO';
    var doc = String(datos.documento || documento || '');
    var P = K.piezas.confirmar;

    /* ya pidió antes: no se abre otra, se le recuerda la que está en curso */
    if (datos.abierta && datos.abierta.id) {
      P.avisar({
        titulo: 'Tu solicitud ya está en Contratación',
        texto: 'La solicitud ' + datos.abierta.id + ' del ' + datos.abierta.fecha + ' está en curso. Contratación te responderá por WhatsApp; cuando tengas acceso la verás en SOLICITUD CONTRATACIÓN.',
        si: 'Entendido'
      });
      return;
    }

    var p1 = caso === 'INACTIVO' ? '¿Ya aceptaste un nuevo contrato en el SECOP II?' : '¿Ya aceptaste tu contrato en el SECOP II?';
    var t1 = caso === 'INACTIVO'
      ? 'No tienes un contrato activo en la app' + (datos.contrato ? ' (el último que tenemos es el ' + datos.contrato + ')' : '') + '. Si ya aceptaste uno nuevo, puedes pedirle el acceso a Contratación.'
      : 'Tu documento todavía no está registrado en la app. Si ya aceptaste tu contrato, puedes pedirle el acceso a Contratación.';

    preguntaSiNo(p1, t1).then(function (si) {
      if (!si) return esperar();
      var quien = caso === 'INACTIVO' ? nombrePropio(datos.nombre) : ('el titular del documento ' + doc);
      var t2 = 'Confirmo que yo, ' + quien + ', ya acepté ' +
        (caso === 'INACTIVO' ? 'un NUEVO contrato' : 'mi contrato') + ' en el SECOP II. ' +
        'Te lo preguntamos dos veces para evitar reprocesos: Contratación solo puede darte acceso a un contrato ya aceptado.';
      return preguntaSiNo('Confirma tus datos', t2, 'Sí, lo confirmo', 'No').then(function (si2) {
        if (!si2) return esperar();
        if (caso === 'INACTIVO') return enviarInactivo(datos, doc);
        return formularioNuevo(datos, doc);
      });
    });
  }

  function esperar() {
    return K.piezas.confirmar.avisar({ titulo: 'Todavía no', texto: TXT_ESPERA, si: 'Entendido' });
  }

  function preguntaSiNo(titulo, texto, si, no) {
    return K.piezas.confirmar.abrir({ titulo: titulo, texto: texto, si: si || 'Sí', no: no || 'No' });
  }

  /* Caso 1: con sus datos. Si en la hoja no hay celular, se pide aquí. */
  function enviarInactivo(datos, doc) {
    if (datos.celular) return enviar({ documento: doc, confirmado: true }, datos);
    return pedirCelular().then(function (cel) {
      if (cel) return enviar({ documento: doc, confirmado: true, telefono: cel }, datos);
    });
  }

  function pedirCelular() {
    return new Promise(function (res) {
      var hoja = capa('Tu celular', '<p class="sol-aclara">No tenemos un celular tuyo registrado. Escríbelo: por ahí te responde Contratación.</p>' +
        '<label class="campo"><span>Celular (WhatsApp) <i class="tr-oblig" aria-hidden="true">*</i></span>' +
        '<input name="cel" type="tel" inputmode="numeric" maxlength="10" placeholder="3001234567" autocomplete="tel"></label>',
        'Continuar');
      var inp = hoja.nodo.querySelector('[name="cel"]');
      inp.addEventListener('input', function () { inp.value = inp.value.replace(/\D/g, '').slice(0, 10); });
      hoja.si.addEventListener('click', function () {
        if (!/^3\d{9}$/.test(inp.value)) { K.aviso('El celular tiene 10 dígitos y empieza por 3.', 'aviso', 4000); inp.focus(); return; }
        hoja.cerrar(true); res(inp.value);
      });
      hoja.alCerrar = function () { res(''); };
      setTimeout(function () { inp.focus(); }, 60);
    });
  }

  /* Una capa propia (el formulario no cabe en confirmar). Misma base del kit. */
  function capa(titulo, cuerpoHtml, textoSi) {
    var n = K.nodo(
      '<div class="kit-capa sol-capa" role="dialog" aria-modal="true">' +
      '  <div class="kit-capa__velo"></div>' +
      '  <section class="kit-capa__hoja">' +
      '    <header class="kit-capa__h"></header>' +
      '    <form class="kit-capa__cuerpo formulario sol-form" novalidate>' + cuerpoHtml + '</form>' +
      '    <div class="kit-capa__pie">' +
      '      <button type="button" class="kit-btn kit-btn--plano sol-no">Cancelar</button>' +
      '      <button type="button" class="kit-btn kit-btn--marca sol-si"></button>' +
      '    </div>' +
      '  </section>' +
      '</div>');
    n.querySelector('.kit-capa__h').innerHTML = K.esc(titulo) + '<button type="button" class="kit-capa__x" aria-label="Cerrar">' + K.icono('cerrar', 18) + '</button>';
    n.querySelector('.sol-si').textContent = textoSi || 'Continuar';
    document.body.appendChild(n);
    var o = { nodo: n, si: n.querySelector('.sol-si'), alCerrar: null, cerrado: false };
    o.cerrar = function (sinAviso) {
      if (o.cerrado) return;
      o.cerrado = true;
      document.removeEventListener('keydown', tecla);
      n.classList.remove('kit-capa--on');
      setTimeout(function () { n.remove(); }, 200);
      if (!sinAviso && o.alCerrar) o.alCerrar();
    };
    function tecla(e) { if (e.key === 'Escape') o.cerrar(); }
    document.addEventListener('keydown', tecla);
    n.querySelector('.sol-no').addEventListener('click', function () { o.cerrar(); });
    n.querySelector('.kit-capa__x').addEventListener('click', function () { o.cerrar(); });
    n.querySelector('.kit-capa__velo').addEventListener('click', function () { o.cerrar(); });
    n.querySelector('form').addEventListener('submit', function (e) { e.preventDefault(); o.si.click(); });
    setTimeout(function () { n.classList.add('kit-capa--on'); }, 10);
    return o;
  }

  /* Caso 2: los datos para unificar la solicitud. */
  function formularioNuevo(datos, doc, previo) {
    var secs = (datos.secretarias || []).map(function (s) { return '<option>' + K.esc(s) + '</option>'; }).join('');
    var h = capa('Tu solicitud a Contratación',
      '<p class="sol-aclara">Con estos datos Contratación busca tu contrato y te da el acceso. <b>El celular es obligatorio</b>: por ahí te responden.</p>' +
      '<label class="campo campo--quieto"><span>Documento</span><input name="doc" type="text" readonly></label>' +
      '<label class="campo"><span>Nombre completo <i class="tr-oblig" aria-hidden="true">*</i></span>' +
      '  <input name="nombre" type="text" maxlength="120" autocomplete="name" placeholder="Nombres y apellidos"></label>' +
      '<div class="campo-fila">' +
      '  <label class="campo"><span>Celular (WhatsApp) <i class="tr-oblig" aria-hidden="true">*</i></span>' +
      '    <input name="cel" type="tel" inputmode="numeric" maxlength="10" placeholder="3001234567" autocomplete="tel"></label>' +
      '  <label class="campo"><span>Correo</span><input name="correo" type="email" autocomplete="email" placeholder="Opcional"></label>' +
      '</div>' +
      '<label class="campo"><span>Secretaría de tu contrato <i class="tr-oblig" aria-hidden="true">*</i></span>' +
      '  <select name="sec"><option value="">Escoge la secretaría</option>' + secs + '</select></label>' +
      '<label class="campo"><span>Número del contrato</span><input name="contrato" type="text" maxlength="40" placeholder="Si ya lo sabes (opcional)"></label>' +
      '<label class="campo"><span>Algo más para Contratación</span><textarea name="det" rows="3" maxlength="1000" placeholder="Opcional"></textarea></label>',
      'Revisar y enviar');
    var f = h.nodo.querySelector('form');
    f.doc.value = doc;
    if (previo) {
      f.nombre.value = previo.nombre || ''; f.cel.value = previo.telefono || ''; f.correo.value = previo.correo || '';
      f.sec.value = previo.secretaria || ''; f.contrato.value = previo.contrato || ''; f.det.value = previo.detalle || '';
    }
    f.cel.addEventListener('input', function () { f.cel.value = f.cel.value.replace(/\D/g, '').slice(0, 10); });
    setTimeout(function () { f.nombre.focus(); }, 60);
    h.si.addEventListener('click', function () {
      var D = {
        documento: doc, confirmado: true,
        nombre: String(f.nombre.value || '').replace(/\s+/g, ' ').trim(),
        telefono: f.cel.value, correo: String(f.correo.value || '').trim(),
        secretaria: f.sec.value, contrato: String(f.contrato.value || '').trim(), detalle: String(f.det.value || '').trim()
      };
      var falta = D.nombre.split(' ').length < 2 || D.nombre.length < 6 ? 'Escribe tu nombre completo (nombres y apellidos).'
        : !/^3\d{9}$/.test(D.telefono) ? 'El celular tiene 10 dígitos y empieza por 3.'
        : (D.correo && !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(D.correo)) ? 'El correo no está bien escrito.'
        : !D.secretaria ? 'Escoge la secretaría de tu contrato.' : '';
      if (falta) { K.aviso(falta, 'aviso', 4500); return; }
      h.cerrar(true);
      K.piezas.confirmar.abrir({
        titulo: 'Resumen de tu solicitud',
        lista: [
          ['Documento', D.documento], ['Nombre', D.nombre.toUpperCase()], ['Celular', D.telefono],
          D.correo ? ['Correo', D.correo] : null, ['Secretaría', D.secretaria],
          D.contrato ? ['Contrato', D.contrato] : null, D.detalle ? ['Nota', D.detalle.length > 120 ? D.detalle.slice(0, 119) + '…' : D.detalle] : null
        ].filter(Boolean),
        nota: 'Confirmaste que ya aceptaste tu contrato en el SECOP II.',
        si: 'Enviar', no: 'Editar'
      }).then(function (ok) {
        if (ok) enviar(D, datos);
        else formularioNuevo(datos, doc, D);
      });
    });
    return Promise.resolve();
  }

  function enviar(cuerpo, datos) {
    K.ocupado = true;
    K.piezas.guardado.abrir({
      titulo: 'Enviando tu solicitud a Contratación',
      sub: 'No cierres la app hasta que termine.',
      pasos: ['Comprobando tu documento', 'Guardando la solicitud', 'Avisando a Contratación']
    });
    return K.pedir('solicitudAcceso', cuerpo, { sinToken: true, app: 'CORE', ms: 60000 })
      .then(function (r) {
        K.ocupado = false;
        K.piezas.guardado.listo({ sub: 'Quedó con el código ' + r.id + '.' });
        setTimeout(function () {
          K.piezas.confirmar.avisar({
            titulo: r.repetida ? 'Tu solicitud ya estaba en Contratación' : 'Solicitud enviada',
            texto: (r.repetida ? 'Ya tenías la solicitud ' + r.id + ' del ' + r.fecha + '. ' : 'Tu solicitud ' + r.id + ' quedó registrada. ') +
              'Contratación la responderá oportunamente por WhatsApp. Cuando tengas acceso a la app, verás el registro y la respuesta en la nueva vista SOLICITUD CONTRATACIÓN.',
            si: 'Entendido'
          });
        }, 1300);
      })
      ['catch'](function (e) {
        K.ocupado = false;
        K.piezas.guardado.fallo();
        K.aviso(tildes((e && e.message) || 'No se pudo enviar.'), 'malo', 9000);
      });
  }

  /* ════════════════ 2. LA VISTA SOLICITUD CONTRATACIÓN ════════════════ */

  var ICO_TIPO = { ADICION: 'mas', CESION: 'persona', MODIFICACION: 'lapiz', SUSPENSION: 'pausa' };

  function vista(sub) {
    var c = K.nodo('<div class="kit-ancho vista tr sol"></div>');
    app.appendChild(c);
    var p = K.pedir('solicitudesContratacion', {}, { ms: 60000 }).then(function (r) { DATA = r; return r; });
    K.piezas.esqueletos.mientras(c, p, { forma: 'ficha', cuantos: 2, espera: 'Trayendo tus solicitudes a Contratación' })
      .then(function () { pintar(c, sub === 'nueva'); })
      ['catch'](function (e) {
        var er = K.nodo('<section class="kit-tarjeta error"><p class="error__t"></p><button type="button" class="kit-btn kit-btn--plano">Reintentar</button></section>');
        er.querySelector('p').textContent = tildes((e && e.message) || 'No se pudo cargar.');
        er.querySelector('button').addEventListener('click', function () { app.innerHTML = ''; vista(sub); });
        c.appendChild(er);
        K.piezas.creditos.montar(c);
      });
  }

  function pintar(c, abrirForm) {
    c.innerHTML = '';
    c.appendChild(K.nodo(
      '<section class="kit-tarjeta tr-cab">' +
      '  <span class="tr-cab__ico">' + K.icono('documento', 24) + '</span>' +
      '  <div class="tr-cab__txt"><h2 class="tr-cab__t">SOLICITUD CONTRATACIÓN</h2>' +
      '  <p class="tr-cab__p">Recuérdale o pídele a la oficina de Contratación un trámite de tu contrato: <b>adición, cesión, modificación o corrección</b> y <b>suspensión</b>. ' +
      'Aquí ves la respuesta y las gestiones que Contratación registre.</p></div>' +
      '</section>'));

    if (!DATA.puede) {
      var cer = K.nodo('<section class="kit-tarjeta tr-cerrada">' + K.icono('candado', 20) + '<p></p></section>');
      cer.querySelector('p').textContent = tildes(DATA.motivo || 'Ahora no puedes hacer solicitudes nuevas.');
      c.appendChild(cer);
    } else {
      var zona = K.nodo('<section class="kit-tarjeta tr-nueva"></section>');
      var boton = K.nodo('<button type="button" class="kit-btn kit-btn--marca tr-nueva__b">' + K.icono('mas', 18) + ' Nueva solicitud a Contratación</button>');
      zona.appendChild(boton);
      boton.addEventListener('click', function () {
        boton.hidden = true;
        zona.appendChild(formApp(c, function () { boton.hidden = false; }));
        zona.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      c.appendChild(zona);
      if (abrirForm) boton.click();
    }
    c.appendChild(misSolicitudes());
    K.piezas.creditos.montar(c);
  }

  function formApp(c, alCerrar) {
    var D = { tipo: '', detalle: '' };
    var f = K.nodo('<form class="formulario tr-form" novalidate><h3 class="grupo__t">Nueva solicitud</h3></form>');
    var tipos = K.nodo('<div class="tr-tipos" role="radiogroup" aria-label="Qué trámite"></div>');
    (DATA.tipos || []).forEach(function (t) {
      var b = K.nodo('<button type="button" role="radio" aria-checked="false" class="tr-tipo" data-v="' + K.esc(t.valor) + '">' +
        '<span class="tr-tipo__ico">' + K.icono(ICO_TIPO[t.valor] || 'documento', 20) + '</span><span><b>' + K.esc(t.texto) + '</b><small>' + K.esc(t.ayuda || '') + '</small></span></button>');
      b.addEventListener('click', function () {
        D.tipo = t.valor;
        [].forEach.call(tipos.children, function (x) { x.setAttribute('aria-checked', x === b ? 'true' : 'false'); });
      });
      tipos.appendChild(b);
    });
    var cT = K.nodo('<div class="campo"><span>¿Qué trámite? <i class="tr-oblig" aria-hidden="true">*</i></span></div>');
    cT.appendChild(tipos);
    f.appendChild(cT);

    var tx = K.nodo('<textarea rows="5" maxlength="2000" placeholder="Cuéntale a Contratación qué necesitas: fechas, valores, el dato que hay que corregir…"></textarea>');
    var n = K.nodo('<small class="tr-cuenta">0 / 2000</small>');
    var cTx = K.nodo('<label class="campo"><span>Tu solicitud <i class="tr-oblig" aria-hidden="true">*</i></span></label>');
    cTx.appendChild(tx); cTx.appendChild(n);
    tx.addEventListener('input', function () {
      D.detalle = tx.value;
      n.textContent = tx.value.length + ' / 2000';
      cTx.classList.toggle('campo--ok', tx.value.trim().length >= 10);
    });
    f.appendChild(cTx);

    var cAdj = K.nodo('<div class="campo"><span>Soportes (opcional)</span><div class="sol-adj"></div>' +
      '<p class="campo__ayuda">Hasta 3 archivos PDF o imágenes (máximo 8 MB cada uno). Puedes pegar una captura con Ctrl+V.</p></div>');
    f.appendChild(cAdj);
    var adj = K.piezas.adjuntos ? K.piezas.adjuntos.montar(cAdj.querySelector('.sol-adj'), {
      acepta: 'application/pdf,image/*', varios: true, maximoMB: 8, maximo: 3
    }) : null;

    var pie = K.nodo('<div class="campo-fila campo-fila--botones"></div>');
    var no = K.nodo('<button type="button" class="kit-btn kit-btn--plano">Cancelar</button>');
    var si = K.nodo('<button type="submit" class="kit-btn kit-btn--marca">' + K.icono('enviar', 16) + ' Revisar y enviar</button>');
    pie.appendChild(no); pie.appendChild(si);
    f.appendChild(pie);
    no.addEventListener('click', function () { f.remove(); if (alCerrar) alCerrar(); });

    f.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var falta = !D.tipo ? 'Escoge el trámite.' : (String(D.detalle).trim().length < 10 ? 'Cuéntale a Contratación qué necesitas (mínimo 10 letras).' : '');
      if (falta) { K.aviso(falta, 'aviso', 5000); return; }
      var t = (DATA.tipos || []).filter(function (x) { return x.valor === D.tipo; })[0] || {};
      var archivos = adj ? adj.archivos() : [];
      K.piezas.confirmar.abrir({
        titulo: 'Resumen de tu solicitud',
        lista: [
          ['Trámite', t.texto || D.tipo],
          ['Contrato', (DATA.contrato && DATA.contrato.contrato) || '—'],
          ['Solicitud', D.detalle.trim().length > 160 ? D.detalle.trim().slice(0, 159) + '…' : D.detalle.trim()],
          archivos.length ? ['Soportes', archivos.length + (archivos.length === 1 ? ' archivo' : ' archivos')] : null
        ].filter(Boolean),
        nota: 'Le avisamos al grupo de Contratación. La respuesta la vas a ver aquí mismo y te llega como notificación.',
        si: 'Enviar', no: 'Editar'
      }).then(function (ok) {
        if (!ok) return;
        (adj && archivos.length ? adj.aBase64() : Promise.resolve([])).then(function (lista) { enviarApp(c, D, lista); },
          function (e) { K.aviso((e && e.message) || 'No se pudo leer un archivo.', 'malo', 6000); });
      });
    });
    return f;
  }

  function enviarApp(c, D, adjuntos) {
    K.ocupado = true;
    K.piezas.guardado.abrir({
      titulo: 'Enviando tu solicitud a Contratación',
      sub: 'No cierres la app hasta que termine.',
      pasos: adjuntos.length ? ['Subiendo tus soportes', 'Guardando la solicitud', 'Avisando a Contratación'] : ['Guardando la solicitud', 'Avisando a Contratación']
    });
    K.pedir('solicitudContratacion', { tipo: D.tipo, detalle: D.detalle, adjuntos: adjuntos }, { ms: 120000 })
      .then(function (r) {
        K.ocupado = false;
        DATA = r;
        K.piezas.guardado.listo({ sub: 'Quedó con el código ' + r.creada + '.' });
        setTimeout(function () {
          if (r.aviso && r.aviso.ok === false) {
            K.piezas.confirmar.avisar({
              titulo: 'El aviso a Contratación no salió',
              texto: 'Tu solicitud ' + r.creada + ' SÍ quedó registrada, pero el WhatsApp al grupo de Contratación no se pudo enviar.',
              nota: 'Contratación la ve igual en su bandeja de solicitudes.',
              si: 'Entendido'
            });
          }
          pintar(c, false);
        }, 1400);
      })
      ['catch'](function (e) {
        K.ocupado = false;
        K.piezas.guardado.fallo();
        K.aviso(tildes((e && e.message) || 'No se pudo enviar.'), 'malo', 9000);
      });
  }

  function estadoDe(x) {
    if (x.tipo === 'GESTION') return { tono: 'info', txt: 'Gestión' };
    if (x.estado === 'RESPONDIDA') return { tono: 'ok', txt: 'Respondida' };
    if (x.gestiones && x.gestiones.length) return { tono: 'info', txt: 'En gestión' };
    return { tono: 'aviso', txt: 'Recibida' };
  }

  function misSolicitudes() {
    var s = K.nodo('<section class="kit-tarjeta tr-mias"><h3 class="seg-sec__t">MIS SOLICITUDES Y GESTIONES</h3></section>');
    var L = DATA.lista || [];
    if (!L.length) {
      s.appendChild(K.nodo('<p class="seg-nada">Todavía no tienes solicitudes ni gestiones con Contratación.</p>'));
      return s;
    }
    var lista = K.nodo('<div class="tr-lista"></div>');
    L.forEach(function (x) {
      var e = estadoDe(x);
      var d = K.nodo('<article class="tr-sol tr-sol--' + e.tono + '"></article>');
      d.appendChild(K.nodo('<div class="tr-sol__cab"><b>' + K.esc(x.id) + '</b><span class="tr-est tr-est--' + e.tono + '">' + K.esc(e.txt) + '</span></div>'));
      d.appendChild(K.nodo('<span class="tr-sol__t">' + K.esc(x.tipoTexto || x.tipo) + '</span>'));
      d.appendChild(K.nodo('<span class="tr-sol__meta">' + K.esc([String(x.fecha || '').split(' ')[0],
        x.contrato ? 'Contrato ' + x.contrato : '', x.origen === 'LOGIN' ? 'Desde la entrada' : (x.origen === 'CONTRATACION' ? 'Registrada por Contratación' : '')].filter(Boolean).join(' · ')) + '</span>'));
      if (x.detalle) {
        var det = K.nodo('<p class="tr-sol__det"></p>');
        det.textContent = x.detalle;
        d.appendChild(det);
      }
      if (x.adjuntos && x.adjuntos.length) {
        var ad = K.nodo('<div class="sol-docs"></div>');
        x.adjuntos.forEach(function (u, i) {
          var b = K.nodo('<button type="button" class="kit-btn kit-btn--plano sol-doc">' + K.icono('clip', 14) + ' Soporte ' + (i + 1) + '</button>');
          b.addEventListener('click', function () {
            if (K.piezas.visor && K.piezas.visor.abrir) K.piezas.visor.abrir(x.adjuntos.map(function (v, j) { return { url: v, titulo: 'Soporte ' + (j + 1) + ' · ' + x.id }; }), { indice: i });
            else window.open(u, '_blank', 'noopener');
          });
          ad.appendChild(b);
        });
        d.appendChild(ad);
      }
      if (x.respuesta) {
        var r = K.nodo('<div class="tr-resp"><p class="tr-resp__t">' + K.icono('comentario', 15) + ' Respuesta de Contratación' +
          (x.fechaRespuesta ? ' · ' + K.esc(String(x.fechaRespuesta).split(' ')[0]) : '') + '</p><p class="sol-txt"></p></div>');
        r.querySelector('.sol-txt').textContent = x.respuesta;
        d.appendChild(r);
      } else if (x.tipo !== 'GESTION') {
        d.appendChild(K.nodo('<p class="tr-sin-resp">' + K.icono('reloj', 14) + ' Todavía sin respuesta.</p>'));
      }
      if (x.gestiones && x.gestiones.length) {
        var g = K.nodo('<ol class="sol-gest" aria-label="Gestiones de Contratación"></ol>');
        x.gestiones.forEach(function (it) {
          var li = K.nodo('<li><span class="sol-gest__f"></span><p></p></li>');
          li.querySelector('.sol-gest__f').textContent = String(it.f || '').slice(0, 16) + (it.por ? ' · ' + nombrePropio(it.por) : '');
          li.querySelector('p').textContent = it.t || '';
          g.appendChild(li);
        });
        var gc = K.nodo('<div class="sol-gest__caja"><p class="sol-gest__t">' + K.icono('check', 14) + ' Gestiones de Contratación</p></div>');
        gc.appendChild(g);
        d.appendChild(gc);
      }
      lista.appendChild(d);
    });
    s.appendChild(lista);
    return s;
  }

  window.SOLCON = {
    sinAcceso: sinAcceso,
    vista: vista,
    datos: function () { return DATA; },
    /* para el banco de pruebas */
    _tildes: tildes, _estadoDe: estadoDe
  };
}());
