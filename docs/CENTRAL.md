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
- **Pagos:** lo cobrado en el mes y el historial.

## Dónde se guarda (archivo maestro)
- **Tenants:** columnas nuevas `Telefono`, `Vence`, `Ultimo_Pago` y `Notas`. Se agregan solas la primera vez.
- **Pagos** (pestaña nueva): `Fecha, Slug, Negocio, Monto, Meses, Metodo, Referencia, Vence_Antes, Vence_Nuevo, Registrado_Por`.

## Estados
| Estado | Cuándo |
|---|---|
| En prueba | `Vence` es hoy o después y nunca pagó |
| Activo | `Vence` es hoy o después y ya pagó alguna vez |
| Por cobrar | `Vence` ya pasó |
| Suspendido | `Activo = no` |
| Sin fecha | No tiene `Vence` (negocios de antes de la central). Ponle la fecha en "Editar datos" o registra un pago |

La central no suspende a nadie sola: tú decides cuándo.

## Puesta en marcha
1. Pega el `Code.gs` nuevo en el Apps Script maestro y publica una **nueva versión**.
2. Revisa que tu Gmail esté en `dueno_admins`.
3. Abre `bookeaa.com/central`, entra y, en iPhone, agrégala a inicio desde Safari.
4. A los negocios que ya existen ponles su fecha. Hay dos formas:
   - "Editar datos" → *Pagado / prueba hasta*;
   - registrar su último pago.
