Actúa como Ingeniero de Software Senior y Diseñador UX/UI. Construye una aplicación web ESTÁTICA, completa y de calidad de producción: un Sistema de Control de Estudios para un colegio de bachillerato en Venezuela (1er a 6to Año).

Usa las skills de diseño **Emil Kowalski** (animaciones con propósito, micro-interacciones precisas) e **Impeccable** (UI pulida, estados completos, accesibilidad). Si están instaladas, cárgalas antes de escribir la interfaz.

## 0. STACK OBLIGATORIO — JAVASCRIPT VANILLA
- HTML5 + CSS3 + JavaScript ES2022 con **ES Modules nativos** (`<script type="module">`).
- **Sin frameworks ni build step**: nada de React, Vue, Vite, Webpack, npm ni TypeScript. El sitio debe funcionar abriendo `index.html` con cualquier servidor estático (GitHub Pages, Netlify, Vercel).
- **Sin Tailwind**: CSS propio organizado con variables (`:root`) para tokens de diseño.
- Librerías solo vía CDN (cdnjs / jsDelivr), mínimas:
  - `lucide` (íconos SVG).
  - `jspdf` + `jspdf-autotable` (boletines PDF).
- Animaciones: transiciones CSS y **Web Animations API** (`element.animate()`); nada de librerías de animación.
- Backend: **Google Apps Script** (Web App) + **Google Sheets** como base de datos.

## 1. ARQUITECTURA DEL FRONTEND

```
/
├── index.html              # shell único (SPA)
├── css/
│   ├── tokens.css          # colores, tipografía, espaciado, radios, sombras, easing
│   ├── base.css            # reset, tipografía, layout
│   ├── components.css      # botones, inputs, tablas, badges, modales, toasts, skeletons
│   └── views.css           # estilos por vista
├── js/
│   ├── main.js             # arranque, registro de rutas
│   ├── router.js           # router por hash (#/admin/pagos) con guardas por rol
│   ├── store.js            # estado global pub/sub (getState, setState, subscribe) + caché
│   ├── api.js              # cliente GAS + modo MOCK conmutable
│   ├── auth.js             # login, logout, sesión en sessionStorage, expiración
│   ├── config.js           # GAS_URL, USE_MOCK, datos del colegio (nombre, DEA, logo)
│   ├── utils/
│   │   ├── dom.js          # helper h(tag, attrs, ...children) para crear nodos sin innerHTML inseguro
│   │   ├── grades.js       # cálculo ponderado, definitivas, aprobado/aplazado
│   │   ├── format.js       # fechas es-VE, cédulas, montos Bs/USD
│   │   └── motion.js       # fadeIn, slideUp, stagger, respetando prefers-reduced-motion
│   ├── components/         # funciones que devuelven HTMLElement
│   │   ├── Table.js  Modal.js  Toast.js  Badge.js  Input.js  Select.js
│   │   ├── StatCard.js  Skeleton.js  EmptyState.js  ConfirmDialog.js
│   │   ├── Sidebar.js  Topbar.js  Toggle.js  Tabs.js
│   │   └── LockScreen.js   # bloqueo por morosidad
│   ├── views/
│   │   ├── login.js
│   │   ├── admin/  coordinador/  profesor/  estudiante/  representante/
│   ├── pdf/boletin.js      # generador del boletín con jsPDF
│   └── mock/mockData.js    # datos realistas para desarrollo sin backend
├── gas/Code.gs             # backend completo para pegar en Apps Script
└── README.md
```

Reglas de código:
- Cada componente es una función pura `Componente(props) → HTMLElement`. Cada vista exporta `render(container, params)` y opcionalmente `destroy()` para limpiar listeners.
- **Nunca** insertes datos del usuario con `innerHTML`; usa `textContent` o el helper `h()` (prevención de XSS).
- Delegación de eventos en tablas grandes.
- El `store` cachea catálogos (grados, materias, periodo activo) y solo vuelve a pedir datos al invalidar tras una escritura.

## 2. DISEÑO (Emil Kowalski + Impeccable)
- **Estética:** minimalista, institucional, corporativa. Tokens: Azul Marino `#0F172A`, Azul Institucional `#1E3A8A`, Azul Acción `#2563EB`, Gris Pizarra `#64748B`, fondo `#F8FAFC`, Esmeralda `#059669` (solvente/aprobado), Rojo `#DC2626` (moroso/aplazado), Ámbar `#D97706` (pendiente).
- **Tipografía:** Inter (Google Fonts), cifras tabulares (`font-variant-numeric: tabular-nums`) en notas y montos.
- **Movimiento:** duraciones de 150–250 ms, easing `cubic-bezier(0.23, 1, 0.32, 1)`; entrada de vistas con fade + desplazamiento de 8px; stagger de 30 ms en tarjetas; `:active { transform: scale(0.98) }` en botones; modales que escalan desde 0.96. Todo se desactiva con `prefers-reduced-motion`.
- **Estados obligatorios** en cada vista: Cargando (skeleton), Vacío (ícono + texto + acción), Error de conexión (con botón Reintentar), Bloqueo por morosidad y Confirmación de guardado (toast).
- **Accesibilidad:** navegación completa por teclado, foco visible, `aria-live` para toasts, contraste AA, labels en todos los inputs, trampa de foco en modales.
- **Responsive:** sidebar colapsable en móvil; la vista de asistencia se diseña mobile-first.

## 3. BASE DE DATOS (Google Sheets — una pestaña por tabla, fila 1 = encabezados)
1. `Periodos`: id, periodo ("2026-2027"), lapso_activo (1|2|3), estado (activo|cerrado). Solo un periodo activo.
2. `Lapsos`: id, periodo_id, numero (1|2|3), estado (abierto|cerrado), fecha_inicio, fecha_fin.
3. `Grados`: id, nombre ("1er Año" … "6to Año"), orden (1–6), seccion, docente_guia_id.
4. `Usuarios`: id, cedula, email, password_hash, salt, nombre, rol (admin|coordinador|profesor|estudiante|representante), grado_id (solo estudiantes), estado (activo|inactivo), telefono.
5. `Relacion_Familiar`: representante_id, estudiante_id, parentesco.
6. `Materias`: id, nombre, grado_id, profesor_id.
7. `PlanesEvaluacion`: id, materia_id, periodo_id, lapso, titulo, tipo (examen|taller|exposicion|proyecto|otro), porcentaje, fecha.
8. `Notas`: id, estudiante_id, evaluacion_id, calificacion (1–20), actualizado_por, fecha_actualizacion.
9. `Asistencia`: id, materia_id, periodo_id, lapso, fecha, estudiante_id, estado (presente|ausente|justificado).
10. `Pagos`: estudiante_id, estado_pago (solvente|moroso), ultima_actualizacion, observaciones.
11. `ReportesPago`: id, representante_id, estudiante_id, banco, referencia, monto, moneda (Bs|USD), fecha_pago, estado (pendiente|aprobado|rechazado), revisado_por.
12. `RasgosPersonalidad`: id, estudiante_id, periodo_id, lapso, rasgo, valoracion (A|B|C|D).
13. `Avisos`: id, titulo, contenido, fecha, roles_destino (lista separada por comas), autor_id.
14. `Historial_Academico`: id, estudiante_id, periodo_id, grado_id, resultado (promovido|repitiente|materia_pendiente), materias_pendientes.
15. `Sesiones`: token, usuario_id, expira.
16. `Auditoria`: fecha, usuario_id, accion, detalle.

Incluye en `Code.gs` una función `setupSheets()` que cree todas las pestañas con sus encabezados y cargue datos semilla (6 grados, materias por grado, usuarios de prueba por rol).

## 4. REGLAS DE NEGOCIO (sistema venezolano)
- **Escala:** toda calificación es de **1 a 20** (se admite un decimal). Mínima aprobatoria: **10**.
- **Plan de evaluación:** por materia y lapso, las evaluaciones deben sumar **exactamente 100%**. No se pueden cargar notas de un lapso cuyo plan no sume 100%.
- **Nota de lapso** = Σ (nota_i × porcentaje_i / 100), redondeada a 2 decimales (resultado entre 1 y 20).
- **Definitiva de materia** = promedio de los 3 lapsos, redondeada según la norma (≥ x.5 sube). Aprueba con ≥ 10.
- **Inasistencia:** si las ausencias injustificadas superan el **25%** de las clases del lapso, la materia se marca “Aplazada por inasistencia” (visible en UI y boletín).
- **Morosidad:** si `estado_pago = moroso`, el estudiante y su representante **no ven notas ni boletín**. El **backend** también lo bloquea: nunca devuelve notas de un moroso aunque se llame la API por consola.
- **Lapsos:** solo se cargan notas y asistencia en el lapso abierto. Un lapso cerrado es de solo lectura para profesores.
- **Relación profesor–alumno:** el profesor solo ve sus materias; al abrir una materia recibe únicamente los estudiantes activos cuyo `grado_id` coincide con el de esa materia. Validado también en backend (un profesor no puede guardar notas de una materia que no es suya).

## 5. ROLES Y VISTAS
**A. Login:** cédula o correo + contraseña, validación inline, estado de carga en el botón, mensaje de error genérico (no revelar si el usuario existe). Redirección automática al panel según rol. Cierre de sesión e inactividad (30 min).

**B. Administrador (control total):**
- Dashboard: total de estudiantes, profesores, % de solvencia, reportes de pago pendientes, avisos recientes.
- Año escolar: crear periodo, abrir/cerrar lapsos (con confirmación).
- Grados y materias: crear/editar grados y materias, asignar profesor y docente guía.
- Usuarios: CRUD de todos los roles, vincular representantes con estudiantes, reset de contraseña.
- Finanzas: listado con buscador (cédula/nombre), filtros solvente/moroso, toggle instantáneo de estado con actualización optimista y reversión si falla; bandeja de **ReportesPago** para aprobar (→ solvente) o rechazar.
- Avisos: crear/editar/eliminar con roles destino.
- Cierre académico: tabla de propuesta (Promovido / Materia pendiente / Repitiente) calculada por definitivas; doble confirmación (modal rojo + escribir “CERRAR AÑO”); ejecuta el cambio de `grado_id` en bloque, registra en `Historial_Academico` y los de 6to Año pasan a estado “egresado”.
- Auditoría: lista de acciones sensibles.

**C. Coordinador (solo lectura + avisos):** vista de todas las materias y su estado de plan (completo al 100% / incompleto / sin crear), avance de carga de notas por profesor, rendimiento por grado y materia (promedios, % de aplazados), puede publicar avisos y abrir/cerrar lapsos si el admin lo habilita.

**D. Profesor:**
- Dashboard: tarjetas por materia asignada (“Matemáticas — 1er Año”, “Física — 5to Año”) con nº de estudiantes y estado del plan.
- Encabezado fijo en cada materia: **“[Materia] — [Grado] | Lapso [N] · [Periodo]”**.
- Plan de evaluación: agregar/editar/eliminar actividades (título, tipo, fecha, %) con barra de progreso hacia 100% (roja si excede, verde al llegar).
- Carga de notas: matriz tipo hoja de cálculo (estudiantes × evaluaciones), navegación con flechas/Enter/Tab, validación 1–20 en tiempo real (celda en rojo si es inválida), columna de nota de lapso calculada al instante, indicador de cambios sin guardar, guardado masivo con toast, aviso al salir con cambios pendientes.
- Asistencia (mobile-first): fecha seleccionable, lista con toggles grandes “Presente” por defecto, opción “Justificado”, botón “Todos presentes”, % de inasistencia por estudiante con alerta al acercarse al 25%.
- Rasgos de personalidad (si es docente guía del grado).

**E. Estudiante:**
- Solvente: tarjetas por materia con notas de L1, L2, L3 y definitiva parcial (color aprobado/aplazado); detalle por materia con cada actividad, %, fecha y nota; resumen de asistencia; avisos.
- Moroso: `LockScreen` institucional (candado, “Solvencia Administrativa Requerida”, contactos de administración). Los avisos siguen visibles.

**F. Representante:**
- Selector de representados (tarjetas por hijo, puede tener varios en distintos grados).
- Por cada hijo: estado de cuenta, asistencia y notas (sujeto a morosidad).
- Reportar pago: formulario (estudiante, banco, referencia, monto, moneda, fecha) con historial de reportes y su estado.
- **Descargar Boletín** (solo si solvente).

## 6. BOLETÍN PDF (`js/pdf/boletin.js`, jsPDF + autotable)
Formato A4 vertical, sobrio: membrete (logo, nombre del colegio, código DEA, RIF, dirección), título “Boletín Informativo — Periodo [X]”, datos del estudiante (nombre, cédula, grado, sección) y del representante; tabla de materias con L1, L2, L3, Definitiva y Observación (Aprobada/Aplazada/Inasistencia); tabla de rasgos de personalidad (A/B/C/D); totales de inasistencia; espacios de firma (Director(a) y Docente Guía) y sello; pie con fecha de emisión. Nombre de archivo: `Boletin_[Cedula]_[Periodo].pdf`.

## 7. BACKEND — `gas/Code.gs`
- `doGet(e)`: health check y lecturas públicas mínimas (nombre del colegio, periodo activo).
- `doPost(e)`: router por `action`. El frontend envía `fetch(GAS_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action, token, payload }) })` — **text/plain para evitar el preflight CORS**, ya que Apps Script no permite configurar cabeceras CORS. Toda respuesta es `ContentService` JSON con forma `{ ok: true, data }` o `{ ok: false, error: { code, message } }`.
- Seguridad:
  - Contraseñas con SHA-256 + salt (`Utilities.computeDigest`); nunca en texto plano.
  - `login` genera un token aleatorio (`Utilities.getUuid()`) guardado en `Sesiones` / `CacheService` con expiración; toda acción (salvo login) valida token y rol.
  - Matriz de permisos por acción y rol; validación de pertenencia (profesor ↔ materia, representante ↔ estudiante).
  - Bloqueo de morosidad aplicado en backend.
  - `LockService` en escrituras para evitar condiciones de carrera; escrituras por lotes (`setValues`) en lugar de fila por fila.
  - Registro en `Auditoria` de cambios de notas, pagos y cierres.
- Acciones: `login`, `logout`, `getBootstrap` (periodo, grados, avisos según rol), `getTeacherSubjects`, `getClassList`, `getEvaluationPlan`, `saveEvaluationPlan`, `getGrades`, `saveGrades`, `getAttendance`, `markAttendance`, `getStudentReport`, `getMyChildren`, `reportPayment`, `listPaymentReports`, `reviewPaymentReport`, `updatePaymentStatus`, `listUsers`, `saveUser`, `linkRepresentative`, `createPeriod`, `setLapsoState`, `saveGrade`, `saveSubject`, `saveTraits`, `saveNotice`, `deleteNotice`, `getCoordinatorOverview`, `previewPromotion`, `executePromotion`.

## 8. MODO MOCK
`config.js` expone `USE_MOCK = true` por defecto. `api.js` enruta al mock con la misma firma y latencia simulada (300–600 ms) y errores aleatorios opcionales para probar estados de error. `mockData.js` incluye: periodo 2026-2027 con lapso 2 abierto, 6 grados, materias reales del bachillerato venezolano, 1 admin, 1 coordinador, 4 profesores (uno con “Matemáticas 1er Año” y “Física 5to Año”), 30 estudiantes repartidos, 10 representantes (uno con dos hijos), notas y asistencia de ejemplo, al menos 3 estudiantes morosos y reportes de pago pendientes. Muestra en el login las credenciales de prueba cuando `USE_MOCK` está activo.

## 9. ENTREGABLES
1. Proyecto completo con la estructura del punto 1, funcionando al 100% en modo mock con `npx serve .` o `python3 -m http.server`.
2. `gas/Code.gs` completo, incluyendo `setupSheets()`.
3. `README.md` en español: cómo correrlo localmente, crear la hoja de Google, pegar `Code.gs`, ejecutar `setupSheets()`, publicar como Web App (Ejecutar como: yo; Acceso: cualquiera), copiar la URL en `config.js`, poner `USE_MOCK = false` y desplegar en GitHub Pages/Netlify. Incluye tabla de credenciales de prueba y limitaciones conocidas (cuotas de Apps Script).
4. Verifica al terminar: recorre cada rol en modo mock, prueba la regla de morosidad, el plan que no suma 100%, notas fuera de rango, la regla del 25% de inasistencia, la descarga del boletín y el cierre de año.

Construye todo con código limpio, modular, comentado donde la lógica no sea obvia, y con un acabado visual impecable.
