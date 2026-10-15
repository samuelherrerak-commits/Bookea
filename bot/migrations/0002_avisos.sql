-- Notificaciones de "Mi negocio" (Web Push a los dueños de los negocios).
CREATE TABLE IF NOT EXISTS ajustes (
  clave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);

-- Un teléfono o computadora de un dueño que aceptó los avisos de un negocio.
CREATE TABLE IF NOT EXISTS push_suscripciones (
  endpoint TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  creado INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS push_suscripciones_slug ON push_suscripciones (slug);

-- Citas próximas, para los recordatorios. Llegan con cada reserva nueva y con el
-- repaso de la mañana (el Apps Script manda la agenda del día).
CREATE TABLE IF NOT EXISTS push_citas (
  slug TEXT NOT NULL,
  id TEXT NOT NULL,
  inicio INTEGER NOT NULL,      -- ms
  cliente TEXT NOT NULL DEFAULT '',
  servicios TEXT NOT NULL DEFAULT '',
  recordada INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (slug, id)
);
CREATE INDEX IF NOT EXISTS push_citas_inicio ON push_citas (recordada, inicio);

-- Qué negocios ya recibieron el resumen de la mañana de un día.
CREATE TABLE IF NOT EXISTS push_resumenes (
  slug TEXT NOT NULL,
  dia TEXT NOT NULL,
  PRIMARY KEY (slug, dia)
);
