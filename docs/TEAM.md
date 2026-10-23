# bookeaa team

bookeaa para negocios con varias personas atendiendo: centros de estética, peluquerías, barberías grandes, consultorios con varios doctores. Es el mismo bookeaa (la misma página `/u/<negocio>`, la misma central y el mismo Mi negocio), con **una agenda por persona**.

## Cómo reserva el cliente
El negocio elige el modo (`equipo_modo`):

| Modo | Flujo |
|---|---|
| `servicio` (por defecto) | Elige el servicio → **¿Con quién?** (solo las personas que lo hacen) → los días y horas de esa persona |
| `persona` | La página abre con **Nuestro equipo** → elige a la persona → ve solo sus servicios → sus días y horas |
| `ambos` | Ve el equipo arriba (elegir es opcional) y los servicios abajo; si no eligió, se le pregunta en la agenda |

- **Cualquiera disponible** (`equipo_cualquiera = si`):
  - junta las horas libres de todas las personas que hacen el servicio;
  - al reservar, el servidor asigna a la que esté libre con menos citas ese día;
  - con una sola persona posible, se elige sola.
- **Link de cada persona:** `bookeaa.com/u/<negocio>?con=<id>`. También vale el nombre: `?con=carla`. Entra con esa persona ya elegida, para que cada una lo comparta en su Instagram.
- **El mensaje de WhatsApp dice "💁 Con: Carla" debajo de la hora.** Las plantillas pueden usar la variable `{profesional}` para ponerlo en otro lugar.
- **La reserva queda en Reservaciones** con las columnas `Profesional` y `Profesional_ID`.

## Agendas
- **Cada persona tiene su calendario** de Google: "Citas Carla · Spa Sol". Lo crea bookeaa en la cuenta maestra y se lo comparte a su Gmail (puede verlo y editarlo). Lo que ella agende ahí, por ejemplo una cita médica, también la ocupa.
- **Su horario** sale de la columna `Horario` de la pestaña **Equipo**, como `lun 09:00-18:00, sáb 09:00-14:00`. Si está vacía, usa el del negocio.
- **Qué servicios hace:** la columna `Servicios`, con los IDs separados por coma. Vacía = hace todos.
- **Lo que ocupa a todos:** los **bloqueos** (días libres) y los eventos del **calendario del negocio**. Sirve para cerrar el local un día.

## Mi negocio con equipo
- **El administrador**, con el correo del negocio, ve todo lo de siempre y además:
  - **Configurar → Equipo**: prende o apaga las reservas por persona, elige el modo y "Cualquiera disponible", y agrega personas con su nombre, Gmail, cargo, foto, servicios y horario propio. También puede copiar el link de cada persona y ver sus bloqueos.
  - En **Hoy** y **Próximas**, cada cita dice "con Carla", y hay botones para ver las de una sola persona.
  - Activar el equipo pide el plan **team**. Si el negocio es individual, la sección muestra la oferta con un botón a WhatsApp.
- **Cada persona del equipo** entra a `bookeaa.com/negocio` con su Gmail y ve:
  - **Hoy** y **Próximas**: solo sus citas. Puede confirmar el Pago Móvil de las suyas.
  - **Bloqueos**: bloquea un día completo o unas horas. Cada bloqueo es un evento 🚫 en su calendario, así que también lo ve en Google Calendar.
  - **Avisos**: le llegan las reservas y los recordatorios de sus citas, y su propio resumen de la mañana.
  - No ve precios, configuración ni el plan.
- **Si un correo es de dos negocios**, por ejemplo dueño de uno y del equipo de otro, Mi negocio deja cambiar entre ellos en Avisos.

Cómo funciona por dentro:
- **Equipo_Indice:** una pestaña del archivo maestro (`Email, Slug, Persona_ID, Nombre, Activo`) que dice de qué negocio es cada correo, sin abrir todas las hojas. Se llena sola al guardar el equipo.
- **Avisos:** el Worker guarda de quién es cada teléfono (migración `0004_equipo.sql`, columna `persona`). El administrador recibe todo; cada persona, lo suyo. Los avisos de cobro solo le llegan al administrador.

## Plan y precio (central)
- **Individual:** $10 al mes.
- **bookeaa team:** $25 al mes hasta 5 personas activas, y $5 por cada persona más. Se calcula solo con la columna `Plan` de Tenants y las personas activas del índice.
- **Lo que paga cada negocio se usa en:**
  - el ingreso mensual de la central;
  - Mi plan y pagos (el monto en bolívares);
  - los avisos de corte;
  - el monto sugerido al registrar un pago.
- **En la central:**
  - "Nuevo negocio" elige el plan;
  - el detalle tiene **"Pasar a bookeaa team"** (o a individual);
  - la lista marca "team · N".
- **En "Ver a fondo"**, la tarjeta **Por persona del equipo** muestra las citas y la facturación de cada una en los últimos 12 meses.
- **El conector de Claude** también maneja el plan (`crear_negocio` y `editar_negocio`).

## Página de venta
`bookeaa.com/team` explica:
- los tres modos de reservar;
- las funciones;
- el precio, con una calculadora por personas;
- las preguntas frecuentes.

Tiene un botón de WhatsApp a bookeaa y otro para verlo funcionando en el demo. La landing la enlaza en el menú (**Team**).

## Activarlo en un negocio
1. **En la central:** "Pasar a bookeaa team".
2. **El dueño, en Mi negocio → Configurar → Equipo:** agrega a su gente con su Gmail y prende "Reservas por persona". A cada una le llega una invitación al calendario "Citas <nombre> · <negocio>".
3. **Cada persona** entra a bookeaa.com/negocio con su Gmail y activa sus avisos.

También se puede hacer desde el conector de Claude (`guardar_configuracion`, sección `equipo`).

Cuando una persona sale de la lista, queda **inactiva**: su calendario y sus citas no se borran y deja de contar para el precio.

## Probarlo sin hoja (modo demo)
- **Página:** `/u/demo?equipo=servicio&rubro=estetica`. También con `equipo=persona` o `equipo=ambos`, y `&con=sofia`.
- **Mi negocio:** `/negocio`, botón "Entrar (demo)".
  - Barbería Norte es el administrador.
  - En Avisos se cambia a Spa Sol, donde eres Carla, del equipo.
- **Central:** `/central`. Spa Sol es team, con 6 personas.
- **Venta:** `/team`.
