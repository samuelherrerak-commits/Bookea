-- Conversaciones del bot de WhatsApp de bookeaa.
CREATE TABLE IF NOT EXISTS conversaciones (
  telefono TEXT PRIMARY KEY,
  nombre TEXT NOT NULL DEFAULT '',
  paso TEXT NOT NULL DEFAULT 'inicio',
  datos TEXT NOT NULL DEFAULT '{}',
  modo TEXT NOT NULL DEFAULT 'bot',
  etiqueta TEXT NOT NULL DEFAULT '',
  cita TEXT,
  ultimo_entrante INTEGER,      -- ms del último mensaje del cliente (ventana de 24 h)
  ultimo_mensaje INTEGER NOT NULL DEFAULT 0,
  resumen TEXT NOT NULL DEFAULT '',
  sin_leer INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS conversaciones_recientes ON conversaciones (ultimo_mensaje DESC);

CREATE TABLE IF NOT EXISTS mensajes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telefono TEXT NOT NULL,
  sentido TEXT NOT NULL,        -- 'in' | 'out'
  autor TEXT NOT NULL,          -- 'cliente' | 'bot' | 'equipo'
  tipo TEXT NOT NULL DEFAULT 'texto',
  texto TEXT NOT NULL DEFAULT '',
  media_id TEXT,
  wamid TEXT UNIQUE,
  creado INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS mensajes_por_chat ON mensajes (telefono, id);

-- Mensajes enviados por mes: servicio (los 1.000 gratis) y plantillas (se cobran).
CREATE TABLE IF NOT EXISTS uso (
  mes TEXT PRIMARY KEY,
  servicio INTEGER NOT NULL DEFAULT 0,
  plantillas INTEGER NOT NULL DEFAULT 0
);

-- Intentos fallidos de entrar a la bandeja, por IP.
CREATE TABLE IF NOT EXISTS intentos (
  ip TEXT PRIMARY KEY,
  fallos INTEGER NOT NULL DEFAULT 0,
  desde INTEGER NOT NULL
);
