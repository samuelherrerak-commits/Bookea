// Presentación de 8 diapositivas (1920×1080) con la identidad de bookeaa, exportada a PDF.
const fs=require('fs'), path=require('path');
const D=require('../calculos/estados.json');
const E=D.E,B=D.B,M=D.mat,pr=D.precio;
const es=(v,d=0)=>{const s=Math.abs(v).toFixed(d).split('.');s[0]=s[0].replace(/\B(?=(\d{3})+(?!\d))/g,'.');return (v<0?'−':'')+s.join(',')};
const $=(v,d=0)=>(v<0?'−':'')+'$'+es(Math.abs(v),d);
const R='../../..';
const icono=(fg,cal)=>`<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="2" y="4" width="28" height="26" rx="7" fill="${fg}"/><path d="M10 2.5v5M22 2.5v5" stroke="${fg}" stroke-width="2.6" stroke-linecap="round"/><path d="M12 11v12M12 17.5a4 4 0 1 1 0 .01" stroke="${cal}" stroke-width="2.6" stroke-linecap="round" fill="none"/></svg>`;
const marca=o=>`<div class="marca">${icono(o?'#fff':'#0f0f0e',o?'#0f0f0e':'#fff')}<span>bookeaa</span></div>`;
const pie=(n,o)=>`<footer>${marca(o)}<span>Auditoría I · Auditoría financiera de Bookeaa, C.A.</span><b>${String(n).padStart(2,'0')}</b></footer>`;
const ok=`<svg viewBox="0 0 24 24" class="ok"><circle cx="12" cy="12" r="11" fill="#1baf7a"/><path d="M7 12.5l3.2 3.2L17 9" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
// analítica de ingresos por trimestre (igual que la cédula SA-1)
const ms=D.meses, tri=[0,1,2,3].map(k=>{const r=ms.slice(k*3,k*3+3);return {t:['Oct–dic 26','Ene–mar 27','Abr–jun 27','Jul–sep 27'][k],esp:r.reduce((a,m)=>a+Math.round(m.pag),0)*pr,reg:r.reduce((a,m)=>a+m.ing,0)+(k===3?48:0)}});
const difTot=tri.reduce((a,x)=>a+x.reg-x.esp,0);
function grafSA1(){const W=900,H=470,m={t:20,r:10,b:60,l:80},iw=W-m.l-m.r,ih=H-m.t-m.b,max=3000,y=v=>m.t+ih-v/max*ih,paso=iw/4,bw=62;let g='';
  for(let v=0;v<=max;v+=1000)g+=`<line x1="${m.l}" x2="${W-m.r}" y1="${y(v)}" y2="${y(v)}" stroke="${v?'#ebebe7':'#8a8a85'}"/><text x="${m.l-14}" y="${y(v)+7}" text-anchor="end" class="eje">${'$'+es(v)}</text>`;
  const bar=(x,v,c)=>{const yy=y(v);return `<path d="M${x},${y(0)}V${yy+8}Q${x},${yy} ${x+8},${yy}H${x+bw-8}Q${x+bw},${yy} ${x+bw},${yy+8}V${y(0)}Z" fill="${c}"/>`};
  tri.forEach((q,i)=>{const cx=m.l+paso*i+paso/2;g+=bar(cx-bw-3,q.esp,'#a3a39e')+bar(cx+3,q.reg,'#2a78d6');
    g+=`<text x="${cx}" y="${y(Math.max(q.esp,q.reg))-14}" text-anchor="middle" class="val">${(q.reg-q.esp>=0?'+':'')+$(q.reg-q.esp)}</text><text x="${cx}" y="${H-22}" text-anchor="middle" class="cat">${q.t}</text>`});
  return `<svg viewBox="0 0 ${W} ${H}" class="grafico" role="img" aria-label="Ingresos esperados frente a registrados por trimestre">${g}</svg>`}
const S=[];
// 1 Portada
S.push(`<section class="oscura portada">${marca(true)}
  <div class="pt-texto"><p class="kicker">Auditoría I · Proyecto final</p><h1>Auditoría<br>financiera</h1>
  <p class="lead">Planificación, ejecución y presentación de resultados en la auditoría de Bookeaa, C.A., ejercicio terminado el 30 de septiembre de 2027.</p></div>
  <img class="bookee-portada" src="${R}/marketing/bookee/bookee-feliz-blanco.png" alt="">
  <p class="autores">[Integrantes] · Prof. [Nombre del docente] · Universidad José María Vargas</p></section>`);
// 2 Entidad
S.push(`<section><p class="kicker">La entidad auditada</p><h2>Bookeaa, C.A.</h2>
  <div class="dos d-ent"><div>
    <p class="texto">Plataforma digital de reservas de citas para salones de belleza, barberías y centros de estética. Cobra una suscripción mensual de ${$(pr)} y cerró su primer ejercicio con unos ${es(ms[11].pag)} negocios que pagan.</p>
    <ul class="hechos"><li><b>Marco contable</b><span>VEN-NIF PYME</span></li><li><b>Normas de auditoría</b><span>NIA adoptadas en Venezuela</span></li><li><b>Período</b><span>1-oct-2026 al 30-sep-2027</span></li><li><b>Cifras</b><span>Ilustrativas, por confidencialidad</span></li></ul></div>
    <div class="rejilla">
      <div class="tarjeta"><b>${$(E.ing)}</b><span>ingresos por suscripciones</span></div>
      <div class="tarjeta"><b>${$(E.neta)}</b><span>resultado neto del ejercicio</span></div>
      <div class="tarjeta"><b>${$(B.activo)}</b><span>activo total</span></div>
      <div class="tarjeta inv"><b>${$(B.patrimonio)}</b><span>patrimonio</span></div>
    </div></div>${pie(2)}</section>`);
// 3 Fases
const fases=[['01','Planificación','NIA 200 a 450 · ago. 2027','Oferta de servicios, control interno, riesgos, materialidad y programas de trabajo.'],
 ['02','Ejecución','NIA 500 a 699 · sep. y oct. 2027','Pruebas de control y pruebas sustantivas analíticas y de detalle, documentadas en cédulas.'],
 ['03','Informe','NIA 700 a 799 · nov. 2027','Formación de la opinión, informe del auditor independiente y carta a la gerencia.']];
S.push(`<section><p class="kicker">El encargo</p><h2>Una auditoría en tres fases</h2>
  <div class="tres">${fases.map(([n,t,p,d],i)=>`<article class="fase${i===2?' inv':''}"><span class="num">${n}</span><h3>${t}</h3><p class="periodo">${p}</p><p>${d}</p></article>`).join('')}</div>${pie(3)}</section>`);
// 4 Planificación I
S.push(`<section><p class="kicker">Fase 1 · Planificación</p><h2>Oferta de servicios y control interno</h2>
  <div class="dos d-mitad">
    <div class="panel"><h4>Oferta de servicios · NIA 210</h4>
      <div class="mini"><div><b>84</b><span>horas</span></div><div><b>${$(84*15)}</b><span>honorarios</span></div><div><b>3</b><span>auditores</span></div></div>
      <ol class="lista-num"><li>Objetivo y alcance de la auditoría</li><li>Responsabilidades de la dirección</li><li>Responsabilidades del auditor</li><li>Cronograma: agosto a noviembre de 2027</li></ol></div>
    <div class="panel"><h4>Control interno · NIA 315 y COSO</h4>
      <div class="medidor"><b>9 de 10</b><span>respuestas afirmativas en el cuestionario del ciclo de ingresos y cobros</span><div class="barra"><i style="width:90%"></i></div></div>
      <div class="chips"><span>Entorno de control</span><span>Evaluación de riesgos</span><span>Actividades de control</span><span>Información y comunicación</span><span>Supervisión</span></div>
      <p class="nota">Oportunidad de mejora: política escrita para las cuotas cobradas por adelantado.</p></div>
  </div>${pie(4)}</section>`);
// 5 Planificación II
const riesgos=[['Ingresos','Corte y ocurrencia (riesgo presunto de fraude)','Alto'],['Efectivo','Saldos digitales no conciliados','Medio'],['Gastos','Gastos del período siguiente','Medio'],['Cuentas por cobrar','Cuotas no cobrables','Bajo'],['Equipos','Cálculo de la depreciación','Bajo']];
S.push(`<section><p class="kicker">Fase 1 · Planificación</p><h2>Riesgos y materialidad</h2>
  <div class="dos d-riesgo">
    <div class="panel"><h4>Matriz de riesgos · NIA 315 y 330</h4><table class="tabla">${riesgos.map(([a,b,c])=>`<tr><td><b>${a}</b></td><td>${b}</td><td><span class="nivel n-${c.toLowerCase()}">${c}</span></td></tr>`).join('')}</table></div>
    <div class="pila">
      <div class="tarjeta inv"><b>${$(M.global)}</b><span>materialidad global: 1,5 % de los ingresos (NIA 320)</span></div>
      <div class="tarjeta"><b>${$(M.desemp)}</b><span>materialidad de ejecución: 70 % de la global</span></div>
      <div class="tarjeta"><b>${$(M.trivial)}</b><span>umbral de incorrecciones claramente insignificantes</span></div>
    </div></div>${pie(5)}</section>`);
// 6 Ejecución: pruebas de control
S.push(`<section><p class="kicker">Fase 2 · Ejecución</p><h2>Pruebas de control</h2>
  <div class="dos d-mitad">
    <div class="panel"><h4>PC-1 · Altas de suscriptores</h4><p class="sub">Muestra de 25 de 156 altas: registro, aceptación, factura y cobro conciliado.</p>
      <div class="puntos">${Array.from({length:25},(_,i)=>`<i class="${i===6?'x':''}"></i>`).join('')}</div>
      <div class="comparar"><div><b>4 %</b><span>desviación observada</span></div><div><b>5 %</b><span>desviación tolerable</span></div></div>
      <p class="resultado">${ok}Control eficaz</p></div>
    <div class="panel"><h4>PC-2 · Conciliaciones mensuales</h4><p class="sub">Conciliaciones bancarias y digitales preparadas, revisadas y firmadas.</p>
      <div class="meses">${['Oct','Nov','Dic','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep'].map(m=>`<span>${ok}${m}</span>`).join('')}</div>
      <div class="comparar"><div><b>12 / 12</b><span>meses conciliados</span></div></div>
      <p class="resultado">${ok}Control eficaz</p></div>
  </div>${pie(6)}</section>`);
// 7 Ejecución: sustantivas
S.push(`<section><p class="kicker">Fase 2 · Ejecución</p><h2>Pruebas sustantivas</h2>
  <div class="dos d-sust">
    <figure><h4>SA-1 · Ingresos esperados (suscriptores × cuota) frente a registrados</h4>
      <div class="leyenda"><span><i style="background:#a3a39e"></i>Esperado</span><span><i style="background:#2a78d6"></i>Registrado</span></div>${grafSA1()}
      <p class="sub">Diferencia total: ${$(difTot)}, por debajo de la materialidad de ejecución (${$(M.desemp)}).</p></figure>
    <div class="pila">
      <div class="panel compacto"><h4>Pruebas de detalle</h4><ul class="checks">
        <li>${ok}Efectivo confirmado y conciliado</li><li>${ok}Cuentas por cobrar confirmadas y cobradas</li><li>${ok}Comprobantes de egresos con soporte</li><li>${ok}Depreciación recalculada</li></ul></div>
      <div class="tarjeta inv"><b>2 ajustes</b><span>de corte (${$(48)} y ${$(18)}), menores a la materialidad, corregidos por la gerencia</span></div>
    </div></div>${pie(7)}</section>`);
// 8 Informe y conclusiones
S.push(`<section class="oscura"><p class="kicker">Fase 3 · Presentación de resultados</p><h2>Opinión no modificada</h2>
  <div class="dos d-final"><div>
    <p class="cita">«Los estados financieros presentan razonablemente, en todos los aspectos materiales, la situación financiera de Bookeaa, C.A. al 30 de septiembre de 2027, de conformidad con VEN-NIF PYME.»</p>
    <p class="kicker" style="margin-top:46px">Recomendaciones a la gerencia · NIA 265</p>
    <ol class="recs"><li>Política escrita de cobros por adelantado</li><li>Gastos pagados por anticipado</li><li>Factura automática al conciliar</li><li>Planificar la auditoría del año 2</li></ol></div>
    <img class="bookee-final" src="${R}/marketing/bookee/bookee-feliz-blanco.png" alt=""></div>${pie(8,true)}</section>`);
const F=`${R}/public/ar-comun/fuentes`;
const css=`
@font-face{font-family:'Barlow Condensed';font-weight:800;src:url(${F}/barlow-condensed-latin-800-normal.woff2)}
@font-face{font-family:'Barlow';font-weight:500;src:url(${F}/barlow-latin-500-normal.woff2)}
@font-face{font-family:'Barlow';font-weight:600 700;src:url(${F}/barlow-latin-600-normal.woff2)}
@page{size:1920px 1080px;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Barlow,sans-serif;font-weight:500;color:#0f0f0e;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
section{width:1920px;height:1080px;padding:88px 110px 0;position:relative;overflow:hidden;page-break-after:always;background:#fff}
section.oscura{background:#0f0f0e;color:#fff}
h1,h2,h3,h4,.num,.tarjeta b,.marca span,.mini b,.medidor b,.comparar b,.recs li::before,.hechos b{font-family:'Barlow Condensed',sans-serif;font-weight:800;text-transform:uppercase}
h1{font-size:200px;line-height:.86}h2{font-size:104px;line-height:.9;margin:18px 0 48px}h3{font-size:52px;line-height:.95}h4{font-size:32px;line-height:1;margin-bottom:22px}
.kicker{font:600 22px/1 Barlow;letter-spacing:.22em;text-transform:uppercase;color:#5b5b57}.oscura .kicker{color:#a3a39e}
.marca{display:flex;align-items:center;gap:14px}.marca svg{width:44px;height:44px}.marca span{font-size:48px;text-transform:none;letter-spacing:-.02em;line-height:.8}
footer{position:absolute;left:110px;right:110px;bottom:48px;display:flex;align-items:center;gap:22px;font-size:20px;color:#5b5b57}
footer .marca svg{width:26px;height:26px}footer .marca span{font-size:28px;color:#0f0f0e}.oscura footer{color:#a3a39e}.oscura footer .marca span{color:#fff}
footer b{margin-left:auto;font:800 28px 'Barlow Condensed'}
.portada .pt-texto{margin-top:120px;max-width:1100px}.portada h1{margin:30px 0 40px}.lead{font-size:34px;line-height:1.35;color:#c3c2b7;max-width:980px}
.bookee-portada{position:absolute;right:70px;bottom:120px;width:700px}.autores{position:absolute;left:110px;bottom:60px;font-size:22px;color:#a3a39e}
.dos{display:grid;gap:56px}.d-ent{grid-template-columns:1fr 860px}.d-mitad{grid-template-columns:1fr 1fr}.d-riesgo{grid-template-columns:1fr 600px}.d-sust{grid-template-columns:1fr 640px}.d-final{grid-template-columns:1fr 420px;align-items:end}
.texto{font-size:32px;line-height:1.4}
.hechos{list-style:none;margin-top:40px;border-top:2px solid #e3e3df}.hechos li{display:flex;justify-content:space-between;padding:18px 0;border-bottom:2px solid #e3e3df;font-size:26px}.hechos b{font-size:28px}.hechos span{color:#5b5b57}
.rejilla{display:grid;grid-template-columns:1fr 1fr;gap:24px}
.tarjeta{background:#f4f4f2;border-radius:28px;padding:30px 34px;display:flex;flex-direction:column;justify-content:center;gap:12px;min-height:200px}
.tarjeta b{font-size:80px;line-height:.9}.tarjeta span{font-size:23px;line-height:1.3;color:#5b5b57}
.inv{background:#0f0f0e!important;color:#fff}.inv span{color:#c3c2b7!important}
.tres{display:grid;grid-template-columns:repeat(3,1fr);gap:32px}
.fase{background:#f4f4f2;border-radius:36px;padding:48px;height:600px;display:flex;flex-direction:column}.fase .num{font-size:140px;line-height:.85;margin-bottom:40px}
.fase .periodo{font-size:23px;color:#5b5b57;margin:16px 0 28px}.fase.inv .periodo{color:#a3a39e!important}.fase.inv .num{color:#fff!important}.fase p{font-size:28px;line-height:1.38}
.panel{border:2px solid #e3e3df;border-radius:36px;padding:40px 44px}.panel.compacto{padding:32px 38px}
.mini{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:30px}.mini div{background:#f4f4f2;border-radius:22px;padding:22px 24px}.mini b{display:block;font-size:56px;line-height:.9}.mini span{font-size:21px;color:#5b5b57}
.lista-num{list-style:none;counter-reset:n}.lista-num li{counter-increment:n;font-size:27px;padding:14px 0;border-bottom:2px solid #f0f0ec;display:flex;gap:16px}.lista-num li::before{content:counter(n);font:800 30px 'Barlow Condensed';width:28px}
.medidor b{font-size:76px;line-height:.9;display:block}.medidor span{font-size:23px;color:#5b5b57}.barra{height:18px;background:#f0f0ec;border-radius:9px;margin:18px 0 30px;overflow:hidden}.barra i{display:block;height:100%;background:#1baf7a;border-radius:9px}
.chips{display:flex;flex-wrap:wrap;gap:12px}.chips span{border-radius:999px;background:#0f0f0e;color:#fff;padding:12px 22px;font-size:21px;font-weight:600}
.nota{margin-top:26px;font-size:22px;color:#5b5b57}
.tabla{width:100%;border-collapse:collapse;font-size:25px}.tabla td{padding:20px 10px;border-bottom:2px solid #f0f0ec;vertical-align:middle}.tabla td:first-child{width:250px}.tabla td:last-child{text-align:right;width:130px}
.nivel{display:inline-block;border-radius:999px;padding:8px 20px;font-size:20px;font-weight:600}.n-alto{background:#eb6834;color:#fff}.n-medio{background:#f4d9cc;color:#0f0f0e}.n-bajo{background:#f0f0ec;color:#0f0f0e}
.pila{display:flex;flex-direction:column;gap:22px}.pila .tarjeta{min-height:0;height:196px}
.sub{font-size:22px;color:#5b5b57;margin:-8px 0 26px;line-height:1.35}
.puntos{display:grid;grid-template-columns:repeat(13,1fr);gap:12px;margin-bottom:30px}.puntos i{aspect-ratio:1;border-radius:50%;background:#1baf7a}.puntos i.x{background:#eb6834}
.comparar{display:flex;gap:18px}.comparar div{flex:1;background:#f4f4f2;border-radius:22px;padding:22px 26px}.comparar b{display:block;font-size:64px;line-height:.9}.comparar span{font-size:21px;color:#5b5b57}
.resultado{display:flex;align-items:center;gap:12px;margin-top:26px;font-size:28px;font-weight:600}.ok{width:34px;height:34px;flex:none}
.meses{display:grid;grid-template-columns:repeat(6,1fr);gap:12px;margin-bottom:30px}.meses span{display:flex;align-items:center;gap:8px;font-size:22px;font-weight:600;background:#f4f4f2;border-radius:16px;padding:12px}.meses .ok{width:26px;height:26px}
figure{border:2px solid #e3e3df;border-radius:36px;padding:34px 34px 20px}figure h4{font-size:28px;margin-bottom:14px}figure .sub{margin:6px 0 0}
.leyenda{display:flex;gap:30px;font-size:21px;color:#5b5b57}.leyenda i{display:inline-block;width:18px;height:18px;border-radius:5px;margin-right:10px;vertical-align:-2px}
.grafico{width:100%;height:470px;display:block}.eje{font:500 20px Barlow;fill:#5b5b57}.cat{font:600 23px Barlow;fill:#0f0f0e}.val{font:700 22px Barlow;fill:#0f0f0e}
.checks{list-style:none}.checks li{display:flex;align-items:center;gap:14px;font-size:25px;padding:12px 0;border-bottom:2px solid #f0f0ec}.checks .ok{width:28px;height:28px}
.cita{font-size:36px;line-height:1.38;border-left:0;color:#fff;background:#1f1f1d;border-radius:32px;padding:40px 46px}
.recs{list-style:none;counter-reset:r;display:grid;grid-template-columns:repeat(2,1fr);gap:20px 36px;margin-top:24px}
.recs li{counter-increment:r;display:flex;align-items:center;gap:18px;font-size:27px}.recs li::before{content:counter(r);width:52px;height:52px;flex:none;border-radius:50%;background:#fff;color:#0f0f0e;display:grid;place-items:center;font-size:28px}
.bookee-final{width:400px;margin-bottom:110px}`;
fs.writeFileSync(path.join(__dirname,'slides.html'),`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Auditoría financiera · Bookeaa, C.A.</title><style>${css}</style></head><body>${S.join('\n')}</body></html>`);
(async()=>{const {chromium}=require('playwright');const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const p=await b.newPage({viewport:{width:1920,height:1080}});await p.goto('file://'+path.join(__dirname,'slides.html'));await p.evaluate(()=>document.fonts.ready);
 await p.pdf({path:path.join(__dirname,'Presentacion_Auditoria_I_bookeaa.pdf'),width:'1920px',height:'1080px',printBackground:true,preferCSSPageSize:true});
 const secs=await p.$$('section');for(let i=0;i<secs.length;i++) await secs[i].screenshot({path:process.env.SHOTS+'/a'+(i+1)+'.png'});
 await b.close();console.log('ok',secs.length)})();
