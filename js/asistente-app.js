/* ============================================================
   CONTRATISTA-FLANDES · ADAPTADOR DEL ASISTENTE DE AYUDA
   24/10/2026 · entrega 1

   La pieza kit/asistente.js no sabe nada de esta app. Aquí se le dice:
     · a dónde puede llevar (destino) y con qué rótulo,
     · qué está bloqueado y qué lo destraba (puerta),
     · lo más urgente al abrir (urgente),
     · los datos reales de las respuestas ({{clave}}) y
     · el estado del contrato: ACTIVO o TERMINADO.

   TODO sale de lo que la app ya trajo al arrancar (contrato, cuentas,
   avisos, comunicados, configuración) y, si la persona ya entró al ESTADO
   DE CUENTA, de lo que esa vista cargó. Ningún dato viaja al servidor
   para responder.

   SIN CONTRATO: el CORE ya manda el texto genérico ("Usuario revisor")
   en lugar del nombre; aquí ese texto se cambia por el ÁREA y nunca se
   inventa un nombre.

   La base embebida (js/asistente-base.js) es el respaldo para la primera
   apertura y la pantalla de entrada; la del CORE la reemplaza en cuanto
   llega con el arranque (solo cuando cambia su sello).
   ============================================================ */
(function () {
  'use strict';

  var K = window.KIT;
  if (!K || !K.piezas.asistente) return;

  var APP = function () { return window.CONTRATISTA_APP || {}; };
  function ar() { try { return (APP().arranque && APP().arranque()) || {}; } catch (e) { return {}; } }
  function contrato() { try { return (window.CONTRATISTA_CANDADO && window.CONTRATISTA_CANDADO.contrato()) || {}; } catch (e) { return {}; } }
  function seg() { try { return window.SEGUIMIENTO && window.SEGUIMIENTO._estado ? window.SEGUIMIENTO._estado() : null; } catch (e) { return null; } }
  function cfgPublica() { try { return (window.CONTRATISTA_CANDADO && window.CONTRATISTA_CANDADO.config()) || {}; } catch (e) { return {}; } }
  function nombre(s) { return K.piezas.personas ? K.piezas.personas.nombrePropio(s) : String(s || ''); }
  function pesos(v) { return '$ ' + K.pesos(v || 0).replace(/^\$\s*/, ''); }
  function ir(ruta) { return function () { location.hash = '#/' + ruta; }; }

  /* ---------- el estado del contrato ---------- */

  var TERMINADOS = { NOTIFICADO: 1, INACTIVO: 1, TERMINADO: 1, LIQUIDADO: 1, FINALIZADO: 1, CERRADO: 1, ANULADO: 1 };
  function estadoContrato() { return K.norm(contrato().estado || ''); }
  function terminado() { return !!TERMINADOS[estadoContrato()]; }
  function notificado() { return estadoContrato() === 'NOTIFICADO'; }

  /* ---------- las cuentas, con lo que hay ---------- */

  var ORDEN = ['BORRADOR', 'EN PROCESO', 'INGRESADA', 'REPORTADA', 'REVISADA POR SUPERVISOR', 'DEVUELTA', 'INCOMPLETA',
    'APROBADA', 'PLAN DE PAGOS', 'CERRADA', 'ORDEN DE PAGO', 'EGRESO', 'PAGADA'];
  var CIERRA = { CERRADA: 1, 'ORDEN DE PAGO': 1, EGRESO: 1, PAGADA: 1 };

  /** Las cuentas del contrato: las del ESTADO DE CUENTA si ya cargó; si no, las del arranque. */
  function cuentas() {
    var S = seg();
    if (S && (S.cuentas || []).length) {
      return S.cuentas.map(function (c) { return { informe: c.informe, estado: K.norm(c.estado), c: c }; });
    }
    var l = ar().cuentasResumen || [];
    return l.map(function (c) { return { informe: Number(c.informe) || 0, estado: K.norm(c.estado) }; })
      .sort(function (a, b) { return a.informe - b.informe; });
  }

  function ultima() { var l = cuentas(); return l.length ? l[l.length - 1] : null; }

  function textoEstado(c) {
    var n = c.informe, cta = 'Tu cuenta ' + n;
    switch (c.estado) {
      case 'BORRADOR': return cta + ' está en **borrador**: termina tus actividades y después ingrésala en INGRESAR CUENTA.';
      case 'EN PROCESO': return cta + ' quedó **a medio ingresar**: vuelve a INGRESAR CUENTA para terminarla.';
      case 'INGRESADA': return cta + ' está **ingresada** pero todavía no la reportas: revisa tus documentos y repórtala en ESTADO DE CUENTA para que la vea tu supervisor(a).';
      case 'REPORTADA': return 'Ya reportaste la cuenta ' + n + ': ahora la **revisa tu supervisor(a)**.';
      case 'REVISADA POR SUPERVISOR': return 'Tu supervisor(a) ya revisó la cuenta ' + n + ': está esperando la **aprobación de Contratación**.';
      case 'DEVUELTA': return cta + ' fue **devuelta**: corrígela en CORREGIR CUENTA y vuelve a reportarla eligiendo CORRECCIÓN.';
      case 'INCOMPLETA': return cta + ' quedó **incompleta**: adjunta lo que te pidieron en CORREGIR CUENTA y vuelve a reportarla.';
      case 'APROBADA': return cta + ' fue **aprobada** por Contratación: descarga tus documentos, súbelos al Plan de pagos del SECOP II y después reporta el plan de pagos.';
      case 'PLAN DE PAGOS': return 'Reportaste el plan de pagos de la cuenta ' + n + ': falta que tu supervisor(a) lo **acepte**.';
      case 'CERRADA': return 'Tu supervisor(a) aceptó el plan de pagos de la cuenta ' + n + ': falta la **orden de pago** de Contabilidad.';
      case 'ORDEN DE PAGO': return 'La **orden de pago** de la cuenta ' + n + ' está emitida: falta el egreso de Tesorería.';
      case 'EGRESO': return 'Tesorería registró el **egreso** de la cuenta ' + n + ': tu pago está en proceso.';
      case 'PAGADA': return cta + ' ya está **pagada**.';
      default: return cta + ' está en estado ' + c.estado + '.';
    }
  }

  function estadoCuenta(corto) {
    var u = ultima();
    var c = contrato();
    if (!u) return c.contrato ? 'Todavía no hay cuentas radicadas de tu contrato ' + c.contrato + '. Empieza por el BORRADOR ACTIVIDADES.' : 'Todavía no veo cuentas de tu contrato.';
    var t = textoEstado(u);
    if (corto) return t;
    var pc = porCorregir();
    if (pc && pc.informe !== u.informe) t = 'Tu cuenta ' + pc.informe + ' está **' + pc.estado.toLowerCase() + '**: corrígela primero en CORREGIR CUENTA.\n' + t;
    var b = bloqueoReporte();
    if (b) t += '\n' + b;
    return t;
  }

  function porCorregir() {
    var pc = ar().porCorregir;
    if (pc && pc.informe) return { informe: pc.informe, estado: K.norm(pc.estado || 'DEVUELTA') };
    var l = cuentas();
    for (var i = 0; i < l.length; i++) if (l[i].estado === 'DEVUELTA' || l[i].estado === 'INCOMPLETA') return l[i];
    return null;
  }

  /** La cuenta ingresada no se puede reportar si la anterior no llegó a CERRADA. */
  function bloqueoReporte() {
    var l = cuentas(), u = ultima();
    if (!u || u.estado !== 'INGRESADA') return '';
    for (var i = l.length - 1; i >= 0; i--) {
      if (l[i].informe >= u.informe) continue;
      if (!CIERRA[l[i].estado]) {
        return 'Tu cuenta ' + l[i].informe + ' todavía está **' + l[i].estado + '**: hasta que su plan de pagos quede aceptado (CERRADA) no puedes reportar la cuenta ' + u.informe + '. Prepararla sí puedes.';
      }
      break;
    }
    return '';
  }

  function cuentaPendiente() {
    var pc = porCorregir();
    if (pc) return 'Ahora la que te frena es la **cuenta ' + pc.informe + '** (' + pc.estado.toLowerCase() + '): corrígela en CORREGIR CUENTA.';
    var l = cuentas();
    for (var i = 0; i < l.length; i++) {
      if (l[i].estado === 'BORRADOR' || l[i].estado === 'EN PROCESO') {
        if (i === l.length - 1) return '';
        return 'Ahora la que te frena es la **cuenta ' + l[i].informe + '** (' + (l[i].estado === 'BORRADOR' ? 'en borrador' : 'a medio ingresar') + '): termínala en INGRESAR CUENTA.';
      }
    }
    return '';
  }

  /* ---------- personas (con SIN CONTRATO) ---------- */

  function esGenerico(n) { return /^usuario\b/i.test(String(n || '').trim()); }
  function persona(n, area) {
    if (!n) return '';
    return esGenerico(n) ? 'la oficina de ' + area : '**' + nombre(n) + '** (' + area + ')';
  }

  function quienMeAtiende() {
    var c = contrato(), t = [];
    if (c.supervisor) t.push('Tu supervisor(a) es **' + nombre(c.supervisor) + '**' + (c.secretaria ? ', de ' + nombre(c.secretaria) : '') + ': revisa tus cuentas y acepta el plan de pagos.');
    var u = ultima(), x = u && u.c;
    if (x && x.aprobo) t.push('Tu cuenta ' + u.informe + ' la aprobó ' + persona(x.aprobo, 'Contratación') + '.');
    if (x && x.ordenQuien) t.push('La orden de pago la hizo ' + persona(x.ordenQuien, 'Contabilidad') + '.');
    if (x && x.egresoQuien) t.push('El egreso lo registró ' + persona(x.egresoQuien, 'Tesorería') + '.');
    if (!x && u) t.push('Quién aprobó, quién hizo la orden y quién registró el egreso lo ves en ESTADO DE CUENTA, con su foto.');
    return t.join('\n') || 'Todavía no hay nadie registrado atendiendo tus cuentas.';
  }

  /* ---------- lo más urgente al abrir ---------- */

  function urgente() {
    var c = contrato();
    if (notificado()) {
      return { texto: 'Tu contrato ' + (c.contrato || '') + ' terminó: su última cuenta ya se pagó. Descarga tu **certificación**' +
        (c.accesoHasta ? ' antes del **' + c.accesoHasta + '**, cuando se cierra tu acceso.' : '.'), accion: 'ir:certificacion' };
    }
    if (terminado()) return null;
    var pc = porCorregir();
    if (pc) {
      return { texto: 'Tu cuenta ' + pc.informe + (pc.estado === 'INCOMPLETA' ? ' quedó **incompleta**: adjunta lo que te pidieron' : ' fue **devuelta**: corrige lo que te pidieron') +
        ' y vuelve a reportarla eligiendo CORRECCIÓN.', accion: 'ir:cuenta' };
    }
    var cand = window.CONTRATISTA_CANDADO && window.CONTRATISTA_CANDADO.estado && window.CONTRATISTA_CANDADO.estado();
    if (cand) {
      /* 30/10 · candado de datos: personales y contrato, en todas las cuentas */
      if ((cand.personales || []).length) return { texto: 'Antes de radicar o reportar tu cuenta **completa tus datos personales**: te falta ' + cand.personales.join(', ') + '.', accion: 'ir:personales' };
      return { texto: 'Antes de radicar o reportar tu cuenta **completa los datos de tu contrato**: van impresos en tus formatos' +
        (cand.deContratacion ? ' (algunos los pone Contratación).' : '.'), accion: 'ir:proceso' };
    }
    var S = seg();
    if (S && (S.acciones || []).length && window.SEGUIMIENTO && window.SEGUIMIENTO._accion) {
      var a = window.SEGUIMIENTO._accion(S.acciones[0]);
      if (a && a[0]) return { texto: '**' + a[0] + '.** ' + (a[1] || ''), accion: 'ir:seguimiento' };
    }
    var u = ultima();
    if (u && u.estado === 'APROBADA') return { texto: textoEstado(u), accion: 'ir:plan' };
    if (u && u.estado === 'INGRESADA') {
      var b = bloqueoReporte();
      return { texto: b || textoEstado(u), accion: 'ir:seguimiento' };
    }
    return null;
  }

  /* ---------- a dónde puede llevar ---------- */

  function etiquetaCuenta() { return porCorregir() ? 'Ir a CORREGIR CUENTA' : 'Ir a INGRESAR CUENTA'; }

  var DESTINOS = {
    inicio: ['Ir al inicio', 'inicio'],
    proceso: ['Ir a DATOS DEL CONTRATO', 'proceso'],
    personales: ['Ir a DATOS PERSONALES', 'personales'],
    borrador: ['Ir a BORRADOR ACTIVIDADES', 'borrador'],
    cuenta: [etiquetaCuenta, 'cuenta'],
    seguimiento: ['Ir a ESTADO DE CUENTA', 'seguimiento'],
    plan: ['Ver el plan de pagos', 'seguimiento/plan'],
    egresos: ['Ver mis egresos', 'seguimiento/egresos'],
    drive: ['Abrir MI CUENTA DRIVE', 'seguimiento/documentos'],
    certificacion: ['Ir a la certificación', 'seguimiento/certificacion'],
    comunicaciones: ['Ir a SOLICITUD A COMUNICACIONES', 'comunicaciones'],
    comunicacionesNueva: ['Hacer una solicitud a Comunicaciones', 'comunicaciones/nueva'],
    tesoreria: ['Ir a SOLICITUD TESORERÍA', 'tesoreria'],
    tesoreriaNueva: ['Hacer una pregunta a Tesorería', 'tesoreria/nueva'],
    contratacion: ['Ir a SOLICITUD CONTRATACIÓN', 'contratacion'],
    contratacionNueva: ['Hacer una solicitud a Contratación', 'contratacion/nueva'],
    comunicados: ['Ir a COMUNICADOS', 'comunicados'],
    directorio: ['Ir al DIRECTORIO', 'directorio'],
    tutoriales: ['Ver los TUTORIALES', 'tutoriales'],
    sitios: ['Ir a SITIOS WEB', 'sitios'],
    avisos: ['Ir a MIS NOTIFICACIONES', 'avisos'],
    misregistros: ['Ir a MIS REGISTROS', 'misregistros']
  };

  function destino(id) {
    var d = DESTINOS[id];
    if (!d) return null;
    var et = typeof d[0] === 'function' ? d[0]() : d[0];
    var ruta = d[1];
    return { etiqueta: et, ir: function () {
      if (id === 'borrador') { try { sessionStorage.removeItem('contratista.ancla'); } catch (x) {} }
      var actual = String(location.hash || '').replace(/^#\/?/, '');
      if (actual === ruta) { window.dispatchEvent(new HashChangeEvent('hashchange')); return; }
      location.hash = '#/' + ruta;
    } };
  }

  var SOLO_CONSULTA = { inicio: 1, seguimiento: 1, plan: 1, egresos: 1, drive: 1, certificacion: 1, avisos: 1, contratacion: 1, contratacionNueva: 1,
    misregistros: 1, comunicados: 1, directorio: 1, sitios: 1, tutoriales: 1, proceso: 1, personales: 1, tesoreria: 1, tesoreriaNueva: 1 };
  var NOTIFICADO_PUEDE = { inicio: 1, seguimiento: 1, plan: 1, egresos: 1, drive: 1, certificacion: 1, avisos: 1, contratacion: 1, contratacionNueva: 1 };

  /** Lo bloqueado se explica y se ofrece lo que lo destraba. */
  function puerta(id) {
    var c = contrato();
    if (notificado() && !NOTIFICADO_PUEDE[id]) {
      return { texto: 'Tu contrato terminó: aquí solo te queda **descargar la certificación**' + (c.accesoHasta ? ' (hasta el ' + c.accesoHasta + ')' : '') + '.', accion: 'ir:certificacion' };
    }
    if (terminado() && !SOLO_CONSULTA[id]) {
      return { texto: 'Tu contrato ' + (c.contrato || '') + ' terminó (' + estadoContrato().toLowerCase() + '): solo puedes **consultar y descargar** (estado de cuenta, egresos, certificación y mis registros). Si tienes un contrato nuevo o crees que es un error, pídeselo a Contratación.', accion: 'ir:contratacionNueva' };
    }
    if (id === 'cuenta') {
      var cand = window.CONTRATISTA_CANDADO && window.CONTRATISTA_CANDADO.estado && window.CONTRATISTA_CANDADO.estado();
      if (cand && (cand.personales || []).length) return { texto: 'Para radicar o reportar tu cuenta primero **completa tus datos personales**: sin ellos no salen tus formatos ni tu pago.', accion: 'ir:personales' };
      if (cand) return { texto: 'Para radicar o reportar tu cuenta primero **completa los datos de tu contrato**: sin ellos no salen tus formatos.', accion: 'ir:proceso' };
    }
    if (id === 'borrador') {
      var pc = porCorregir();
      if (pc) return { texto: 'Antes de seguir con el borrador, **corrige tu cuenta ' + pc.informe + '** (' + pc.estado.toLowerCase() + ').', accion: 'ir:cuenta' };
    }
    if (id === 'tutoriales') {
      var v = cfgPublica().TUTORIALES_ACTIVO;
      if (!(v === true || K.norm(String(v === undefined || v === null ? '' : v)) === 'SI')) return { texto: 'Los tutoriales no están disponibles en este momento. La **guía rápida** sí: te la descargo.', accion: 'guia' };
    }
    return null;
  }

  /* ---------- acciones que no son ir a una vista ---------- */

  function accion(nombreAccion) {
    switch (nombreAccion) {
      case 'guia': return { etiqueta: 'Descargar la guía rápida', icono: 'descargar', cierra: false, hacer: function () { if (K.piezas.guia) K.piezas.guia.descargar('CONTRATISTA'); } };
      case 'soporte': return { etiqueta: 'Contarle a soporte', icono: 'salvavidas', hacer: function (p) {
        if (K.piezas.soporte) K.piezas.soporte.abrir({ vista: titulo(), texto: p ? 'Le pregunté al asistente: «' + p + '»\n' : '' });
      } };
      case 'foto': return { etiqueta: 'Cambiar mi foto', icono: 'camara', hacer: function () { if (APP().abrirFoto) APP().abrirFoto(); } };
      case 'clave': return { etiqueta: 'Actualizar contraseña', icono: 'llave', hacer: function () { K.piezas.sesion.cambiarClave(); } };
      case 'instalar': return { etiqueta: 'Instalar la app', icono: 'descargar', hacer: function () { if (K.piezas.instalar) K.piezas.instalar.abrir(); } };
      default: return null;
    }
  }

  function titulo() { try { return (K.piezas.insights.configuracion() || {}).vista || ''; } catch (e) { return ''; } }

  /* ---------- los datos de las respuestas ---------- */

  function dato(k) {
    var c = contrato(), S = seg(), cfg = cfgPublica(), a = ar();
    switch (k) {
      case 'estadoCuenta': return estadoCuenta(false);
      case 'estadoCuentaCorto': return estadoCuenta(true);
      case 'queMeToca':
        var u = urgente();
        return u ? u.texto : (terminado() ? 'Tu contrato terminó: solo te queda consultar y descargar.' : 'Por ahora **nada urgente**: ' + estadoCuenta(true));
      case 'cuentaPendiente': return cuentaPendiente();
      case 'reporteBloqueo': return bloqueoReporte() || 'Ahora mismo no veo ninguna cuenta tuya frenada por eso.';
      case 'devolucion':
        var d = [];
        (S ? S.cuentas || [] : []).forEach(function (x) { (x.devoluciones || []).forEach(function (y) { d.push({ n: x.informe, y: y }); }); });
        if (d.length) {
          var z = d[d.length - 1];
          return 'La última devolución fue en la cuenta ' + z.n + (z.y.fecha ? ', el ' + z.y.fecha : '') +
            (z.y.quien ? ', por ' + (esGenerico(z.y.quien) ? 'la oficina de Contratación' : nombre(z.y.quien)) : '') + ':\n«' + (z.y.motivo || 'sin motivo escrito') + '»';
        }
        var pc = porCorregir();
        return pc ? 'Tu cuenta ' + pc.informe + ' está ' + pc.estado.toLowerCase() + ': el motivo está arriba de todo en CORREGIR CUENTA.' : 'Ahora no tienes cuentas devueltas.';
      case 'pagado':
        if (!S || !S.cuentas) return 'Lo pagado, lo que está en trámite y lo que falta están arriba en **ESTADO DE CUENTA**.';
        var pag = S.cuentas.filter(function (x) { return K.norm(x.estado) === 'PAGADA'; }).length;
        return 'Llevas **' + pag + (pag === 1 ? ' cuenta pagada' : ' cuentas pagadas') + '** por ' + pesos(S.pagado) +
          (S.netoPagado ? ' (neto girado: ' + pesos(S.netoPagado) + ')' : '') + '.\nEn trámite: ' + pesos(S.enTramite) + '. Te falta por cobrar: ' + pesos(S.porPagar) + '.';
      case 'quienMeAtiende': return quienMeAtiende();
      case 'supervisor': return c.supervisor ? 'Te supervisa **' + nombre(c.supervisor) + '**' + (c.secretaria ? ', de ' + nombre(c.secretaria) : '') + '.' : 'Tu contrato no tiene supervisor(a) registrado: avísale a Contratación.';
      case 'contratoResumen':
        var p = [];
        if (c.contrato) p.push('Contrato **' + c.contrato + '**');
        if (c.valorFinal && c.valorFinal.texto) p.push('valor ' + c.valorFinal.texto);
        if (c.fechaTermino) p.push('termina el ' + c.fechaTermino);
        return p.length ? p.join(', ') + '.' : '';
      case 'obligaciones':
        var o = (c.obligaciones || []).length;
        return o ? 'Tu contrato tiene **' + o + ' obligaciones**: en cada cuenta cuentas qué hiciste en cada una.' : 'No veo obligaciones cargadas en tu contrato.';
      case 'contratosCert':
        var l = (window.CONTRATISTA_CANDADO && window.CONTRATISTA_CANDADO.contratos()) || [];
        return l.length > 1 ? 'Tienes **' + l.length + ' contratos**: antes de generarla escoge de cuál (el actual o uno anterior).' : '';
      case 'avisosTelefono':
        var e = K.piezas.avisos ? K.piezas.avisos.estado() : '';
        if (e === 'listo') return 'Este teléfono **ya recibe avisos**: te llegan cuando tu cuenta cambia de estado, aunque tengas la app cerrada.';
        if (e === 'ios-sin-instalar') return 'En iPhone los avisos solo llegan con la app **instalada** en la pantalla de inicio: menú de tu perfil → Instalar la app.';
        if (e === 'bloqueado') return 'Los avisos están **bloqueados** en este navegador. Toca la tarjeta **AVISOS AL TELÉFONO** del inicio y te decimos dónde se desbloquean.';
        return 'Toca la tarjeta **AVISOS AL TELÉFONO** del inicio y acepta el permiso del teléfono.';
      case 'noLeidos':
        var n = K.piezas.buzon ? K.piezas.buzon.noLeidos() : ((a.avisos && a.avisos.noLeidos) || 0);
        return n ? 'Tienes **' + n + (n === 1 ? ' sin leer**.' : ' sin leer**.') : 'No tienes avisos sin leer.';
      case 'comunicadosSinLeer':
        var I = window.INSTITUCIONAL, m = I && I.noLeidos ? I.noLeidos() : 0;
        return m ? 'Tienes **' + m + ' sin leer**.' : '';
      case 'pctSalud': return String(cfg.PLANILLA_PCT_SALUD || '12.5').replace('.', ',');
      case 'pctPension': return String(cfg.PLANILLA_PCT_PENSION || '16').replace('.', ',');
      case 'pctArl': return String(cfg.PLANILLA_PCT_ARL || '0.522').replace('.', ',');
      case 'contrato': return c.contrato || '';
      case 'estadoContrato': return estadoContrato();
      case 'nombre': var yo = (APP().yo && APP().yo()) || {}; return nombre(String(yo.nombre || '').split(/\s+/)[0] || '');
      default: return '';
    }
  }

  function vista() {
    try { var cl = (K.piezas.insights.configuracion() || {}).clave; if (cl) return cl; } catch (e) {}
    return String(location.hash || '').replace(/^#\/?/, '').split('/')[0] || 'inicio';
  }

  var ADAPTADOR = {
    vista: vista,
    estado: function () { return terminado() ? 'TERMINADO' : 'ACTIVO'; },
    dato: dato, urgente: urgente, destino: destino, puerta: puerta, accion: accion
  };

  /* ══════════════ la pantalla de entrada ══════════════ */

  function campo(n) { return document.querySelector('.kit-sesion [name="' + n + '"]'); }
  function resaltar(el) {
    if (!el) return;
    el.classList.add('kit-as-resalta');
    try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) {}
    setTimeout(function () { el.classList.remove('kit-as-resalta'); }, 3600);
  }

  var ENTRADA = {
    vista: function () { return 'entrada'; },
    estado: function () { return ''; },
    dato: function () { return ''; },
    urgente: function () { return null; },
    destino: function () { return null; },
    puerta: function () { return null; },
    accion: function (a) {
      if (a === 'olvide') return { etiqueta: 'Mostrarme el botón', icono: 'llave', hacer: function () {
        var d = campo('documento');
        if (d && !String(d.value || '').trim()) { d.focus(); resaltar(d); }
        /* NO se toca: mandar la contraseña lo decide la persona */
        resaltar(document.querySelector('.kit-sesion__olvide'));
      } };
      if (a === 'documento') return { etiqueta: 'Ir a la entrada', icono: 'persona', hacer: function () {
        var d = campo('documento'), cl = campo('clave');
        var el = d && !String(d.value || '').trim() ? d : (cl || d);
        if (el) { el.focus(); resaltar(el); }
      } };
      if (a === 'instalar') return { etiqueta: 'Cómo instalarla', icono: 'descargar', hacer: function () { if (K.piezas.instalar) K.piezas.instalar.abrir(); } };
      if (a === 'soporte') {
        var num = String((window.MARCA && window.MARCA.SOPORTE_WHATSAPP) || '').replace(/\D/g, '');
        if (!num) return null;
        return { etiqueta: 'Escribir a soporte por WhatsApp', icono: 'whatsapp', hacer: function (p) {
          window.open('https://wa.me/' + num + '?text=' + encodeURIComponent('Contratista · no puedo entrar a la app.\n' + (p || '')), '_blank', 'noopener');
        } };
      }
      return null;
    }
  };

  K.piezas.asistente.configurar({
    app: 'CONTRATISTA',
    base: window.ASISTENTE_BASE || [],
    adaptador: ADAPTADOR
  });

  window.CONTRATISTA_ASISTENTE = {
    adaptador: ADAPTADOR,
    entrada: ENTRADA,
    /* para las pruebas */
    _cuentas: cuentas, _urgente: urgente, _bloqueo: bloqueoReporte
  };
}());
