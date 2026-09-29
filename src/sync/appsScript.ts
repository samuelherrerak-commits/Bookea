/**
 * Utilidades de prueba: sacan una constante de un archivo de Apps Script (texto)
 * y la evalúan, para comparar las listas que están copiadas en el backend, en la
 * barra lateral y en el front. Solo la usan los tests.
 */
/** `deps`: otras constantes del mismo archivo que esta usa (ej. ZONA en CONFIG_DEFAULTS). */
export function constanteGs<T>(fuente: string, nombre: string, deps: string[] = []): T {
  const inicio = fuente.indexOf(`const ${nombre} =`)
  if (inicio === -1) throw new Error(`No encontré const ${nombre}`)
  // Una línea ("const TOKEN = '…';") o un bloque que termina en "];" / "};" al
  // comienzo de una línea.
  const resto = fuente.slice(inicio)
  const primera = resto.slice(0, resto.indexOf('\n'))
  let codigo: string
  if (/;\s*(\/\/.*)?$/.test(primera) && !/[[{]\s*$/.test(primera)) {
    codigo = primera
  } else {
    const fin = resto.search(/\n[\]}];/)
    if (fin === -1) throw new Error(`No encontré el final de ${nombre}`)
    codigo = resto.slice(0, fin + 3)
  }
  const previas = deps.map((d) => `const ${d} = ${JSON.stringify(constanteGs(fuente, d))};`).join('\n')
  return new Function(`${previas}\n${codigo}\nreturn ${nombre};`)() as T
}

/**
 * Saca funciones de nivel superior de un archivo de Apps Script y las devuelve
 * listas para probar. `globales` reemplaza los servicios de Google (CacheService,
 * Utilities…) con dobles de prueba.
 */
export function funcionesGs<T extends Record<string, (...args: never[]) => unknown>>(
  fuente: string,
  nombres: string[],
  globales: Record<string, unknown> = {},
): T {
  const codigo = nombres
    .map((nombre) => {
      const inicio = fuente.indexOf(`function ${nombre}(`)
      if (inicio === -1) throw new Error(`No encontré function ${nombre}`)
      const fin = fuente.indexOf('\n}', inicio)
      return fuente.slice(inicio, fin + 2)
    })
    .join('\n')
  const claves = Object.keys(globales)
  return new Function(...claves, `${codigo}\nreturn { ${nombres.join(', ')} };`)(...claves.map((k) => globales[k])) as T
}
