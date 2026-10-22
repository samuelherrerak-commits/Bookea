# Conector de Claude para administrar bookeaa

Con este conector, Claude administra bookeaa contigo desde cualquier chat. Puede:
- ver los negocios, las métricas, las citas y la configuración;
- crear negocios y configurarlos;
- registrar pagos y aprobar o rechazar los Pago Móvil;
- suspender o reactivar negocios.

Ejemplo: *"Crea una veterinaria de ejemplo con mi correo, con consulta, vacunas y baño, abierta de lunes a sábado"*.

## Cómo funciona
- Es un servidor MCP dentro del **Worker del bot** (Cloudflare): `https://bookeaa-bot.<tu-subdominio>.workers.dev/mcp`. No hay que pagar ni mantener otro servidor.
- **Quién puede usarlo:** solo un administrador de bookeaa.
  1. Al conectarlo, Claude te manda a **bookeaa.com/conectar**.
  2. Ahí entras con Google, igual que en la central.
  3. El Apps Script comprueba que tu correo esté en `dueno_admins`.
- **Con qué permisos actúa Claude:** con tu sesión de la central. Las validaciones son las mismas de la central y de Mi negocio, y no se agregó ninguna puerta nueva al Apps Script (solo la operación `yo`, que dice quién eres).
- **Cuánto dura el permiso:** igual que la sesión de la central, hasta 30 días. Cuando vence, Claude te pide volver a conectar.
- **Qué se guarda:** los tokens van en D1 cifrados con SHA-256, nunca en claro.

Herramientas: `listar_negocios`, `ver_metricas`, `ver_negocio`, `crear_negocio`, `editar_negocio`, `suspender_negocio`, `registrar_pago`, `ver_cobros`, `aprobar_pago`, `rechazar_pago`, `ver_citas`, `ver_configuracion` y `guardar_configuracion`.

## Ponerlo en marcha (una vez)
1. **Fusiona el PR.** La Action del bot aplica sola la migración `0003_conector.sql` y despliega el Worker.
2. **Apps Script:** pega el `Code.gs` nuevo y publica una **nueva versión**. Revisa que estén:
   - la propiedad `bot_bandeja_url`, que ya existe por el bot;
   - tu Gmail en `dueno_admins`.
3. **En Claude:** ve a [claude.ai/customize/connectors](https://claude.ai/customize/connectors) → **Agregar conector personalizado**.
   - Nombre: `bookeaa`.
   - URL: `https://bookeaa-bot.<tu-subdominio>.workers.dev/mcp`, la misma de la bandeja cambiando `/bandeja` por `/mcp`.
4. Toca **Conectar**: se abre bookeaa.com/conectar. Entra con Google y toca **Permitir**.
5. Abre un chat nuevo: los conectores se cargan al empezar.

## Si algo falla
- **"No eres administrador de bookeaa":** agrega tu Gmail a `dueno_admins` en el Apps Script.
- **"El pedido venció":** pasaron más de 15 minutos. Vuelve a tocar Conectar en Claude.
- **Claude dice que no puede conectar:**
  - revisa que la URL termine en `/mcp`;
  - revisa que la Action del bot haya corrido después de fusionar;
  - en Cloudflare → Workers → bookeaa-bot → Logs ves cada llamada.
- **Quitarle el permiso a Claude:** borra el conector en Claude. Para cerrar a la fuerza todas las sesiones, incluidas las de la central y Mi negocio, borra la propiedad `sesion_secreto` del Apps Script.
