-- Conector de Claude (MCP): OAuth para que solo un administrador de bookeaa lo use.
-- Los códigos y los tokens se guardan con su SHA-256, nunca en claro.

-- Clientes que se registran solos (registro dinámico de OAuth), como claude.ai.
CREATE TABLE IF NOT EXISTS oauth_clientes (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL DEFAULT '',
  redirecciones TEXT NOT NULL,   -- JSON: lista de redirect_uri permitidas
  creado INTEGER NOT NULL
);

-- Un pedido de autorización esperando que el administrador entre con Google y lo apruebe.
CREATE TABLE IF NOT EXISTS oauth_pedidos (
  id TEXT PRIMARY KEY,
  cliente TEXT NOT NULL,
  redireccion TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT '',
  reto TEXT NOT NULL,            -- code_challenge (PKCE, S256)
  expira INTEGER NOT NULL
);

-- Código de un solo uso que el cliente cambia por un token.
CREATE TABLE IF NOT EXISTS oauth_codigos (
  hash TEXT PRIMARY KEY,
  cliente TEXT NOT NULL,
  redireccion TEXT NOT NULL,
  reto TEXT NOT NULL,
  sesion TEXT NOT NULL,          -- sesión de la central (Apps Script) del administrador
  email TEXT NOT NULL,
  expira INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS oauth_tokens (
  hash TEXT PRIMARY KEY,
  cliente TEXT NOT NULL,
  sesion TEXT NOT NULL,
  email TEXT NOT NULL,
  creado INTEGER NOT NULL,
  expira INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS oauth_tokens_expira ON oauth_tokens (expira);
