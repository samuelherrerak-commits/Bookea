-- bookeaa team: a quién del equipo es cada teléfono y cada cita.
-- persona = '' es el administrador del negocio (recibe todo); si no, el id de la persona
-- del equipo (recibe solo lo suyo).
ALTER TABLE push_suscripciones ADD COLUMN persona TEXT NOT NULL DEFAULT '';
ALTER TABLE push_citas ADD COLUMN persona TEXT NOT NULL DEFAULT '';
