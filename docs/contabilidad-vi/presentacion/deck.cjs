const pptxgen=require('pptxgenjs');
const {applyTheme}=require('/root/.claude/skills/synced/7306d5f3-0491-4a28-b664-42ba345403e8_0c758b79-7037-4927-a0d9-4bfda3012181/pptx/scripts/apply_theme.js');
const D=require('../calculos/datos.json');
const B=D.base,C=D.conservador,O=D.optimista,PA=D.par,pr=PA.precio;
const es=(v,d=0)=>{const s=Math.abs(v).toFixed(d).split('.');s[0]=s[0].replace(/\B(?=(\d{3})+(?!\d))/g,'.');return (v<0?'−':'')+s.join(',')};
const $=(v,d=0)=>(v<0?'−':'')+'$'+es(Math.abs(v),d);
const THEME={name:'bookeaa',headFontFace:'Arial Narrow',bodyFontFace:'Arial',colors:{dk1:'0F0F0E',lt1:'FFFFFF',dk2:'5B5B57',lt2:'F4F4F2',
  accent1:'2A78D6',accent2:'EB6834',accent3:'1BAF7A',accent4:'E3E3DF',accent5:'A3A39E',accent6:'2C2C2A',hlink:'2A78D6',folHlink:'5B5B57'}};
const pres=new pptxgen(); pres.layout='LAYOUT_16x9'; pres.theme={headFontFace:THEME.headFontFace,bodyFontFace:THEME.bodyFontFace};
pres.title='Estructura de costos en tres fases: bookeaa'; pres.author='[Nombres de los estudiantes]';
const C_=pres.SchemeColor;
const HEAD={fontFace:'Arial Narrow',bold:true};
// ---------- layouts ----------
pres.defineSlideMaster({title:'PORTADA',background:{color:'0F0F0E'},objects:[
  {placeholder:{options:{name:'title',type:'title',x:0.5,y:1.85,w:9,h:1.6,fontFace:'Arial Narrow',fontSize:44,bold:true,color:C_.background1,align:'left',valign:'top',margin:0},text:''}},
  {placeholder:{options:{name:'body',type:'body',x:0.5,y:3.6,w:7.5,h:0.8,fontSize:16,color:'A3A39E',valign:'top',margin:0},text:''}},
]});
pres.defineSlideMaster({title:'CONTENIDO',background:{color:'FFFFFF'},objects:[
  {placeholder:{options:{name:'title',type:'title',x:0.5,y:0.32,w:9,h:0.7,fontFace:'Arial Narrow',fontSize:30,bold:true,color:C_.text1,align:'left',valign:'middle',margin:0},text:''}},
  {image:{path:'logo-oscuro.png',x:0.5,y:5.18,w:0.2,h:0.2}},
  {text:{text:'bookeaa · Contabilidad VI',options:{x:0.76,y:5.16,w:3,h:0.24,fontSize:10,color:'5B5B57',margin:0,valign:'middle'}}},
],slideNumber:{x:9.1,y:5.16,w:0.4,h:0.24,fontSize:10,color:'5B5B57',align:'right'}});
pres.defineSlideMaster({title:'CIERRE',background:{color:'0F0F0E'},objects:[
  {placeholder:{options:{name:'title',type:'title',x:0.5,y:0.32,w:9,h:0.7,fontFace:'Arial Narrow',fontSize:30,bold:true,color:C_.background1,align:'left',valign:'middle',margin:0},text:''}},
  {image:{path:'logo-claro.png',x:0.5,y:5.18,w:0.2,h:0.2}},
  {text:{text:'bookeaa · Contabilidad VI',options:{x:0.76,y:5.16,w:3,h:0.24,fontSize:10,color:'A3A39E',margin:0,valign:'middle'}}},
],slideNumber:{x:9.1,y:5.16,w:0.4,h:0.24,fontSize:10,color:'A3A39E',align:'right'}});
const kicker=(s,t,x,y,w,color='5B5B57')=>s.addText(t.toUpperCase(),{x,y,w,h:0.28,fontSize:11,bold:true,charSpacing:3,color,margin:0,isTextBox:true,objectName:'kicker'});
const tile=(s,x,y,w,h,num,label,{dark=false,numSize=30}={})=>{
  s.addShape(pres.shapes.ROUNDED_RECTANGLE,{x,y,w,h,rectRadius:0.12,fill:{color:dark?'0F0F0E':'F4F4F2'},line:{color:dark?'0F0F0E':'F4F4F2'},objectName:'tarjeta'});
  s.addText(num,{x:x+0.2,y:y+0.1,w:w-0.4,h:0.5,...HEAD,fontSize:numSize,color:dark?'FFFFFF':'0F0F0E',margin:0,valign:'bottom',isTextBox:true,objectName:'cifra'});
  s.addText(label,{x:x+0.2,y:y+0.64,w:w-0.4,h:h-0.72,fontSize:11.5,color:dark?'C3C2B7':'5B5B57',margin:0,valign:'top',isTextBox:true,objectName:'etiqueta'});
};
// ---------- 1. Portada ----------
pres.addSection({title:'Inicio'});
let s=pres.addSlide({masterName:'PORTADA',sectionTitle:'Inicio'});
s.addImage({path:'logo-claro.png',x:0.5,y:0.55,w:0.55,h:0.55,objectName:'logo'});
s.addText('bookeaa',{x:1.2,y:0.5,w:3,h:0.65,...HEAD,fontSize:34,color:'FFFFFF',margin:0,valign:'middle',isTextBox:true,objectName:'marca'});
kicker(s,'Contabilidad VI · Contabilidad de costos',0.5,1.5,9,'A3A39E');
s.addText('ESTRUCTURA DE COSTOS EN TRES FASES',{placeholder:'title'});
s.addText('Cómo cambian los costos de una empresa de software por suscripción según sus proyecciones de ventas',{placeholder:'body'});
s.addText('[Nombres de los estudiantes]  ·  Prof. [Nombre del docente]  ·  Octubre de 2026',{x:0.5,y:4.75,w:9,h:0.3,fontSize:12,color:'A3A39E',margin:0,isTextBox:true,objectName:'autores'});
s.addNotes('Buenos días. Hoy presentamos el análisis de la estructura de costos de bookeaa, una plataforma de reservas en línea que funciona por suscripción. La idea central es mostrar cómo se diseña la estructura de costos en tres fases y cómo cambian los costos según el escenario de ventas.');
// ---------- 2. El negocio ----------
pres.addSection({title:'Contexto'});
s=pres.addSlide({masterName:'CONTENIDO',sectionTitle:'Contexto'});
s.addText('UN NEGOCIO POR SUSCRIPCIÓN',{placeholder:'title'});
s.addText('Plataforma digital para que salones de belleza, barberías y centros de estética reciban reservas de citas en línea. El ingreso se acumula mes a mes con cada cliente que se queda.',
  {x:0.5,y:1.25,w:5.1,h:1.0,fontSize:15,color:'0F0F0E',margin:0,valign:'top',isTextBox:true,objectName:'descripcion'});
kicker(s,'Cómo se proyectan las ventas',0.5,2.55,5.1);
const pasos=[['Se incorpora','Mes de prueba sin costo'],['Pasa a pagar','70 % de conversión'],['Se mantiene','5 % se retira al mes'],['Genera ingreso','Clientes × cuota']];
pasos.forEach(([t,d],i)=>{const x=0.5+i*1.31;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE,{x,y:2.95,w:1.17,h:1.55,rectRadius:0.1,fill:{color:i===3?'0F0F0E':'F4F4F2'},line:{color:i===3?'0F0F0E':'F4F4F2'},objectName:'paso'+(i+1)});
  s.addText(String(i+1),{x:x+0.12,y:3.05,w:0.9,h:0.45,...HEAD,fontSize:26,color:i===3?'FFFFFF':'0F0F0E',margin:0,isTextBox:true,objectName:'num-paso'});
  s.addText([{text:t,options:{bold:true,breakLine:true}},{text:d,options:{color:i===3?'C3C2B7':'5B5B57'}}],{x:x+0.12,y:3.55,w:0.98,h:0.9,fontSize:11,color:i===3?'FFFFFF':'0F0F0E',margin:0,valign:'top',isTextBox:true,objectName:'texto-paso'});
});
tile(s,6.1,1.25,3.4,1.15,'1 mes','de prueba sin costo para cada negocio');
tile(s,6.1,2.55,3.4,1.15,$(pr),'cuota mensual fija de la suscripción');
tile(s,6.1,3.85,3.4,1.15,String(PA.meta),'negocios: meta del primer trimestre',{dark:true});
s.addNotes('bookeaa ofrece a pequeños negocios de servicios una página para que sus clientes reserven citas. El modelo es de suscripción: cada negocio tiene un mes de prueba sin costo y luego paga una cuota fija de '+$(pr)+' al mes. La meta es incorporar '+PA.meta+' negocios en el primer trimestre. Las ventas se proyectan en unidades: negocios que entran, que pasan a pagar, que se mantienen, y luego se multiplica por la cuota. Las cifras fueron modificadas por confidencialidad, pero mantienen las proporciones reales.');
// ---------- 3. Hoja de ruta ----------
pres.addSection({title:'Desarrollo'});
s=pres.addSlide({masterName:'CONTENIDO',sectionTitle:'Desarrollo'});
s.addText('LA RUTA EN TRES FASES',{placeholder:'title'});
const fases=[['01','ESTRUCTURA BASE','Octubre a diciembre de 2026','Costos mínimos, presupuestados como montos mensuales, para arrancar y validar el mercado.','Presupuesto estático'],
 ['02','ANÁLISIS Y AJUSTES','Enero a septiembre de 2027','Con los datos del trimestre se clasifican los costos en fijos y variables y se mide el costo por cliente.','Presupuesto flexible y CVU'],
 ['03','ESTRUCTURA OBJETIVO','Octubre de 2027 a septiembre de 2028','Estructura completa: remuneración de la dirección, servicios contables y procesos más eficientes.','Costeo por actividades']];
fases.forEach(([n,t,p,d,h],i)=>{const x=0.5+i*3.1,dark=i===2,fg=dark?'FFFFFF':'0F0F0E',mu=dark?'C3C2B7':'5B5B57';
  s.addShape(pres.shapes.ROUNDED_RECTANGLE,{x,y:1.25,w:2.9,h:3.7,rectRadius:0.12,fill:{color:dark?'0F0F0E':'F4F4F2'},line:{color:dark?'0F0F0E':'F4F4F2'},objectName:'fase'+(i+1)});
  s.addText(n,{x:x+0.25,y:1.4,w:2.4,h:0.7,...HEAD,fontSize:40,color:fg,margin:0,valign:'top',isTextBox:true,objectName:'numero-fase'});
  s.addText(t,{x:x+0.25,y:2.1,w:2.4,h:0.65,...HEAD,fontSize:19,color:fg,margin:0,valign:'top',isTextBox:true,objectName:'titulo-fase'});
  s.addText(p,{x:x+0.25,y:2.8,w:2.4,h:0.4,fontSize:11,color:mu,margin:0,valign:'top',isTextBox:true,objectName:'periodo'});
  s.addText(d,{x:x+0.25,y:3.25,w:2.4,h:1.1,fontSize:12.5,color:fg,margin:0,valign:'top',isTextBox:true,objectName:'enfoque'});
  s.addText(h.toUpperCase(),{x:x+0.25,y:4.4,w:2.4,h:0.35,fontSize:10.5,bold:true,charSpacing:2,color:dark?'FFFFFF':'2A78D6',margin:0,valign:'middle',isTextBox:true,objectName:'herramienta'});
});
s.addNotes('Nuestro enfoque es que la estructura de costos no es fija: se diseña y se perfecciona. En la fase 1, el primer trimestre, arrancamos con una estructura liviana y presupuestada por partidas. En la fase 2, al cierre del trimestre, usamos los datos reales para clasificar los costos en fijos y variables y construir un presupuesto flexible. En la fase 3, el segundo año, llegamos a la estructura objetivo: completa, profesional y organizada por actividades.');
// ---------- 4. Fases 1 y 2 ----------
s=pres.addSlide({masterName:'CONTENIDO',sectionTitle:'Desarrollo'});
s.addText('FASE 2: COSTOS FIJOS Y VARIABLES',{placeholder:'title'});
const cat=['Conservador','Base','Optimista'];
s.addChart(pres.charts.BAR,[{name:'Costos fijos',labels:cat,values:[C,B,O].map(x=>Math.round(x.r29.cf))},{name:'Costos variables',labels:cat,values:[C,B,O].map(x=>Math.round(x.r29.cv))}],
 {x:0.4,y:1.15,w:5.4,h:3.85,barDir:'col',barGrouping:'stacked',chartColors:['2A78D6','EB6834'],barGapWidthPct:70,
  showTitle:true,title:'Costos de los meses 4 a 12, en dólares',titleFontSize:12,titleColor:'5B5B57',titleFontFace:'+mn-lt',
  showValue:true,dataLabelPosition:'ctr',dataLabelColor:'FFFFFF',dataLabelFontSize:11,dataLabelFormatCode:'#,##0',dataLabelFontFace:'+mn-lt',
  showLegend:true,legendPos:'b',legendFontSize:11,legendFontFace:'+mn-lt',legendColor:'5B5B57',
  catAxisLabelColor:'5B5B57',catAxisLabelFontSize:12,catAxisLabelFontFace:'+mn-lt',valAxisLabelColor:'5B5B57',valAxisLabelFontSize:10,valAxisLabelFontFace:'+mn-lt',valAxisLabelFormatCode:'#,##0',
  valGridLine:{color:'E3E3DF',size:0.75},catGridLine:{style:'none'},objectName:'grafico-fase2'});
tile(s,6.1,1.25,3.4,1.15,$(B.a.mcu,2),'margen de contribución por cliente ('+es(B.a.mcu/pr*100)+' % de la cuota)');
tile(s,6.1,2.55,3.4,1.15,es(B.a.peCrec),'negocios: punto de equilibrio con crecimiento (escenario base)');
tile(s,6.1,3.85,3.4,1.15,'GAO '+es(C.a.gao,1),'escenario conservador: opera cerca del equilibrio',{dark:true});
s.addNotes('En la fase 1 los costos del trimestre son iguales en los tres escenarios, '+$(B.q1.ct)+', porque se presupuestan por partidas. Al pasar a la fase 2 incorporamos los costos variables: la incorporación de cada negocio, la atención mensual y los tributos sobre las ventas. Ahora los costos fijos casi no cambian entre escenarios, pero los variables van de '+$(C.r29.cv)+' a '+$(O.r29.cv)+'. Cada cliente que paga aporta un margen de contribución de '+$(B.a.mcu,2)+'. El punto de equilibrio clásico es de unos '+es(B.a.pe)+' negocios, pero al incluir el costo de incorporar clientes nuevos sube a '+es(B.a.peCrec)+' en el escenario base. En el conservador el apalancamiento operativo es de '+es(C.a.gao,1)+', lo que significa que cualquier variación en las ventas se amplifica mucho en la utilidad.');
// ---------- 5. Fase 3 ----------
s=pres.addSlide({masterName:'CONTENIDO',sectionTitle:'Desarrollo'});
s.addText('FASE 3: LA ESTRUCTURA OBJETIVO',{placeholder:'title'});
kicker(s,'Costos variables',0.5,1.25,4.2,'EB6834');
s.addText([['Incorporación asistida de cada negocio'],['Visitas comerciales selectivas'],['Atención y soporte por cliente activo'],['Tributos sobre ventas y costos de cobro']].map(([t],i,a)=>({text:t,options:{bullet:true,breakLine:i<a.length-1}})),
 {x:0.5,y:1.55,w:4.2,h:1.3,fontSize:13,color:'0F0F0E',margin:0,valign:'top',paraSpaceAfter:4,isTextBox:true,objectName:'lista-variables'});
kicker(s,'Costos fijos',0.5,2.95,4.2,'2A78D6');
s.addText(['Remuneración de la dirección','Mantenimiento y desarrollo de la plataforma','Infraestructura en la nube (escalonada)','Servicios contables externos','Publicidad y marketing'].map((t,i,a)=>({text:t,options:{bullet:true,breakLine:i<a.length-1}})),
 {x:0.5,y:3.25,w:4.2,h:1.65,fontSize:13,color:'0F0F0E',margin:0,valign:'top',paraSpaceAfter:4,isTextBox:true,objectName:'lista-fijos'});
tile(s,5.1,1.25,4.4,1.15,$(B.f3.res),'resultado del año 2, escenario base');
tile(s,5.1,2.55,2.1,1.15,$(B.f3.cvu,2),'costo variable por cliente (fase 2: '+$(B.a.cvu,2)+')',{numSize:28});
tile(s,7.4,2.55,2.1,1.15,es(B.f3.ltv/B.f3.cac,1),'veces: valor del cliente sobre su costo de captación',{numSize:28});
tile(s,5.1,3.85,4.4,1.15,'Por volumen','la fase 3 se activa al superar unos '+es(Math.round(B.f3.peC/5)*5)+' negocios pagando',{dark:true,numSize:28});
s.addNotes('La fase 3 es la estructura objetivo para el segundo año. Incorpora la remuneración de la dirección, servicios contables externos e infraestructura escalable. Al mismo tiempo, la incorporación de clientes pasa a un esquema de autoservicio guiado y la atención se apoya en guías, así que el costo variable por cliente baja de '+$(B.a.cvu,2)+' a '+$(B.f3.cvu,2)+'. En el escenario base, el segundo año cierra con un resultado de '+$(B.f3.res)+'. Como los costos fijos suben, recomendamos activar esta fase por volumen: cuando la cartera supere el punto de equilibrio, de unos '+es(Math.round(B.f3.peC/5)*5)+' negocios pagando.');
// ---------- 6. Conclusiones ----------
pres.addSection({title:'Cierre'});
s=pres.addSlide({masterName:'CIERRE',sectionTitle:'Cierre'});
s.addText('CONCLUSIONES',{placeholder:'title'});
const concl=[['EN EL TOTAL','Desde la fase 2, los costos crecen con el número de clientes por la parte variable.'],
 ['EN EL COSTO UNITARIO','A más clientes, menor costo por cliente: '+$(B.cu.f3,2)+' en el base y '+$(O.cu.f3,2)+' en el optimista.'],
 ['EN EL RIESGO','Con menos ventas la empresa opera cerca del equilibrio y necesita una estructura austera.']];
concl.forEach(([t,d],i)=>{const x=0.5+i*3.1;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE,{x,y:1.25,w:2.9,h:1.75,rectRadius:0.12,fill:{color:'2C2C2A'},line:{color:'2C2C2A'},objectName:'conclusion'+(i+1)});
  s.addText(t,{x:x+0.22,y:1.38,w:2.5,h:0.6,...HEAD,fontSize:19,color:'FFFFFF',margin:0,valign:'top',isTextBox:true,objectName:'titulo-conclusion'});
  s.addText(d,{x:x+0.22,y:2.0,w:2.5,h:0.95,fontSize:12.5,color:'C3C2B7',margin:0,valign:'top',isTextBox:true,objectName:'texto-conclusion'});
});
kicker(s,'Recomendaciones',0.5,3.3,9,'A3A39E');
const recs=['Registrar desde el inicio las horas por cliente','Presupuesto flexible y comparación mensual','Activar la fase 3 por volumen','Seguir cuota, conversión y cancelación'];
recs.forEach((t,i)=>{const x=0.5+(i%2)*4.6,y=3.7+Math.floor(i/2)*0.6;
  s.addText(String(i+1),{x,y,w:0.4,h:0.4,shape:pres.shapes.OVAL,fill:{color:'FFFFFF'},...HEAD,fontSize:15,color:'0F0F0E',align:'center',valign:'middle',margin:0,objectName:'num-rec'});
  s.addText(t,{x:x+0.55,y,w:3.9,h:0.4,fontSize:14,color:'FFFFFF',margin:0,valign:'middle',isTextBox:true,objectName:'recomendacion'});
});
s.addNotes('Para cerrar: las proyecciones de ventas afectan a los costos de tres maneras. En el total, porque desde la fase 2 la parte variable crece con los clientes. En el costo unitario, porque a mayor volumen los costos fijos se reparten entre más clientes. Y en el riesgo, porque con menos ventas la empresa opera cerca del punto de equilibrio. Recomendamos registrar las horas por cliente desde el inicio, aplicar el presupuesto flexible con comparación mensual, activar la fase 3 por volumen y vigilar la cuota, la conversión y la cancelación. Muchas gracias.');
(async()=>{await pres.writeFile({fileName:'Presentacion_Contabilidad_VI_bookeaa.pptx'});await applyTheme('Presentacion_Contabilidad_VI_bookeaa.pptx',THEME);console.log('ok')})();
