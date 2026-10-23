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

## Activarlo en un negocio
Hasta que esté la sección Equipo en Mi negocio (ronda 2), se activa con el **conector de Claude** (`guardar_configuracion`, sección `equipo`). Por ejemplo:

> En spa-sol activa el equipo en modo servicio con "Cualquiera". Agrega a Carla Méndez (carla@gmail.com, directora, hace todo) y a Andrea Rojas (andrea@gmail.com, especialista, solo faciales y cejas, de martes a sábado de 9 a 5).

O a mano, en la hoja del negocio:
1. **Actualizar el negocio** (menú) para que aparezca la pestaña **Equipo**.
2. Llenar las personas. El calendario de cada una lo crea bookeaa al guardar desde Mi negocio o el conector. A mano hay que pegar el ID de un calendario.
3. En **Configuracion**, poner:
   - `equipo_activo = si`;
   - `equipo_modo`;
   - `equipo_cualquiera`.

Cuando una persona sale de la lista, queda **inactiva**: su calendario y sus citas no se borran.

## Precio
$25 al mes hasta 5 personas, y $5 por cada persona extra. Se cobra desde la central en la ronda 3.

## Lo que viene
- **Ronda 2 (Mi negocio):**
  - la sección Equipo para el administrador;
  - cada persona entra con su Gmail y ve solo sus citas;
  - cada persona puede bloquear sus horas;
  - avisos de sus reservas en su teléfono.
- **Ronda 3:** el plan Team en la central, métricas por persona y la página de venta.

## Probarlo sin hoja (modo demo)
`/u/demo?equipo=servicio&rubro=estetica`. También con `equipo=persona` o `equipo=ambos`, y `&con=sofia` para entrar por el link de Sofía.
