// Verifica el Apps Script antes de publicarlo. No se puede ejecutar fuera de
// Google, así que se revisa lo que se puede revisar sin ejecutarlo.
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const file = process.argv[2]
  ? new URL(`file://${process.argv[2]}`)
  : new URL('../apps-script/Code.gs', import.meta.url)
const source = readFileSync(file, 'utf8')
const lineas = source.split('\n')

try {
  new vm.Script(source, { filename: 'Code.gs' })
} catch (err) {
  console.error(err)
  process.exit(1)
}

// Nombres declarados más de una vez dentro de la misma función.
//
// La comprobación de sintaxis no alcanza para esto: un `const` dentro de un bloque
// interno está permitido y tapa al `let` de afuera sin que nada se queje. El
// problema solo aparece en tiempo de ejecución, cuando se sale del bloque y el
// nombre vuelve al de afuera, que quedó sin asignar. Así se guardaba una reserva
// completa y el cliente recibía un 500: `orden.total` leía un undefined que nadie
// miraba porque la sintaxis era válida.
const problemas = []

/** Nombres declarados en una lista: `a, b = f(x, y), c` → ['a', 'b', 'c']. */
function declaradores(lista) {
  const salida = []
  let profundidad = 0
  let actual = ''
  for (const ch of lista) {
    if (ch === '(' || ch === '[' || ch === '{') profundidad++
    else if (ch === ')' || ch === ']' || ch === '}') profundidad--
    if (ch === ',' && profundidad === 0) {
      salida.push(actual)
      actual = ''
    } else {
      actual += ch
    }
  }
  salida.push(actual)
  return salida.map((p) => p.trim().match(/^([A-Za-z_$][\w$]*)/)).filter(Boolean).map((m) => m[1])
}

for (let i = 0; i < lineas.length; i++) {
  const inicio = lineas[i].match(/^function\s+([A-Za-z_$][\w$]*)/)
  if (!inicio) continue

  const nombre = inicio[1]
  // Un mapa de declaraciones por scope de llaves. Dos llaves anidadas, un callback y
  // otro callback son scopes distintos y pueden usar el mismo nombre sin problema;
  // lo que se busca es el mismo nombre dos veces en el MISMO scope, que es cuando
  // la segunda tapa a la primera.
  const scopes = [new Map()]
  let profundidad = 0
  let started = false

  for (let j = i; j < lineas.length; j++) {
    const limpia = lineas[j]
      .replace(/\/\/.*$/, '')
      .replace(/(['"`])(?:\\.|(?!\1)[^\\])*\1/g, '""')
      .trim()

    // `let a, b, c = 1` declara tres nombres, no uno: hay que partir la lista
    // entera, cortando solo en las comas que no están dentro de paréntesis,
    // corchetes, llaves ni cadenas.
    const declara = limpia.match(/^(?:const|let|var)\s+(.+)$/)
    if (declara) {
      const scope = scopes[scopes.length - 1]
      for (const variable of declaradores(declara[1])) {
        const previa = scope.get(variable)
        if (previa) {
          problemas.push(
            `${nombre}(): \`${variable}\` en la línea ${j + 1} ya estaba declarado en la línea ${previa}, ` +
              'en el mismo bloque. El de adentro lo tapa y, al salir del bloque, el de afuera sigue sin asignarse.',
          )
        } else {
          scope.set(variable, j + 1)
        }

        // El mismo nombre otra vez en un bloque más adentro. Es legal, y casi siempre
        // está bien. Pero si el de afuera se usa después del bloque, se está leyendo
        // el valor vacío, porque el `const` de adentro solo vive hasta el `}`.
        for (let k = 0; k < scopes.length - 1; k++) {
          const exterior = scopes[k].get(variable)
          if (exterior) {
            problemas.push(
              `${nombre}(): \`${variable}\` de la línea ${j + 1} tapa al de la línea ${exterior}, ` +
                'que quedó en el scope de afuera. Si se usa después de este bloque, sale vacío.',
            )
            break
          }
        }
      }
    }

    const abre = (limpia.match(/\{/g) || []).length
    const cierra = (limpia.match(/\}/g) || []).length
    if (abre > 0) started = true

    for (let k = 0; k < cierra && scopes.length > 1; k++) scopes.pop()
    for (let k = 0; k < abre - cierra; k++) scopes.push(new Map())

    profundidad += abre - cierra
    if (started && profundidad <= 0) break
  }
}

if (problemas.length) {
  console.error('apps-script/Code.gs: declaraciones duplicadas\n')
  for (const p of problemas) console.error('  ' + p)
  console.error('')
  process.exit(1)
}

console.log('apps-script/Code.gs: sintaxis OK, sin declaraciones duplicadas')
