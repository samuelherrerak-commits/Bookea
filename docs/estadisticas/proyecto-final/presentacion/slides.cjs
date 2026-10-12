// Presentación del proyecto de Estadística (8 diapositivas, 1920×1080) con la identidad visual de bookeaa; exporta HTML, PDF y capturas.
const fs=require('fs'),path=require('path');
const D=require('../calculos/datos.json'); const SA=D.sal,V=D.V,C=D.C;
const es=(v,d=0)=>{const s=Math.abs(v).toFixed(d).split('.');s[0]=s[0].replace(/\B(?=(\d{3})+(?!\d))/g,'.');return (v<0?'−':'')+s.join(',')};
const pc=(v,d=1)=>es(v*100,d)+' %';
const R='../../../..';
const pie=(n,o)=>`<footer><span>Estadísticas y Probabilidades · Proyecto final · Universidad José María Vargas</span><b>${String(n).padStart(2,'0')}</b></footer>`;
const tj=(b,l,x='')=>`<div class="tarjeta ${x}"><b>${b}</b><span>${l}</span></div>`;
// ---------- gráficos SVG ----------
function eje(m,W,H,ymax,paso,fmt,yf){let g='';for(let v=0;v<=ymax+1e-9;v+=paso)g+=`<line x1="${m.l}" x2="${W-m.r}" y1="${yf(v)}" y2="${yf(v)}" stroke="${v?'#ebebe7':'#8a8a85'}"/><text x="${m.l-14}" y="${yf(v)+7}" text-anchor="end" class="eje">${fmt(v)}</text>`;return g}
function svgHist(){const W=900,H=480,m={t:40,r:20,b:64,l:64},iw=W-m.l-m.r,ih=H-m.t-m.b,x0=1.12,x1=2.54,X=v=>m.l+(v-x0)/(x1-x0)*iw,Y=v=>m.t+ih-v/12*ih;
 let g=eje(m,W,H,12,2,v=>v,Y);
 SA.freq.forEach((f,i)=>{const a=X(f.lo),b=X(f.hi),y=Y(f.fi);g+=`<rect x="${a+2}" y="${y}" width="${b-a-4}" height="${Y(0)-y}" rx="6" fill="${i===3?'#eb6834':'#2a78d6'}"/><text x="${(a+b)/2}" y="${y-10}" text-anchor="middle" class="val">${f.fi}</text>`});
 SA.freq.concat([{lo:2.46}]).forEach(f=>{g+=`<text x="${X(f.lo)}" y="${H-30}" text-anchor="middle" class="eje">${es(f.lo,2)}</text>`});
 const mx=X(SA.media);g+=`<line x1="${mx}" x2="${mx}" y1="${m.t-8}" y2="${Y(0)}" stroke="#b4371f" stroke-width="3" stroke-dasharray="9 7"/><text x="${mx-12}" y="${m.t+10}" text-anchor="end" class="val" fill="#b4371f" style="fill:#b4371f">Media ${es(SA.media,3)}</text>`;
 g+=`<text x="${X(1.83)+130}" y="${Y(11)-8}" class="val" style="fill:#eb6834">Clase modal 1,74 – 1,92</text>`;
 return `<svg viewBox="0 0 ${W} ${H}" class="grafico" role="img" aria-label="Histograma de salarios">${g}</svg>`}
function svgBox(){const W=900,H=440,m={t:30,r:150,b:70,l:150},iw=W-m.l-m.r,x0=4,x1=16,X=v=>m.l+(v-x0)/(x1-x0)*iw;let g='';
 for(let v=4;v<=16;v+=2)g+=`<line x1="${X(v)}" x2="${X(v)}" y1="${m.t}" y2="${H-m.b}" stroke="#ebebe7"/><text x="${X(v)}" y="${H-m.b+36}" text-anchor="middle" class="eje">${v}</text>`;
 g+=`<line x1="${m.l}" x2="${W-m.r}" y1="${H-m.b}" y2="${H-m.b}" stroke="#8a8a85"/>`;
 [[V.car,'Caracas','#2a78d6',120,'CV 8,66 %'],[V.mar,'Maracaibo','#eb6834',290,'CV 40,78 %']].forEach(([v,n,c,y,cv])=>{
  g+=`<text x="${m.l-18}" y="${y+8}" text-anchor="end" class="cat">${n}</text>`;
  g+=`<line x1="${X(v.mn)}" x2="${X(v.q1)}" y1="${y}" y2="${y}" stroke="${c}" stroke-width="4"/><line x1="${X(v.q3)}" x2="${X(v.mx)}" y1="${y}" y2="${y}" stroke="${c}" stroke-width="4"/>`;
  g+=`<line x1="${X(v.mn)}" x2="${X(v.mn)}" y1="${y-16}" y2="${y+16}" stroke="${c}" stroke-width="4"/><line x1="${X(v.mx)}" x2="${X(v.mx)}" y1="${y-16}" y2="${y+16}" stroke="${c}" stroke-width="4"/>`;
  g+=`<rect x="${X(v.q1)}" y="${y-42}" width="${X(v.q3)-X(v.q1)}" height="84" rx="8" fill="${c}" fill-opacity=".45" stroke="${c}" stroke-width="3"/><line x1="${X(v.med)}" x2="${X(v.med)}" y1="${y-42}" y2="${y+42}" stroke="#0f0f0e" stroke-width="6"/>`;
  g+=`<path d="M${X(v.m)} ${y-13} l13 13 -13 13 -13 -13z" fill="#fff" stroke="#0f0f0e" stroke-width="3"/><text x="${X(v.mx)+16}" y="${y+8}" class="val">${cv}</text>`});
 g+=`<text x="${(m.l+W-m.r)/2}" y="${H-12}" text-anchor="middle" class="eje">Ventas diarias (millones de Bs.)  ·  ◇ media  ·  línea negra: mediana</text>`;
 return `<svg viewBox="0 0 ${W} ${H}" class="grafico" role="img" aria-label="Diagrama de caja de ventas">${g}</svg>`}
function svgBin(){const W=900,H=480,m={t:70,r:20,b:64,l:80},iw=W-m.l-m.r,ih=H-m.t-m.b,n=200,p=.03,bw=iw/13,Y=v=>m.t+ih-v/0.18*ih;
 const pk=k=>{let c=1;for(let i=1;i<=k;i++)c*=(n-k+i)/i;return c*Math.pow(p,k)*Math.pow(1-p,n-k)};
 let g=eje(m,W,H,0.18,0.04,v=>es(v,2),Y);
 for(let k=0;k<=12;k++){const x=m.l+bw*k+bw*.12,w=bw*.76,y=Y(pk(k));const c=k<=3?'#2a78d6':k===4?'#a3a39e':k===5?'#eb6834':k===6?'#0f7a5c':'#1baf7a';
  g+=`<rect x="${x}" y="${y}" width="${w}" height="${Y(0)-y}" rx="5" fill="${c}"/><text x="${x+w/2}" y="${y-8}" text-anchor="middle" class="val" style="font-size:19px">${es(pk(k),3)}</text><text x="${x+w/2}" y="${H-30}" text-anchor="middle" class="eje">${k}</text>`}
 const mx=m.l+bw*6+bw/2;g+=`<path d="M${mx-10} ${m.t-34} h20 l-10 16z" fill="#0f0f0e"/><text x="${mx}" y="${m.t-44}" text-anchor="middle" class="val">Valor esperado μ = 6</text>`;
 g+=`<text x="${(m.l+W-m.r)/2}" y="${H-4}" text-anchor="middle" class="eje">Unidades defectuosas por lote (k)</text>`;
 return `<svg viewBox="0 0 ${W} ${H}" class="grafico" role="img" aria-label="Distribución binomial">${g}</svg>`}
function svgNorm(){const W=900,H=480,m={t:50,r:24,b:84,l:30},iw=W-m.l-m.r,ih=H-m.t-m.b,X=v=>m.l+(v-21)/48*iw,f=v=>Math.exp(-0.5*((v-45)/8)**2)/(8*Math.sqrt(2*Math.PI)),Y=v=>m.t+ih-v/0.056*ih;
 const area=(a,b,c,o)=>{let d=`M${X(a)} ${Y(0)}`;for(let v=a;v<=b+1e-9;v+=0.25)d+=` L${X(v)} ${Y(f(v))}`;return `<path d="${d} L${X(b)} ${Y(0)}Z" fill="${c}" fill-opacity="${o}"/>`};
 let g=area(21,37,'#eb6834',.8)+area(37,53,'#2a78d6',.45)+area(53,69,'#1baf7a',.8);
 let d='';for(let v=21;v<=69+1e-9;v+=0.25)d+=(v===21?'M':' L')+X(v)+' '+Y(f(v));g+=`<path d="${d}" fill="none" stroke="#0f0f0e" stroke-width="4"/>`;
 g+=`<line x1="${m.l}" x2="${W-m.r}" y1="${Y(0)}" y2="${Y(0)}" stroke="#8a8a85"/>`;
 [29,37,53,61].forEach(v=>g+=`<line x1="${X(v)}" x2="${X(v)}" y1="${Y(f(v))}" y2="${Y(0)}" stroke="#777" stroke-dasharray="3 6" stroke-width="2"/>`);
 g+=`<line x1="${X(45)}" x2="${X(45)}" y1="${Y(f(45))-10}" y2="${Y(0)}" stroke="#0f0f0e" stroke-width="4" stroke-dasharray="10 7"/><text x="${X(45)}" y="${Y(f(45))-22}" text-anchor="middle" class="val" style="paint-order:stroke;stroke:#fff;stroke-width:9px;stroke-linejoin:round">Media μ = 45 min</text>`;
 [[21,'−3σ'],[29,'−2σ'],[37,'−1σ'],[45,'μ'],[53,'+1σ'],[61,'+2σ'],[69,'+3σ']].forEach(([v,s])=>g+=`<text x="${X(v)}" y="${Y(0)+32}" text-anchor="middle" class="eje">${v}</text><text x="${X(v)}" y="${Y(0)+58}" text-anchor="middle" class="eje" style="font-size:18px">${s}</text>`);
 [[C.x10,'P10 = '+es(C.x10,2),-1],[C.x90,'P90 = '+es(C.x90,2),1]].forEach(([v,t,s])=>g+=`<path d="M${X(v)-11} ${Y(0)+2} h22 l-11 -20z" fill="#b4371f"/><line x1="${X(v)}" x2="${X(v)}" y1="${Y(0)-20}" y2="${Y(f(v))}" stroke="#b4371f" stroke-width="3" stroke-dasharray="8 5"/><text x="${X(v)+s*14}" y="${Y(f(v))-12}" text-anchor="${s<0?'end':'start'}" class="val" style="fill:#b4371f">${t} min</text>`);
 g+=`<text x="${X(45)}" y="${Y(0.021)}" text-anchor="middle" class="val" style="font-size:26px;paint-order:stroke;stroke:#fff;stroke-width:9px;stroke-linejoin:round">P(37 &lt; T &lt; 53) = ${pc(C.p_mid,2)}</text>`;
 g+=`<text x="${X(30.5)}" y="${Y(0.0045)}" text-anchor="middle" class="val" style="font-size:19px;paint-order:stroke;stroke:#fff;stroke-width:9px;stroke-linejoin:round">${pc(C.p_lt37,2)}</text><text x="${X(59.5)}" y="${Y(0.0045)}" text-anchor="middle" class="val" style="font-size:19px;paint-order:stroke;stroke:#fff;stroke-width:9px;stroke-linejoin:round">${pc(C.p_gt53,2)}</text>`;
 return `<svg viewBox="0 0 ${W} ${H}" class="grafico" role="img" aria-label="Distribución normal">${g}</svg>`}
function svgCV(){const W=1000,H=520,m={t:44,r:30,b:50,l:430},iw=W-m.l-m.r,X=v=>m.l+v/50*iw;
 const dat=[['Salarios (Tarea 1)',SA.cv*100],['Ventas Caracas (Tarea 2)',8.66],['Ventas Maracaibo (Tarea 2)',40.78],['Tiempo de procesamiento (Tarea 3)',C.cv_t*100],['Defectos por lote (Tarea 3)',C.cv_d*100]];let g='';
 [0,10,20,30,40,50].forEach(v=>g+=`<line x1="${X(v)}" x2="${X(v)}" y1="${m.t}" y2="${H-m.b}" stroke="#ebebe7"/><text x="${X(v)}" y="${H-m.b+34}" text-anchor="middle" class="eje">${v} %</text>`);
 dat.forEach(([n,v],i)=>{const y=m.t+16+i*88,c=v<15?'#1baf7a':v<=30?'#e0a100':'#eb6834';g+=`<text x="${m.l-18}" y="${y+34}" text-anchor="end" class="cat">${n}</text><rect x="${m.l}" y="${y}" width="${X(v)-m.l}" height="54" rx="7" fill="${c}"/><text x="${X(v)+14}" y="${y+37}" class="val">${es(v,1)} %</text>`});
 [15,30].forEach(t=>g+=`<line x1="${X(t)}" x2="${X(t)}" y1="${m.t-6}" y2="${H-m.b}" stroke="#444" stroke-width="3" stroke-dasharray="9 6"/><text x="${X(t)}" y="${m.t-14}" text-anchor="middle" class="eje">${t} %</text>`);
 return `<svg viewBox="0 0 ${W} ${H}" class="grafico" role="img" aria-label="Coeficiente de variación">${g}</svg>`}
function svgPortada(){let g='';const fi=[4,8,10,11,6,8,3];fi.forEach((f,i)=>g+=`<rect x="${20+i*104}" y="${330-f*24}" width="96" height="${f*24}" rx="8" fill="#1f1f1d" stroke="#3a3a37" stroke-width="2"/>`);
 let d='';for(let x=0;x<=740;x+=5){const z=(x-370)/150;d+=(x===0?'M':' L')+(20+x)+' '+(330-Math.exp(-z*z/2)*290)}
 g+=`<path d="${d}" fill="none" stroke="#fff" stroke-width="7"/>`;[250,490].forEach(x=>g+=`<line x1="${x}" x2="${x}" y1="${330-Math.exp(-0.5*((x-390)/150)**2)*290}" y2="330" stroke="#a3a39e" stroke-width="3" stroke-dasharray="8 8"/>`);
 g+=`<line x1="20" x2="760" y1="330" y2="330" stroke="#5b5b57" stroke-width="3"/>`;return `<svg viewBox="0 0 780 350" class="deco">${g}</svg>`}
// ---------- diapositivas ----------
const S=[];
S.push(`<section class="oscura portada"><p class="kicker">Estadísticas y Probabilidades · Proyecto final</p>
 <div class="pt-texto"><h1>Métodos<br>cuantitativos<br>en contabilidad</h1><p class="lead">Estructura salarial, variabilidad de las ventas y control estadístico de la calidad.</p></div>
 ${svgPortada()}<p class="autores">Samuel Herrera · Universidad José María Vargas · Octubre de 2026</p></section>`);
S.push(`<section><p class="kicker">Planteamiento</p><h2>Un problema, tres casos</h2>
 <div class="tres">
  <article class="fase"><span class="num">01</span><h3>Salarios</h3><p class="periodo">Asignación I · 50 empleados</p><p>Distribución de frecuencias de la estructura salarial de una manufacturera de Valencia.</p><span class="chip">Presupuesto de nómina</span></article>
  <article class="fase"><span class="num">02</span><h3>Ventas</h3><p class="periodo">Asignación II · 30 días</p><p>Medidas de posición y dispersión de las ventas de dos sucursales: Caracas y Maracaibo.</p><span class="chip">Ingresos y liquidez</span></article>
  <article class="fase inv"><span class="num">03</span><h3>Calidad</h3><p class="periodo">Asignación III · planta en Los Andes</p><p>Distribuciones binomial y normal aplicadas a los defectos y a los tiempos de procesamiento.</p><span class="chip">Costos de calidad</span></article></div>
 <p class="franja"><b>Pregunta central:</b> ¿cómo se traduce la información estadística en decisiones de presupuesto, costos y control?</p>${pie(2)}</section>`);
S.push(`<section><p class="kicker">Asignación I · Temas 1 y 2</p><h2>Tarea 1: la nómina en números</h2>
 <div class="dos d-graf"><figure><h4>Salarios de 50 empleados (millones de Bs.)</h4>${svgHist()}</figure>
 <div class="pila p4">${tj(es(SA.suma,1),'millones de Bs. al mes: nómina base ('+es(SA.anual,1)+' al año)')}${tj('1,77','moda de los salarios; media '+es(SA.media,3)+' y mediana '+es(SA.mediana,2))}${tj(pc(SA.cv),'coeficiente de variación: dispersión moderada')}${tj('+'+pc(SA.esc.pct,2),'costo de llevar a 12 empleados a la moda: '+es(SA.esc.costo,2)+' millones al mes','inv')}</div></div>${pie(3)}</section>`);
S.push(`<section><p class="kicker">Asignación II · Medidas de posición y dispersión</p><h2>Tarea 2: ventas y riesgo de caja</h2>
 <div class="dos d-graf"><figure><h4>Ventas diarias por sucursal (30 días)</h4>${svgBox()}</figure>
 <div class="pila">${tj('8,66 % vs 40,78 %','coeficiente de variación de Caracas y de Maracaibo')}${tj(pc(V.car.d1_m)+' vs '+pc(V.mar.d1_m),'nivel de ventas confiable 9 de cada 10 días (D1 ÷ media)')}${tj('±'+pc(V.car.var_pct)+' vs ±'+pc(V.mar.var_pct),'variación del total mensual (intervalo de 95 %)','inv')}</div></div>${pie(4)}</section>`);
S.push(`<section><p class="kicker">Asignación III · Distribución binomial</p><h2>Tarea 3: defectos por lote</h2>
 <div class="dos d-graf"><figure><h4>Defectos en un lote de 200 unidades (tasa de 3 %)</h4><div class="leyenda"><span><i style="background:#2a78d6"></i>3 o menos</span><span><i style="background:#eb6834"></i>exactamente 5</span><span><i style="background:#1baf7a"></i>6 o más</span></div>${svgBin()}</figure>
 <div class="pila p4">${tj('6','defectos esperados por lote (σ = 2,41)')}${tj(pc(C.pge6,2),'probabilidad de 6 o más defectos; exactamente 5: '+pc(C.p5,2))}${tj(pc(C.pge10,2),'lotes con 10 o más defectos: zona de alerta')}${tj('6C → 4C','costo esperado de fallas por lote si la tasa baja de 3 % a 2 %','inv')}</div></div>${pie(5)}</section>`);
S.push(`<section><p class="kicker">Asignación III · Distribución normal</p><h2>Tarea 3: tiempos de procesamiento</h2>
 <div class="dos d-graf"><figure><h4>Tiempo por unidad: media 45 min, desviación estándar 8 min</h4>${svgNorm()}</figure>
 <div class="pila p4">${tj(pc(C.p_mid,2),'de las unidades tarda entre 37 y 53 minutos')}${tj(es(C.x10,2)+' min','percentil 10: referencia de mejores prácticas')}${tj(es(C.x90,2)+' min','percentil 90: estándar de planificación')}${tj('+'+pc(C.holgura),'holgura del estándar P90 sobre la media de 45 min','inv')}</div></div>${pie(6)}</section>`);
S.push(`<section><p class="kicker">Integración</p><h2>La variabilidad, eje común</h2>
 <div class="dos d-integ"><figure><h4>Coeficiente de variación de las cinco variables</h4><div class="leyenda"><span><i style="background:#1baf7a"></i>Baja (&lt; 15 %)</span><span><i style="background:#e0a100"></i>Moderada</span><span><i style="background:#eb6834"></i>Alta (&gt; 30 %)</span></div>${svgCV()}</figure>
 <ol class="lecciones"><li><b>La media no basta</b><span>Dos sucursales con ventas parecidas pueden variar casi cinco veces distinto.</span></li><li><b>La forma importa</b><span>Simétrica en salarios, asimétrica en defectos y bimodal en Maracaibo.</span></li><li class="inv"><b>La variabilidad vale dinero</b><span>Se traduce en reservas, provisiones y holguras en los estándares.</span></li></ol></div>${pie(7)}</section>`);
S.push(`<section class="oscura"><p class="kicker">Cierre</p><h2>Conclusiones y recomendaciones</h2>
 <div class="dos d-cierre"><div><p class="kicker" style="margin-bottom:22px">Conclusiones</p>
  <div class="conclu"><p><b>Presupuestar con intervalos</b> y escenarios, no con una cifra única.</p><p><b>Dimensionar reservas y provisiones</b> con un nivel de prudencia explícito.</p><p><b>Evaluar cada decisión por su costo</b> esperado antes de aprobarla.</p></div></div>
  <div><p class="kicker" style="margin-bottom:22px">Recomendaciones</p><ol class="recs2"><li>Escenarios pesimista, base y optimista cuando el CV supere 30 %</li><li>Gráfico de control np: alerta desde 10 defectos y acción desde 14</li><li>Prevención solo si cuesta menos de 2C por lote</li><li>Plan de seguimiento con indicadores, umbrales y responsables</li></ol></div></div>${pie(8,true)}</section>`);
const F=`${R}/public/ar-comun/fuentes`;
const css=fs.readFileSync(path.join(__dirname,'estilo.css'),'utf8').replace(/\$\{F\}/g,F)+`
.portada .pt-texto{margin-top:110px;max-width:1700px}.portada h1{font-size:170px;margin:26px 0 36px}.portada .lead{font-size:32px;max-width:860px}.deco{position:absolute;right:90px;bottom:150px;width:760px}
.franja{margin-top:36px;font-size:30px;line-height:1.35;background:#0f0f0e;color:#fff;border-radius:28px;padding:34px 44px}.franja b{font-family:'Barlow Condensed';text-transform:uppercase;font-weight:800;font-size:40px;margin-right:12px}
.fase .chip{margin-top:auto}.fase{height:490px}.fase .num{font-size:110px;margin-bottom:22px}
.d-graf{grid-template-columns:1fr 640px;margin-top:-6px}.d-integ{grid-template-columns:1fr 600px}
.pila.p4 .tarjeta{height:152px;padding:22px 30px}.pila.p4 .tarjeta b{font-size:58px}.pila .tarjeta b{font-size:64px}
.pila .tarjeta span{font-size:22px}
figure h4{font-size:28px;margin-bottom:12px}.grafico{height:auto}
.lecciones{list-style:none;display:flex;flex-direction:column;gap:22px;counter-reset:l}.lecciones li{background:#f4f4f2;border-radius:28px;padding:32px 36px;flex:1;display:flex;flex-direction:column;justify-content:center;gap:10px}
.lecciones b{font:800 46px 'Barlow Condensed';text-transform:uppercase;line-height:.95}.lecciones span{font-size:25px;line-height:1.35;color:#5b5b57}.lecciones li.inv span{color:#c3c2b7}
.d-cierre{grid-template-columns:1fr 1fr;gap:70px}.conclu p{background:#1f1f1d;border-radius:28px;padding:34px 40px;font-size:30px;line-height:1.35;margin-bottom:20px;color:#c3c2b7}.conclu b{color:#fff}
.recs2{list-style:none;counter-reset:r}.recs2 li{counter-increment:r;display:flex;align-items:center;gap:22px;font-size:30px;line-height:1.3;padding:24px 0;border-bottom:2px solid #2c2c29}
.recs2 li::before{content:counter(r);width:56px;height:56px;flex:none;border-radius:50%;background:#fff;color:#0f0f0e;display:grid;place-items:center;font:800 32px 'Barlow Condensed'}`;
fs.writeFileSync(path.join(__dirname,'slides.html'),`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Métodos cuantitativos en contabilidad</title><style>${css}</style></head><body>${S.join('\n')}</body></html>`);
(async()=>{const {chromium}=require('playwright');const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const p=await b.newPage({viewport:{width:1920,height:1080}});await p.goto('file://'+path.join(__dirname,'slides.html'));await p.evaluate(()=>document.fonts.ready);
 await p.pdf({path:path.join(__dirname,'Presentacion_Proyecto_Estadisticas.pdf'),width:'1920px',height:'1080px',printBackground:true,preferCSSPageSize:true});
 const secs=await p.$$('section');if(process.env.SHOTS)for(let i=0;i<secs.length;i++)await secs[i].screenshot({path:process.env.SHOTS+'/e'+(i+1)+'.png'});
 await b.close();console.log('ok',secs.length)})();
