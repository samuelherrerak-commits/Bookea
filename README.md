# ByMariaNails · Reservas

Landing page **estática y mobile-first** para reservar citas de uñas con ByMariaNails. La clienta elige servicios, promociones y adicionales, indica si la cita es **en el spa o a domicilio** (+20 % y 15 min de traslado), aplica un cupón, escoge fecha y hora libres y asigna **obligatoriamente** su método de pago: pago en la cita, o Pago Móvil con **"Copiar todo"**, **"Ya pagué"** y el **capture** del pago. Al confirmar, la reserva se guarda en Google Sheets, Google Calendar y Drive (el capture), y la clienta pasa a WhatsApp con un mensaje ya armado. El mensaje trae un enlace **"Agregar a Google Calendar"** con la cita ya llena, y a domicilio le recuerda **enviar su ubicación por el chat** (no se pide dirección en la página, así no hace falta ninguna API de mapas).

- **Front:** Vite + React + TypeScript + Tailwind CSS v4 + Framer Motion + Sonner.
- **Backend:** Google Apps Script (`apps-script/Code.gs`) sobre Google Sheets y Google Calendar.
- **Precios:** en euros. El monto en bolívares usa la **tasa oficial del euro del BCV**.
- **Hosting:** Render (Static Site). `npm run build` genera `dist/` y no hace falta servidor.

## Landing de bookeaa (raíz `/`)

Quien abre la raíz del dominio, sin `/u/<slug>`, ve la landing comercial de **bookeaa** (`src/landing/`): problema y solución, cómo funciona, funciones, plantillas, precio (1 mes gratis, luego Pro a $15/mes) y preguntas frecuentes. Se carga en un chunk aparte, así que no pesa en la agenda de los negocios.

- **"Prueba gratis"** abre WhatsApp al número de `VITE_BOOKEAA_WHATSAPP` (+58 412 029 8203) con un mensaje ya armado (`src/landing/cta.ts`).
- **"Ver una agenda real"** lleva a `/u/<VITE_DEFAULT_SHOP>`. La raíz ya no redirige a ese negocio.
- Tipografías: Barlow Condensed (títulos) y Barlow (texto), solo en la landing.
- La sección **Plantillas** muestra capturas reales de la página de reservas (`public/landing/`). Para regenerarlas después de cambiar un estilo: `npm run capture:plantillas`. Usa el modo demo y Chromium (`CHROMIUM_PATH`, por defecto `/opt/pw-browsers/chromium`); qué negocio, estilo y colores sale en cada captura se define en `src/landing/plantillas.json`.

## Estilos y colores de cada negocio

Se eligen en la hoja **Configuracion** del negocio. Todos los estilos usan la misma distribución; cambian las fuentes, las esquinas y los detalles.

| Clave | Valores | Qué hace |
| --- | --- | --- |
| `tema_estilo` | `elegante` · `moderno` · `editorial` · `amable` · `audaz` · `clasico` · `minimal` · `retro` | Par de fuentes y forma. `audaz` es el de la landing de bookeaa: condensada, gruesa y en mayúsculas. |
| `color_principal` | hex, ej. `#1F6F5C` (el `#` es opcional) | Color de marca: botones, chips y acentos. El tono del texto de acento se oscurece o aclara solo hasta leerse bien. Si está lleno, gana sobre `paleta` y `tema_base/soft/deep`. |
| `color_fondo` | hex, ej. `#FFFFFF`, `#F4EFE6`, `#111111` | Fondo de la página. Superficies, bordes y textos salen de él; con un fondo oscuro los textos pasan a claros. Vacío = el crema de siempre. |
| `paleta` / `tema_base` / `tema_soft` / `tema_deep` | igual que antes | Siguen funcionando si `color_principal` está vacío. |

En modo demo (sin `VITE_API_URL`) se puede probar cualquier combinación en la URL: `/u/demo?estilo=retro&principal=%23C4572E&fondo=%23F6EBDD&marca=Ritual%20Spa&rubro=estetica` (`rubro`: `barberia` o `estetica`; vacío = uñas). En producción esos parámetros no hacen nada.

## Desarrollo local

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # pruebas de precios, cupos, WhatsApp y normalización
npm run build      # genera dist/
npm run check:gs   # verifica la sintaxis del Apps Script
```

Si no defines `VITE_API_URL`, la app corre en **modo demo**: usa datos de ejemplo y no envía nada. Para conectarla a tu hoja, copia `.env.example` a `.env` y completa los valores:

| Variable | Descripción |
| --- | --- |
| `VITE_API_URL` | URL de la aplicación web de Apps Script (termina en `/exec`). |
| `VITE_API_TOKEN` | Token que exige el script. Se genera con el menú **SaaS Reservas → Generar token de la API** y no se sube al repo. |
| `VITE_WHATSAPP` | Número de respaldo, solo dígitos. Por defecto: `584122516390`. La clave `whatsapp` de la hoja tiene prioridad. |
| `VITE_BOOKEAA_WHATSAPP` | WhatsApp de bookeaa al que llevan los botones de la landing. Por defecto: `584120298203`. |

## Instalar el backend (Google Apps Script)

1. Crea una hoja de cálculo en Google Sheets y abre **Extensiones → Apps Script**.
2. Pega el contenido de `apps-script/Code.gs`.
3. En **Configuración del proyecto (⚙️)**, cambia la **zona horaria** a `America/Caracas`.
4. Ejecuta **`setupDatabase`** y acepta los permisos (Hojas, Calendar y **Drive**, para guardar los captures en la carpeta "Comprobantes ByMariaNails"). Crea las hojas (incluidas **Horarios** y **Bloqueos**), los encabezados, las claves de configuración y el calendario "Citas Mariana". Si ya tenías hojas, no borra nada: solo agrega lo que falte.
5. (Opcional) Ejecuta **`seedDemoData`** para cargar servicios, promociones y el cupón `BIENVENIDA` de ejemplo.
6. Completa la hoja **Configuracion** (tabla más abajo), sobre todo los datos de Pago Móvil.
7. Ejecuta **`diagnostico`** para ver los servicios, promociones y horarios que va a recibir la página, y **`probarTasa`** para confirmar que se obtiene la tasa BCV del euro.
8. Ve a **Implementar → Nueva implementación → Aplicación web**, con *Ejecutar como: Yo* y *Quién tiene acceso: Cualquier persona*. Copia la URL.
9. Cada vez que cambies el código, entra en **Implementar → Gestionar implementaciones → ✏️ → Versión: Nueva versión**. Así la URL no cambia.

### Hojas

| Hoja | Columnas | Notas |
| --- | --- | --- |
| `Servicios` | `ID, Nombre, Precio, Duracion_Min, Tipo` | El `ID` es opcional: si está vacío se genera a partir del nombre. `Tipo` es la categoría con la que se agrupan en la página ("Manos", "Pies"…); escribe `Adicional` para los extras que se suman a un servicio. `Precio` va en euros. |
| `Promociones` | `ID, Nombre, Servicios_Incluidos, Precio_Promo` | `Servicios_Incluidos` acepta IDs o nombres separados por comas, por ejemplo `Manicure, Nivelacion`. |
| `Horarios` | `Dia, Hora_Inicio, Hora_Fin` | Tu horario semanal. Una fila por tramo; puedes repetir el día para una pausa (Lunes 09:00–12:00 y Lunes 14:00–18:00). Deja las horas vacías para cerrar ese día. |
| `Bloqueos` | `Fecha, Hora_Inicio, Hora_Fin, Motivo` | Cierra fechas u horas puntuales (vacaciones, citas por fuera). Sin horas, bloquea el día completo. El motivo no se muestra a las clientas. |
| `Sedes` | `Nombre, Direccion, Maps_URL, Activa` | Dónde se atiende. Con una sola sede la página dice "En el consultorio" (según `lugar_tipo`); con varias, el cliente elige entre sus nombres. **Todas comparten la misma agenda**. `Activa` es una casilla: desmárcala para ocultar una sede sin borrarla. |
| `Mensajes` | `Nombre, Texto` | Plantillas del WhatsApp que llega con cada reserva. Nace con 3 (Cálida, Formal, Breve); se pueden editar o agregar más. `mensaje_plantilla` elige cuál se usa. |
| `Cupones` | `Codigo, Descuento_Porcentaje, Descuento_Monto, Usos_Restantes` | Se usa el porcentaje si es mayor que 0; si no, el monto en €. Si `Usos_Restantes` está vacío, el cupón es ilimitado. |
| `Reservaciones` | `ID, Fecha_Solicitud, Cliente, Telefono, Servicios, Total, Fecha_Cita, Hora_Cita, Metodo_Pago, Referencia, Cupon, Estado, Tasa_BCV, Total_Bs, Modalidad, Direccion, Recargo, Comprobante` | La llena el script. Las reservas con Pago Móvil entran con estado `Pago por verificar` y con el enlace al capture en Drive. `Referencia` ya no se usa (queda "N/A"). |
| `Configuracion` | `Clave, Valor` | Ver la tabla siguiente. |

### Claves de `Configuracion`

| Clave | Ejemplo | Uso |
| --- | --- | --- |
| `nombre_negocio` | `Mariana` | Saludo del mensaje de WhatsApp. |
| `whatsapp` | `584122516390` | Número que recibe las reservas. |
| `hora_apertura` / `hora_cierre` / `dias_laborales` | `09:00` / `19:00` / `1,2,3,4,5,6` | Solo se usan para crear la pestaña Horarios la primera vez (o si queda vacía). |
| `intervalo_min` | `30` | Minutos entre un cupo y el siguiente. |
| `dias_anticipacion` | `21` | Cuántos días hacia adelante se muestran. |
| `anticipacion_min_horas` | `2` | Horas mínimas de aviso para reservar hoy. |
| `pm_banco`, `pm_telefono`, `pm_cedula` | `Banesco (0134)`, `0412-2516390`, `V-12.345.678` | Datos de Pago Móvil que ve la clienta. |
| `tasa_eur_manual` | `412,35` | Solo se usa si no se puede obtener la tasa BCV. |
| `recargo_domicilio_pct` | `20` | % que se suma a domicilio, sobre el precio de los servicios (antes del cupón). |
| `minutos_extra_domicilio` | `15` | Minutos de traslado que se reservan en la agenda para citas a domicilio. |
| `lugar_tipo` | `consultorio` | `spa` · `consultorio` · `barberia` · `estudio` · `salon` · `clinica` · `local` · `otro`. Da el nombre del lugar en la página y el mensaje ("En el consultorio"). |
| `lugar_nombre` | `la clínica` | Solo con `lugar_tipo = otro`: cómo se dice después de "En". |
| `permite_domicilio` | `si` | `si` agrega "A domicilio" (con `recargo_domicilio_pct` y `minutos_extra_domicilio`). Vacío o `no`: no se ofrece. |
| `mensaje_plantilla` | `Formal` | Qué fila de la pestaña Mensajes se usa. |
| `slug`, `api_url`, `pagina_url` | — | Los escribe el maestro (`crearTenant` / "Actualizar"). La barra lateral los usa para refrescar la página al guardar y para el botón "Ver página". `pagina_url` sale de la propiedad del script `sitio_url` (ej. `https://bookea.onrender.com`). |
| `direccion_spa`, `direccion_spa_url` | — | Solo hojas viejas: "Actualizar" las pasa a la pestaña Sedes. |

**Calendario:** se sigue llamando "Citas Mariana" a propósito. Si se renombrara, el script crearía un calendario nuevo y vacío y dejaría de ver las citas ya guardadas.

**Bloquear días u horas:** agrega una fila en la pestaña **Bloqueos**, o crea un evento en el calendario "Citas Mariana" (un evento de todo el día bloquea el día completo).

**Apartar la hora:** no se aparta. La hora queda bloqueada para los demás solo cuando la clienta confirma la reserva: antes de crearla, el script vuelve a comprobar el calendario y los bloqueos, y si alguien se adelantó devuelve `cupo_ocupado` y la clienta elige otra hora. La agenda se lee una vez al entrar, así que un horario ocupado puede verse libre unos segundos; la comprobación final es la que manda.

**Cambiar el token:** menú **SaaS Reservas → Generar token de la API** en la hoja maestra (lo guarda en las propiedades del script, clave `api_token`). Pon el mismo valor en `VITE_API_TOKEN` (en `.env.local` y en Render) y redespliega, y ejecuta **Actualizar todos los negocios** para que llegue a la barra lateral de cada hoja. Si no coinciden, todo responde `no_autorizado`. Sin token generado, el script no atiende a nadie.

**Después de cambiar el código del script** entra en **Implementar → Gestionar implementaciones → ✏️ → Versión: Nueva versión → Implementar**. Si en cambio creas una implementación nueva, la URL cambia y hay que actualizarla en `render.yaml`. Los cambios en la hoja (servicios, horarios, bloqueos) se ven al instante, sin volver a implementar.

### Mensaje de WhatsApp: variables

`{negocio}` `{nombre}` `{telefono}` `{fecha}` `{hora}` `{duracion}` `{servicios}` `{lugar}` `{direccion}` `{cupon}` `{total}` `{pago}` `{comprobante}` `{calendario}` `{reserva}`.

Si **todas** las variables de una línea quedan vacías (por ejemplo, no hubo cupón o el pago no fue por Pago Móvil), la línea no sale en el mensaje. Las 3 plantillas originales viven en `src/lib/mensajes.ts`, `apps-script/Code.gs` y `apps-script/cliente/Configurador.gs`; un test comprueba que sean iguales.

### Actualizar negocios existentes

En la hoja maestra, menú **SaaS Reservas**:

- **Actualizar un negocio**: le agrega a esa hoja todo lo nuevo (pestañas Sedes y Mensajes, claves, plantillas, dropdowns y la migración de `direccion_spa` a Sedes) y muestra un resumen. No borra ni pisa datos.
- **Actualizar todos los negocios**: lo mismo para cada negocio activo, con un resumen por negocio.

Después de cambiar `Code.gs`, publica una **nueva versión** de la implementación (la URL no cambia).

### Ventana de configuración y código QR (hoja de cada negocio)

`apps-script/cliente/` es un proyecto de Apps Script **aparte** del maestro: una ventana grande dentro de la hoja del negocio (menú a la izquierda, formulario al centro y vista previa a la derecha) para configurar todo sin tocar celdas. Tiene marca, estilo y colores con vista previa, lugar y sedes, domicilio, mensaje con vista previa, horario y pagos. Solo lee y escribe esa hoja; al guardar pide la página fresca (`fresh=1`) para que el cambio se vea de inmediato.

La sección **Código QR** arma una imagen con el QR del link del negocio (`pagina_url`), con sus colores y las fuentes de su estilo:

- **Formatos:** cartel de mostrador (A6, 1240×1748), historia (1080×1920), post (1080×1350), tarjeta de presentación (1050×600) y solo el código (1024×1024).
- **Textos editables:** título, subtítulo y frase destacada, más casillas para mostrar el nombre y el link escrito.
- **Colores:** "Mis colores", "Invertido" o "Blanco y negro". El código va siempre sobre una tarjeta blanca con módulos oscuros (contraste ≥ 4,5), para que cualquier cámara lo lea.
- **Descargar PNG** baja la imagen en tamaño real. Si el navegador bloquea la descarga dentro de Sheets, clic derecho sobre la imagen → "Guardar imagen como".
- La librería es `qrcode-generator` (MIT), copiada en línea en `Sidebar.html`: no depende de ningún CDN ni pide permisos extra. Un test comprueba que sea idéntica a la de npm.

Instalación:

1. Abre la **hoja plantilla** (menú maestro → *Ver ID plantilla*) → **Extensiones → Apps Script**.
2. Pega `Configurador.gs` en un archivo `.gs` y crea un archivo HTML llamado **`Sidebar`** con el contenido de `Sidebar.html` (se sigue llamando así para que en las hojas viejas baste con reemplazar el contenido). Guarda.
3. Recarga la hoja: aparece el menú **bookeaa → Configurar mi página / Generar código QR**. La primera vez pide permisos (la hoja y conectarse a la URL del maestro).

Los negocios que se creen desde entonces ya traen la ventana (se copia con la plantilla). En hojas **ya creadas** hay que pegarla una vez a mano (mismos pasos en su hoja) y correr antes "Actualizar un negocio" para que tengan las pestañas nuevas y su `pagina_url`.

### Tasa BCV del euro

El script la obtiene en este orden:

1. Caché de 3 horas.
2. Página oficial `bcv.org.ve`.
3. `ve.dolarapi.com` (tasa oficial).
4. Último valor bueno guardado.
5. `tasa_eur_manual`.

El monto en Bs se calcula en el servidor y se guarda en `Total_Bs` junto con la `Tasa_BCV` usada.

### Qué cambió respecto al script original

- Se quitó `.setHeaders()`: ese método no existe en `ContentService` y hacía fallar toda petición autorizada. Apps Script ya envía CORS por su cuenta, y el front manda el POST como `text/plain` para evitar el preflight.
- La lista de **cupones ya no se envía al navegador**. Se validan con `?action=cupon&codigo=…` y otra vez en el POST.
- El **total se recalcula en el servidor** a partir de los IDs de la orden.
- Cada reserva comprueba la disponibilidad y revisa el calendario antes de guardar, dentro de un `LockService.getScriptLock()`. Ese lock es uno solo para todos los negocios (`LockService` no tiene lock por clave), así que las reservas se guardan de a una: cada una tarda 3–6 s, lo que da ~600 por hora, muy por encima del pico esperado. Para no alargarlo, la tasa fresca se pide **después** de soltar el lock. No hay reservas temporales: la hora solo se ocupa al confirmar, y si dos clientas eligen la misma, la segunda recibe `cupo_ocupado` y vuelve a la agenda. La agenda se lee al entrar con `fresh=1`, así que el catálogo cacheado 15 minutos no oculta un cupo recién tomado.
- El método de pago es obligatorio también en el servidor. Pago Móvil exige referencia.
- `Configuracion` se envía como texto (`getDisplayValues`) y las fechas se interpretan en `America/Caracas`.

> El token viaja dentro del JavaScript público, así que funciona como filtro básico, no como secreto. Por eso las reglas importantes (precios, cupones, cupos) se validan en el servidor.

### Seguridad del backend

- **Token fuera del código:** vive en las propiedades del script (`api_token`) y en Render; ni `Code.gs`, ni `Configurador.gs`, ni `render.yaml` lo tienen escrito (un test lo comprueba).
- **Textos limpios:** nombre, teléfono, dirección, sede y cupón se cortan a un largo máximo y pierden los caracteres de control. Lo que empieza con `= + - @` se guarda como texto, para que nadie meta una fórmula en la hoja del negocio.
- **Topes anti-spam** (con `CacheService`, por negocio): 30 reservas por minuto, 3 reservas por teléfono al día y 30 consultas de cupón cada 10 minutos.
- **Capture:** máximo 3 MB y se revisa por sus primeros bytes que sea JPEG, PNG, WEBP o HEIC.
- **Configuracion pública:** el catálogo no envía `api_token` ni `api_url`. Ya no existe la acción `directorio`, que listaba todos los negocios.
- **Sitio:** la app lleva un CSP (lo arma `vite.config.ts` con el hash del único script en línea) y Render agrega `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` y HSTS.

## Publicar en Render

**Opción A: Blueprint (recomendada).** En Render, entra en **New → Blueprint**, elige este repositorio y Render leerá `render.yaml`, que ya trae el nombre del sitio, la URL `/exec` del Apps Script y el rewrite que necesita la app. Cada push a `main` redespliega solo.

**Opción B: manual.** Entra en **New → Static Site** con esta configuración:

- Build command: `npm ci && npm run build`
- Publish directory: `dist`
- Environment: `VITE_API_URL=<URL /exec>`, `VITE_API_TOKEN=<token del menú>`, `VITE_DEFAULT_SHOP=<slug>`. Opcionalmente, `VITE_WHATSAPP`.
- En **Routes** agrega `/*` → `/index.html` (rewrite), o la raíz y cada `/u/<slug>` dan 404.

Las variables `VITE_*` se incrustan al compilar. Si cambias alguna, haz **Manual Deploy → Clear build cache & deploy**.

### Antes de publicar

1. Pega el `Code.gs` nuevo en la hoja maestra (todavía sin publicar versión) y recarga la hoja. Luego **SaaS Reservas → Generar token de la API** y copia el token.
2. En Render → **Environment**: pon ese valor en `VITE_API_TOKEN` (el Blueprint ya no lo trae) y haz **Manual Deploy → Clear build cache & deploy**.
3. Mientras Render compila, publica una **versión nueva** de la implementación del script (la URL no cambia). Esta primera vez las páginas fallan un par de minutos, entre que publicas el script y termina el deploy: hazlo en una hora tranquila. En los cambios de token siguientes no hay corte, porque el token anterior sigue valiendo 24 h.
4. **SaaS Reservas → Actualizar todos los negocios**, para que cada barra lateral reciba el token nuevo. Pega también el `Configurador.gs` nuevo en la hoja plantilla y en las hojas ya creadas.
5. **SaaS Reservas → Actualizar la tasa cada 2 horas** (instala el disparador; una sola vez).
6. Haz una reserva de prueba. Después prueba una 4.ª reserva con el mismo teléfono ese día: tiene que rechazarla.
7. Activa la **verificación en 2 pasos** en la cuenta de Google dueña del script, en GitHub y en Render.
8. Si pasas el repo a **privado**, revisa en Render → **Settings → Repository** que siga conectado y haz un Manual Deploy de prueba. Render sigue desplegando mientras su app de GitHub tenga acceso al repo.

### Capacidad (cuenta de Gmail)

Con 100 negocios de ~70 clientes que reservan cada 21 días son ~333 reservas al día. El plan de 100 GB de Google One solo da espacio: **no cambia las cuotas de Apps Script**, que dependen del tipo de cuenta.

| Recurso | Uso estimado | Límite Gmail |
| --- | --- | --- |
| Eventos de Calendar creados | ~333/día | 5.000/día |
| Ejecuciones de la web app | ~3–5 mil/día | sin tope diario (30 a la vez, 6 min c/u) |
| UrlFetch (tasa) | ~24/día con el disparador | 20.000/día |
| Disparadores | ~12 corridas cortas/día | 90 min/día |
| Hojas | ~1.200 filas/año por negocio | 10 M de celdas |

El espacio que sí crece es el de los captures de Pago Móvil en el Drive del dueño del script: ~100–250 KB cada uno (el front los comprime a 1280 px). Con la mitad de las reservas por Pago Móvil son ~0,6–1,2 GB al mes.

### Por qué el rewrite y el `VITE_DEFAULT_SHOP`

El negocio se lee de la ruta: `slugFromLocation()` saca el slug de `/u/<slug>`, y a veces de `?shop=`. Como el build no genera un archivo por negocio, `/u/samuel-herrera` no existe en `dist/` y Render respondería 404. El rewrite `/* → /index.html` resuelve eso: Render sirve el archivo real si existe y solo aplica la regla cuando no, así que `/assets/*` y `/favicon.svg` no se ven afectados.

La raíz `/` sí sirve `index.html`, pero no trae slug, y sin slug el catálogo se pide sin negocio y sale vacío. Por eso `main.tsx` manda a `/u/<VITE_DEFAULT_SHOP>` antes del primer render. Cada negocio tiene su propio enlace `/u/su-negocio`; esto solo decide qué pasa al abrir el dominio pelado.

## Estructura

```
apps-script/        Backend (Code.gs + appsscript.json)
src/lib/            Lógica pura: api, normalize, pricing, slots, whatsapp, format, motion
src/state/order.tsx Estado de la orden (reducer + borrador en sessionStorage)
src/components/     UI: tarjetas, carrito (bottom sheet), cupón, checkout
src/views/          Pantallas: catálogo, agenda, pago, confirmación
```
