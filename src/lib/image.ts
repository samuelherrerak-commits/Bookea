/**
 * Reduce una foto/captura para enviarla al Apps Script: lado mayor ≤ maxSide
 * y JPEG. Una captura de teléfono (~2–4 MB) queda en ~100–250 KB, legible y liviana para Drive.
 */
export async function compressImage(file: File, maxSide = 1280, quality = 0.72): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('El archivo debe ser una imagen (foto o captura).')
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('No pudimos leer la imagen. Prueba con otra captura.'))
      el.src = url
    })
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Tu navegador no pudo procesar la imagen.')
    ctx.fillStyle = '#ffffff' // fondo blanco para PNG con transparencia
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', quality)
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** "data:image/jpeg;base64,AAAA" → { mime, base64 } */
export function splitDataUrl(dataUrl: string): { mime: string; base64: string } {
  const match = /^data:([^;]+);base64,(.*)$/.exec(dataUrl)
  return match ? { mime: match[1], base64: match[2] } : { mime: 'image/jpeg', base64: '' }
}

/**
 * Foto de perfil: recorta el centro en cuadrado y la deja en `lado`×`lado` JPEG (~20–40 KB),
 * lista para mandarla como data URL.
 */
export async function fotoCuadrada(file: File, lado = 320, quality = 0.8): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Elige una imagen (JPG, PNG o similar).')
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('No pudimos leer esa imagen. Prueba con otra.'))
      el.src = url
    })
    const corte = Math.min(img.naturalWidth, img.naturalHeight)
    const final = Math.max(1, Math.min(lado, corte))
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = final
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Tu navegador no pudo procesar la imagen.')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, final, final)
    ctx.drawImage(img, (img.naturalWidth - corte) / 2, (img.naturalHeight - corte) / 2, corte, corte, 0, 0, final, final)
    return canvas.toDataURL('image/jpeg', quality)
  } finally {
    URL.revokeObjectURL(url)
  }
}
