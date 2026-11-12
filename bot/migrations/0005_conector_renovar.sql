-- Conector de Claude: refresh tokens para que la conexión no se caiga cuando vence el token.
-- Cada uno guarda la sesión de la central con la que se renueva (rotan en cada uso).
CREATE TABLE IF NOT EXISTS oauth_renovaciones (
  hash TEXT PRIMARY KEY,
  cliente TEXT NOT NULL,
  sesion TEXT NOT NULL,
  email TEXT NOT NULL,
  creado INTEGER NOT NULL,
  expira INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS oauth_renovaciones_expira ON oauth_renovaciones (expira);
