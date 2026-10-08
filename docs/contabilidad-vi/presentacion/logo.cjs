const sharp=require('sharp');
const icono=(fg,cal)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect x="2" y="4" width="28" height="26" rx="7" fill="${fg}"/><path d="M10 2.5v5M22 2.5v5" stroke="${fg}" stroke-width="2.6" stroke-linecap="round"/><path d="M12 11v12M12 17.5a4 4 0 1 1 0 .01" stroke="${cal}" stroke-width="2.6" stroke-linecap="round" fill="none"/></svg>`;
(async()=>{await sharp(Buffer.from(icono('#ffffff','#0f0f0e'))).resize(512,512).png().toFile('logo-claro.png');
await sharp(Buffer.from(icono('#0f0f0e','#ffffff'))).resize(512,512).png().toFile('logo-oscuro.png');console.log('ok')})();
