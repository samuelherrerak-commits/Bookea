# Central de bookeaa

`bookeaa.com/central` es la app del dueño de bookeaa para administrar los negocios. Se agrega a inicio como **"bookeaa Central"**, separada de "Mi negocio".

## Quién entra
Solo los correos de la propiedad **`dueno_admins`** del Apps Script maestro, separados por coma. Se entra con Google, igual que en "Mi negocio".

## Qué hace
- **Resumen:**
  - activos, en prueba, por cobrar (vencidos) y los que vencen en 5 días;
  - el ingreso mensual: activos × $10.
- **Negocios:**
  - buscar y filtrar por estado;
  - cada negocio muestra hasta cuándo está pagado o en prueba, o hace cuánto venció.
- **Detalle de un negocio:**
  - **Registrar pago:** meses, monto, método y referencia. Extiende el vencimiento desde la fecha en que vence, así no pierde días por pagar antes. Si ya venció, cuenta desde hoy. Un negocio suspendido que paga se reactiva.
  - **Cobrar por WhatsApp:** abre el chat con el mensaje listo (vencido, por vencer o fin de la prueba).
  - **Suspender o reactivar:** con `Activo = no`, la página deja de recibir reservas.
  - **Editar** el Gmail, el WhatsApp, la fecha y las notas.
  - **Abrir** su hoja y su página.
- **Nuevo negocio:**
  - nombre, link (`/u/…`, sale solo del nombre), Gmail del dueño, WhatsApp y días de prueba (30 por defecto);
  - crea la hoja, el calendario y la carpeta, igual que "Nuevo negocio" del menú. Tarda unos 30 s.
- **Prospectos:** los que agendaron su afiliación con el bot de WhatsApp y todavía no son negocio. "Crear negocio" llena el alta con sus datos.
- **Cobros:** los Pago Móvil que reportan los negocios desde "Mi plan y pagos" (ver abajo).
- **Pagos:** lo cobrado en el mes y el historial.
- **Marketing:** el calendario y la cola de publicaciones (ver abajo).

## En computadora: panel y negocios a fondo
En una pantalla de 1024 px o más, la central cambia de forma:
- tiene una barra lateral;
- abre en el **Panel**;
- las hojas de acciones salen como ventana en el centro.

En el teléfono el Panel también está, en la barra de abajo.

**Panel:**
- **Cifras principales:**
  - ingreso mensual recurrente, es decir, los que pagan × $10, y lo que sumarían los que están en prueba;
  - lo cobrado este mes contra el mes pasado;
  - las reservas de toda la plataforma en 30 días, contra los 30 anteriores;
  - los negocios activos y las altas del mes.
- **Gráficos de 12 meses:** lo cobrado por bookeaa, las reservas de todos los negocios y las altas. El mes en curso va más claro. Al pasar el mouse se ve el valor exacto.
- **Negocios por estado** y **próximos cortes**: los de los 7 días siguientes, con lo que hay por cobrar.
- **Necesitan atención**, cuando un negocio:
  - venció o está por cobrar;
  - no tiene reservas en 30 días;
  - bajó a la mitad;
  - está por terminar su prueba;
  - tiene la hoja sin poder leerse.
- **Actividad por negocio:** una tabla que se ordena por reservas, cambio, última reserva, corte o nombre. Muestra:
  - las minibarras de los últimos 6 meses;
  - las próximas citas;
  - los clientes.

**Negocios** en computadora es una tabla con el plan, las reservas de 30 días, la actividad y el contacto. Cada fila tiene **Gestionar** (pagos, editar, suspender) y **Ver a fondo**.

**Ver a fondo** muestra un negocio completo. En el teléfono se abre desde su detalle: "📊 Ver el negocio a fondo".
- **Cifras:** reservas y facturación de 30 días con su cambio, ticket promedio, clientes y qué porcentaje volvió, y cancelaciones.
- **Gráficos por mes:** reservas, facturación (en la moneda del negocio) y clientes nuevos.
- **Cuándo le reservan:** un mapa de calor de día × hora.
- **Rankings:**
  - servicios más pedidos, con lo que facturan;
  - cómo le pagan;
  - estado de las reservas;
  - dónde atiende.
- **Las últimas reservas** y **su plan en bookeaa:** pagos, reportes, configuración y notas.

**De dónde salen los números:** el Apps Script lee la pestaña Reservaciones de la hoja de cada negocio (operaciones `metricas` y `negocio`). Las canceladas se cuentan aparte. La facturación es la suma del total de cada reserva, no lo que el negocio cobró de verdad. El panel se guarda 10 minutos en caché; **Recalcular ahora** lo vuelve a leer.

## Marketing: calendario y cola
La pestaña **Marketing** (barra lateral o barra de abajo) es el calendario y la cola de publicaciones de bookeaa. Solo organiza y aprueba; la producción (videos, voz, carruseles) sigue en la carpeta `marketing/` del repositorio.
- **Cifras:** publicaciones de hoy, por aprobar (con las atrasadas en rojo), aprobadas y publicadas.
- **Cola:** las publicaciones por día, con hora de Caracas, tipo y estado. Filtros: por publicar, borradores, aprobadas, publicadas y todas.
- **Calendario:** el mes con un punto por publicación (el color es el estado). Tocar un día muestra lo de ese día.
- **Cada publicación:** se edita la fecha, la hora, el título, el texto, los hashtags, el link del video o las imágenes y las notas.
  - **Estados:** borrador → **Aprobar** → **Marcar publicado** (guarda quién y cuándo). También **Volver a borrador** y **Omitir**.
  - **Copiar texto** deja el caption con sus hashtags listo para pegar.
  - El link del video debe ser público (no de Drive): Instagram no lo puede descargar de Drive.
- **Publicar con Make:** el escenario *bookeaa - publicar aprobados de Central* corre cada 15 minutos. Le pide a Central las publicaciones **aprobadas** cuya fecha y hora de Caracas ya llegaron y que tienen link (`accion: 'make'`, op `pendientes`), las publica en Instagram (Reel o carrusel) y avisa el resultado (op `publicado`): si salió bien queda **Publicado**; si falló vuelve a **Borrador** con el motivo en Notas.
  - Make usa su propio token (`make_token`): menú del Apps Script → *Make: generar token de marketing*. Se pega una sola vez en el primer módulo del escenario ("Set variable"). No uses el token público de la web ni lo compartas por chat.
  - En un carrusel, el campo "Link" lleva un link por lámina, en orden (hasta 10).
- **Alarmas de TikTok:** el botón *Alarmas de TikTok* de la pestaña descarga un calendario (`.ics`) con un evento y una alarma a la hora de cada publicación de TikTok pendiente. Al abrirlo en el teléfono se agrega a su calendario. Cada evento trae el texto con hashtags y el link del video, y la hora ya viene convertida desde Caracas. En una publicación, **Abrir video** lleva al archivo para guardarlo en el teléfono y subirlo.
- **Borradores en TikTok:** Marketing conecta tu cuenta de TikTok (Login Kit) y manda cada video de la cola a tus **borradores** (Content Posting API, modo *Upload*); tú lo terminas y publicas desde la app de TikTok. Solo publica en la cuenta del dueño de la app.
  - Configuración (una vez): en la app de TikTok registra la **Redirect URI** `https://bookeaa.com/central`, activa los productos *Login Kit* (permiso `user.info.basic`) y *Content Posting API* (permiso `video.upload`), y guarda las claves con el menú del Apps Script **"TikTok: guardar claves de la app"**. Las claves nunca van en el repositorio ni en un chat.
  - Uso: **Conectar TikTok** → autorizas → en una publicación de video, **Enviar a TikTok (borrador)**. Llega una notificación a la bandeja de TikTok.
  - El video se sube por partes (no se pasa un link), porque con link TikTok exige verificar el dominio. Máximo 64 MB. TikTok permite hasta 5 borradores pendientes cada 24 horas.
  - **Carruseles como fotos:** en un carrusel aparece **Enviar fotos a TikTok (borrador)**. Las fotos sí se piden por link, y TikTok solo baja fotos de un dominio verificado: las láminas se leen de `https://bookeaa.com/fotos-tiktok/carrusel-N-NN.jpg` (la misma numeración que en Cloudinary; se generan con `node marketing/scripts/render-carruseles.mjs N --tiktok` y se suben al repo en `public/fotos-tiktok/`). En el portal de TikTok hay que verificar **bookeaa.com** (o el prefijo `https://bookeaa.com/fotos-tiktok/`) en *Manage URL properties*; si no, el envío responde "falta verificar bookeaa.com". Se puede usar otra base con la propiedad `tiktok_fotos_base`.
  - **Envío automático:** el escenario de Make llama a Central con `op: "tiktok"` en cada ronda (cada 15 min). Central manda a los borradores, de a 2 por ronda como máximo, los videos y carruseles con link que ya tocan (aprobados de ayer o de hoy, o de hoy ya publicados en Instagram) y que no tengan la marca *En borradores de TikTok* en Notas. Si TikTok rechaza una pieza se anota *Error TikTok* en Notas y no se reintenta sola (queda el botón); si TikTok responde que hay demasiados borradores pendientes, se reintenta en la siguiente ronda. Hace falta TikTok conectado.
  - Los permisos duran 24 h (se renuevan solos con el refresh token, que vale 365 días).
- **Importar calendario:** la primera vez trae las publicaciones de octubre (`src/central/marketing-semilla.json`). Importar de nuevo solo agrega las que faltan; no pisa lo que ya editaste.
- **Dónde se guarda:** pestaña **Marketing** del archivo maestro (`ID, Fecha, Hora, Tipo, Titulo, Plataforma, Caption, Hashtags, Media, Estado, Publicado_En, Notas`). Se crea sola. Make puede leer esa misma pestaña para publicar lo que esté en `aprobado`.
- **Regenerar los datos iniciales:** `python3 marketing/personal/fyp/generar_cola.py` (lee `CALENDARIO-OCTUBRE.csv`).

## Dónde se guarda (archivo maestro)
- **Tenants:** columnas nuevas `Telefono`, `Vence`, `Ultimo_Pago` y `Notas`. Se agregan solas la primera vez.
- **Pagos** (pestaña nueva): `Fecha, Slug, Negocio, Monto, Meses, Metodo, Referencia, Vence_Antes, Vence_Nuevo, Registrado_Por`.
- **PagosNegocio:** cada Pago Móvil que reporta un negocio, con su estado (`Por verificar`, `Aprobado`, `Rechazado`) y con qué movimiento del banco se concilió.
- **MovimientosBanco:** los abonos que entraron al banco, leídos de los correos o del estado de cuenta. No se repiten.
- **Tenants → `Suspendido_Auto`:** marca a los que pausó el cobro automático, para reactivarlos solos al pagar.

## Estados
| Estado | Cuándo |
|---|---|
| En prueba | `Vence` es hoy o después y nunca pagó |
| Activo | `Vence` es hoy o después y ya pagó alguna vez |
| Por cobrar | `Vence` pasó hace 3 días o menos (los días de gracia) |
| Vencido | Pasaron más de 3 días sin pago. La revisión de la mañana lo suspende |
| Suspendido | `Activo = no` |
| Sin fecha | No tiene `Vence` (negocios de antes de la central). Usa **"Usar fecha de ingreso como corte"** en su detalle, ponle la fecha en "Editar datos" o registra un pago |

## Ciclo de cobro
- **Fecha de corte:** el mismo día del mes en que entró el negocio. Si entró un 31, en los meses cortos es el último día.
- **Pago:** $10 al mes, en bolívares a la tasa BCV del día, por Pago Móvil a tus datos.
- **Gracia:** 3 días después del corte.
- **Al 4.º día sin pago** la página se pausa sola (`Activo = no`, `Suspendido_Auto = si`) y te llega un aviso al bot.
- **Al aprobarse un pago** se extiende `Vence` desde el corte (no desde el día en que pagó, así el corte no se mueve) y se reactiva la página.
- **Avisos al negocio** (en su teléfono, por "Mi negocio"):
  - 3 días y 1 día antes del corte;
  - el día del corte;
  - cada día de gracia;
  - cuando se pausa;
  - cuando se aprueba o se rechaza su pago.

## Cobros: la pasarela de bookeaa
No usa la API del banco ni cobra comisión. El negocio paga por Pago Móvil y reporta el pago en **Configurar → Mi plan y pagos**: fecha, banco, teléfono, referencia y monto. Luego se concilia solo con lo que entró al banco, por dos vías:

1. **Correos del banco** (cada 10 minutos): el Apps Script lee en tu Gmail los avisos de "Pago Móvil recibido" con la búsqueda `correo_banco_query`.
   - La búsqueda por defecto es `from:(bdvenlinea OR banvenez OR bancodevenezuela) newer_than:7d`. Ajústala en Cobros → *Tus datos de Pago Móvil* si los correos te llegan de otra dirección.
   - Si tu banco solo manda SMS, reenvíalos a ese Gmail con una app de reenvío de SMS: el lector entiende el texto del SMS del BDV.
2. **Estado de cuenta:** en Cobros → *Subir estado de cuenta*. Lo descargas del BDV en Excel (.xls/.xlsx) o CSV.
   - Encuentra solas las columnas Fecha, Referencia, Concepto y Abono/Crédito (o Monto) y se queda solo con los abonos.
   - El PDF no se puede leer.

**Cuándo se aprueba solo:** cuando un abono coincide con un pago reportado en los tres datos:
- **referencia:** los últimos 4 a 6 dígitos;
- **monto:** con un margen de Bs. 0,50 o del 0,5 %;
- **fecha:** hasta 3 días de diferencia.

Lo que no coincide queda **Por verificar**, con una pista: el abono que más se le parece. Ahí lo apruebas o lo rechazas con un motivo, y al negocio le llega el aviso. Los abonos que nadie ha reportado se ven en *Abonos sin reporte*.

## Puesta en marcha
1. Pega el `Code.gs` nuevo en el Apps Script maestro y publica una **nueva versión**.
2. Revisa que tu Gmail esté en `dueno_admins`.
3. Abre `bookeaa.com/central`, entra y, en iPhone, agrégala a inicio desde Safari.
4. A los negocios que ya existen ponles su fecha. Hay tres formas:
   - "Usar fecha de ingreso como corte";
   - "Editar datos" → *Pagado / prueba hasta*;
   - registrar su último pago.
5. **Cobros → Tus datos de Pago Móvil:** banco, teléfono, cédula o RIF y titular. Es lo que ven los negocios. Se guardan como propiedades `pm_banco`, `pm_telefono`, `pm_cedula` y `pm_titular`.
6. **Cobros → Activar automáticos.** Crea dos disparadores:
   - los correos del banco, cada 10 minutos;
   - la revisión de cortes, cada día a las 7:00 (Caracas).

   La primera vez Google te pide permiso para leer Gmail. Si el botón da error de permisos, en el editor del Apps Script ejecuta una vez la función **`instalarCobros`** y acepta. También puedes hacerlo desde el menú del archivo maestro: **Cobros: activar automáticos**.

   Los correos del banco tienen que llegar al **mismo Gmail dueño del Apps Script**.


## Programador de publicaciones (Instagram vía webhook + TikTok), sin gastar créditos de Make

El escenario original de Make consultaba a Central cada 15 minutos (3–4 créditos por vuelta aunque no hubiera nada): unos 380 créditos al día, y el plan gratis trae 1.000 al mes. Ahora **Apps Script lleva el reloj** (los temporizadores son gratis) y **Make solo corre cuando hay una pieza que publicar**:

1. Un temporizador de Apps Script (`programadorMarketing`, cada 15 min) busca lo **aprobado, con link y que ya toca** (fecha y hora de Caracas).
2. Cada pieza se manda por **webhook** a Make (`makeEnviarPendientes_`) y queda con la marca *Enviado a Make* en Notas, para no repetirse. Si el webhook falla, no hay marca y se reintenta en la siguiente ronda. Aprobar de nuevo una pieza quita la marca y permite reenviarla.
3. El escenario de Make (`docs/make-webhook-blueprint.json`) tiene 3 pasos: recibir, publicar en Instagram y avisar a Central con `op: "publicado"` (o devolverla a borrador con el error). **≈3 créditos por pieza**, unos 12 al día con 4 piezas.
4. El mismo temporizador manda a TikTok (borradores y fotos) con `tiktokAutomatico_`, sin pasar por Make: 0 créditos.

Puesta en marcha (una vez):
- En Make: escenario nuevo desde `docs/make-webhook-blueprint.json` (Importar blueprint), con un webhook propio y tu conexión de Instagram; completa el ID de la cuenta de Instagram y activa el escenario.
- En el Apps Script: menú **"Make: guardar webhook de publicación"** (pega la dirección `https://hook.…` del webhook; no va en el repo ni en un chat) y luego **"Marketing: activar programador (Instagram y TikTok)"**.
- El token de Make (`make_token`) sigue siendo el que genera el menú *Make: generar token de marketing*; Apps Script lo incluye en cada llamada para que Make pueda avisar el resultado.
- Con el programador activo se desactiva el escenario viejo que consulta cada 15 min (el `op: "pendientes"` sigue existiendo por si se quiere volver a ese modo).
