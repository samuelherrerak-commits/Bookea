/*
 * Datos legales de bookeaa en UN solo lugar. Los usan /terminos, /privacidad y /guia-legal.
 * Mientras un dato esté vacío, la página muestra "[Pendiente: …]" resaltado.
 * Cuando registres la firma personal, completa los campos y vuelve a publicar.
 */
window.DATOS_LEGALES = {
  firma: '', // nombre exacto de la firma personal, como sale en el Registro Mercantil
  titular: '', // nombre y apellido de quien es dueño de la firma
  rif: '', // ej. V-12345678-9 (el de la firma)
  registro: '', // Registro Mercantil, fecha, número y tomo
  domicilio: '', // dirección fiscal
  ciudad: '', // ciudad cuyos tribunales resuelven los conflictos
  correo: '', // correo para soporte y privacidad, ej. hola@bookeaa.com
  whatsapp: '+58 422 029 8203',
  sitio: 'bookeaa.com',
  precio: '$15', // precio mensual de referencia
  vigencia: '1 de octubre de 2026', // fecha desde la que rigen los términos
}

;(function () {
  const ETIQUETAS = {
    firma: 'nombre de la firma personal', titular: 'nombre del titular', rif: 'RIF', registro: 'datos del Registro Mercantil',
    domicilio: 'domicilio fiscal', ciudad: 'ciudad', correo: 'correo de contacto',
  }
  function rellenar() {
    document.querySelectorAll('[data-dato]').forEach((el) => {
      const k = el.dataset.dato
      const v = String(window.DATOS_LEGALES[k] || '').trim()
      el.textContent = v || `[Pendiente: ${ETIQUETAS[k] || k}]`
      el.classList.toggle('pendiente', !v)
    })
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', rellenar)
  else rellenar()
})()
