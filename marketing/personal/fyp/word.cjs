// Genera Guiones-octubre-bookeaa.docx desde guiones.json (sale de generar.py).
//   NODE_PATH=<carpeta con el paquete docx> node marketing/personal/fyp/word.cjs
const fs = require('fs')
const path = require('path')
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, ShadingType, PageBreak, Footer, PageNumber, LevelFormat } = require('docx')
const G = JSON.parse(fs.readFileSync(path.join(__dirname, 'guiones.json'), 'utf8'))
const DIAS = { Lun: 'lunes', Mar: 'martes', 'Mié': 'miércoles', Jue: 'jueves', Vie: 'viernes' }
const HORA = { '13:00': '1:00 p. m.', '20:30': '8:30 p. m.' }
const T = (text, o = {}) => new TextRun({ text, font: 'Arial', ...o })
const P = (children, o = {}) => new Paragraph({ children: Array.isArray(children) ? children : [children], ...o })
const fecha = (o) => `${DIAS[o.dia]} ${parseInt(o.fecha.slice(8))} de octubre`

function entrada(o) {
  const audio = o.tipo === 'VOZ'
  return [
    new Paragraph({ heading: HeadingLevel.HEADING_3, keepNext: true, spacing: { before: 320, after: 60 }, children: [T(o.archivo)] }),
    P([T(`${audio ? '🎙️ AUDIO' : '🎥 VIDEO A CÁMARA'}  ·  ${o.titulo}  ·  sale el ${fecha(o)}, ${HORA[o.hora]}`, { size: 18, color: '5B5B57' })], { keepNext: true, spacing: { after: 100 } }),
    P([T('Qué dices:', { bold: true, size: 18, color: '5B5B57' })], { keepNext: true, spacing: { after: 40 } }),
    new Paragraph({
      keepNext: true,
      spacing: { after: 100, line: 340 },
      indent: { left: 200, right: 200 },
      shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'F4F4F2' },
      border: { left: { style: BorderStyle.SINGLE, size: 24, color: '0F0F0E', space: 10 } },
      children: [T(`«${o.cuerpo}»`, { size: 28 })],
    }),
    P([T(`Gancho en pantalla: ${o.gancho}`, { size: 17, italics: true, color: '5B5B57' })], { keepNext: true, spacing: { after: 40 } }),
    P([T(audio ? `Imagen: ${o.visual}` : `Cómo grabarlo: ${o.visual}`, { size: 17, italics: true, color: '5B5B57' })], { keepNext: true, spacing: { after: 60 } }),
    P([T('☐ Grabado      ☐ Subido a Drive', { size: 18 })], { spacing: { after: 120 } }),
  ]
}
const bullets = (items) => items.map((t) => new Paragraph({ numbering: { reference: 'b', level: 0 }, spacing: { after: 60 }, children: [T(t, { size: 21 })] }))
const sesiones = [
  { titulo: 'Sesión 1 · Hoy', nota: 'Semana 0: jueves 8 y viernes 9 de octubre. Pásamelo antes del jueves a las 10 a. m.', sem: 'S00' },
  { titulo: 'Sesión 2 · Sábado 10 o domingo 11', nota: 'Semanas 1 y 2: del 12 al 23 de octubre. Pásamelo antes del domingo 11 en la noche.', sem: 'S01 S02' },
  { titulo: 'Sesión 3 · Fin de semana del 24', nota: 'Semana 3: del 26 al 30 de octubre. Pásamelo antes del domingo 25 en la noche (o grábala junto con la sesión 2).', sem: 'S03' },
]
const cuerpo = [
  P([T('Guiones para grabar', { bold: true, size: 52 })], { spacing: { after: 60 } }),
  P([T('bookeaa · Octubre 2026 · videos de 15 segundos para TikTok y Reels', { size: 22, color: '5B5B57' })], { spacing: { after: 240 } }),
  P([T(`Tienes que grabar ${G.filter((o) => o.tipo === 'VOZ').length} audios y ${G.filter((o) => o.tipo === 'CAM').length} videos a cámara. Cada video funciona solo: tiene su gancho, conecta con el problema del negocio, presenta bookeaa como la solución y termina con un llamado a la acción. Los videos MG (sin voz) los hago yo.`, { size: 22 })], { spacing: { after: 200 } }),
  new Paragraph({ heading: HeadingLevel.HEADING_2, children: [T('Antes de grabar')] }),
  P([T('🎙️ Audios (VOZ)', { bold: true, size: 22 })], { spacing: { before: 120, after: 60 } }),
  ...bullets([
    'Grábalos en un cuarto con ropa, cortinas o cojines (absorben el eco), con el teléfono a un palmo de la boca.',
    'La primera frase es el gancho: dila con fuerza, como si interrumpieras una conversación.',
    'Habla con energía, como si le contaras un chisme a un amigo. Unos 15 segundos cada uno.',
    'Haz 2 tomas seguidas de cada audio, con 2 segundos de silencio entre una y otra. Yo elijo la mejor.',
  ]),
  P([T('🎥 Videos a cámara (CAM)', { bold: true, size: 22 })], { spacing: { before: 160, after: 60 } }),
  ...bullets([
    'Vertical, en 1080p o 4K, con luz de frente. Manda el archivo original, no por WhatsApp.',
    'Mira al lente, no a la pantalla. Apréndete la idea, no la frase exacta.',
    'Quédate quieto 1 segundo antes de hablar y 1 segundo al terminar.',
    'Cambia de camiseta entre días. Si te equivocas, repite la frase desde el principio: yo corto.',
  ]),
  P([T('📁 Para subir', { bold: true, size: 22 })], { spacing: { before: 160, after: 60 } }),
  ...bullets([
    'Nombra cada archivo exactamente como el título del guion (por ejemplo, FYP-S00-JUE-VOZ.m4a).',
    'Súbelos a una carpeta de Drive compartida con "Cualquier persona con el enlace" y mándame el link de la carpeta.',
  ]),
]
for (const s of sesiones) {
  const lote = G.filter((o) => s.sem.includes(o.id.split('-')[1]))
  cuerpo.push(new Paragraph({ children: [new PageBreak()] }))
  cuerpo.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [T(s.titulo)] }))
  cuerpo.push(P([T(s.nota, { size: 21, color: '5B5B57' })], { spacing: { after: 200 } }))
  for (const [tipo, nombre] of [['VOZ', 'Audios (voz en off)'], ['CAM', 'Videos a cámara']]) {
    const items = lote.filter((o) => o.tipo === tipo)
    cuerpo.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 100 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '0F0F0E', space: 4 } }, children: [T(`${nombre} · ${items.length}`)] }))
    for (const o of items) cuerpo.push(...entrada(o))
  }
}
const doc = new Document({
  creator: 'bookeaa',
  title: 'Guiones para grabar · Octubre',
  styles: {
    default: { document: { run: { font: 'Arial', size: 22 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: 'Arial', size: 40, bold: true, color: '0F0F0E' }, paragraph: { spacing: { after: 120 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: 'Arial', size: 28, bold: true, color: '0F0F0E' }, paragraph: { spacing: { before: 240, after: 100 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: 'Arial', size: 24, bold: true, color: '0F0F0E' }, paragraph: { outlineLevel: 2 } },
    ],
  },
  numbering: { config: [{ reference: 'b', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] }] },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1200, bottom: 1200, left: 1300, right: 1300 } } },
    footers: { default: new Footer({ children: [P([T('bookeaa · guiones de octubre · página ', { size: 16, color: '5B5B57' }), new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '5B5B57', font: 'Arial' })], { alignment: AlignmentType.RIGHT })] }) },
    children: cuerpo,
  }],
})
Packer.toBuffer(doc).then((b) => { fs.writeFileSync(path.join(__dirname, '..', 'Guiones-octubre-bookeaa.docx'), b); console.log('ok') })
