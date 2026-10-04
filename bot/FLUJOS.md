# Flujos del bot de WhatsApp

Cada caja azul es **un mensaje del bot**. Cada uno cuenta para los **1.000 mensajes gratis al mes**, y después cuesta ≈ $0,0113. Los mensajes del cliente no cuentan.

Reglas del bot:
- **un mensaje por turno**;
- en la afiliación pide solo lo mínimo para **agendar la cita de configuración**. Servicios, precios, duración, horario y logo los tomas tú en la cita.

## Mensajes por flujo

Conteo completo, desde el primer "hola" (incluye el menú):

| Flujo | Antes | Ahora |
|---|---|---|
| Afiliar · presencial (sábado) | 13 | **6** |
| Afiliar · Google Meet | 12 | **5** |
| Cómo funciona y precio | 2–3 (precio y "cómo funciona" por separado) | **2** |
| Soporte que se resuelve solo | 6 | **4** |
| Soporte con caso abierto | 8 | **5** |
| Hablar con una persona | 2 | **2** |

Con 1.000 mensajes gratis al mes, antes alcanzaban para unas **75 afiliaciones** y ahora para unas **170–200**.

"Precios y prueba gratis" ya no es una opción del menú. La prueba gratis **es** la afiliación (primer mes gratis), y el precio va en el saludo y en "Cómo funciona y precio".

## Menú (siempre primero)

```mermaid
flowchart TD
  A([Cliente escribe cualquier cosa]) --> M["1 · Saludo + precio + lista<br/>🎁 1 mes gratis, luego $10<br/>[Afiliar · Cómo funciona y precio · Soporte · Persona]"]:::bot
  M -->|Afiliar mi negocio| AF[[Afiliación]]
  M -->|Cómo funciona y precio| I["2 · Qué incluye + $10 + ejemplo<br/>[Afiliar mi negocio · Hablar con alguien]"]:::bot
  I -->|Afiliar mi negocio| AF
  I -->|Hablar con alguien| P
  M -->|Soporte| S[[Soporte]]
  M -->|Hablar con una persona| P["2 · Ya le aviso al equipo<br/>(fuera de horario lo dice)"]:::bot --> H([Modo humano: respondes tú desde la bandeja])
  M -.->|tiene cita| C[[Mi cita]]
  classDef bot fill:#dbeafe,stroke:#1d4ed8,color:#0f0f0e
```

## Afiliar mi negocio

```mermaid
flowchart TD
  S([Toca Afiliar mi negocio]) --> D["1 · Cita de configuración (1 h)<br/>Escríbeme nombre del negocio y Gmail<br/>Ej: Barbería El Corte, elcorte@gmail.com"]:::bot
  D -->|manda los dos| MO
  D -->|solo el nombre| FC["Tu correo Gmail ✉️"]:::bot --> MO
  D -->|solo el correo| FN["¿Cómo se llama tu negocio?"]:::bot --> MO
  MO["2 · ¿Cómo prefieres la cita?<br/>[Presencial · sábado] [Google Meet]"]:::bot
  MO -->|Presencial| DIR["3 · ¿Dirección? (o ubicación 📍)"]:::bot --> HP
  MO -->|Google Meet| HM
  HP["4 · Lista de horas libres<br/>Sáb 10 oct · 8:00 a. m. …<br/>(Ver más fechas)"]:::bot
  HM["3 · Lista de horas libres<br/>Lun 5 oct · 9:00 a. m. …<br/>(Ver más fechas)"]:::bot
  HP -->|elige hora| OK
  HM -->|elige hora| OK
  OK["5 (Meet: 4) · ¡Listo! ✅ Cita el sábado 10 de octubre 9:30 a. m.<br/>+ dirección o enlace de Meet<br/>Para cambiarla: mi cita"]:::bot
  OK --> G([Apps Script: evento en Afiliaciones bookeaa + Meet<br/>invitación al Gmail + fila en Prospectos + correo para ti])
  HP -.->|hora ocupada| HP
  HM -.->|sin horas libres| X["Te aviso al equipo"]:::bot --> H([Modo humano])
  classDef bot fill:#dbeafe,stroke:#1d4ed8,color:#0f0f0e
```

- Elegir la hora **es** confirmar: ya no hay resumen ni "Corregir", un mensaje menos.
- La lista muestra día y hora juntos (hasta 9 opciones, más "Ver más fechas"), en vez de elegir primero el día y después la hora.

## Mi cita

```mermaid
flowchart TD
  A([Escribe mi cita o la elige en el menú]) --> C["1 · Tu cita es el … [Cambiar fecha] [Cancelar cita] [Menú]"]:::bot
  C -->|Cambiar fecha| L["2 · Lista de horas libres"]:::bot -->|elige| R["3 · ¡Listo! Cambié tu cita"]:::bot
  C -->|Cancelar cita| Q["2 · ¿Seguro? [Sí, cancelar] [No]"]:::bot -->|Sí| X["3 · Cancelada"]:::bot
  classDef bot fill:#dbeafe,stroke:#1d4ed8,color:#0f0f0e
```

## Soporte

```mermaid
flowchart TD
  A([Toca Soporte]) --> T["1 · ¿Con qué te ayudo?<br/>[Logo · Horario/días libres · No aparece una reserva · Alerta · Pago Móvil · Otra cosa]"]:::bot
  T -->|un tema| R["2 · Respuesta + ¿Se resolvió?<br/>[Sí, gracias] [No, necesito ayuda]"]:::bot
  R -->|Sí| F["3 · ¡Genial!"]:::bot
  R -->|No| D
  T -->|Otra cosa| D["2–3 · Cuéntame qué pasó y el nombre de tu negocio<br/>(captura con el texto)"]:::bot
  D -->|un mensaje| K["3–4 · Caso #N abierto ✅"]:::bot --> H([Modo humano + fila en Soporte + correo para ti])
  classDef bot fill:#dbeafe,stroke:#1d4ed8,color:#0f0f0e
```

## Siempre
- **"menú"** vuelve al inicio desde cualquier punto, también si un humano está atendiendo.
- **Modo humano**: el bot no contesta (0 mensajes) hasta que toques "Devolver al bot" o "Cerrar caso" en la bandeja. También vuelve solo al bot si pasan 24 h sin mensajes.
- **Texto que no entiende**: un mensaje: "Toca una de las opciones…" o el menú.
