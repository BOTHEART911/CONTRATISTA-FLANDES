/* CONTRATISTA-FLANDES · BASE SEMBRADA DEL ASISTENTE (24/10/2026)
   Respaldo embebido: la usa el asistente la primera vez y en la entrada.
   La de verdad vive en el CORE (hoja ASISTENTE_TEMAS) y se edita en ADMIN;
   cuando cambia, llega con el arranque y reemplaza esta en el teléfono.
   Generado desde la semilla: no se edita a mano. */
window.ASISTENTE_BASE = [
{
"id": "C-INICIO",
"app": "CONTRATISTA",
"vista": "",
"titulo": "Ir al inicio",
"frases": [
"ir al inicio",
"volver al inicio",
"pantalla principal",
"menu principal",
"regresar al menu",
"donde esta el inicio"
],
"respuesta": "Te llevo a tu **inicio**: ahí están todos los bloques de la app.",
"accion": "ir:inicio",
"estado": "",
"activo": true,
"orden": 1
},
{
"id": "C-ESTADO-MI-CUENTA",
"app": "CONTRATISTA",
"vista": "inicio,seguimiento",
"titulo": "¿En qué va mi cuenta?",
"frases": [
"en que va mi cuenta",
"como va mi cuenta",
"estado de mi cuenta",
"ya me aprobaron la cuenta",
"donde va mi cuenta",
"ya revisaron mi cuenta",
"mi cuenta ya paso",
"que paso con mi cuenta",
"ya pagaron mi cuenta",
"seguimiento de mi cuenta",
"la cuenta en que estado esta",
"ya me aprobaron",
"me aprobaron la cuenta"
],
"respuesta": "{{estadoCuenta}}",
"accion": "ir:seguimiento",
"estado": "",
"activo": true,
"orden": 2
},
{
"id": "C-QUE-ME-TOCA",
"app": "CONTRATISTA",
"vista": "inicio,seguimiento",
"titulo": "¿Qué me toca hacer ahora?",
"frases": [
"que me toca hacer",
"que tengo que hacer ahora",
"que me falta",
"que hago ahora",
"cual es el siguiente paso",
"que sigue",
"que debo hacer",
"tengo algo pendiente",
"que me falta para radicar"
],
"respuesta": "{{queMeToca}}",
"accion": "",
"estado": "",
"activo": true,
"orden": 3
},
{
"id": "C-CUENTA-COBRO",
"app": "CONTRATISTA",
"vista": "",
"titulo": "Mi cuenta de cobro",
"frases": [
"cuenta de cobro",
"hacer la cuenta",
"hacer mi cuenta",
"presentar la cuenta",
"pasar la cuenta",
"como hago mi cuenta",
"quiero cobrar",
"necesito cobrar",
"cobrar el mes",
"radicar el mes"
],
"respuesta": "¿Vas a **adelantar tus actividades** del mes o vas a **relacionar toda tu cuenta** con fechas, planilla y documentos?",
"accion": "preguntar:C-BORRADOR|C-INGRESAR",
"estado": "",
"activo": true,
"orden": 4
},
{
"id": "C-ORDEN-CUENTA",
"app": "CONTRATISTA",
"vista": "inicio",
"titulo": "¿Por dónde empiezo mi cuenta?",
"frases": [
"por donde empiezo",
"como empiezo mi cuenta",
"pasos para la cuenta",
"orden para hacer la cuenta",
"primera vez que hago la cuenta",
"como funciona la cuenta mensual",
"que pasos sigo cada mes"
],
"respuesta": "El orden es siempre el mismo:\n1. **BORRADOR ACTIVIDADES**: escribes qué hiciste en cada obligación y subes la evidencia.\n2. **INGRESAR CUENTA**: fechas, planilla y documentos. Ahí se generan tus formatos.\n3. **ESTADO DE CUENTA**: reportas la cuenta a tu supervisor(a) y sigues cada paso hasta el pago.",
"accion": "ir:borrador",
"estado": "",
"activo": true,
"orden": 5
},
{
"id": "C-BORRADOR",
"app": "CONTRATISTA",
"vista": "inicio,borrador",
"titulo": "Escribir mis actividades (borrador)",
"frases": [
"borrador de actividades",
"escribir actividades",
"adelantar actividades",
"llenar actividades",
"mis actividades del mes",
"informe de actividades",
"donde escribo lo que hice",
"registrar actividades",
"diligenciar obligaciones",
"escribir el informe"
],
"respuesta": "En **BORRADOR ACTIVIDADES** escribes, por cada obligación, qué hiciste en el periodo (en pasado y con cifras) y subes la evidencia. Lo puedes ir llenando durante el mes; toca **Guardar mi avance** para que quede en el servidor.",
"accion": "ir:borrador",
"estado": "",
"activo": true,
"orden": 6
},
{
"id": "C-REDACTAR",
"app": "CONTRATISTA",
"vista": "borrador,borradorObligacion",
"titulo": "¿Cómo redacto una actividad?",
"frases": [
"como redacto una actividad",
"como escribo la actividad",
"ejemplo de actividad",
"como describo lo que hice",
"que escribo en la obligacion",
"dame un ejemplo",
"redactar obligacion"
],
"respuesta": "Empieza con un verbo en pasado y pon una cifra y el lugar. Por ejemplo:\n«**Realicé 12 visitas** de seguimiento a las veredas El Paso y Bocas, con **48 familias** atendidas.»\nEvita «apoyar» o «colaborar» sin decir cuánto ni dónde: es lo que más devuelve Contratación.",
"accion": "",
"estado": "",
"activo": true,
"orden": 7
},
{
"id": "C-FOTOS",
"app": "CONTRATISTA",
"vista": "borrador,borradorObligacion",
"titulo": "Fotos de evidencia",
"frases": [
"cuantas fotos puedo subir",
"subir fotos",
"subir evidencias",
"imagenes de evidencia",
"foto de evidencia",
"evidencia fotografica",
"que foto sirve",
"agregar imagen",
"no me deja subir la foto"
],
"respuesta": "Hasta **3 imágenes por obligación** (PNG, JPG, WEBP o HEIC). La app las reduce antes de subirlas y se guardan solas en cuanto las eliges. Usa fotos de lo que hiciste en el periodo que cobras: la reunión con su lista de asistencia, el sitio intervenido, el informe entregado.\nEn el **Formato de Evidencias** solo salen las obligaciones que tienen imágenes.",
"accion": "ir:borrador",
"estado": "",
"activo": true,
"orden": 8
},
{
"id": "C-ADJUNTOS",
"app": "CONTRATISTA",
"vista": "borrador,borradorObligacion",
"titulo": "Adjuntar PDF, Word o Excel a una obligación",
"frases": [
"adjuntar pdf",
"adjuntar archivo",
"subir un word",
"subir un excel",
"archivo de evidencia",
"archivo de evidencia del cumplimiento",
"adjunto de la obligacion",
"donde subo el informe",
"agregar otro adjunto",
"cuantos archivos puedo subir",
"subir acta o listado"
],
"respuesta": "Dentro de cada obligación, en **ARCHIVO DE EVIDENCIA DEL CUMPLIMIENTO**: hasta **5 adjuntos** (PDF, Word o Excel de hasta 10 MB cada uno), cada uno con el **nombre** que tú le pongas. El primero va en la casilla y los demás con **Agregar otro adjunto**; también puedes arrastrarlos o pegarlos con Ctrl+V. En tu carpeta quedan numerados **1.1., 1.2.…** por obligación. Si reemplazas o quitas uno, el anterior se borra para siempre y los demás se renumeran.",
"accion": "ir:borrador",
"estado": "",
"activo": true,
"orden": 9
},
{
"id": "C-SIGUIENTE-CUENTA",
"app": "CONTRATISTA",
"vista": "borrador",
"titulo": "No me deja pasar a la siguiente cuenta",
"frases": [
"no puedo pasar a la siguiente cuenta",
"no se abre el borrador",
"no me deja empezar la nueva cuenta",
"una cuenta a la vez",
"por que no puedo hacer la siguiente",
"bloqueado el borrador",
"no me aparece la cuenta nueva"
],
"respuesta": "Las cuentas van **en orden, una a la vez**. El borrador de la siguiente no se abre mientras una cuenta anterior esté **DEVUELTA**, **INCOMPLETA**, **EN PROCESO** o en **BORRADOR** sin terminar. Cuando esa cuenta queda **INGRESADA** o más adelante, se abre la siguiente.\n{{cuentaPendiente}}",
"accion": "ir:cuenta",
"estado": "",
"activo": true,
"orden": 10
},
{
"id": "C-INGRESAR",
"app": "CONTRATISTA",
"vista": "inicio,cuenta",
"titulo": "Ingresar (radicar) mi cuenta",
"frases": [
"ingresar cuenta",
"radicar cuenta",
"radicar mi cuenta",
"subir la cuenta",
"relacionar la cuenta",
"meter la cuenta",
"presentar documentos de la cuenta",
"fechas y planilla",
"toda mi cuenta",
"ingresar toda la cuenta"
],
"respuesta": "En **INGRESAR CUENTA** radicas en **cuatro bloques**: fechas y periodo, relación de pago, relación de planilla y documentos. El índice te dice cuál está listo. Al guardar se arman tus formatos; después la **reportas** en ESTADO DE CUENTA.",
"accion": "ir:cuenta",
"estado": "",
"activo": true,
"orden": 11
},
{
"id": "C-DOCUMENTOS",
"app": "CONTRATISTA",
"vista": "cuenta",
"titulo": "¿Qué documentos necesito?",
"frases": [
"que documentos necesito",
"que documentos piden",
"documentos obligatorios",
"que debo adjuntar",
"que tengo que subir en la cuenta",
"documentos de la cuenta",
"requisitos de la cuenta",
"pestañas de documentos",
"subir la planilla",
"donde subo la planilla",
"donde subo la certificacion bancaria"
],
"respuesta": "Siempre: **certificación bancaria**, **planilla** (PDF sin contraseña) y el **baucher** de la planilla (foto o PDF).\nSi aplica, abre la **pestaña** de tu caso: planilla anexa, planilla ARL suministrada por la Alcaldía, documento que pidió tu supervisor(a), RUT (Régimen Simple), factura electrónica, certificado de parafiscales o certificado de NO aportes a pensión.\nSolo en la primera cuenta, adición o novedades: acta de inicio, clausulados, CDP, RP, RUT y certificado de ARL.",
"accion": "ir:cuenta",
"estado": "",
"activo": true,
"orden": 12
},
{
"id": "C-PDF-CLAVE",
"app": "CONTRATISTA",
"vista": "cuenta",
"titulo": "El PDF no sube o tiene contraseña",
"frases": [
"pdf con contraseña",
"no sube el pdf",
"el archivo no carga",
"pdf protegido",
"no me acepta el archivo",
"formato del archivo",
"quitar contraseña al pdf",
"el pdf no carga",
"no puedo subir el pdf"
],
"respuesta": "Todos los documentos van en **PDF sin protección**; solo el baucher de la planilla se acepta también como foto. Si eliges un PDF protegido (con clave o permisos), la app no lo guarda y te ofrece **Quitar la protección aquí**: si te pide clave, escríbela (en las planillas suele ser tu cédula) y se sube un PDF limpio. También puedes abrirlo, tocar **Imprimir → Guardar como PDF** y subir esa copia. Cada archivo se guarda en cuanto lo eliges.",
"accion": "ir:sitios",
"estado": "",
"activo": true,
"orden": 13
},
{
"id": "C-ARL-ALCALDIA",
"app": "CONTRATISTA",
"vista": "cuenta",
"titulo": "Planilla ARL suministrada por la Alcaldía",
"frases": [
"planilla arl de la alcaldia",
"la alcaldia paga mi arl",
"arl riesgo elevado",
"arl suministrada",
"riesgo 4",
"riesgo 5"
],
"respuesta": "Si la Alcaldía te paga la ARL por tener **riesgo elevado**, en el bloque de documentos abre la pestaña **La Alcaldía realiza mis aportes a ARL** y sube ahí la **planilla ARL suministrada por la Alcaldía**. Es opcional: solo si es tu caso.",
"accion": "ir:cuenta",
"estado": "",
"activo": true,
"orden": 14
},
{
"id": "C-APORTES",
"app": "CONTRATISTA",
"vista": "cuenta",
"titulo": "¿Cómo se llenan los aportes?",
"frases": [
"como lleno los aportes",
"salud pension y arl",
"base de cotizacion",
"aportes de seguridad social",
"calcular aportes",
"relacion de planilla",
"no me deja escribir salud",
"porcentaje de pension"
],
"respuesta": "En **RELACIÓN DE PLANILLA** escribe primero la **Base de cotización**: mientras esté vacía, salud, pensión y ARL quedan bloqueados. Al escribirla se llenan solos: **salud {{pctSalud}} %**, **pensión {{pctPension}} %** y **ARL {{pctArl}} %** de la base, hacia arriba a la centena.\n**Deben quedar iguales a los de la planilla que adjuntas**; si tu planilla dice otra cosa, corrígelos a mano. La planilla anexa funciona igual.",
"accion": "ir:cuenta",
"estado": "",
"activo": true,
"orden": 15
},
{
"id": "C-SALDO",
"app": "CONTRATISTA",
"vista": "cuenta",
"titulo": "¿Por qué no puedo cambiar el saldo?",
"frases": [
"no puedo cambiar el saldo",
"saldo actual",
"el saldo esta mal",
"nuevo saldo",
"valor por cobrar",
"saldo no cuadra",
"cuanto me queda del contrato"
],
"respuesta": "El **Saldo actual** lo pone el sistema y es de solo lectura: en la primera cuenta es el valor de tu contrato y después es lo que quedó de tu cuenta anterior. Si te hicieron una **adición**, Contratación ya la sumó. Tú solo escribes el **Valor por cobrar**; el **Nuevo saldo** se calcula solo.\nSi el saldo no te cuadra, pregúntale a Contratación.",
"accion": "ir:contratacionNueva",
"estado": "",
"activo": true,
"orden": 16
},
{
"id": "C-FECHA-INICIO",
"app": "CONTRATISTA",
"vista": "cuenta",
"titulo": "¿De dónde sale la fecha de inicio del periodo?",
"frases": [
"fecha de inicio del periodo",
"inicio del periodo",
"fin del periodo",
"fecha del periodo",
"periodo de la cuenta",
"la fecha sale sola",
"cambiar la fecha de inicio"
],
"respuesta": "Desde tu **segunda cuenta**, el **Inicio del periodo** sale solo: es el **día siguiente** al fin del periodo de tu cuenta anterior (si terminó el 19/10, empieza el 20/10). Si tu periodo empieza otro día, cámbialo. En la primera cuenta, en una cuenta devuelta o en una corrección, queda la fecha que escribiste.",
"accion": "ir:cuenta",
"estado": "",
"activo": true,
"orden": 17
},
{
"id": "C-FECHA-RADICACION",
"app": "CONTRATISTA",
"vista": "cuenta",
"titulo": "Fecha de radicación",
"frases": [
"fecha de radicacion",
"que fecha de radicacion pongo",
"no me deja escoger la fecha",
"dia de corte",
"radicar a tiempo",
"hasta cuando puedo radicar",
"fecha limite para radicar"
],
"respuesta": "La fecha de radicación no es libre: solo valen **hoy y los dos días hábiles siguientes** (después de las 4 p. m., desde el siguiente hábil). Pasado el **día de corte** del mes, salen los primeros hábiles del mes siguiente. Por eso conviene no dejarlo para el último día.",
"accion": "ir:cuenta",
"estado": "",
"activo": true,
"orden": 18
},
{
"id": "C-EDITAR",
"app": "CONTRATISTA",
"vista": "cuenta,seguimiento",
"titulo": "Cambiar algo después de guardar",
"frases": [
"puedo cambiar algo despues de guardar",
"editar cuenta",
"modificar la cuenta",
"me equivoque en la cuenta",
"corregir algo antes de reportar",
"editar correccion",
"cambiar un documento ya subido"
],
"respuesta": "Sí, **mientras no la hayas reportado**. Toca **EDITAR CUENTA** (o **EDITAR CORRECCIÓN** si es una corrección) en ESTADO DE CUENTA o en INGRESAR CUENTA, cambia lo que necesites y vuelve a guardar: tus formatos se rehacen. Después la reportas.",
"accion": "ir:cuenta",
"estado": "",
"activo": true,
"orden": 19
},
{
"id": "C-SENAL",
"app": "CONTRATISTA",
"vista": "cuenta,borrador",
"titulo": "Se me fue la señal",
"frases": [
"se me fue la señal",
"se cayo el internet",
"se cerro la app",
"perdi lo que escribi",
"se me apago el celular",
"sin conexion",
"barra roja"
],
"respuesta": "Nada se pierde: lo escrito queda en este teléfono y cada archivo que subes queda guardado al instante. La barra **roja** de abajo te dice cuando es tu internet; cuando vuelve la red, la app sigue sola y lo que ya había salido **no se repite**. Vuelve a entrar y sigues donde ibas.",
"accion": "",
"estado": "",
"activo": true,
"orden": 20
},
{
"id": "C-REPORTAR",
"app": "CONTRATISTA",
"vista": "seguimiento,cuenta",
"titulo": "Reportar mi cuenta al supervisor",
"frases": [
"reportar cuenta",
"reportar mi cuenta",
"avisar al supervisor",
"como le aviso al supervisor",
"enviar la cuenta al supervisor",
"reporte inicial",
"ya radique y ahora que",
"mi supervisor no ve mi cuenta",
"el supervisor no ha visto mi cuenta",
"el supervisor no ha revisado"
],
"respuesta": "Radicar no avisa a nadie: tu supervisor(a) se entera cuando **reportas** la cuenta. En **ESTADO DE CUENTA** escoge la cuenta y toca **REPORTE INICIAL** (o **CORRECCIÓN** si ya te la habían devuelto). Antes, abre tus documentos en **MI CUENTA DRIVE** y revísalos uno a uno. La app no la reporta por ti: lo haces tú con el botón.",
"accion": "ir:seguimiento",
"estado": "",
"activo": true,
"orden": 21
},
{
"id": "C-REPORTE-BLOQUEADO",
"app": "CONTRATISTA",
"vista": "seguimiento",
"titulo": "No me deja reportar la cuenta",
"frases": [
"no me deja reportar",
"no aparece el boton reportar",
"por que no puedo reportar",
"reporte bloqueado",
"no puedo reportar la cuenta nueva"
],
"respuesta": "Una cuenta nueva **no se reporta** si la anterior no llegó a **CERRADA** (plan de pagos aceptado por tu supervisor(a)). Prepararla sí puedes: borrador e ingreso se adelantan, el reporte espera.\n{{reporteBloqueo}}",
"accion": "ir:seguimiento",
"estado": "",
"activo": true,
"orden": 22
},
{
"id": "C-DEVUELTA",
"app": "CONTRATISTA",
"vista": "inicio,seguimiento,cuenta",
"titulo": "Me devolvieron la cuenta",
"frases": [
"me devolvieron la cuenta",
"cuenta devuelta",
"corregir cuenta",
"por que me la devolvieron",
"cuenta incompleta",
"me rechazaron la cuenta",
"que tengo que corregir",
"motivo de la devolucion"
],
"respuesta": "No empiezas de cero: corriges solo lo que te pidieron. En el inicio la tarjeta cambia a **CORREGIR CUENTA**; adentro está el motivo arriba de todo. Si te piden cambiar actividades o evidencias, se corrigen en BORRADOR ACTIVIDADES sobre esa misma cuenta. Guarda la corrección y repórtala eligiendo **CORRECCIÓN**.\n{{devolucion}}",
"accion": "ir:cuenta",
"estado": "",
"activo": true,
"orden": 23
},
{
"id": "C-PLAN-PAGOS",
"app": "CONTRATISTA",
"vista": "seguimiento",
"titulo": "Reportar el plan de pagos",
"frases": [
"plan de pagos",
"reportar plan de pagos",
"subir al secop",
"secop plan de pagos",
"cuenta aprobada que sigue",
"cuenta unificada",
"enviado a la entidad"
],
"respuesta": "Cuando Contratación **aprueba** tu cuenta: en **ESTADO DE CUENTA → MI CUENTA DRIVE** toca **UNIFICAR Y DESCARGAR**: la app une tus documentos en un solo PDF, en el orden de la guía y con el nombre listo. Súbelo al **Plan de pagos del SECOP II** y, cuando diga «Enviado a la entidad» y la planilla esté validada, toca **REPORTAR PLAN DE PAGOS** en ESTADO DE CUENTA. Al reportarlo pierdes el acceso a la carpeta de Drive, pero en la app sigues viendo tus documentos.",
"accion": "ir:plan",
"estado": "",
"activo": true,
"orden": 24
},
{
"id": "C-PLAN-CORREGIR",
"app": "CONTRATISTA",
"vista": "seguimiento",
"titulo": "Me pidieron corregir el plan de pagos",
"frases": [
"corregir el plan de pagos",
"me devolvieron el plan",
"reportar correccion del plan",
"el supervisor no acepta el plan",
"plan de pagos rechazado"
],
"respuesta": "Corrige el plan en el **SECOP II** siguiendo lo que te indicaron y después toca **REPORTAR CORRECCIÓN DEL PLAN** en ESTADO DE CUENTA para que tu supervisor(a) lo vuelva a revisar.",
"accion": "ir:seguimiento",
"estado": "",
"activo": true,
"orden": 25
},
{
"id": "C-ESTADOS",
"app": "CONTRATISTA",
"vista": "seguimiento",
"titulo": "¿Qué significa cada estado?",
"frases": [
"que significa cada estado",
"estados de la cuenta",
"que es cerrada",
"que es revisada por supervisor",
"que es ingresada",
"que es reportada",
"que significa egreso",
"camino de la cuenta"
],
"respuesta": "El camino de tu cuenta:\n**BORRADOR** (escribes) → **INGRESADA** (radicaste) → **REPORTADA** (le avisaste a tu supervisor) → **REVISADA POR SUPERVISOR** → **APROBADA** (Contratación) → **PLAN DE PAGOS** (lo reportaste) → **CERRADA** (tu supervisor aceptó el plan) → **ORDEN DE PAGO** (Contabilidad) → **EGRESO** (Tesorería) → **PAGADA**.\nSi algo no está bien: **DEVUELTA** (corrige lo que te pidieron) o **INCOMPLETA** (faltan documentos).",
"accion": "ir:seguimiento",
"estado": "",
"activo": true,
"orden": 26
},
{
"id": "C-PAGADO",
"app": "CONTRATISTA",
"vista": "seguimiento",
"titulo": "¿Cuánto me han pagado?",
"frases": [
"cuanto me han pagado",
"cuanto llevo cobrado",
"cuanto me falta por cobrar",
"lo pagado del contrato",
"valor pagado",
"cuanto me deben"
],
"respuesta": "{{pagado}}",
"accion": "ir:plan",
"estado": "",
"activo": true,
"orden": 27
},
{
"id": "C-CUANDO-PAGAN",
"app": "CONTRATISTA",
"vista": "seguimiento,tesoreria",
"titulo": "¿Cuándo me pagan?",
"frases": [
"cuando me pagan",
"cuando me consignan",
"no me ha llegado el pago",
"cuando llega la plata",
"ya giraron",
"fecha de pago",
"no me han pagado"
],
"respuesta": "El pago llega después del **EGRESO** de Tesorería. Mira en **ESTADO DE CUENTA** en qué paso va tu cuenta y en **Egresos registrados** el número y la fecha. Si ya tiene egreso y pasaron **3 días hábiles** sin que llegue, pregúntale a Tesorería desde **SOLICITUD TESORERÍA**.\n{{estadoCuentaCorto}}",
"accion": "ir:egresos",
"estado": "",
"activo": true,
"orden": 28
},
{
"id": "C-EGRESOS",
"app": "CONTRATISTA",
"vista": "seguimiento",
"titulo": "Ver mis egresos",
"frases": [
"mis egresos",
"numero de egreso",
"comprobante de egreso",
"ver egresos",
"egresos registrados",
"copiar el egreso"
],
"respuesta": "En **ESTADO DE CUENTA → Egresos registrados** está el número de cada egreso con su botón para copiarlo, la fecha y el neto girado.",
"accion": "ir:egresos",
"estado": "",
"activo": true,
"orden": 29
},
{
"id": "C-DRIVE",
"app": "CONTRATISTA",
"vista": "seguimiento",
"titulo": "Mis documentos de la cuenta (Drive)",
"frases": [
"mi cuenta drive",
"mis documentos",
"descargar mis documentos",
"carpeta de drive",
"ver los formatos",
"descargar el informe de supervision",
"descargar la orden de pago",
"donde estan mis documentos"
],
"respuesta": "En **ESTADO DE CUENTA → MI CUENTA DRIVE** están todos los documentos de cada cuenta (tus formatos, el informe de supervisión, la orden de pago, el egreso). El ojo lo abre en la app y la flecha lo descarga con el mismo nombre que tiene en Drive.",
"accion": "ir:drive",
"estado": "",
"activo": true,
"orden": 30
},
{
"id": "C-CERTIFICACION",
"app": "CONTRATISTA",
"vista": "seguimiento,inicio",
"titulo": "Descargar la certificación del contrato",
"frases": [
"certificacion del contrato",
"certificado del contrato",
"descargar certificacion",
"constancia del contrato",
"certificado laboral",
"sacar la certificacion",
"certificacion para el sigep",
"generar certificacion"
],
"respuesta": "Baja hasta **CERTIFICACIÓN CONTRATO** en ESTADO DE CUENTA y toca **Generar certificación**: se abre aquí mismo para verla, descargarla o imprimirla, con su código y su QR. {{contratosCert}}",
"accion": "ir:certificacion",
"estado": "",
"activo": true,
"orden": 31
},
{
"id": "C-CESION",
"app": "CONTRATISTA",
"vista": "seguimiento,contratacion",
"titulo": "Certificación con cesión",
"frases": [
"certificacion con cesion",
"cedente",
"cesionario",
"me cedieron el contrato",
"cedi mi contrato"
],
"respuesta": "Si el contrato tuvo **cesión**, la certificación lo dice: al **cedente** le certifica su parte (hasta el día antes de la cesión y por el valor que le correspondió) y al **cesionario** desde el día en que empezó, con su propio valor. Cada uno la saca desde su app.",
"accion": "ir:certificacion",
"estado": "",
"activo": true,
"orden": 32
},
{
"id": "C-QUIEN-ATIENDE",
"app": "CONTRATISTA",
"vista": "inicio,seguimiento",
"titulo": "¿Quién me atiende?",
"frases": [
"quien me atiende",
"quien reviso mi cuenta",
"quien aprobo mi cuenta",
"quien hizo la orden de pago",
"quien es mi revisor",
"con quien hablo de mi cuenta"
],
"respuesta": "{{quienMeAtiende}}",
"accion": "",
"estado": "",
"activo": true,
"orden": 33
},
{
"id": "C-SUPERVISOR",
"app": "CONTRATISTA",
"vista": "proceso",
"titulo": "¿Quién me supervisa?",
"frases": [
"quien es mi supervisor",
"quien me supervisa",
"nombre del supervisor",
"mi supervisora",
"cambiaron mi supervisor"
],
"respuesta": "{{supervisor}}",
"accion": "ir:proceso",
"estado": "",
"activo": true,
"orden": 34
},
{
"id": "C-CONTRATO",
"app": "CONTRATISTA",
"vista": "inicio,proceso",
"titulo": "Datos del contrato",
"frases": [
"datos del contrato",
"mi contrato",
"ver mi contrato",
"valor del contrato",
"plazo del contrato",
"fecha de terminacion del contrato",
"numero de contrato",
"acta de inicio"
],
"respuesta": "En **DATOS DEL CONTRATO** está tu contrato completo: número, objeto, plazo, valor, CDP, RP y tus obligaciones, con quién te supervisa. {{contratoResumen}}",
"accion": "ir:proceso",
"estado": "",
"activo": true,
"orden": 35
},
{
"id": "C-COMPLETAR-CONTRATO",
"app": "CONTRATISTA",
"vista": "proceso,cuenta",
"titulo": "Completar los datos del contrato",
"frases": [
"faltan datos del contrato",
"completar datos del contrato",
"no me deja ingresar la primera cuenta",
"llenar datos del contrato",
"proceso secop",
"primera cuenta bloqueada"
],
"respuesta": "Los datos del contrato salen impresos en todos tus formatos: sin ellos no se ingresa la **primera cuenta**. En **DATOS DEL CONTRATO** toca el botón de editar y llénalos con tu clausulado y tu acta de inicio: el **N° de proceso** (solo los tres dígitos del medio: en CPS-021-2026 escribe 021), las **fechas del acta de inicio** y el **RP** (solo los últimos dígitos).",
"accion": "ir:proceso",
"estado": "",
"activo": true,
"orden": 36
},
{
"id": "C-RP",
"app": "CONTRATISTA",
"vista": "proceso",
"titulo": "¿Cómo escribo el RP?",
"frases": [
"como escribo el rp",
"registro presupuestal",
"numero del rp",
"rp del contrato",
"cdp",
"los ceros del rp"
],
"respuesta": "Solo los **últimos dígitos**, los que van después de los ceros. Si tu RP es 2026000087, escribes **87**: el año y los ceros los pone el sistema, y debajo ves cómo va a quedar.",
"accion": "ir:proceso",
"estado": "",
"activo": true,
"orden": 37
},
{
"id": "C-OBLIGACIONES",
"app": "CONTRATISTA",
"vista": "proceso,borrador",
"titulo": "¿Cuántas obligaciones tengo?",
"frases": [
"cuantas obligaciones tengo",
"mis obligaciones",
"obligaciones del contrato",
"me falta una obligacion",
"obligacion repetida",
"las obligaciones estan mal"
],
"respuesta": "{{obligaciones}} Si una obligación está mal escrita o falta, pídele la corrección a Contratación.",
"accion": "ir:proceso",
"estado": "",
"activo": true,
"orden": 38
},
{
"id": "C-PERSONALES",
"app": "CONTRATISTA",
"vista": "personales",
"titulo": "Mis datos personales",
"frases": [
"datos personales",
"cambiar mi correo",
"cambiar mi telefono",
"cambiar mi direccion",
"actualizar mis datos",
"mi cuenta bancaria",
"cambiar el banco",
"eps afp arl",
"subir mi firma",
"cambiar mi firma"
],
"respuesta": "En **DATOS PERSONALES** corriges tu correo, WhatsApp, dirección, cuenta bancaria, banco, EPS, AFP, ARL y tu **firma**. Salen impresos en tus cuentas: un banco mal escrito devuelve el pago. Lo que cambias queda al día en todos tus contratos.",
"accion": "ir:personales",
"estado": "",
"activo": true,
"orden": 39
},
{
"id": "C-NOMBRE-DOC",
"app": "CONTRATISTA",
"vista": "personales",
"titulo": "Corregir mi nombre o documento",
"frases": [
"mi nombre esta mal",
"corregir mi nombre",
"cambiar mi documento",
"mi cedula esta mal",
"nombre mal escrito"
],
"respuesta": "El **nombre** y el **documento** no se cambian desde aquí: los corrige la oficina de **Contratación**. Pídeselo desde SOLICITUD CONTRATACIÓN.",
"accion": "ir:contratacionNueva",
"estado": "",
"activo": true,
"orden": 40
},
{
"id": "C-CORREO",
"app": "CONTRATISTA",
"vista": "personales",
"titulo": "¿Por qué importa el correo?",
"frases": [
"por que importa el correo",
"correo institucional",
"no me llega la orden de pago al correo",
"que correo pongo"
],
"respuesta": "A tu **correo personal** llegan la orden de pago y el comprobante de pago. Usa uno tuyo, no el institucional.",
"accion": "ir:personales",
"estado": "",
"activo": true,
"orden": 41
},
{
"id": "C-CUENTA-CERO",
"app": "CONTRATISTA",
"vista": "personales",
"titulo": "Mi cuenta bancaria empieza por cero",
"frases": [
"mi cuenta empieza por cero",
"numero de cuenta con cero",
"el cero de la cuenta",
"cuenta bancaria mal"
],
"respuesta": "Escríbela **con el cero**, sin puntos ni guiones: el campo lo respeta. Sin ese cero el banco rechaza la transferencia.",
"accion": "ir:personales",
"estado": "",
"activo": true,
"orden": 42
},
{
"id": "C-FOTO",
"app": "CONTRATISTA",
"vista": "inicio,personales",
"titulo": "Cambiar mi foto de perfil",
"frases": [
"cambiar mi foto",
"poner foto de perfil",
"foto de perfil",
"quitar mi foto",
"subir mi foto",
"mi foto no aparece"
],
"respuesta": "Toca tu foto (o tus iniciales) en el saludo, o el menú de tu perfil → **Foto de perfil**. La recortas con el dedo y queda la misma en todas las apps de la Alcaldía.",
"accion": "foto",
"estado": "",
"activo": true,
"orden": 43
},
{
"id": "C-CLAVE",
"app": "CONTRATISTA",
"vista": "",
"titulo": "Cambiar mi contraseña",
"frases": [
"cambiar mi contraseña",
"actualizar contraseña",
"nueva contraseña",
"cambiar la clave",
"quiero otra contraseña"
],
"respuesta": "En el menú de tu perfil → **Actualizar contraseña**: te pide la actual y la nueva dos veces.",
"accion": "clave",
"estado": "",
"activo": true,
"orden": 44
},
{
"id": "C-AVISOS-TELEFONO",
"app": "CONTRATISTA",
"vista": "inicio,avisos",
"titulo": "Avisos al teléfono",
"frases": [
"no me llegan los avisos",
"notificaciones al celular",
"activar avisos",
"avisos al telefono",
"no me llegan notificaciones",
"recibir notificaciones",
"push"
],
"respuesta": "{{avisosTelefono}}",
"accion": "ir:inicio",
"estado": "",
"activo": true,
"orden": 45
},
{
"id": "C-NOTIFICACIONES",
"app": "CONTRATISTA",
"vista": "inicio,avisos",
"titulo": "Mis notificaciones",
"frases": [
"mis notificaciones",
"ver mis avisos",
"avisos sin leer",
"que me han avisado",
"el numero rojo",
"burbuja roja"
],
"respuesta": "En **MIS NOTIFICACIONES** queda todo lo que te hemos avisado, aunque el aviso del teléfono se haya perdido. {{noLeidos}} Si un aviso es de tu cuenta, al tocarlo te lleva a ella.",
"accion": "ir:avisos",
"estado": "",
"activo": true,
"orden": 46
},
{
"id": "C-COMUNICADOS",
"app": "CONTRATISTA",
"vista": "inicio,comunicados",
"titulo": "Comunicados",
"frases": [
"comunicados",
"noticias de la alcaldia",
"que informo la alcaldia",
"comunicado de contratacion",
"ver comunicado",
"documento del comunicado"
],
"respuesta": "En **COMUNICADOS** está lo que te informan la Alcaldía, Contratación, Contabilidad, Tesorería y tu supervisor(a). {{comunicadosSinLeer}} Si uno trae documentos, tócalo y usa **Ver documento**: se abre aquí mismo, con zoom, descarga e impresión.",
"accion": "ir:comunicados",
"estado": "",
"activo": true,
"orden": 47
},
{
"id": "C-PRENSA",
"app": "CONTRATISTA",
"vista": "inicio,comunicaciones",
"titulo": "Pedir apoyo a Comunicaciones",
"frases": [
"solicitud a comunicaciones",
"pedir fotos para un evento",
"pedir video",
"pieza grafica",
"publicacion en redes",
"perifoneo",
"prensa",
"cubrir un evento",
"solicitud de prensa"
],
"respuesta": "En **SOLICITUD A COMUNICACIONES** pides fotos, video, piezas gráficas, perifoneo o publicaciones para tu secretaría. Se pide con **3 días de antelación**, con el aval de tu supervisor(a) y con tu contrato **activo**. La envías tú desde el formulario.",
"accion": "ir:comunicacionesNueva",
"estado": "",
"activo": true,
"orden": 48
},
{
"id": "C-TESORERIA",
"app": "CONTRATISTA",
"vista": "inicio,tesoreria",
"titulo": "Preguntar a Tesorería por un pago",
"frases": [
"solicitud tesoreria",
"preguntar a tesoreria",
"reclamar el pago",
"pregunta por el pago",
"tesoreria no me ha pagado",
"por que no me deja preguntar a tesoreria"
],
"respuesta": "En **SOLICITUD TESORERÍA** le preguntas por el pago de una cuenta. Se puede cuando la cuenta ya tiene **egreso** (o está pagada) y han pasado **3 días hábiles**. La respuesta te llega aquí mismo y como aviso al teléfono.",
"accion": "ir:tesoreriaNueva",
"estado": "",
"activo": true,
"orden": 49
},
{
"id": "C-SOL-CONTRATACION",
"app": "CONTRATISTA",
"vista": "inicio,contratacion",
"titulo": "Pedir un trámite a Contratación",
"frases": [
"solicitud a contratacion",
"pedir adicion",
"pedir una adicion",
"cesion del contrato",
"suspension del contrato",
"modificacion del contrato",
"correccion del contrato",
"tramite con contratacion",
"otrosi",
"suspender el contrato",
"ceder el contrato",
"adicionar el contrato"
],
"respuesta": "En **SOLICITUD CONTRATACIÓN** pides o recuerdas un trámite de tu contrato: **adición, cesión, modificación o corrección** y **suspensión**. Cuéntale qué necesitas y adjunta soportes si quieres. Mientras una solicitud siga sin respuesta, no puedes pedir otra vez el mismo trámite. La respuesta te llega como aviso y queda ahí.",
"accion": "ir:contratacionNueva",
"estado": "",
"activo": true,
"orden": 50
},
{
"id": "C-GESTION",
"app": "CONTRATISTA",
"vista": "contratacion",
"titulo": "¿Qué es una gestión?",
"frases": [
"que es una gestion",
"gestiones de contratacion",
"gestion registrada"
],
"respuesta": "Es algo que Contratación **hizo** por tu contrato (te atendió, envió un documento, tramitó tu adición). La registran para que tengas el rastro aquí, aunque no hayas pedido nada.",
"accion": "ir:contratacion",
"estado": "",
"activo": true,
"orden": 51
},
{
"id": "C-DIRECTORIO",
"app": "CONTRATISTA",
"vista": "inicio,directorio",
"titulo": "Directorio institucional",
"frases": [
"directorio",
"telefono de contratacion",
"correo de tesoreria",
"donde queda la secretaria",
"numero de la alcaldia",
"contacto de una oficina",
"whatsapp de la oficina",
"telefono de tesoreria",
"telefono de contabilidad",
"correo de contratacion",
"telefono de la secretaria"
],
"respuesta": "En **DIRECTORIO INSTITUCIONAL** está dónde queda cada dependencia, con su correo y su teléfono. Toca el WhatsApp o el teléfono para escribir o llamar de una.",
"accion": "ir:directorio",
"estado": "",
"activo": true,
"orden": 52
},
{
"id": "C-SITIOS",
"app": "CONTRATISTA",
"vista": "inicio,sitios",
"titulo": "Sitios web (SECOP II, Small PDF, DIAN)",
"frases": [
"sitios web",
"secop",
"secop ii",
"small pdf",
"unir pdf",
"dian",
"sia observa",
"pagina de la alcaldia"
],
"respuesta": "En **SITIOS WEB** están SECOP II (donde subes el plan de pagos), SIA Observa, la página de la Alcaldía, **Small PDF** para unir tus PDF y la DIAN.",
"accion": "ir:sitios",
"estado": "",
"activo": true,
"orden": 53
},
{
"id": "C-TUTORIALES",
"app": "CONTRATISTA",
"vista": "inicio,tutoriales",
"titulo": "Videos tutoriales",
"frases": [
"tutoriales",
"videos",
"video de ayuda",
"como se usa la app en video",
"ver tutorial"
],
"respuesta": "En **TUTORIALES DE USO** hay videos cortos de cada paso. Empieza por el de **borrador de actividades** y después el de **ingresar cuenta**.",
"accion": "ir:tutoriales",
"estado": "",
"activo": true,
"orden": 54
},
{
"id": "C-MISREGISTROS",
"app": "CONTRATISTA",
"vista": "inicio,misregistros",
"titulo": "Mis registros (descargar mis cuentas)",
"frases": [
"mis registros",
"descargar mis cuentas",
"historial de cuentas",
"todas mis cuentas",
"exportar a excel",
"descargar en pdf mis cuentas"
],
"respuesta": "En **MIS REGISTROS** están todas tus cuentas con su periodo, lo cobrado, el estado, la orden de pago y el egreso. Descárgalas en **PDF** (con o sin las actividades) o en **Excel**.",
"accion": "ir:misregistros",
"estado": "",
"activo": true,
"orden": 55
},
{
"id": "C-GERENCIAL",
"app": "CONTRATISTA",
"vista": "misregistros",
"titulo": "Informe gerencial",
"frases": [
"informe gerencial",
"informe con graficas",
"resumen con graficas",
"kpi",
"informe para el supervisor con graficas"
],
"respuesta": "En **MIS REGISTROS → Informe gerencial** descargas un PDF con portada, cifras y gráficas de tus cuentas.",
"accion": "ir:misregistros",
"estado": "",
"activo": true,
"orden": 56
},
{
"id": "C-GUIA",
"app": "CONTRATISTA",
"vista": "",
"titulo": "Descargar la guía rápida",
"frases": [
"guia rapida",
"manual de uso",
"descargar la guia",
"instructivo",
"manual en pdf",
"como se usa la app"
],
"respuesta": "Te descargo la **guía rápida** del contratista: cada tarea en una página, con capturas y pasos. También está en el menú de tu perfil.",
"accion": "guia",
"estado": "",
"activo": true,
"orden": 57
},
{
"id": "C-INSTALAR",
"app": "CONTRATISTA",
"vista": "",
"titulo": "Instalar la app",
"frases": [
"instalar la app",
"descargar la app",
"poner la app en el celular",
"agregar a inicio",
"icono en la pantalla",
"app en iphone"
],
"respuesta": "La app se instala sin tienda: menú de tu perfil → **Instalar la app** y te muestra el botón exacto de tu navegador (en iPhone: Compartir → Agregar a inicio). Instalada, te llegan los avisos de tu cuenta.",
"accion": "instalar",
"estado": "",
"activo": true,
"orden": 58
},
{
"id": "C-SOPORTE",
"app": "CONTRATISTA",
"vista": "",
"titulo": "Hablar con soporte",
"frases": [
"hablar con soporte",
"soporte tecnico",
"reportar un problema",
"la app no funciona",
"tengo un error",
"no me deja guardar",
"se queda cargando",
"ayuda de una persona",
"falla de la app",
"hablar con una persona",
"hablar con alguien",
"que me atienda una persona"
],
"respuesta": "Cuéntale al equipo de soporte qué pasó, con hasta 3 capturas: tu caso llega al equipo de desarrollo y ves la respuesta en la app (menú de tu perfil → Soporte).",
"accion": "soporte",
"estado": "",
"activo": true,
"orden": 59
},
{
"id": "C-SOLICITUD-ACCESO-OTRO",
"app": "CONTRATISTA",
"vista": "",
"titulo": "Tengo un contrato nuevo",
"frases": [
"tengo un contrato nuevo",
"nuevo contrato",
"otro contrato",
"me renovaron el contrato",
"contrato con otra secretaria",
"dos contratos"
],
"respuesta": "Si tienes dos contratos, al entrar la app te pide escoger con cuál trabajar. Si tu contrato nuevo todavía no aparece, pídeselo a Contratación.",
"accion": "ir:contratacionNueva",
"estado": "",
"activo": true,
"orden": 60
},
{
"id": "C-ROBOT",
"app": "CONTRATISTA",
"vista": "",
"titulo": "¿Qué puedes hacer?",
"frases": [
"que puedes hacer",
"quien eres",
"para que sirves",
"como me ayudas",
"que sabes hacer",
"ayuda"
],
"respuesta": "Soy el asistente de la app. Te explico cada pantalla, te digo en qué va tu cuenta y qué te toca, y te llevo al sitio. Escribe, dicta o toca una pregunta. **No guardo ni envío nada por ti**: eso lo haces tú con los botones de la app.",
"accion": "",
"estado": "",
"activo": true,
"orden": 61
},
{
"id": "C-TERMINADO-INGRESAR",
"app": "CONTRATISTA",
"vista": "",
"titulo": "Mi contrato terminó",
"frases": [
"ingresar cuenta",
"radicar cuenta",
"hacer la cuenta",
"cuenta de cobro",
"borrador de actividades",
"reportar cuenta",
"mi contrato termino",
"contrato inactivo",
"ya no puedo hacer cuentas"
],
"respuesta": "Tu contrato **{{contrato}}** ya terminó (estado **{{estadoContrato}}**): aquí solo puedes **consultar y descargar** (estado de cuenta, egresos, certificación y mis registros). Si crees que es un error o tienes un contrato nuevo, pídeselo a Contratación.",
"accion": "ir:contratacionNueva",
"estado": "TERMINADO",
"activo": true,
"orden": 62
},
{
"id": "E-OLVIDE",
"app": "CONTRATISTA",
"vista": "entrada",
"titulo": "Olvidé mi contraseña",
"frases": [
"olvide mi contraseña",
"no me acuerdo la clave",
"recuperar contraseña",
"perdi la contraseña",
"contraseña incorrecta",
"no se mi clave",
"me bloquearon"
],
"respuesta": "Escribe tu **documento** arriba y toca **Olvidé mi contraseña**: te la mandamos al **WhatsApp** que tienes registrado. Si cambiaste de número, pídele a Contratación que lo actualice.",
"accion": "olvide",
"estado": "",
"activo": true,
"orden": 63
},
{
"id": "E-SIN-ACCESO",
"app": "CONTRATISTA",
"vista": "entrada",
"titulo": "No tengo acceso a la app",
"frases": [
"no tengo acceso",
"no puedo entrar",
"no estoy registrado",
"contrato inactivo",
"no me deja entrar",
"primer contrato",
"pedir acceso",
"acceso a la app"
],
"respuesta": "Escribe tu documento y tu contraseña y toca **Entrar**. Si tu contrato está inactivo o todavía no estás registrado, la app te pregunta si ya **aceptaste el contrato en el SECOP II** y te deja **pedir el acceso** a Contratación (si es tu primer contrato, con tu nombre, tu celular y la secretaría). Si el contrato está inactivo basta tu documento. Contratación te responde por WhatsApp.",
"accion": "documento",
"estado": "",
"activo": true,
"orden": 64
},
{
"id": "E-INSTALAR",
"app": "CONTRATISTA",
"vista": "entrada",
"titulo": "¿Cómo instalo la app?",
"frases": [
"como instalo la app",
"instalar",
"descargar la app",
"agregar a inicio",
"app en el iphone",
"poner la app en el celular"
],
"respuesta": "La app se instala sin tienda de aplicaciones: te muestro el botón exacto de tu navegador. En **iPhone** es **Compartir → Agregar a inicio**. Instalada, te llegan los avisos de tu cuenta.",
"accion": "instalar",
"estado": "",
"activo": true,
"orden": 65
},
{
"id": "E-DOCUMENTO",
"app": "CONTRATISTA",
"vista": "entrada",
"titulo": "¿Cómo escribo mi documento?",
"frases": [
"como escribo el documento",
"con puntos",
"cedula con puntos",
"que documento pongo",
"usuario"
],
"respuesta": "Tu número de documento **solo con números, sin puntos ni espacios**. El ojo junto a la contraseña te deja verla para no equivocarte.",
"accion": "documento",
"estado": "",
"activo": true,
"orden": 66
},
{
"id": "E-DOS-CONTRATOS",
"app": "CONTRATISTA",
"vista": "entrada",
"titulo": "Tengo dos contratos",
"frases": [
"tengo dos contratos",
"dos secretarias",
"escoger contrato",
"otro contrato"
],
"respuesta": "Entra como siempre: si tienes dos contratos (por ejemplo, con dos secretarías), la app te pide escoger con cuál trabajar.",
"accion": "documento",
"estado": "",
"activo": true,
"orden": 67
},
{
"id": "E-QUE-ES",
"app": "CONTRATISTA",
"vista": "entrada",
"titulo": "¿Qué es esta app?",
"frases": [
"que es esta app",
"para que sirve la app",
"que hace la app",
"quien puede entrar"
],
"respuesta": "Es la app del **contratista** de la Alcaldía de Flandes: radicas tu cuenta cada mes, sigues tu pago paso a paso, recibes los avisos y haces tus trámites desde el celular.",
"accion": "documento",
"estado": "",
"activo": true,
"orden": 68
},
{
"id": "E-SOPORTE",
"app": "CONTRATISTA",
"vista": "entrada",
"titulo": "Hablar con soporte",
"frases": [
"hablar con soporte",
"ayuda",
"la app no carga",
"error al entrar",
"se queda cargando",
"soporte"
],
"respuesta": "Si no puedes entrar por un error de la app, escríbele a soporte por **WhatsApp** con lo que te salió (una captura ayuda). Si es por tu contraseña o tu acceso, primero prueba **Olvidé mi contraseña** o pide el acceso desde la entrada.",
"accion": "soporte",
"estado": "",
"activo": true,
"orden": 69
}
];
