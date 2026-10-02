# Bot de WhatsApp de bookeaa

El bot atiende el número **+58 422 029 8203** con la API oficial de WhatsApp. Hace lo siguiente:
- **Afiliar un negocio**: pide los datos y agenda la **cita de configuración e inducción**.
  - Presencial: solo los sábados, en el negocio. Pide la dirección.
  - Google Meet: de lunes a viernes. El enlace se crea solo.
- **Precios** y **cómo funciona**.
- **Soporte**: resuelve solo lo básico. Si no alcanza, abre un caso y te pasa el chat.
- **Hablar con una persona**: te avisa y se calla.

Atiendes los chats desde la **bandeja**: `https://bookeaa-bot.<tu-subdominio>.workers.dev/bandeja`.

```
WhatsApp ──► Meta ──► Worker de Cloudflare (bot/) ──► Apps Script maestro (Code.gs)
                         │  D1: chats y mensajes          ├─ Calendario "Afiliaciones bookeaa" (+ Meet)
                         └─ /bandeja                       ├─ Hojas Prospectos y Soporte
                                                           └─ Correo de aviso
```

> **Importante:** el número queda conectado a la API y **deja de funcionar en la app de WhatsApp**. Todo se atiende desde la bandeja.

## Cuánto cuesta
Tarifas de Meta para Venezuela ("Resto de Latinoamérica"), desde el 1-oct-2026:

| Qué | Costo |
|---|---|
| Mensajes que te escriben | Gratis |
| Lo que responde el bot o tú, dentro de las 24 h desde el último mensaje de esa persona | 1.000 gratis al mes, después ≈ $0,0113 c/u |
| Escribirle a alguien que no te ha escrito en 24 h (aunque lo escribas tú a mano) | Solo con plantilla aprobada: aviso ≈ $0,0113, promoción ≈ $0,074 |
| Te escriben desde un anuncio de Instagram o Facebook | 72 h gratis |
| Cloudflare Workers + D1, Apps Script, Calendar, Meet | $0 |

Ejemplos:
- 80 negocios al mes conversando con el bot son unos 960 mensajes: **$0**.
- 250 negocios: unos **$23**.

La bandeja (Ajustes) muestra cuántos mensajes llevas en el mes. Los recordatorios de la cita los manda Google Calendar por correo, así que no cuestan nada.

Revisa las tarifas vigentes en la página de precios de Meta antes de lanzar, porque cambian.

## Puesta en marcha (todo desde el navegador)

### 1. Cloudflare (gratis)
1. Crea la cuenta en <https://dash.cloudflare.com>.
2. **Workers y Pages**: copia el **Account ID** (está en la columna derecha).
3. **Mi perfil → Tokens de API → Crear token**:
   - usa la plantilla **"Editar Cloudflare Workers"**;
   - agrega el permiso **Cuenta · D1 · Editar**;
   - crea el token y cópialo.

### 2. Meta (WhatsApp Cloud API)
1. Si el número está en la app de WhatsApp, **bórralo de la app** antes: WhatsApp Business → Ajustes → Cuenta → Eliminar cuenta.
2. Crea el **portfolio de empresa** "bookeaa" en <https://business.facebook.com>.
3. En <https://developers.facebook.com> → **Mis apps → Crear app**:
   - caso de uso **"Conectarte con clientes por WhatsApp"**, tipo Empresa;
   - vincúlala al portfolio.
4. **WhatsApp → Configuración de la API**:
   - agrega el número **+58 422 029 8203** y verifícalo con el código por SMS;
   - pide el nombre visible **bookeaa**;
   - copia el **Phone number ID** y el **WhatsApp Business Account ID**.
5. **Token permanente**: Configuración del negocio → Usuarios del sistema → Agregar (administrador).
   - Asígnale la app y la cuenta de WhatsApp con control total.
   - **Generar token**: sin vencimiento, con los permisos `whatsapp_business_messaging` y `whatsapp_business_management`.
6. **App secret**: en la app, Configuración → Básica → Clave secreta de la app.
7. **Publica la app** (modo Live). Te pide una política de privacidad: usa `https://bookeaa.com/privacidad/`.
8. **Método de pago** en WhatsApp Manager → Configuración → Pagos. Solo se cobra si pasas de lo gratis o mandas plantillas.

### 3. Apps Script (archivo maestro)
1. Pega el `apps-script/Code.gs` nuevo.
2. Activa el servicio **Google Calendar API**. Dos formas:
   - en el editor, Servicios (+) → Google Calendar API → identificador `Calendar`;
   - o pega `apps-script/appsscript.json`.
3. Menú **SaaS Reservas → Bot de WhatsApp: generar token**. Copia el token: va como `BOT_TOKEN` en GitHub.
4. Menú **Bot de WhatsApp: avisos y calendario**:
   - pon el correo que recibe los avisos;
   - pon la dirección de la bandeja, cuando la tengas (paso 5).

   Esto crea el calendario **"Afiliaciones bookeaa"**.
5. **Implementar → Gestionar implementaciones → Nueva versión**. La URL `/exec` no cambia y es la misma de `VITE_API_URL`.

Horarios de la cita, en Configuración del proyecto → Propiedades del script:

| Clave | Por defecto | Qué es |
|---|---|---|
| `bot_sabado_desde` / `bot_sabado_hasta` | `08:00` / `17:00` | Sábados presenciales |
| `bot_sabado_min` | `90` | Duración, con traslado |
| `bot_sabados` | `4` | Cuántos sábados ofrecer |
| `bot_meet_desde` / `bot_meet_hasta` | `09:00` / `17:00` | Lunes a viernes por Meet |
| `bot_meet_min` | `60` | Duración |
| `bot_dias_meet` | `8` | Cuántos días hábiles ofrecer |
| `bot_anticipacion_horas` | `12` | Anticipación mínima |

Para bloquear un día u unas horas, crea un evento en "Afiliaciones bookeaa": el bot no ofrece esa hora.

### 4. GitHub (despliegue automático)
Ve a Settings → Secrets and variables → Actions → **New repository secret** y crea estos:

| Secreto | Valor |
|---|---|
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | Del paso 1 |
| `WA_TOKEN` | Token permanente (paso 2.5) |
| `WA_PHONE_ID`, `WA_WABA_ID` | Del paso 2.4 |
| `APP_SECRET` | Del paso 2.6 |
| `VERIFY_TOKEN` | Una frase larga que inventes (la vuelves a usar en el paso 5) |
| `BANDEJA_CLAVE` | Tu clave para entrar a la bandeja (mínimo 12 caracteres) |
| `APPS_SCRIPT_URL` | La URL `/exec` del Apps Script |
| `BOT_TOKEN` | Del paso 3.3 |

Después ve a **Actions → Bot de WhatsApp → Run workflow**:
- crea la base de datos y despliega el bot;
- al final muestra la dirección `https://bookeaa-bot.<subdominio>.workers.dev`.

Desde ahí, cada cambio en `bot/` que se fusione en main se despliega solo.

### 5. Conectar Meta con el bot
1. En la app de Meta, ve a **WhatsApp → Configuración → Webhook**:
   - URL de devolución de llamada: `https://bookeaa-bot.<subdominio>.workers.dev/webhook`;
   - Token de verificación: el mismo `VERIFY_TOKEN`.
2. Toca **Verificar y guardar** y suscríbete al campo **messages**.
3. Entra a `/bandeja` con tu clave y abre **Ajustes**:
   - **Crear plantillas en Meta**: Meta las aprueba en minutos u horas;
   - **Configurar perfil**: pone la descripción, la web y el Instagram.
4. Sube la foto de perfil en WhatsApp Manager. Usa `whatsapp/perfil.png` del kit de marca.
5. Escríbele "hola" al número desde otro teléfono.

## Si no responde
- **Meta**: revisa que el webhook diga *Verificado* y que **messages** esté suscrito. La app tiene que estar **publicada**.
- **Cloudflare**: ve a Workers → bookeaa-bot → **Logs** y mira los errores en vivo.
- **"Firma inválida"**: el `APP_SECRET` de GitHub no coincide con el de la app.
- **No agenda**:
  - revisa `APPS_SCRIPT_URL` y `BOT_TOKEN`;
  - confirma que publicaste una versión nueva del Apps Script;
  - confirma que autorizaste los permisos de Calendar, Drive y Gmail. La primera vez, ejecuta cualquier opción del menú del bot.

## Desarrollo local
```bash
cp bot/.dev.vars.ejemplo bot/.dev.vars   # y completa los valores
npx wrangler d1 migrations apply bookeaa-bot --local --config bot/wrangler.toml
npm run bot:dev                          # http://localhost:8787/bandeja
npm run bot:test
```

Archivos:
- `src/flujo.ts`: la conversación. Es una máquina de estados con pruebas en `flujo.test.ts`.
- `src/textos.ts`: todo lo que dice el bot.
- `src/bandeja.ts` y `src/bandejaHtml.ts`: la bandeja.
- `src/apps.ts`: las llamadas al Apps Script.
