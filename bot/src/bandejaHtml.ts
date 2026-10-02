/** HTML de la bandeja (una sola página, sin dependencias). Todo el texto del cliente se pinta con textContent. */

const ESTILO = `
:root{--bg:#ffffff;--fg:#0f0f0e;--muted:#5b5b57;--soft:#f4f4f2;--rule:#e3e3df;--ink:#ffffff;--in:#f4f4f2;--out:#0f0f0e;--outfg:#ffffff;--bot:#e3e3df;--alerta:#b3261e;--ok:#1e7a46;
--display:'Barlow Condensed','Arial Narrow',sans-serif;--body:'Barlow','Helvetica Neue',Arial,sans-serif;color-scheme:light}
@media (prefers-color-scheme:dark){:root{--bg:#0f0f0e;--fg:#f4f4f2;--muted:#a3a39d;--soft:#1b1b19;--rule:#2c2c29;--ink:#0f0f0e;--in:#1f1f1c;--out:#f4f4f2;--outfg:#0f0f0e;--bot:#2c2c29;--alerta:#ff8a80;--ok:#7fd8a0;color-scheme:dark}}
*{box-sizing:border-box}html,body{height:100%}
body{margin:0;background:var(--bg);color:var(--fg);font:400 16px/1.45 var(--body);-webkit-font-smoothing:antialiased}
button,select,input,textarea{font:inherit;color:inherit}
button{cursor:pointer}
:focus-visible{outline:3px solid var(--fg);outline-offset:2px}
.btn{border:0;border-radius:999px;background:var(--fg);color:var(--ink);padding:9px 16px;font:700 14px/1 var(--display);letter-spacing:.1em;text-transform:uppercase}
.btn.sec{background:var(--soft);color:var(--fg)}
.btn:disabled{opacity:.45;cursor:not-allowed}
.marca{display:inline-flex;align-items:center;gap:8px;font:800 24px/1 var(--display)}
.marca svg{width:24px;height:24px}
`

const ICONO = `<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="2" y="4" width="28" height="26" rx="7" fill="currentColor"/><path d="M10 2.5v5M22 2.5v5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M12 11v12M12 17.5a4 4 0 1 1 0 .01" stroke="var(--bg)" stroke-width="2.6" stroke-linecap="round" fill="none"/></svg>`

const FUENTES = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800&family=Barlow:wght@400;500;600&display=swap">`

export const LOGIN = (mensaje: string) => `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Bandeja bookeaa</title>${FUENTES}<style>${ESTILO}
main{min-height:100%;display:grid;place-items:center;padding:24px 16px}
form{width:100%;max-width:360px;display:grid;gap:14px}
h1{font:800 44px/.9 var(--display);text-transform:uppercase;margin:12px 0 0}
input{border:1.5px solid var(--rule);background:var(--bg);border-radius:12px;padding:12px 14px}
.error{color:var(--alerta);font-size:14px;margin:0}
</style></head><body><main><form method="post" action="/bandeja/entrar">
<span class="marca">${ICONO}bookeaa</span><h1>Bandeja de WhatsApp</h1>
<label for="clave">Clave</label><input id="clave" name="clave" type="password" autocomplete="current-password" required autofocus>
${mensaje ? `<p class="error" role="alert">${mensaje}</p>` : ''}
<button class="btn" type="submit">Entrar</button></form></main></body></html>`

export const PAGINA = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Bandeja bookeaa</title>${FUENTES}<style>${ESTILO}
.app{height:100%;display:grid;grid-template-rows:auto minmax(0,1fr);grid-template-columns:minmax(0,1fr)}
header.barra{display:flex;flex-wrap:wrap;align-items:center;gap:10px;padding:10px 16px;padding-top:max(10px,env(safe-area-inset-top));border-bottom:1px solid var(--rule)}
header.barra .acciones{margin-left:auto;display:flex;gap:8px;align-items:center;min-width:0}
select.filtro{border:1.5px solid var(--rule);background:var(--bg);border-radius:999px;padding:7px 10px;font-size:14px;max-width:46vw}
.cuerpo{display:grid;grid-template-columns:minmax(0,340px) minmax(0,1fr);min-height:0}
.lista{border-right:1px solid var(--rule);overflow:auto;min-height:0}
.item{display:grid;gap:3px;width:100%;text-align:left;border:0;border-bottom:1px solid var(--rule);background:none;padding:12px 16px}
.item[aria-current=true]{background:var(--soft)}
.item .fila{display:flex;gap:8px;align-items:baseline;min-width:0}
.item b{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.item time{margin-left:auto;font-size:12px;color:var(--muted);flex:none;font-variant-numeric:tabular-nums}
.item p{margin:0;font-size:14px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.chips{display:flex;gap:6px;flex-wrap:wrap}
.chip{font:700 11px/1 var(--display);letter-spacing:.1em;text-transform:uppercase;border:1.5px solid var(--rule);border-radius:999px;padding:4px 8px;color:var(--muted)}
.chip.humano{border-color:var(--fg);color:var(--fg)}
.punto{width:10px;height:10px;border-radius:50%;background:var(--alerta);flex:none;align-self:center}
.chat{display:grid;grid-template-rows:auto minmax(0,1fr) auto;grid-template-columns:minmax(0,1fr);min-height:0;min-width:0}
.chat .cab{min-width:0;display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:10px 16px;border-bottom:1px solid var(--rule)}
.chat .cab h2{margin:0;font:800 24px/1 var(--display);text-transform:uppercase;min-width:0;overflow-wrap:anywhere}
.chat .cab small{display:block;font:500 13px/1.3 var(--body);color:var(--muted);text-transform:none}
.chat .cab .acc{display:flex;gap:8px;flex-wrap:wrap;margin-left:auto}
.mensajes{overflow-y:auto;overflow-x:hidden;min-width:0;padding:16px;display:flex;flex-direction:column;gap:8px;min-height:0}
.msg{max-width:min(78%,560px);padding:9px 12px;border-radius:14px;white-space:pre-wrap;overflow-wrap:anywhere;font-size:15px}
.msg.in{background:var(--in);align-self:flex-start;border-top-left-radius:4px}
.msg.out{background:var(--out);color:var(--outfg);align-self:flex-end;border-top-right-radius:4px}
.msg.bot{background:var(--bot);color:var(--fg)}
.msg img{display:block;max-width:100%;border-radius:8px;margin-bottom:6px}
.msg time{display:block;font-size:11px;opacity:.6;margin-top:4px;text-align:right}
.msg .autor{display:block;font:700 11px/1 var(--display);letter-spacing:.1em;text-transform:uppercase;opacity:.6;margin-bottom:4px}
.escribir{grid-template-columns:minmax(0,1fr);min-width:0;border-top:1px solid var(--rule);padding:10px 16px;padding-bottom:max(10px,env(safe-area-inset-bottom));display:grid;gap:8px}
.escribir .fila{display:flex;gap:8px;align-items:flex-end;min-width:0}
.escribir textarea{flex:1;min-width:0;resize:none;border:1.5px solid var(--rule);background:var(--bg);border-radius:14px;padding:10px 12px;max-height:160px}
.aviso{font-size:13px;color:var(--muted);margin:0}
.aviso.alerta{color:var(--alerta)}
.vacio{display:grid;place-items:center;color:var(--muted);padding:40px 16px;text-align:center}
.volver{display:none}
dialog{border:1px solid var(--rule);border-radius:16px;background:var(--bg);color:var(--fg);padding:20px;width:min(560px,calc(100vw - 32px));max-height:85vh;overflow:auto}
dialog::backdrop{background:rgb(0 0 0/.45)}
dialog h3{font:800 26px/1 var(--display);text-transform:uppercase;margin:0 0 12px}
dialog .grupo{display:grid;gap:8px;margin-bottom:18px}
dialog label{font-size:14px;color:var(--muted)}
dialog input,dialog select{border:1.5px solid var(--rule);background:var(--bg);border-radius:10px;padding:9px 12px}
table{border-collapse:collapse;width:100%;font-size:14px}td,th{text-align:left;padding:6px 4px;border-bottom:1px solid var(--rule)}
.medidor{height:10px;border-radius:99px;background:var(--soft);overflow:hidden}.medidor i{display:block;height:100%;background:var(--fg)}
@media (max-width:760px){
  .cuerpo{grid-template-columns:minmax(0,1fr)}
  .app.abierto .lista{display:none}
  .app:not(.abierto) .chat{display:none}
  .volver{display:inline-flex}
  .lista{border-right:0}
  header.barra .acciones{margin-left:0;width:100%}
  select.filtro{flex:1;max-width:none}
  .chat .cab .acc{margin-left:0;width:100%}
}
</style></head><body><div class="app" id="app">
<header class="barra"><span class="marca">${ICONO}bookeaa</span>
<div class="acciones"><select class="filtro" id="filtro" aria-label="Filtrar por etiqueta"><option value="">Todos los chats</option></select>
<button class="btn sec" id="ajustes" type="button">Ajustes</button>
<form method="post" action="/bandeja/salir"><button class="btn sec" type="submit">Salir</button></form></div></header>
<div class="cuerpo"><nav class="lista" id="lista" aria-label="Chats"></nav>
<section class="chat" id="chat"><div class="vacio">Elige un chat de la lista.</div></section></div></div>

<dialog id="dlgAjustes"><h3>Ajustes</h3><div id="ajustesCuerpo">Cargando…</div><p><button class="btn sec" type="button" data-cerrar>Cerrar</button></p></dialog>
<dialog id="dlgPlantilla"><h3>Enviar plantilla</h3><form id="formPlantilla" class="grupo"></form></dialog>

<script>
const $ = (s, r = document) => r.querySelector(s)
const el = (tag, props = {}, ...hijos) => { const e = Object.assign(document.createElement(tag), props); e.append(...hijos.filter((h) => h != null)); return e }
const api = async (ruta, opciones = {}) => {
  const r = await fetch('/bandeja/api' + ruta, { ...opciones, headers: { 'Content-Type': 'application/json', 'X-Bandeja': '1' } })
  const datos = await r.json().catch(() => ({}))
  if (r.status === 401) location.reload()
  if (!r.ok) throw new Error(datos.error || 'Algo salió mal')
  return datos
}
const DIA = 24 * 3600e3
let ETIQUETAS = [], PLANTILLAS = [], abierto = null, ahoraServidor = Date.now()
const nombreEtiqueta = (k) => (ETIQUETAS.find((e) => e[0] === k) || [k, ''])[1]
const hora = (ms) => { const d = new Date(ms); const hoy = new Date(); return d.toDateString() === hoy.toDateString() ? d.toLocaleTimeString('es-VE', { hour: 'numeric', minute: '2-digit' }) : d.toLocaleDateString('es-VE', { day: 'numeric', month: 'short' }) }
/** *negrita* de WhatsApp sin usar innerHTML. */
const conNegritas = (t) => t.split(/(\\*[^*\\n]+\\*)/).map((p) => /^\\*[^*\\n]+\\*$/.test(p) ? el('b', { textContent: p.slice(1, -1) }) : document.createTextNode(p))
const tel = (t) => '+' + t.replace(/^(\\d{2})(\\d{3})(\\d{3})(\\d+)$/, '$1 $2 $3 $4')

async function cargarAjustesBase() {
  const a = await api('/ajustes')
  ETIQUETAS = a.etiquetas; PLANTILLAS = a.definidas
  const f = $('#filtro')
  for (const [k, n] of ETIQUETAS) f.append(el('option', { value: k, textContent: n }))
  try { f.value = localStorage.getItem('filtro') || '' } catch (_) {}
}

async function pintarLista() {
  const { chats, ahora } = await api('/chats?etiqueta=' + encodeURIComponent($('#filtro').value))
  ahoraServidor = ahora
  const lista = $('#lista')
  lista.replaceChildren()
  if (!chats.length) lista.append(el('p', { className: 'vacio', textContent: 'No hay chats todavía.' }))
  for (const c of chats) {
    const b = el('button', { type: 'button', className: 'item' })
    b.setAttribute('aria-current', String(c.telefono === abierto))
    const chips = el('div', { className: 'chips' })
    if (c.etiqueta) chips.append(el('span', { className: 'chip', textContent: nombreEtiqueta(c.etiqueta) }))
    if (c.modo === 'humano') chips.append(el('span', { className: 'chip humano', textContent: 'Lo atiendes tú' }))
    b.append(
      el('div', { className: 'fila' }, c.sin_leer ? el('span', { className: 'punto', title: 'Sin leer' }) : null, el('b', { textContent: c.nombre || tel(c.telefono) }), el('time', { textContent: hora(c.ultimo_mensaje) })),
      el('p', { textContent: c.resumen || '' }), chips)
    b.onclick = () => abrir(c.telefono)
    lista.append(b)
  }
}

async function abrir(telefono, mantenerScroll) {
  abierto = telefono
  $('#app').classList.add('abierto')
  const { conv, mensajes, ahora } = await api('/chats/' + telefono)
  const chat = $('#chat')
  const scrollPrevio = chat.querySelector('.mensajes')
  const alFinal = !scrollPrevio || scrollPrevio.scrollHeight - scrollPrevio.scrollTop - scrollPrevio.clientHeight < 60
  const ventana = conv.ultimo_entrante && ahora - conv.ultimo_entrante < DIA

  const etiqueta = el('select', { className: 'filtro', ariaLabel: 'Etiqueta' }, el('option', { value: '', textContent: 'Sin etiqueta' }), ...ETIQUETAS.map(([k, n]) => el('option', { value: k, textContent: n })))
  etiqueta.value = conv.etiqueta || ''
  etiqueta.onchange = () => accion('/etiqueta', { etiqueta: etiqueta.value })
  const modo = el('button', { type: 'button', className: 'btn sec', textContent: conv.modo === 'humano' ? 'Devolver al bot' : 'Tomar chat' })
  modo.onclick = () => accion('/modo', { modo: conv.modo === 'humano' ? 'bot' : 'humano' })
  const cerrar = el('button', { type: 'button', className: 'btn sec', textContent: 'Cerrar caso' })
  cerrar.onclick = () => accion('/cerrar', {})
  const volver = el('button', { type: 'button', className: 'btn sec volver', textContent: '‹ Chats' })
  volver.onclick = () => { abierto = null; $('#app').classList.remove('abierto'); pintarLista() }

  const cita = conv.cita ? JSON.parse(conv.cita) : null
  const sub = [tel(conv.telefono), conv.modo === 'humano' ? 'lo atiendes tú' : 'responde el bot', cita ? 'cita ' + cita.fecha + ' ' + cita.hora + (cita.modalidad === 'meet' ? ' (Meet)' : ' (presencial)') : ''].filter(Boolean).join(' · ')
  const cab = el('div', { className: 'cab' }, volver, el('h2', { textContent: conv.nombre || tel(conv.telefono) }, el('small', { textContent: sub })), el('div', { className: 'acc' }, etiqueta, modo, cerrar))

  const lista = el('div', { className: 'mensajes', role: 'log' })
  for (const m of mensajes) {
    const clase = 'msg ' + (m.sentido === 'in' ? 'in' : 'out' + (m.autor === 'bot' ? ' bot' : ''))
    const burbuja = el('div', { className: clase })
    if (m.sentido === 'out') burbuja.append(el('span', { className: 'autor', textContent: m.autor === 'bot' ? 'Bot' : m.tipo === 'plantilla' ? 'Tú · plantilla' : 'Tú' }))
    if (m.media_id && m.tipo === 'imagen') burbuja.append(el('img', { src: '/bandeja/media/' + encodeURIComponent(m.media_id), alt: 'Imagen', loading: 'lazy' }))
    burbuja.append(...conNegritas(m.texto || ''), el('time', { textContent: hora(m.creado) }))
    lista.append(burbuja)
  }

  const caja = el('textarea', { id: 'texto', rows: 2, placeholder: ventana ? 'Escribe tu respuesta…' : 'Pasaron más de 24 h: usa una plantilla', disabled: !ventana, ariaLabel: 'Mensaje' })
  const enviar = el('button', { type: 'button', className: 'btn', textContent: 'Enviar', disabled: !ventana })
  enviar.onclick = async () => {
    const texto = caja.value.trim(); if (!texto) return
    enviar.disabled = true
    try { await api('/chats/' + telefono + '/responder', { method: 'POST', body: JSON.stringify({ texto }) }); caja.value = ''; await abrir(telefono) }
    catch (e) { aviso.textContent = e.message; aviso.className = 'aviso alerta' } finally { enviar.disabled = !ventana }
  }
  const plantilla = el('button', { type: 'button', className: 'btn sec', textContent: 'Plantilla' })
  plantilla.onclick = () => abrirPlantilla(conv)
  const restante = conv.ultimo_entrante ? Math.max(0, DIA - (ahora - conv.ultimo_entrante)) : 0
  const aviso = el('p', { className: ventana ? 'aviso' : 'aviso alerta', textContent: ventana
    ? 'Ventana abierta ' + Math.floor(restante / 3600e3) + ' h ' + Math.floor((restante % 3600e3) / 60e3) + ' min más. Responder te asigna el chat (el bot se calla).'
    : 'Fuera de las 24 h: solo puedes mandar una plantilla aprobada, y se cobra.' })
  const escribir = el('div', { className: 'escribir' }, aviso, el('div', { className: 'fila' }, caja, enviar, plantilla))

  chat.replaceChildren(cab, lista, escribir)
  if (alFinal || !mantenerScroll) lista.scrollTop = lista.scrollHeight
  else lista.scrollTop = scrollPrevio.scrollTop
  pintarLista()
}

async function accion(ruta, cuerpo) {
  try { await api('/chats/' + abierto + ruta, { method: 'POST', body: JSON.stringify(cuerpo) }) } catch (e) { alert(e.message) }
  abrir(abierto, true)
}

function abrirPlantilla(conv) {
  const form = $('#formPlantilla')
  const sel = el('select', { id: 'pl' }, ...PLANTILLAS.map((p) => el('option', { value: p.name, textContent: p.name.replace(/_/g, ' ') + ' · $' + p.costo })))
  const campos = el('div', { className: 'grupo' })
  const vista = el('p', { className: 'aviso' })
  const pintar = () => {
    const p = PLANTILLAS.find((x) => x.name === sel.value)
    campos.replaceChildren(...p.campos.map((c, i) => { const id = 'pv' + i; return el('div', { className: 'grupo' }, el('label', { htmlFor: id, textContent: c }), el('input', { id, value: i === 0 ? (conv.nombre || '').split(' ')[0] : '', required: true })) }))
    vista.textContent = p.texto + '  (costo aprox. $' + p.costo + ', ' + (p.category === 'MARKETING' ? 'promoción' : 'aviso') + ')'
  }
  sel.onchange = pintar
  const mandar = el('button', { type: 'submit', className: 'btn', textContent: 'Enviar plantilla' })
  const cancelar = el('button', { type: 'button', className: 'btn sec', textContent: 'Cancelar' })
  cancelar.onclick = () => $('#dlgPlantilla').close()
  form.replaceChildren(el('label', { htmlFor: 'pl', textContent: 'Plantilla (Meta tiene que haberla aprobado)' }), sel, campos, vista, el('div', { className: 'chips' }, mandar, cancelar))
  form.onsubmit = async (ev) => {
    ev.preventDefault()
    const valores = [...campos.querySelectorAll('input')].map((i) => i.value)
    try { await api('/chats/' + conv.telefono + '/plantilla', { method: 'POST', body: JSON.stringify({ nombre: sel.value, valores }) }); $('#dlgPlantilla').close(); abrir(conv.telefono) }
    catch (e) { vista.textContent = e.message; vista.className = 'aviso alerta' }
  }
  pintar()
  $('#dlgPlantilla').showModal()
}

async function abrirAjustes() {
  const d = $('#dlgAjustes'), c = $('#ajustesCuerpo')
  d.showModal(); c.textContent = 'Cargando…'
  const a = await api('/ajustes')
  const usados = a.uso.servicio, pct = Math.min(100, Math.round((usados / 1000) * 100))
  const estado = Object.fromEntries((a.plantillas || []).map((p) => [p.name, p.status]))
  const correo = el('input', { id: 'correo', type: 'email', placeholder: 'hola@bookeaa.com' })
  const res = el('p', { className: 'aviso' })
  const perfil = el('button', { type: 'button', className: 'btn sec', textContent: 'Configurar perfil' })
  perfil.onclick = async () => { try { await api('/perfil', { method: 'POST', body: JSON.stringify({ correo: correo.value }) }); res.textContent = 'Perfil actualizado.' } catch (e) { res.textContent = e.message } }
  const crear = el('button', { type: 'button', className: 'btn sec', textContent: 'Crear plantillas en Meta' })
  crear.onclick = async () => { try { const r = await api('/plantillas', { method: 'POST', body: '{}' }); res.textContent = r.resultados.map((x) => x.name + ': ' + (x.ok ? 'enviada a revisión' : x.error)).join(' · '); } catch (e) { res.textContent = e.message } }
  c.replaceChildren(
    el('div', { className: 'grupo' }, el('label', { textContent: 'Mensajes de servicio este mes (1.000 gratis; después ≈ $0,0113 c/u)' }),
      el('div', { className: 'medidor' }, el('i', { style: 'width:' + pct + '%' })), el('p', { className: 'aviso', textContent: usados + ' de 1.000 · plantillas enviadas: ' + a.uso.plantillas })),
    el('div', { className: 'grupo' }, el('label', { textContent: 'Plantillas' }),
      el('table', {}, el('tbody', {}, ...a.definidas.map((p) => el('tr', {}, el('td', { textContent: p.name }), el('td', { textContent: p.category === 'MARKETING' ? 'Promoción ≈ $' + p.costo : 'Aviso ≈ $' + p.costo }), el('td', { textContent: estado[p.name] || 'sin crear' }))))),
      a.errorPlantillas ? el('p', { className: 'aviso alerta', textContent: a.errorPlantillas }) : null, crear),
    el('div', { className: 'grupo' }, el('label', { htmlFor: 'correo', textContent: 'Perfil de WhatsApp (descripción, web e Instagram). Correo opcional:' }), correo, perfil),
    res)
}

$('#filtro').onchange = () => { try { localStorage.setItem('filtro', $('#filtro').value) } catch (_) {} pintarLista() }
$('#ajustes').onclick = abrirAjustes
document.querySelectorAll('[data-cerrar]').forEach((b) => b.onclick = () => b.closest('dialog').close())
cargarAjustesBase().catch(() => {}).finally(() => pintarLista())
setInterval(() => { if (document.hidden) return; if (abierto) abrir(abierto, true); else pintarLista() }, 10000)
</script></body></html>`
