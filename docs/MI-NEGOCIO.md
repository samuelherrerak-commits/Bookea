# Mi negocio: la app de cada dueño

`bookeaa.com/negocio` es la app del dueño de cada negocio. Se agrega a la pantalla de inicio y abre como app, sin la barra del navegador.

- **Hoy:**
  - las citas del día con hora, cliente, servicio y botón de WhatsApp;
  - cuál es la próxima;
  - los pagos por verificar, con el capture y el botón **Pago recibido**, que cambia el estado a *Confirmada* en la hoja.
- **Próximas:** las citas de los próximos 14 días, por día.
- **Avisos y más:**
  - activar los avisos en el teléfono;
  - cambiar de negocio, si tiene varios;
  - ver su página de reservas;
  - cerrar sesión.

Los avisos son:
- 📅 cada reserva nueva;
- 💸 cada Pago Móvil por verificar;
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
2. iPhone: Safari → Compartir → **Agregar a inicio**. Abre **Mi negocio** desde el ícono → **Avisos y más → Activar avisos**.
3. Haz una reserva de prueba en `/u/<tu-negocio>`: llega "📅 Nueva reserva".

## Si algo falla
- **"No pudimos verificar tu cuenta de Google":** revisa que `google_client_id` (Apps Script) y `VITE_GOOGLE_CLIENT_ID` (Render) sean el mismo ID.
- **"… no tiene un negocio en bookeaa":** ese Gmail no está en la columna Email de Tenants.
- **El botón de Google no aparece:** el dominio no está en **Orígenes de JavaScript autorizados**.
- **Los avisos no llegan:**
  - revisa `bot_bandeja_url`;
  - revisa que la Action del bot haya corrido después de fusionar;
  - en Cloudflare → Workers → bookeaa-bot → Logs están los envíos.
- **Cerrar la sesión de todos los dueños:** borra la propiedad `sesion_secreto` del Apps Script. Se crea otra sola.
