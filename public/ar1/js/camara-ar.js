// Cámara + MindAR. Abre la cámara trasera, reconoce el frente de la tarjeta y mueve el ancla
// de la escena. Usa el Controller de MindAR 1.2.5 directamente: su integración con three.js
// importa `sRGBEncoding`, que three.js quitó en la 0.162, así que aquí va la misma lógica de
// cámara de MindARThree escrita para el three.js actual.

const MINDAR = new URL('../../ar-comun/vendor/mind-ar-1.2.5/mindar-image.prod.js', import.meta.url).href
const OBJETIVO = new URL('../tarjeta.mind', import.meta.url).href

let cargaMindAR = null
let cargaObjetivo = null

/** MindAR (incluye TensorFlow.js, ~280 KB comprimido): se baja en segundo plano. */
export function precargarMindAR() {
  return (cargaMindAR ??= import(MINDAR))
}

export function precargarObjetivo() {
  return (cargaObjetivo ??= fetch(OBJETIVO).then((r) => {
    if (!r.ok) throw new Error(`tarjeta.mind: ${r.status}`)
    return r.arrayBuffer()
  }))
}

export class ErrorCamara extends Error {
  constructor(motivo, causa) {
    super(`cámara: ${motivo}`)
    this.motivo = motivo
    this.causa = causa
  }
}

function motivoDe(err) {
  switch (err?.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'permiso'
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'sinCamara'
    case 'NotReadableError':
    case 'AbortError':
      return 'ocupada'
    default:
      return 'error'
  }
}

/** Pide la cámara trasera. Llamarla directo en el toque del botón (iPhone lo exige). */
export async function abrirCamara() {
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new ErrorCamara('navegador')
  const pedidos = [
    { audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } },
    { audio: false, video: { facingMode: 'environment' } },
    { audio: false, video: true },
  ]
  let ultimo = null
  for (const pedido of pedidos) {
    try {
      return await navigator.mediaDevices.getUserMedia(pedido)
    } catch (err) {
      ultimo = err
      if (err?.name === 'NotAllowedError' || err?.name === 'SecurityError') break
    }
  }
  throw new ErrorCamara(motivoDe(ultimo), ultimo)
}

/**
 * Arranca el seguimiento. `opciones`: proceso (px del lado mayor con que trabaja MindAR),
 * minCF y beta (filtro de MindAR) y suavizado (1/s, suavizado extra del ancla en cada cuadro).
 */
export async function iniciarAR({ THREE, contenedor, video, stream, escena, opciones = {}, onEstado }) {
  video.setAttribute('playsinline', '')
  video.setAttribute('autoplay', '')
  video.muted = true
  video.srcObject = stream
  await video.play().catch(() => {})
  if (!(video.readyState >= 2 && video.videoWidth)) {
    await new Promise((listo, falla) => {
      const reloj = setTimeout(() => falla(new Error('la cámara no entregó imagen')), 10000)
      video.addEventListener(
        'loadeddata',
        () => {
          clearTimeout(reloj)
          listo()
        },
        { once: true },
      )
    })
  }

  const [{ Controller }, objetivo] = await Promise.all([precargarMindAR(), precargarObjetivo()])
  const { ancla, camara } = escena

  const postMatriz = new THREE.Matrix4()
  const matriz = new THREE.Matrix4()
  const posObj = new THREE.Vector3()
  const rotObj = new THREE.Quaternion()
  const escObj = new THREE.Vector3()
  const pos = new THREE.Vector3()
  const rot = new THREE.Quaternion()
  const esc = new THREE.Vector3()
  let visible = false
  let pegar = true
  let cuadros = 0
  let controlador = null
  let ancho = 0
  let alto = 0

  function crearControlador() {
    ancho = video.videoWidth
    alto = video.videoHeight
    // MindAR procesa una copia reducida del cuadro: rinde en gama media y se ve igual de nítido,
    // porque el video en pantalla sigue a su resolución completa.
    const k = Math.min(1, (opciones.proceso ?? 640) / Math.max(ancho, alto))
    const pw = Math.round(ancho * k)
    const ph = Math.round(alto * k)
    video.width = pw
    video.height = ph
    const c = new Controller({
      inputWidth: pw,
      inputHeight: ph,
      maxTrack: 1,
      filterMinCF: opciones.minCF ?? 0.001,
      filterBeta: opciones.beta ?? 100,
      warmupTolerance: 3,
      missTolerance: 8,
      onUpdate: (data) => {
        if (data.type === 'processDone') {
          cuadros++
          return
        }
        if (data.type !== 'updateMatrix') return
        if (data.worldMatrix) {
          matriz.fromArray(data.worldMatrix).multiply(postMatriz)
          matriz.decompose(posObj, rotObj, escObj)
          if (!visible) {
            visible = true
            pegar = true
            onEstado?.('encontrada')
          }
        } else if (visible) {
          visible = false
          onEstado?.('perdida')
        }
      },
    })
    const { dimensions } = c.addImageTargetsFromBuffer(objetivo.slice(0))
    const [mw, mh] = dimensions[0]
    // origen al centro de la imagen y 1 unidad = su ancho (igual que MindARThree)
    postMatriz.compose(new THREE.Vector3(mw / 2, mh / 2, 0), new THREE.Quaternion(), new THREE.Vector3(mw, mw, mw))
    c.dummyRun(video)
    c.processVideo(video)
    return c
  }

  function ajustar() {
    if (!controlador) return
    // si el contenedor todavía está oculto mide 0: se usa la ventana
    const cw = contenedor.clientWidth || window.innerWidth
    const ch = contenedor.clientHeight || window.innerHeight
    const rv = video.videoWidth / video.videoHeight
    let w
    let h
    // el video cubre la pantalla (como object-fit: cover)
    if (rv > cw / ch) {
      h = ch
      w = h * rv
    } else {
      w = cw
      h = w / rv
    }
    const proj = controlador.getProjectionMatrix()
    camara.fov = (2 * Math.atan((1 / proj[5] / h) * ch) * 180) / Math.PI
    camara.near = proj[14] / (proj[10] - 1)
    camara.far = proj[14] / (proj[10] + 1)
    camara.aspect = cw / ch
    camara.updateProjectionMatrix()
    video.style.width = `${w}px`
    video.style.height = `${h}px`
    video.style.left = `${-(w - cw) / 2}px`
    video.style.top = `${-(h - ch) / 2}px`
  }

  // si el teléfono gira, el cuadro cambia de forma: se rearma MindAR con las medidas nuevas
  function alCambiarVideo() {
    if (!controlador || !video.videoWidth) return
    const giro = (video.videoWidth > video.videoHeight) !== (ancho > alto)
    if (!giro) return
    controlador.dispose()
    visible = false
    onEstado?.('perdida')
    controlador = crearControlador()
    ajustar()
  }
  video.addEventListener('resize', alCambiarVideo)

  controlador = crearControlador()
  ajustar()

  return {
    ajustar,
    /** Mueve el ancla hacia la última pose, suavizado según el tiempo del cuadro. */
    actualizar(dt) {
      ancla.visible = visible
      if (!visible) return
      if (pegar) {
        pos.copy(posObj)
        rot.copy(rotObj)
        esc.copy(escObj)
        pegar = false
      } else {
        const k = 1 - Math.exp(-dt * (opciones.suavizado ?? 22))
        pos.lerp(posObj, k)
        rot.slerp(rotObj, k)
        esc.lerp(escObj, k)
      }
      ancla.matrix.compose(pos, rot, esc)
      ancla.matrixWorldNeedsUpdate = true
    },
    get visible() {
      return visible
    },
    /** false si el sistema cortó la cámara (por ejemplo, al cambiar de app en iPhone). */
    activa() {
      return stream.getVideoTracks().some((p) => p.readyState === 'live')
    },
    /** Cuadros que procesó MindAR desde la última consulta. */
    cuadros() {
      const n = cuadros
      cuadros = 0
      return n
    },
    detener() {
      video.removeEventListener('resize', alCambiarVideo)
      try {
        controlador?.dispose()
      } catch {
        /* ya estaba detenido */
      }
      controlador = null
      for (const pista of stream.getTracks()) pista.stop()
      video.srcObject = null
    },
  }
}
