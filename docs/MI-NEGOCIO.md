# Mi negocio: la app de cada dueño

`bookeaa.com/negocio` es la app del dueño de cada negocio. Se agrega a la pantalla de inicio y abre como app, sin la barra del navegador.

Tiene el diseño de bookeaa.com: fondo blanco, negro carbón, Barlow y títulos en Barlow Condensed en mayúsculas. Ver `html.mi-negocio` en `src/index.css`.

**Equipo** solo aparece en Configurar si el negocio tiene el plan bookeaa team (se cambia desde la central).

- **Hoy:**
  - las citas del día con hora, cliente, servicio y botón de WhatsApp;
  - cuál es la próxima;
  - los pagos por verificar, con el capture y el botón **Pago recibido**, que cambia el estado a *Confirmada* en la hoja.
- **Próximas:** las citas de los próximos 14 días, por día.
- **Reagendar** (botón en cada cita de Hoy y Próximas; solo el administrador): para cuando el cliente no puede ir.
  - Se elige el día (45 días a la vista) y una de las **horas libres**. Salen según el horario, lo que dura la cita (la de su evento), las otras citas del calendario y los días libres.
  - Con equipo se puede **pasar a otra persona**: se ven sus horas libres y la cita pasa a su calendario.
  - **Otra hora** permite poner cualquier hora. Si choca con otra cita o queda fuera del horario, avisa y se puede **mover igual**. Una hora que ya pasó no se acepta.
  - Al moverla se mueve su evento en el calendario y se actualiza la fila (`Fecha_Cita`, `Hora_Cita` y, con equipo, `Profesional`). La columna `Reagendada` guarda la fecha y hora de antes, y la cita muestra 🔁 *Reagendada*.
  - Después ofrece **Avisarle por WhatsApp** al cliente con el mensaje listo ("Tu cita de … quedó para el …").
- **Cancelar** (junto a Reagendar; solo el administrador):
  - pide un motivo opcional y ofrece **Mejor reagendarla**;
  - al cancelar se borra su evento del calendario, así la hora queda libre en la página;
  - la fila queda *Cancelada* con el motivo en `Motivo_Cancelacion`, y el panel la cuenta como cancelada;
  - ofrece **Avisarle por WhatsApp** con el mensaje listo y el link para reservar otra.
- **Configurar:** lo mismo que la ventana de la hoja ("Configurar mi página"), desde el teléfono. Se guarda en la hoja del negocio y la página lo muestra en la próxima carga:
  - **Servicios:** nombre, precio, minutos, categoría y adicionales (pestaña Servicios);
  - **Horario:** días con uno o varios tramos, cada cuántos minutos, días a mostrar, aviso mínimo y alertas del calendario;
  - **Días libres:** días completos u horas, de hoy en adelante (pestaña Bloqueos; los pasados se conservan);
  - **Cupones:** código, porcentaje o monto, y usos que quedan (vacío = ilimitado) (pestaña Cupones);
  - **Código QR:** cartel de mostrador, historia, post, tarjeta o solo el código, con los colores y las fuentes del negocio. El link es siempre su página (`/u/<slug>`) y no se puede cambiar; se descarga en PNG o se comparte;
  - **Mi página:** nombre, títulos, logo, estilo y color;
  - **Lugar:** tipo de lugar, sedes y domicilio;
  - **Pagos y WhatsApp:** número, moneda, métodos, Pago Móvil y tasa de respaldo;
  - **Mensaje de WhatsApp:** cuál plantilla se usa y su texto;
  - **Ticket de reserva:** activarlo, o facturación fiscal con imprenta.
- **Avisos:**
  - activar los avisos en el teléfono;
  - cambiar de negocio, si tiene varios;
  - ver su página de reservas;
  - cerrar sesión.

Los avisos son:
- 📅 cada reserva nueva;
- 💸 cada Pago Móvil por verificar;
- ✖️ cada cita cancelada desde Mi negocio (ya no hay recordatorio);
- 🔁 cada cita reagendada, con la hora nueva y la de antes (el recordatorio pasa a la hora nueva);
- ⏰ 30 minutos antes de cada cita;
- ☀️ a las 7:00 a. m., las citas del día.

En iPhone los avisos necesitan iOS 16.4 o más y la app agregada a inicio desde Safari.

```
Teléfono del dueño ──► bookeaa.com/negocio ──► Apps Script (accion: 'dueno')
                         ▲  Entrar con Google      ├─ verifica la cuenta y busca su negocio (Tenants → Email)
                         │                         ├─ lee Reservaciones de su hoja
     avisos (Web Push)   │                         └─ guarda la suscripción en el Worker
                         │
Worker del bot (bookeaa-bot) ◄── reserva nueva (Apps Script, al reservar)
   D1: suscripciones y citas      cron cada 5 min: recordatorios y resumen de las 7:00
```

El dueño entra con el **Gmail de la columna `Email` de la pestaña Tenants**. Puede haber varios correos en la celda, separados por coma.

## Panel (solo el administrador)
La pestaña **Panel** muestra cuánto dinero dejaron las reservas en un período: **hoy, semana, este mes, mes pasado, 30 días o 12 meses**.
- **Facturado:** la suma del total de cada reserva, sin las canceladas, y cuánto cambió contra el período anterior.
- **Ya atendido y agendado:** lo de las citas hasta hoy y lo de las que vienen.
- **Reservas, ticket promedio, clientes y canceladas.**
- **Pagos Móviles por verificar**, con su monto.
- **Facturado por día**, o por mes en 12 meses. Al pasar el mouse o tocar una barra se ve el monto exacto.
- **Cuánto hizo cada persona** (bookeaa team): lo que facturaron sus citas, cuántas fueron y qué parte del total.
- **Servicios** y **cómo te pagan**, ordenados por lo que dejaron.

Son las cifras que marcó cada reserva en la página, en la moneda del negocio. No es lo que se cobró de verdad: un descuento hecho en persona no aparece. Las personas del equipo no ven el Panel.

Arriba del Panel hay tres vistas: **Números** (lo de arriba), **Clientes** e **Historial**. La app recuerda la última que abriste.

### Clientes (CRM)
Los clientes salen de las reservas, agrupados por **teléfono** (da igual si lo escribieron `0412…` o `+58 412…`; sin teléfono, por nombre).
- Arriba: cuántos clientes hay, cuántos son **frecuentes** (3 visitas o más), cuántos están **por volver** y qué % **vuelve** (de los que vinieron, cuántos vinieron más de una vez).
- Cada cliente tiene un **segmento**, en este orden:
  - **Inactivo:** más de 120 días sin venir y sin cita agendada.
  - **Por volver:** vino 2 veces o más, no tiene cita y ya pasó más de lo que suele tardar (su promedio entre visitas × 1,3, mínimo 21 días).
  - **Frecuente:** 3 visitas o más.
  - **Nuevo:** su primera cita fue hace menos de 30 días.
  - **Ocasional:** el resto.
- Se filtra por segmento y se busca por nombre o teléfono. El botón de WhatsApp abre el chat; a los que están **por volver** o **inactivos** les deja escrito un mensaje para invitarlos, con el link de reservas.
- Al tocar un cliente se abre su **ficha**: visitas, cuánto ha gastado, cada cuántos días viene, última y próxima cita, cancelaciones, sus servicios de siempre, quién lo atiende y **toda su historia** de citas (con el motivo si se canceló y si se reagendó).

Una visita es una cita no cancelada con fecha de hoy o antes.

### Historial
Todas las citas de un mes, por día, desde la primera reserva del negocio. Se pasa de mes con las flechas y se filtra por **atendidas, agendadas o canceladas**, por persona del equipo y por cliente, teléfono o servicio. **Descargar Excel (CSV)** baja lo que se ve, para abrirlo en Excel o Google Sheets. Al tocar una cita se abre la ficha del cliente.

## En computadora
Mi negocio, la central y la página de reservas se adaptan a la pantalla:
- **Mi negocio:**
  - las secciones van en una barra lateral, en vez de abajo;
  - el Panel usa todo el ancho, con las cifras en una fila y los gráficos lado a lado.
- **Página de reservas:**
  - el catálogo se abre a dos columnas;
  - la agenda y el pago quedan al centro, con las horas en cuatro columnas.

En el teléfono todo sigue igual.

## Mi plan y pagos
Es la primera sección de **Configurar**. Muestra:
- el estado del plan: mes gratis, al día, pago pendiente o página en pausa;
- la fecha de corte, que es el mismo día del mes en que el negocio entró a bookeaa, y los 3 días para pagar;
- el monto en bolívares a la tasa BCV del día. Se puede pagar más de un mes;
- los datos de Pago Móvil de bookeaa, con botones para copiar.

Después de pagar, el dueño **reporta el pago** con la fecha, su banco, su teléfono, la referencia y el monto. Si el banco ya lo muestra, se aprueba al instante. Si no, queda *por verificar* y le avisamos al confirmarlo o al rechazarlo.

Cuando el pago está pendiente o la página está en pausa, **Hoy** muestra un aviso rojo con **"Pagar ahora"**. Los avisos de cobro abren directo esta sección (`/negocio?ver=plan`).

Cómo se concilia y cuándo se pausa una página: [CENTRAL.md](CENTRAL.md#ciclo-de-cobro).

## Puesta en marcha (una sola vez)

### 1. ID de cliente de Google
1. Entra a <https://console.cloud.google.com> con la cuenta de bookeaa y crea un proyecto, por ejemplo **bookeaa**.
2. **APIs y servicios → Pantalla de consentimiento de OAuth:**
   - tipo **Externo**;
   - nombre **bookeaa**;
   - tu correo;
   - dominio `bookeaa.com`.

   Publícala con **Publicar app**. Solo pide nombre y correo, así que no necesita verificación de Google.
3. **APIs y servicios → Credenciales → Crear credenciales → ID de cliente de OAuth:**
   - tipo **Aplicación web**;
   - nombre **bookeaa Mi negocio**;
   - **Orígenes de JavaScript autorizados:** `https://bookeaa.com` y `https://www.bookeaa.com`;
   - URI de redirección: no hace falta ninguno.
4. Copia el **ID de cliente**. Termina en `.apps.googleusercontent.com` y no es secreto.

### 2. Render
En el servicio **bookea → Environment**, agrega `VITE_GOOGLE_CLIENT_ID` con ese ID y vuelve a desplegar.

### 3. Apps Script (archivo maestro)
1. Pega el `Code.gs` nuevo y publica una **nueva versión**: Implementar → Gestionar implementaciones → ✏️ → Nueva versión.
2. En **Configuración del proyecto → Propiedades del script**:

   | Propiedad | Valor |
   |---|---|
   | `google_client_id` | El mismo ID de cliente |
   | `dueno_admins` | Tu Gmail: ves todos los negocios (para soporte). Opcional |
   | `bot_bandeja_url` | Ya debería estar, por el bot: `https://bookeaa-bot.<subdominio>.workers.dev/bandeja` |

3. La primera vez, ejecuta cualquier función del editor para autorizar **UrlFetchApp**. Lo pide porque habla con Google y con el Worker.

### 4. Worker
No hay que hacer nada a mano. Al fusionar, la Action del bot:
- aplica la migración `0002_avisos.sql`;
- despliega el cron de cada 5 minutos.

Las claves VAPID de los avisos las crea el Worker solo y las guarda en D1.

## Probar
1. Abre `bookeaa.com/negocio` en el teléfono y entra con un Gmail que esté en Tenants.
2. iPhone: Safari → Compartir → **Agregar a inicio**. Abre **Mi negocio** desde el ícono → **Avisos → Activar avisos**.
3. Haz una reserva de prueba en `/u/<tu-negocio>`: llega "📅 Nueva reserva".

## Si algo falla
- **"No pudimos verificar tu cuenta de Google":** revisa que `google_client_id` (Apps Script) y `VITE_GOOGLE_CLIENT_ID` (Render) sean el mismo ID.
- **"… no tiene un negocio en bookeaa":** ese Gmail no está en la columna Email de Tenants.
- **El botón de Google no aparece:** el dominio no está en **Orígenes de JavaScript autorizados**.
- **Los avisos no llegan:** en Avisos toca **"Enviarme un aviso de prueba"**. Dice exactamente qué pasó:
  - "Falta configurar el servidor de avisos (bot_bandeja_url)" → agrega esa propiedad en el Apps Script;
  - "El bot_token del Apps Script no coincide…" → el `bot_token` del Apps Script y el secreto `BOT_TOKEN` de GitHub tienen que ser iguales;
  - "No hay ningún teléfono registrado" → apaga los avisos y vuelve a activarlos;
  - "No se pudo entregar: web.push.apple.com 403…" → el código y la razón que dio Apple o Google.

  Además:
  - revisa `bot_bandeja_url`;
  - revisa que la Action del bot haya corrido después de fusionar;
  - en Cloudflare → Workers → bookeaa-bot → Logs están los envíos.
- **Cerrar la sesión de todos los dueños:** borra la propiedad `sesion_secreto` del Apps Script. Se crea otra sola.
