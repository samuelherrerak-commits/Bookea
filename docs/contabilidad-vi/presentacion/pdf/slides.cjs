// Genera slides.html (1920×1080 por diapositiva) con la identidad de bookeaa y lo exporta a PDF.
const fs=require('fs'), path=require('path');
const D=require('../../calculos/datos.json');
const B=D.base,C=D.conservador,O=D.optimista,PA=D.par,pr=PA.precio;
const es=(v,d=0)=>{const s=Math.abs(v).toFixed(d).split('.');s[0]=s[0].replace(/\B(?=(\d{3})+(?!\d))/g,'.');return (v<0?'−':'')+s.join(',')};
const $=(v,d=0)=>(v<0?'−':'')+'$'+es(Math.abs(v),d);
const R='../../../..'; // raíz del repo
const icono=(fg,cal)=>`<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="2" y="4" width="28" height="26" rx="7" fill="${fg}"/><path d="M10 2.5v5M22 2.5v5" stroke="${fg}" stroke-width="2.6" stroke-linecap="round"/><path d="M12 11v12M12 17.5a4 4 0 1 1 0 .01" stroke="${cal}" stroke-width="2.6" stroke-linecap="round" fill="none"/></svg>`;
const marca=(oscuro)=>`<div class="marca">${icono(oscuro?'#fff':'#0f0f0e',oscuro?'#0f0f0e':'#fff')}<span>bookeaa</span></div>`;
const pie=(n,oscuro)=>`<footer>${marca(oscuro)}<span>Contabilidad VI · Estructura de costos</span><b>${String(n).padStart(2,'0')}</b></footer>`;
// gráfico de barras apiladas (fase 2, meses 4 a 12)
function barras(){
  const W=900,H=560,m={t:30,r:20,b:70,l:90},iw=W-m.l-m.r,ih=H-m.t-m.b,max=6000;
  const y=v=>m.t+ih-v/max*ih, cats=[['Conservador',C],['Base',B],['Optimista',O]], bw=150, paso=iw/3;
  let g='';
  for(let v=0;v<=max;v+=1000) g+=`<line x1="${m.l}" x2="${W-m.r}" y1="${y(v)}" y2="${y(v)}" stroke="${v?'#ebebe7':'#8a8a85'}"/><text x="${m.l-16}" y="${y(v)+8}" text-anchor="end" class="eje">${v?'$'+es(v):'$0'}</text>`;
  cats.forEach(([n,x],i)=>{const cx=m.l+paso*i+paso/2,f=x.r29.cf,v=x.r29.cv,x0=cx-bw/2;
    const yf=y(f),yv=y(f+v);
    g+=`<rect x="${x0}" y="${yf}" width="${bw}" height="${y(0)-yf}" fill="#2a78d6"/>`;
    g+=`<path d="M${x0},${yf-4}V${yv+10}Q${x0},${yv} ${x0+10},${yv}H${x0+bw-10}Q${x0+bw},${yv} ${x0+bw},${yv+10}V${yf-4}Z" fill="#eb6834"/>`;
    g+=`<text x="${cx}" y="${(yf+y(0))/2+10}" text-anchor="middle" class="val claro">${$(f)}</text>`;
    g+=`<text x="${cx}" y="${(yv+yf)/2+10}" text-anchor="middle" class="val claro">${$(v)}</text>`;
    g+=`<text x="${cx}" y="${yv-18}" text-anchor="middle" class="val">${$(f+v)}</text>`;
    g+=`<text x="${cx}" y="${H-28}" text-anchor="middle" class="cat">${n}</text>`;});
  return `<svg viewBox="0 0 ${W} ${H}" class="grafico" role="img" aria-label="Costos fijos y variables de los meses 4 a 12 por escenario">${g}</svg>`;
}
const pe3=es(Math.round(B.f3.peC/5)*5);
const S=[];
// 1 Portada
S.push(`<section class="oscura portada">
  ${marca(true)}
  <div class="pt-texto">
    <p class="kicker">Contabilidad VI · Contabilidad de costos</p>
    <h1>Estructura<br>de costos<br>en tres fases</h1>
    <p class="lead">Cómo cambian los costos de una empresa de software por suscripción según sus proyecciones de ventas.</p>
  </div>
  <img class="bookee-portada" src="${R}/marketing/bookee/bookee-feliz-blanco.png" alt="">
  <p class="autores">[Nombres de los estudiantes] · Prof. [Nombre del docente] · Octubre de 2026</p>
</section>`);
// 2 Negocio
S.push(`<section>
  <p class="kicker">El negocio</p>
  <h2>Un negocio por<br>suscripción</h2>
  <div class="dos d-neg">
    <div>
      <p class="texto">Una plataforma para que salones de belleza, barberías y centros de estética reciban reservas en línea. El ingreso se acumula mes a mes con cada cliente que se queda.</p>
      <div class="cifras">
        <div class="cifra"><b>1 mes</b><span>de prueba sin costo</span></div>
        <div class="cifra"><b>${$(pr)}</b><span>cuota mensual fija</span></div>
        <div class="cifra inv"><b>${PA.meta}</b><span>negocios, meta del primer trimestre</span></div>
      </div>
      <p class="kicker" style="margin-top:44px">Cómo se proyectan las ventas</p>
      <ol class="pasos">
        <li><i>1</i><b>Se incorpora</b><span>Mes de prueba</span></li>
        <li><i>2</i><b>Pasa a pagar</b><span>70 % de conversión</span></li>
        <li><i>3</i><b>Se mantiene</b><span>5 % se retira al mes</span></li>
        <li class="inv"><i>4</i><b>Genera ingreso</b><span>Clientes × cuota</span></li>
      </ol>
    </div>
    <div class="telefono"><div class="pantalla"><img src="${R}/public/landing/plantillas/audaz.jpg" alt="Página de reservas de un negocio"></div></div>
  </div>
  ${pie(2)}
</section>`);
// 3 Ruta
const fases=[['01','Estructura base','Oct. a dic. 2026','Costos mínimos, presupuestados como montos mensuales, para arrancar y validar el mercado.','Presupuesto estático'],
 ['02','Análisis y ajustes','Ene. a sep. 2027','Con los datos del trimestre se separan los costos fijos y variables y se mide el costo por cliente.','Presupuesto flexible · CVU'],
 ['03','Estructura objetivo','Oct. 2027 a sep. 2028','Estructura completa: remuneración de la dirección, servicios contables y procesos más eficientes.','Costeo por actividades']];
S.push(`<section>
  <p class="kicker">La propuesta</p>
  <h2>La ruta en tres fases</h2>
  <div class="tres">${fases.map(([n,t,p,d,h],i)=>`
    <article class="fase${i===2?' inv':''}">
      <span class="num">${n}</span><h3>${t}</h3><p class="periodo">${p}</p><p>${d}</p><span class="chip">${h}</span>
    </article>`).join('')}</div>
  ${pie(3)}
</section>`);
// 4 Fase 2
S.push(`<section>
  <p class="kicker">Fase 2 · Meses 4 a 12</p>
  <h2>Los costos siguen a las ventas</h2>
  <div class="dos d-graf">
    <figure>
      <div class="leyenda"><span><i style="background:#2a78d6"></i>Costos fijos</span><span><i style="background:#eb6834"></i>Costos variables</span></div>
      ${barras()}
    </figure>
    <div class="pila">
      <div class="tarjeta"><b>${$(B.a.mcu,2)}</b><span>margen de contribución por cliente (${es(B.a.mcu/pr*100)} % de la cuota)</span></div>
      <div class="tarjeta"><b>${es(B.a.peCrec)}</b><span>negocios: punto de equilibrio con crecimiento, escenario base</span></div>
      <div class="tarjeta inv"><b>GAO ${es(C.a.gao,1)}</b><span>en el escenario conservador: opera cerca del equilibrio</span></div>
    </div>
  </div>
  ${pie(4)}
</section>`);
// 5 Fase 3
S.push(`<section>
  <p class="kicker">Fase 3 · Segundo año</p>
  <h2>La estructura objetivo</h2>
  <div class="dos d-f3">
    <div class="listas">
      <div><h4><i style="background:#eb6834"></i>Costos variables</h4><ul><li>Incorporación asistida de cada negocio</li><li>Visitas comerciales selectivas</li><li>Atención y soporte por cliente</li><li>Tributos sobre ventas y cobros</li></ul></div>
      <div><h4><i style="background:#2a78d6"></i>Costos fijos</h4><ul><li>Remuneración de la dirección</li><li>Mantenimiento y desarrollo</li><li>Infraestructura en la nube <em>(escalonada)</em></li><li>Servicios contables externos</li><li>Publicidad y marketing</li></ul></div>
    </div>
    <div class="rejilla">
      <div class="tarjeta ancha"><b>${$(B.f3.res)}</b><span>resultado del año 2, escenario base</span></div>
      <div class="tarjeta"><b>${$(B.f3.cvu,2)}</b><span>costo variable por cliente (fase 2: ${$(B.a.cvu,2)})</span></div>
      <div class="tarjeta"><b>${es(B.f3.ltv/B.f3.cac,1)}×</b><span>valor del cliente sobre su costo de captación</span></div>
      <div class="tarjeta ancha inv"><b>Por volumen</b><span>la fase 3 se activa al superar unos ${pe3} negocios pagando</span></div>
    </div>
  </div>
  ${pie(5)}
</section>`);
// 6 Conclusiones
S.push(`<section class="oscura">
  <p class="kicker">Para cerrar</p>
  <h2>Conclusiones</h2>
  <div class="tres concl">
    <article><h3>En el total</h3><p>Desde la fase 2, los costos crecen con el número de clientes por la parte variable.</p></article>
    <article><h3>En el costo unitario</h3><p>A más clientes, menor costo por cliente: ${$(B.cu.f3,2)} en el base y ${$(O.cu.f3,2)} en el optimista.</p></article>
    <article><h3>En el riesgo</h3><p>Con menos ventas la empresa opera cerca del equilibrio y necesita una estructura austera.</p></article>
  </div>
  <div class="cierre">
    <div>
      <p class="kicker">Recomendaciones</p>
      <ol class="recs"><li>Registrar desde el inicio las horas por cliente</li><li>Presupuesto flexible y comparación mensual</li><li>Activar la fase 3 por volumen</li><li>Seguir cuota, conversión y cancelación</li></ol>
    </div>
    <img class="bookee-cierre" src="${R}/marketing/bookee/bookee-feliz-blanco.png" alt="">
  </div>
  ${pie(6,true)}
</section>`);
const F=`${R}/public/ar-comun/fuentes`;
const html=`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Estructura de costos en tres fases · bookeaa</title><style>
@font-face{font-family:'Barlow Condensed';font-weight:800;src:url(${F}/barlow-condensed-latin-800-normal.woff2)}
@font-face{font-family:'Barlow';font-weight:500;src:url(${F}/barlow-latin-500-normal.woff2)}
@font-face{font-family:'Barlow';font-weight:600 700;src:url(${F}/barlow-latin-600-normal.woff2)}
@page{size:1920px 1080px;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Barlow,sans-serif;font-weight:500;color:#0f0f0e;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
section{width:1920px;height:1080px;padding:88px 110px 0;position:relative;overflow:hidden;page-break-after:always;background:#fff}
section.oscura{background:#0f0f0e;color:#fff}
h1,h2,h3,h4,.num,.cifra b,.tarjeta b,.marca span,.pasos i,.recs li::before{font-family:'Barlow Condensed',sans-serif;font-weight:800;text-transform:uppercase}
h1{font-size:190px;line-height:.86;letter-spacing:-.01em}
h2{font-size:112px;line-height:.88;margin:18px 0 46px}
h3{font-size:44px;line-height:.95}
.kicker{font:600 22px/1 Barlow;letter-spacing:.22em;text-transform:uppercase;color:#5b5b57}
.oscura .kicker{color:#a3a39e}
.marca{display:flex;align-items:center;gap:14px}.marca svg{width:44px;height:44px}.marca span{font-size:48px;text-transform:none;letter-spacing:-.02em;line-height:.8}
footer{position:absolute;left:110px;right:110px;bottom:48px;display:flex;align-items:center;gap:22px;font-size:20px;color:#5b5b57}
footer .marca svg{width:26px;height:26px}footer .marca span{font-size:28px;color:#0f0f0e}
.oscura footer{color:#a3a39e}.oscura footer .marca span{color:#fff}
footer b{margin-left:auto;font:800 28px 'Barlow Condensed';color:inherit}
/* portada */
.portada{padding-top:80px}.portada .pt-texto{margin-top:120px;max-width:1100px}
.portada h1{margin:30px 0 40px}.lead{font-size:34px;line-height:1.35;color:#c3c2b7;max-width:900px}
.bookee-portada{position:absolute;right:70px;bottom:120px;width:720px}
.autores{position:absolute;left:110px;bottom:60px;font-size:22px;color:#a3a39e}
/* columnas */
.dos{display:grid;grid-template-columns:1fr 520px;gap:90px}
.d-neg{grid-template-columns:1fr;max-width:1180px}
.texto{font-size:32px;line-height:1.4;max-width:900px}
.cifras{display:flex;gap:22px;margin-top:36px}
.cifra,.tarjeta{background:#f4f4f2;border-radius:28px;padding:28px 32px;flex:1;display:flex;flex-direction:column;gap:10px}
.cifra b,.tarjeta b{font-size:72px;line-height:.9}.cifra span,.tarjeta span{font-size:22px;line-height:1.3;color:#5b5b57}
.inv{background:#0f0f0e!important;color:#fff}.inv span{color:#c3c2b7!important}
.pasos{list-style:none;display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin-top:22px}
.pasos li{border:2px solid #e3e3df;border-radius:24px;padding:22px 24px;display:flex;flex-direction:column;gap:6px}
.pasos li.inv{border-color:#0f0f0e}.pasos i{font-style:normal;font-size:44px;line-height:1}.pasos b{font-size:24px;font-weight:600}.pasos span{font-size:20px;color:#5b5b57}
.telefono{position:absolute;right:110px;top:80px;width:450px;height:870px;border-radius:70px;background:#0f0f0e;padding:16px;box-shadow:0 40px 80px rgba(15,15,14,.18)}
.pantalla{width:100%;height:100%;border-radius:56px;overflow:hidden;background:#fff}.pantalla img{width:100%;display:block}
/* fases */
.tres{display:grid;grid-template-columns:repeat(3,1fr);gap:32px}
.fase{background:#f4f4f2;border-radius:36px;padding:44px 44px;height:620px;display:flex;flex-direction:column}
.fase .num{font-size:130px;line-height:.85;margin-bottom:34px}.fase h3{font-size:52px}.fase .periodo{font-size:22px;color:#5b5b57;margin:14px 0 26px}.fase.inv .periodo{color:#a3a39e}
.fase p{font-size:27px;line-height:1.38}.chip{margin-top:auto;align-self:flex-start;border-radius:999px;padding:14px 26px;background:#0f0f0e;color:#fff;font-size:21px;font-weight:600}
.fase.inv .chip{background:#fff;color:#0f0f0e!important}.fase.inv .num{color:#fff!important}
/* gráfico */
.d-graf{grid-template-columns:1fr 600px}
figure{border:2px solid #e3e3df;border-radius:36px;padding:30px 30px 10px}
.leyenda{display:flex;gap:32px;font-size:22px;color:#5b5b57;padding-left:20px}.leyenda i,h4 i{display:inline-block;width:18px;height:18px;border-radius:5px;margin-right:10px;vertical-align:-2px}
.grafico{width:100%;height:560px;display:block}.eje{font:500 20px Barlow;fill:#5b5b57}.cat{font:600 24px Barlow;fill:#0f0f0e}.val{font:700 23px Barlow;fill:#0f0f0e}.val.claro{fill:#fff}
.pila{display:flex;flex-direction:column;gap:24px}.pila .tarjeta{flex:none;height:196px;justify-content:center}
/* fase 3 */
.d-f3{grid-template-columns:1fr 860px}
.listas{display:grid;gap:34px}h4{font-size:34px;margin-bottom:16px}
.listas ul{list-style:none}.listas li{font-size:26px;line-height:1.2;padding:10px 0;border-bottom:2px solid #f0f0ec}.listas em{color:#5b5b57;font-style:normal}
.rejilla{display:grid;grid-template-columns:1fr 1fr;gap:22px;align-content:start}.rejilla .ancha{grid-column:span 2}.rejilla .tarjeta{min-height:170px;justify-content:center}
/* cierre */
.concl article{background:#1f1f1d;border-radius:32px;padding:40px 42px;min-height:290px}.concl h3{font-size:46px;margin-bottom:18px}.concl p{font-size:27px;line-height:1.38;color:#c3c2b7}
.cierre{display:flex;justify-content:space-between;align-items:flex-end;margin-top:54px}
.recs{list-style:none;counter-reset:r;display:grid;grid-template-columns:repeat(2,640px);gap:22px 36px;margin-top:26px}
.recs li{counter-increment:r;display:flex;align-items:center;gap:20px;font-size:28px}
.recs li::before{content:counter(r);width:54px;height:54px;flex:none;border-radius:50%;background:#fff;color:#0f0f0e;display:grid;place-items:center;font-size:30px}
.bookee-cierre{width:330px;margin:0 -10px 70px 0}
</style></head><body>${S.join('\n')}</body></html>`;
fs.writeFileSync(path.join(__dirname,'slides.html'),html);
(async()=>{const {chromium}=require('playwright');const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const p=await b.newPage({viewport:{width:1920,height:1080}});await p.goto('file://'+path.join(__dirname,'slides.html'));await p.evaluate(()=>document.fonts.ready);
 await p.pdf({path:path.join(__dirname,'..','Presentacion_Contabilidad_VI_bookeaa.pdf'),width:'1920px',height:'1080px',printBackground:true,preferCSSPageSize:true});
 const secs=await p.$$('section');for(let i=0;i<secs.length;i++) await secs[i].screenshot({path:process.env.SHOTS+'/s'+(i+1)+'.png'});
 await b.close();console.log('ok',secs.length)})();
