/* ============================================================
   CONTRATISTA-FLANDES · AYUDA POR VISTA (Insights)
   Ecosistema Flandes · Fase 4, entrega 4.9

   El pliego: "Insights en TODAS las vistas del contratista, según la
   vista donde esté: información de esa vista y/o que le diga qué hacer,
   con botones de información que ayuden".

   Cada vista tiene aquí:
     · una GUÍA: qué es esto y qué te toca hacer AHORA, con tus datos
       (tu cuenta, tu estado, tu supervisor), no un texto genérico. Es lo
       que la voz lee apenas se abre el robot.
     · PREGUNTAS RÁPIDAS con la respuesta ya calculada en el teléfono.

   Los datos salen de lo que la app ya trajo en el arranque (contrato,
   avisos, comunicados, personas) y del estado de cada módulo. Ninguna
   pregunta viaja al servidor: la respuesta es inmediata.

   El borrador de actividades trae sus propias cifras (borrador.js): allí
   esta ayuda se completa con las de la vista, no se pisa.
   ============================================================ */
(function () {
  'use strict';

  var K = window.KIT;
  var CTX = function () { return {}; };

  /* ---------- utilidades ---------- */

  function pesos(v) { return '$ ' + K.pesos(v || 0).replace(/^\$\s*/, ''); }
  function nombre(s) { return K.piezas.personas ? K.piezas.personas.nombrePropio(s) : String(s || ''); }
  function primerNombre(s) { return nombre(String(s || '').trim().split(/\s+/)[0] || ''); }
  function ctx() { try { return CTX() || {}; } catch (e) { return {}; } }
  function contrato() { return ctx().contrato || {}; }
  function seg() { try { return window.SEGUIMIENTO && window.SEGUIMIENTO._estado ? window.SEGUIMIENTO._estado() : null; } catch (e) { return null; } }

  function cuentaActual(S) {
    if (!S || !(S.cuentas || []).length) return null;
    var n = S.actual, c = null;
    S.cuentas.forEach(function (x) { if (x.informe === n) c = x; });
    return c || S.cuentas[S.cuentas.length - 1];
  }

  function hola() {
    var y = ctx().yo || {};
    return y.nombre ? primerNombre(y.nombre) + ', ' : '';
  }

  /* Lo que responde "¿Quién me atiende?": caras que el contratista ve. */
  function quienMeAtiende() {
    var c = contrato();
    var S = seg();
    var t = '';
    if (c.supervisor) t += 'Tu supervisor(a) es **' + nombre(c.supervisor) + '**: revisa tus cuentas y acepta el plan de pagos.\n';
    var a = cuentaActual(S);
    if (a && a.aprobo) t += 'Tu última cuenta la aprobó en Contratación **' + nombre(a.aprobo) + '**.\n';
    if (a && a.ordenQuien) t += 'La orden de pago la hizo en Contabilidad **' + nombre(a.ordenQuien) + '**.\n';
    if (a && a.egresoQuien) t += 'El egreso lo registró en Tesorería **' + nombre(a.egresoQuien) + '**.\n';
    if (!t) t = 'Todavía no hay nadie registrado atendiendo tus cuentas.';
    return t.trim();
  }

  /* ══════════════ las guías ══════════════ */

  var GUIAS = {

    inicio: function () {
      var S = seg(), a = cuentaActual(S), c = contrato(), ar = ctx().arranque || {};
      var t = hola() + 'este es tu inicio. ';
      /* 10.3 · NOTIFICADO: lo único que le queda es la certificación */
      if (String(c.estado || '').toUpperCase() === 'NOTIFICADO') {
        return {
          guia: t + 'Tu contrato ' + (c.contrato || '') + ' terminó: su última cuenta ya se pagó. Descarga tu **certificación** del contrato' +
            (c.accesoHasta ? ' antes del **' + c.accesoHasta + '**' : '') + ', que es cuando se cierra tu acceso a la app.',
          botones: [{ texto: '¿Para qué me sirve la certificación?', responde: function () {
            return 'Es el documento que certifica tu contrato (objeto, valor y fechas) con un **código QR** de validación. Sirve para actualizar tu hoja de vida en el **SIGEP** y para presentarla en otros procesos.';
          } }]
        };
      }
      if (a && window.SEGUIMIENTO && window.SEGUIMIENTO._detalle) {
        t += window.SEGUIMIENTO._detalle(a)[1] + ' ';
        if ((S.acciones || []).length && window.SEGUIMIENTO._accion) t += '**Lo que te toca ahora:** ' + window.SEGUIMIENTO._accion(S.acciones[0])[0] + '. ';
      } else if (c.contrato) {
        t += 'Tu contrato ' + c.contrato + ' está ' + String(c.estado || '').toLowerCase() + '. ';
      }
      var sin = (ar.avisos && ar.avisos.noLeidos) || 0;
      if (sin) t += 'Tienes ' + sin + (sin === 1 ? ' notificación sin leer.' : ' notificaciones sin leer.');
      return {
        guia: t,
        botones: [
          { texto: '¿Por dónde empiezo mi cuenta?', responde: function () {
              return 'El orden es siempre el mismo:\n1. **BORRADOR ACTIVIDADES**: escribes qué hiciste en cada obligación y subes hasta 3 fotos de evidencia.\n' +
                     '2. **INGRESAR CUENTA**: fechas, planilla y documentos. Ahí se generan tus formatos.\n' +
                     '3. **ESTADO DE CUENTA**: reportas la cuenta a tu supervisor(a) y sigues cada paso hasta el pago.'; } },
          { texto: '¿Quién me atiende?', responde: quienMeAtiende },
          { texto: '¿Cómo cambio mi foto?', responde: function () {
              return 'Toca tu foto (o tus iniciales) arriba en el saludo, o el menú de tu perfil → **Foto de perfil**. La recortas con el dedo y queda la misma en todas las apps de la Alcaldía.'; } },
          { texto: '¿Cómo me llegan los avisos?', responde: function () {
              var e = K.piezas.avisos ? K.piezas.avisos.estado() : '';
              if (e === 'listo') return 'Este teléfono ya recibe avisos. Te llegan cuando tu cuenta cambia de estado, aunque tengas la app cerrada.';
              if (e === 'ios-sin-instalar') return 'En iPhone los avisos solo llegan con la app instalada en la pantalla de inicio. Menú de tu perfil → **Instalar la app**.';
              if (e === 'bloqueado') return 'Los avisos están bloqueados en este navegador. Toca la tarjeta **AVISOS AL TELÉFONO** y te decimos dónde se desbloquean.';
              return 'Toca la tarjeta **AVISOS AL TELÉFONO** y acepta el permiso del teléfono.'; } }
        ]
      };
    },

    borrador: function () {
      return {
        guia: 'Aquí escribes lo que hiciste en cada obligación de tu contrato y subes la evidencia. ' +
              '**Escribe en pasado y con cifras** (cuántas visitas, cuántos informes, cuántas personas): es lo que el formato pide y lo que más devuelve Contratación cuando falta. ' +
              'Lo que escribes se guarda en este teléfono mientras tanto; toca **Guardar mi avance** para que quede en el servidor.',
        botones: [
          { texto: '¿Cómo redacto una actividad?', responde: function () {
              return 'Empieza con un verbo en pasado y pon una cifra. Por ejemplo:\n«**Realicé 12 visitas** de seguimiento a las veredas El Paso y Bocas, con **48 familias** atendidas.»\nEvita «apoyar», «colaborar» sin decir cuánto ni dónde.'; } },
          { texto: '¿Cuántas fotos puedo subir?', responde: function () {
              return 'Hasta **3 imágenes por obligación**. Van en el formato de evidencias, una al lado de la otra y sin deformarse. La app las reduce antes de subirlas, así que no gastan tus datos.'; } }
        ]
      };
    },

    borradorObligacion: function () {
      return {
        guia: 'Escribe **qué hiciste, cuánto y dónde**, en pasado. Abajo sube hasta 3 fotos que lo prueben. Con **Siguiente** pasas a la próxima obligación sin perder lo escrito.',
        alto: true,
        botones: [
          { texto: 'Dame un ejemplo', responde: function () {
              return '«**Elaboré 4 informes** técnicos de interventoría y **asistí a 6 comités** de obra en el barrio Villa Magdalena.»'; } },
          { texto: '¿Qué foto sirve como evidencia?', responde: function () {
              return 'Una que muestre la actividad: la reunión con su lista de asistencia, el sitio intervenido, la pantalla del informe entregado. Nada de fotos personales ni capturas borrosas.'; } }
        ]
      };
    },

    cuenta: function () {
      var c = contrato();
      var primera = c && !c.yaDiligenciado;
      return {
        guia: 'Aquí radicas tu cuenta en **cuatro bloques**: fechas y periodo, relación de pago, relación de planilla y documentos. Entra al que quieras; el índice te dice cuál está listo. ' +
              'Los tres documentos **obligatorios** son la **certificación bancaria**, la **planilla** y su **baucher** de pago.' +
              (primera ? ' Antes ve a **DATOS DEL CONTRATO**: te faltan datos obligatorios y sin ellos no salen tus formatos.' : ''),
        botones: [
          { texto: '¿Qué documentos necesito?', responde: function () {
              return 'Siempre: certificación bancaria, planilla (PDF sin contraseña) y el baucher de la planilla (foto o PDF).\n' +
                     'Si aplica: planilla anexa y su baucher, anexos de actividades en un solo PDF, RUT si eres Régimen Simple, factura si facturas electrónicamente, parafiscales si eres persona jurídica, certificado de NO aportes si eres pensionado.\n' +
                     'Solo en la primera cuenta: acta de inicio, clausulados, CDP, RP, RUT y certificado de ARL.'; } },
          { texto: '¿Qué pasa si se me va la señal?', responde: function () {
              return 'Nada se pierde: lo escrito queda en este teléfono y cada PDF que subes queda guardado al instante. Vuelve a entrar y sigues donde ibas.'; } },
          { texto: '¿Cuál es el siguiente paso?', responde: function () {
              return 'Cuando termines, ve a **ESTADO DE CUENTA** y toca **REPORTAR CUENTA**. Hasta que no la reportes, tu supervisor(a) no la ve.'; } }
        ]
      };
    },

    seguimiento: function () {
      var S = seg(), a = cuentaActual(S);
      var t = 'Aquí ves dónde va cada cuenta, en cinco pasos: ingresada, aprobada, orden, egreso y pagada. ';
      if (a && window.SEGUIMIENTO._detalle) t += window.SEGUIMIENTO._detalle(a)[1] + ' ';
      if (S && (S.acciones || []).length && window.SEGUIMIENTO._accion) {
        var ac = window.SEGUIMIENTO._accion(S.acciones[0]);
        t += '**Ahora te toca:** ' + ac[0] + '.';
      }
      if (S && S.habil && S.habil.ok === false && S.habil.motivo) t += ' ' + S.habil.motivo;
      return {
        guia: t,
        filas: function () { var s = seg(); return s ? s.cuentas || [] : []; },
        medidas: [
          { titulo: 'Valor del contrato', calcula: function () { var s = seg(); return s && s.valorFinal ? pesos(s.valorFinal) : null; } },
          { titulo: 'Pagado', calcula: function () { var s = seg(); return s ? pesos(s.pagado) : null; } },
          { titulo: 'En trámite', calcula: function () { var s = seg(); return s ? pesos(s.enTramite) : null; } },
          { titulo: 'Por pagar', calcula: function () { var s = seg(); return s ? pesos(s.porPagar) : null; } }
        ],
        botones: [
          { texto: '¿Qué me toca hacer?', responde: function () {
              var s = seg();
              if (!s || !(s.acciones || []).length) return 'Por ahora nada: tu cuenta está en manos de la Alcaldía. Te avisamos cuando cambie.';
              return s.acciones.map(function (x) { var q = window.SEGUIMIENTO._accion(x); return '**' + q[0] + '.** ' + q[1]; }).join('\n\n'); } },
          { texto: '¿Cuánto me han pagado?', responde: function () {
              var s = seg();
              if (!s) return 'Todavía no cargó tu estado de cuenta.';
              var pagadas = (s.cuentas || []).filter(function (c) { return c.estado === 'PAGADA'; }).length;
              return 'Llevas **' + pagadas + (pagadas === 1 ? ' cuenta pagada' : ' cuentas pagadas') + '** por ' + pesos(s.pagado) +
                     (s.netoPagado ? ' (neto girado a tu cuenta: ' + pesos(s.netoPagado) + ')' : '') + '.\n' +
                     'En trámite: ' + pesos(s.enTramite) + '. Te falta por cobrar: ' + pesos(s.porPagar) + '.'; } },
          { texto: '¿Por qué me la devolvieron?', responde: function () {
              var s = seg(), d = [];
              (s ? s.cuentas || [] : []).forEach(function (c) { (c.devoluciones || []).forEach(function (x) { d.push({ n: c.informe, x: x }); }); });
              if (!d.length) return 'Ninguna de tus cuentas tiene devoluciones registradas.';
              var u = d[d.length - 1];
              return 'La última devolución fue en la cuenta ' + u.n + (u.x.fecha ? ', el ' + u.x.fecha : '') +
                     (u.x.quien ? ', por ' + nombre(u.x.quien) : '') + ':\n«' + (u.x.motivo || 'sin motivo escrito') + '»\n' +
                     'Corrígela en **CORREGIR CUENTA** y vuelve a reportarla eligiendo **CORRECCIÓN**.'; } },
          { texto: '¿Quién me atiende?', responde: quienMeAtiende }
        ]
      };
    },

    avisos: function () {
      var ar = ctx().arranque || {};
      var n = K.piezas.buzon ? K.piezas.buzon.noLeidos() : ((ar.avisos && ar.avisos.noLeidos) || 0);
      return {
        guia: 'Aquí queda **todo lo que te hemos avisado**, aunque el aviso del teléfono se haya perdido. ' +
              (n ? 'Tienes ' + n + (n === 1 ? ' sin leer. ' : ' sin leer. ') : 'No tienes avisos sin leer. ') +
              'Si un aviso es de tu cuenta, al tocarlo te lleva a ella.',
        botones: [
          { texto: '¿Por qué no me llegan al teléfono?', responde: GUIAS.inicio().botones[3].responde }
        ]
      };
    },

    proceso: function () {
      var c = contrato();
      var t = 'Aquí está tu contrato completo: plazo, valor, respaldos presupuestales y tus obligaciones. ';
      if (!c.yaDiligenciado) t += '**Te faltan datos obligatorios**: toca el botón de abajo y llénalos con tu clausulado y tu acta de inicio. Sin ellos no salen los formatos de tu primera cuenta.';
      else t += 'Si algo no coincide con tu acta de inicio, corrígelo con el botón de abajo.';
      return {
        guia: t,
        botones: [
          { texto: '¿Cuántas obligaciones tengo?', responde: function () {
              var o = (contrato().obligaciones || []).length;
              return o ? 'Tu contrato tiene **' + o + ' obligaciones**. En cada cuenta tienes que contar qué hiciste en cada una.' : 'No encontramos obligaciones cargadas en tu contrato. Avísale a Contratación.'; } },
          { texto: '¿Cómo escribo el RP?', responde: function () {
              return 'Solo los **últimos dígitos**, los que van después de los ceros. Si tu RP es 2026000087, escribes 87: el año y los ceros los pone el sistema.'; } },
          { texto: '¿Quién me supervisa?', responde: function () {
              var c2 = contrato();
              return c2.supervisor ? 'Te supervisa **' + nombre(c2.supervisor) + '**' + (c2.secretaria ? ', de ' + nombre(c2.secretaria) : '') + '.' : 'Tu contrato no tiene supervisor(a) registrado.'; } }
        ]
      };
    },

    personales: function () {
      return {
        guia: 'Estos datos salen impresos en los formatos de tus cuentas. Revisa sobre todo el **número de cuenta y el banco**: un error ahí devuelve el pago. ' +
              'El nombre y el documento los cambia Contratación. Lo demás lo corriges tú y queda al día en todos tus contratos.',
        botones: [
          { texto: '¿Por qué importa el correo?', responde: function () {
              return 'A tu correo personal llegan la **orden de pago** y el **comprobante de pago**. Usa uno tuyo, no el institucional.'; } },
          { texto: 'Mi cuenta empieza por cero', responde: function () {
              return 'Escríbelo con el cero: el campo lo respeta. Sin ese cero el banco rechaza la transferencia.'; } },
          { texto: '¿Cómo cambio mi foto?', responde: function () {
              return 'Menú de tu perfil (arriba a la derecha) → **Foto de perfil**. La misma foto la ven tu supervisor(a) y las demás oficinas.'; } }
        ]
      };
    },

    comunicaciones: function () {
      return {
        guia: 'Aquí pides a Comunicaciones fotos, video, piezas gráficas o publicaciones para tu secretaría. Se pide con **3 días de antelación** y tu contrato tiene que estar **activo**. Abajo ves tus solicitudes y quién las atiende.',
        botones: [
          { texto: '¿Qué datos piden?', responde: function () {
              return 'Nombre del evento, fecha y hora de inicio y fin, lugar, qué necesitas (foto, video, pieza, publicación) y los detalles. Mientras más claro, mejor sale.'; } }
        ]
      };
    },

    tesoreria: function () {
      return {
        guia: 'Aquí le preguntas a Tesorería por el pago de una cuenta. Se puede cuando la cuenta ya tiene **egreso** o está **pagada** y han pasado **3 días hábiles**. La respuesta te llega aquí mismo.',
        botones: [
          { texto: '¿Por qué no me deja preguntar?', responde: function () {
              return 'Porque tu cuenta todavía no tiene egreso, o no han pasado 3 días hábiles desde él. Mira en **ESTADO DE CUENTA** en qué paso va.'; } }
        ]
      };
    },

    comunicados: function () {
      var I = window.INSTITUCIONAL;
      var n = I && I.noLeidos ? I.noLeidos() : 0;
      return {
        guia: 'Lo que te informan la Alcaldía, Contratación, Contabilidad, Tesorería y tu supervisor(a). ' +
              (n ? 'Tienes **' + n + (n === 1 ? ' sin leer' : ' sin leer') + '**. ' : '') +
              'Si un comunicado trae documentos, tócalo y usa **Ver documento**: se abre aquí mismo, con zoom, descarga e impresión.',
        botones: [
          { texto: '¿Qué documentos se pueden ver?', responde: function () {
              return 'PDF e imágenes se ven directo. Word, Excel y PowerPoint se muestran convertidos a PDF, y **Descargar** te baja el archivo original.'; } }
        ]
      };
    },

    directorio: function () {
      return {
        guia: 'Dónde queda cada dependencia de la Alcaldía, con su correo y su teléfono. Toca el WhatsApp o el teléfono para escribir o llamar de una.',
        botones: []
      };
    },

    tutoriales: function () {
      return {
        guia: 'Videos cortos de cada paso de la app. Puedes darles me gusta y dejar tu pregunta en los comentarios.',
        botones: [
          { texto: '¿Cuál veo primero?', responde: function () {
              return 'El de **borrador de actividades** y después el de **ingresar cuenta**: son los dos pasos que más se equivocan.'; } }
        ]
      };
    },

    sitios: function () {
      return {
        guia: 'Los sitios que usas para tu contrato: SECOP II (donde subes el plan de pagos), SIA Observa, la página de la Alcaldía, Small PDF para unir tus PDF y la DIAN.',
        botones: [
          { texto: '¿Para qué es Small PDF?', responde: function () {
              return 'Para **unir en un solo PDF** los documentos de tu cuenta aprobada antes de subirlos al Plan de pagos del SECOP II.'; } }
        ]
      };
    }
  };

  /* ══════════════ montar ══════════════ */

  var TITULOS = {
    inicio: 'Tu inicio', borrador: 'BORRADOR ACTIVIDADES', borradorObligacion: 'Tu obligación',
    cuenta: 'INGRESAR CUENTA', seguimiento: 'ESTADO DE CUENTA', avisos: 'MIS NOTIFICACIONES',
    proceso: 'DATOS DEL CONTRATO', personales: 'DATOS PERSONALES', comunicaciones: 'SOLICITUD A COMUNICACIONES',
    tesoreria: 'SOLICITUD TESORERÍA', comunicados: 'COMUNICADOS', directorio: 'DIRECTORIO INSTITUCIONAL',
    tutoriales: 'TUTORIALES DE USO', sitios: 'SITIOS WEB'
  };

  /** La ayuda de una vista. extra: lo que la vista añade (sus cifras). */
  function montar(vista, extra) {
    if (!K.piezas.insights) return;
    var g = GUIAS[vista];
    if (!g) return;
    /* la guía se calcula AL ABRIR, no al montar: así habla de lo que hay
       en pantalla en ese momento (el estado de cuenta llega después). */
    var cfg = {
      vista: (extra && extra.vista) || TITULOS[vista] || vista,
      guia: function () { return g().guia; },
      botones: [],
      alto: false
    };
    var base = g();
    cfg.alto = !!base.alto;
    cfg.botones = base.botones || [];
    if (base.filas) { cfg.filas = base.filas; cfg.medidas = base.medidas; }
    if (extra) {
      if (extra.filas) { cfg.filas = extra.filas; cfg.medidas = extra.medidas; cfg.filtros = extra.filtros; }
      if (extra.botones) cfg.botones = extra.botones.concat(cfg.botones);
      if (extra.guia) { var gg = extra.guia; cfg.guia = function (f) { return (typeof gg === 'function' ? gg(f) : gg) + '\n\n' + g().guia; }; }
      if (extra.alto !== undefined) cfg.alto = extra.alto;
    }
    K.piezas.insights.montar(cfg);
  }

  window.AYUDA = {
    configurar: function (fn) { if (typeof fn === 'function') CTX = fn; },
    montar: montar,
    tiene: function (v) { return !!GUIAS[v]; },
    _guias: GUIAS
  };
}());
