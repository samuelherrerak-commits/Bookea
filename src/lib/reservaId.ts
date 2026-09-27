/**
 * Id del intento de reserva.
 *
 * Un mismo intento lleva siempre el mismo id y se reintenta con él. Si la
 * respuesta se pierde por un corte de red, el servidor reconoce el reintento y
 * devuelve la reserva que ya guardó, en vez de rechazarla con "ocupado" por el
 * evento que el propio cliente acaba de crear. Ese id va en sessionStorage para
 * que recargar la página a mitad de un intento no lo cambie: si cambiara, el
 * reintento parecería una reserva nueva y la anterior quedaría huérfana.
 *
 * Se borra al confirmar, para que la siguiente reserva del mismo cliente empiece
 * con un id limpio.
 */

const RESERVA_KEY = 'reserva:v1'

/** globalThis === window en el navegador, y permite inyectar un storage falso en tests. */
function storage(): Storage | null {
  try {
    return (globalThis as { sessionStorage?: Storage }).sessionStorage ?? null
  } catch {
    return null // el navegador puede bloquear el almacenamiento
  }
}

export function getReservaId(): string {
  const s = storage()
  const guardado = s?.getItem(RESERVA_KEY)
  if (guardado) return guardado

  const nuevo = crypto.randomUUID()
  try {
    s?.setItem(RESERVA_KEY, nuevo)
  } catch {
    /* sin almacenamiento el id solo vive en este intento */
  }
  return nuevo
}

export function clearReservaId(): void {
  try {
    storage()?.removeItem(RESERVA_KEY)
  } catch {
    /* nada que limpiar */
  }
}
