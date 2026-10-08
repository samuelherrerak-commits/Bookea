const fs=require('fs');
const {Document,Packer,Paragraph,TextRun,Table,TableRow,TableCell,WidthType,AlignmentType,ImageRun,Header,PageNumber,
  BorderStyle,ShadingType,HeadingLevel,PageBreak,LevelFormat,TableLayoutType}=require('docx');
const D=JSON.parse(fs.readFileSync('datos.json'));
const B=D.base,C=D.conservador,O=D.optimista,ESC=[['Conservador',C],['Base',B],['Optimista',O]];
const es=(v,d=0)=>{const s=Math.abs(v).toFixed(d).split('.');s[0]=s[0].replace(/\B(?=(\d{3})+(?!\d))/g,'.');return (v<0?'−':'')+s.join(',')};
const $=(v,d=0)=>(v<0?'−':'')+'$'+es(Math.abs(v),d);
const $2=v=>$(v,2), pc=(v,d=0)=>es(v*100,d)+' %';
const FONT='Times New Roman';
// ---------- helpers ----------
const runs=(t,base={})=>{ // **negrita**, *cursiva*
  const out=[];const re=/(\*\*[^*]+\*\*|\*[^*]+\*)/g;let i=0,m;
  while((m=re.exec(t))){if(m.index>i)out.push(new TextRun({text:t.slice(i,m.index),...base}));
    const s=m[0];out.push(s.startsWith('**')?new TextRun({text:s.slice(2,-2),bold:true,...base}):new TextRun({text:s.slice(1,-1),italics:true,...base}));i=m.index+s.length}
  if(i<t.length)out.push(new TextRun({text:t.slice(i),...base}));return out};
const P=t=>new Paragraph({children:runs(t),alignment:AlignmentType.JUSTIFIED,indent:{firstLine:720},spacing:{line:480}});
const P0=(t,o={})=>new Paragraph({children:runs(t),spacing:{line:480},...o});
const H1=(t,pb)=>new Paragraph({pageBreakBefore:!!pb,heading:HeadingLevel.HEADING_1,alignment:AlignmentType.CENTER,spacing:{line:480},children:[new TextRun({text:t,bold:true})]});
const H2=t=>new Paragraph({heading:HeadingLevel.HEADING_2,spacing:{line:480},children:[new TextRun({text:t,bold:true})]});
const H3=t=>new Paragraph({heading:HeadingLevel.HEADING_3,spacing:{line:480},children:[new TextRun({text:t,bold:true,italics:true})]});
const LI=(t,ref='vin')=>new Paragraph({alignment:AlignmentType.JUSTIFIED,numbering:{reference:ref,level:0},spacing:{line:480},children:runs(t)});
const BR=()=>new Paragraph({children:[new PageBreak()]});
let nt=0,nf=0;
const thin={style:BorderStyle.SINGLE,size:4,color:'000000'},none={style:BorderStyle.NONE,size:0,color:'FFFFFF'};
function tabla(titulo,cab,filas,anchos,nota,opts={}){
  nt++;const W=9360;const sum=anchos.reduce((a,b)=>a+b,0);const cw=anchos.map(a=>Math.round(a/sum*W));cw[cw.length-1]+=W-cw.reduce((a,b)=>a+b,0);
  const celda=(t,j,tipo,ri)=>{const der=j>0&&opts.izq?!opts.izq.includes(j):j>0;const negr=tipo==='h'||(opts.negr||[]).includes(ri);
    return new TableCell({width:{size:cw[j],type:WidthType.DXA},margins:{top:40,bottom:40,left:80,right:80},
    borders:{top:tipo==='h'?thin:none,bottom:tipo==='h'||tipo==='last'?thin:none,left:none,right:none},
    shading:(opts.sombra||[]).includes(ri)?{type:ShadingType.CLEAR,fill:'F2F2F2',color:'auto'}:undefined,
    children:[new Paragraph({keepNext:tipo!=='last',keepLines:true,alignment:tipo==='h'?(j===0?AlignmentType.LEFT:AlignmentType.CENTER):(der?AlignmentType.RIGHT:AlignmentType.LEFT),
      children:runs(String(t),{size:opts.size||20,bold:negr||undefined})})]})};
  const rows=[new TableRow({tableHeader:true,cantSplit:true,children:cab.map((t,j)=>celda(t,j,'h',-1))}),
    ...filas.map((f,i)=>new TableRow({cantSplit:true,children:f.map((t,j)=>celda(t,j,i===filas.length-1?'last':'b',i))}))];
  return [new Paragraph({spacing:{before:240,line:480},keepNext:true,children:[new TextRun({text:'Tabla '+nt,bold:true})]}),
    new Paragraph({spacing:{line:480},keepNext:true,children:[new TextRun({text:titulo,italics:true})]}),
    new Table({width:{size:W,type:WidthType.DXA},columnWidths:cw,layout:TableLayoutType.FIXED,rows}),
    ...(nota?[new Paragraph({spacing:{before:120,after:240,line:240},children:[new TextRun({text:'Nota. ',italics:true}),...runs(nota)],alignment:AlignmentType.JUSTIFIED})]:[new Paragraph({spacing:{after:240},children:[]})])];
}
function figura(titulo,file,nota){nf++;
  return [new Paragraph({spacing:{before:240,line:480},keepNext:true,children:[new TextRun({text:'Figura '+nf,bold:true})]}),
    new Paragraph({spacing:{line:480},keepNext:true,children:[new TextRun({text:titulo,italics:true})]}),
    new Paragraph({keepNext:true,children:[new ImageRun({type:'png',data:fs.readFileSync(file),transformation:{width:600,height:332}})]}),
    new Paragraph({spacing:{before:120,after:240,line:240},children:[new TextRun({text:'Nota. ',italics:true}),...runs(nota)]})]}
const ref=t=>new Paragraph({children:runs(t),indent:{left:720,hanging:720},spacing:{line:480}});
// ---------- datos ----------
const PA=D.par, P3=D.p3, pr=PA.precio, H=PA.hora;
const MES={Ene:'enero',Feb:'febrero',Mar:'marzo',Abr:'abril',May:'mayo',Jun:'junio',Jul:'julio',Ago:'agosto',Sep:'septiembre',Oct:'octubre',Nov:'noviembre',Dic:'diciembre'};
const largo=e=>{const [m,y]=e.split(' ');return MES[m]+' de 20'+y};
const cruce=x=>{const i=x.plan.findIndex((m,j)=>j>0&&m.caja>=0&&x.plan.slice(j).every(z=>z.caja>=0));return i<0?null:x.plan[i].et};
const prom=(x,f,k)=>{const r=x.plan.filter(p=>p.fase===f);return r.reduce((a,p)=>a+p[k],0)/r.length};
const altaF2=PA.hAlta*H+PA.transpAlta, sopF2=PA.hSoporte*H, tribU=pr*(PA.isae+PA.cobro)/100;
const altaF3=P3.hAlta*P3.hora, visF3=P3.visitas*P3.transp, sopF3=P3.hSoporte*P3.hora;
const cfF3=(P3.direccion+P3.mant+P3.nube+P3.dominio+P3.telefono+P3.contador+P3.ads+P3.influencer+P3.material)*(1+P3.impr/100);
const pasoPrecio=(D.sens[2][1][1]-D.sens[0][1][1])/4, pasoPrecio3=(D.sens3[2][1]-D.sens3[0][1])/4;
const cacF2=x=>x.a.cacTotal/(x.conv/100), ltvF2=x=>x.a.mcu/(x.churn/100);
const c=[];
const cen=(t,o={})=>new Paragraph({alignment:AlignmentType.CENTER,spacing:{line:480},children:runs(t,o)});

// ---------- PORTADA ----------
c.push(...[1,2,3].map(()=>new Paragraph({spacing:{line:480},children:[]})));
c.push(cen('**Diseño de la estructura de costos de una empresa de software por suscripción en tres fases y efecto de las proyecciones de ventas sobre sus costos: caso bookeaa**'));
c.push(new Paragraph({spacing:{line:480},children:[]}));
c.push(cen('[Nombre y apellido del estudiante] · C.I. [número]'),cen('[Nombre y apellido del estudiante] · C.I. [número]'),
  cen('[Escuela de Contaduría Pública], [Nombre de la universidad]'),cen('Contabilidad VI (Contabilidad de Costos), sección [número]'),
  cen('Prof. [Nombre del docente]'),cen('[Día] de octubre de 2026'));
c.push(BR());

// ---------- CONTEXTO ----------
c.push(H1('Contexto'));
c.push(P('La contabilidad de costos no se limita a registrar lo que ya se gastó: su aporte más valioso es anticipar cuánto costará operar a distintos niveles de actividad y, con esa información, apoyar las decisiones de precio, inversión y crecimiento (Horngren et al., 2012). En una empresa que comienza, además, la estructura de costos no es fija: se diseña, se pone a prueba y se perfecciona a medida que el negocio crece y se obtiene información real. Este trabajo aborda precisamente ese proceso.'));
c.push(H2('Descripción de la organización'));
c.push(P('bookeaa es un emprendimiento venezolano que ofrece a pequeños negocios de servicios —salones de belleza, barberías y centros de estética— una plataforma digital para que sus clientes reserven citas en línea. El negocio contrata el servicio, bookeaa le prepara su página de reservas con sus servicios, precios y horarios, y a partir de ese momento las citas, los pagos y las confirmaciones se gestionan de forma automática.'));
c.push(P('El modelo de ingresos es de **suscripción mensual**: cada negocio disfruta de un primer mes de prueba sin costo y luego paga una cuota fija de **'+$(pr)+' al mes**. La meta comercial es incorporar **'+PA.meta+' negocios en el primer trimestre** de operaciones, que comienza en octubre de 2026. Este tipo de modelo tiene una característica que lo hace especialmente interesante desde el punto de vista de los costos: el ingreso se acumula mes a mes con cada cliente que se mantiene, mientras que buena parte de los costos se concentra en atraer e incorporar a cada nuevo cliente.'));
c.push(H2('Planteamiento y objetivos'));
c.push(P('El trabajo se desarrolla desde la mirada del contador público responsable de diseñar la estructura de costos de la empresa y de proyectar su comportamiento. La pregunta central es: **¿cómo debe construirse la estructura de costos de una empresa de software por suscripción y cómo se ven afectados sus costos por los distintos escenarios de ventas?** Para responderla, se plantea una hoja de ruta en tres fases:'));
c.push(LI('**Fase 1. Estructura base de lanzamiento** (primer trimestre): una estructura liviana, con costos operativos presupuestados como montos mensuales, adecuada para iniciar operaciones y validar el mercado.','obj'));
c.push(LI('**Fase 2. Análisis y ajustes al cierre del primer trimestre** (meses 4 a 12): con la información real del trimestre, se clasifican los costos por su comportamiento, se miden los costos por cliente y se construye un presupuesto flexible.','obj'));
c.push(LI('**Fase 3. Estructura de costos objetivo** (segundo año): la estructura completa a la que la empresa quiere llegar, con remuneración del equipo, servicios profesionales, infraestructura escalable y procesos más eficientes.','obj'));
c.push(P('Los objetivos específicos son: (a) clasificar los costos de cada fase según su comportamiento y su función; (b) proyectar los resultados de cada fase en tres escenarios de ventas; (c) medir el margen de contribución, el punto de equilibrio, el margen de seguridad y el apalancamiento operativo; y (d) formular recomendaciones para la gestión de los costos.'));
c.push(H2('Metodología'));
c.push(P('Se partió de la herramienta de proyección de costos y ventas de la empresa (bookeaa, 2026), que calcula mes a mes los clientes, los ingresos, los costos y la caja en tres escenarios: conservador, base y optimista. Sobre ella se construyeron las fases 2 y 3 aplicando los criterios de la contabilidad de costos vistos en clase. Todas las cifras están expresadas en dólares estadounidenses. **Por razones de confidencialidad, los montos de precios, costos y captación de clientes fueron modificados respecto de los reales de la empresa**; las cifras son ilustrativas, pero conservan la estructura y las proporciones del negocio, por lo que las conclusiones no cambian. Los clientes pueden aparecer con decimales porque las tasas de conversión y de cancelación producen promedios.'));

// ---------- DESARROLLO ----------
c.push(H1('Desarrollo'));
c.push(H2('Fundamentos de costos aplicados a una empresa de software'));
c.push(P('Polimeni et al. (1997) distinguen el **costo**, que es el sacrificio de recursos para generar el servicio, del **gasto**, que se reconoce en el período porque no se vincula con la producción. En una empresa industrial los elementos del costo son materia prima, mano de obra directa y costos indirectos de fabricación. En una empresa de software por suscripción la materia prima prácticamente no existe: la **mano de obra directa** está en las horas dedicadas a incorporar y atender a cada cliente, y los **costos indirectos** están en la infraestructura tecnológica, las comunicaciones y el mantenimiento de la plataforma.'));
c.push(P('Según su comportamiento frente al volumen, los costos son **fijos** cuando su total no cambia dentro de un rango relevante de actividad, **variables** cuando su total cambia en proporción a la actividad, **semivariables** cuando combinan ambas partes y **escalonados** cuando se mantienen constantes hasta un umbral y luego saltan a un nuevo nivel (Garrison et al., 2007). Esta clasificación es la base del análisis costo–volumen–utilidad (CVU): el **margen de contribución** (precio menos costo variable unitario) es lo que cada cliente aporta para cubrir los costos fijos; el **punto de equilibrio** es el volumen en el que ese aporte iguala a los costos fijos; el **margen de seguridad** mide cuánto pueden caer las ventas antes de entrar en pérdida, y el **grado de apalancamiento operativo** (GAO) indica cuántas veces se amplifica en la utilidad un cambio porcentual de las ventas (Ramírez Padilla, 2013).'));
c.push(P('Para proyectar, Horngren et al. (2012) distinguen el **presupuesto estático**, preparado para un solo nivel de actividad, del **presupuesto flexible**, que recalcula los costos según el volumen a partir de sus inductores. Por su parte, el **costeo basado en actividades** (ABC) asigna los recursos a las actividades que los consumen —captar, incorporar y atender clientes— y de ellas a los clientes, lo que en las empresas de servicios permite conocer con precisión cuánto cuesta cada cliente (Kaplan y Cooper, 1999). Las tres fases de este trabajo recorren ese camino: del presupuesto estático al presupuesto flexible y, finalmente, a una estructura organizada por actividades.'));

c.push(H2('El modelo de ingresos por suscripción y los escenarios de ventas'));
c.push(P('En una empresa por suscripción la proyección de ventas no parte del monto en dinero, sino de las **unidades**: negocios que se incorporan, negocios que pagan y negocios que se retiran. La proyección sigue cuatro pasos: (a) cada mes se incorporan negocios nuevos que usan su mes de prueba; (b) al mes siguiente, un porcentaje de ellos pasa a pagar (tasa de conversión); (c) cada mes se retira un porcentaje de los que pagan (tasa de cancelación); y (d) el ingreso del mes es el número de negocios que pagan multiplicado por la cuota mensual. Este procedimiento obliga a explicitar los supuestos comerciales y permite compararlos luego con la realidad, que es justamente lo que se hace al cierre del primer trimestre.'));
c.push(...tabla('Supuestos de ventas de cada escenario',
 ['Supuesto','Conservador','Base','Optimista'],
 [['Factor sobre la captación base','0,6','1,0','1,4'],
  ['Negocios incorporados en el año 1',es(C.o.captados),es(B.o.captados),es(O.o.captados)],
  ['Incorporados en el primer trimestre (meta: '+PA.meta+')',es(C.q1.captados),es(B.q1.captados),es(O.q1.captados)],
  ['Conversión de prueba a pago','55 %','70 %','80 %'],
  ['Cancelación mensual','8 %','5 %','3 %'],
  ['Cuota mensual',$(pr),$(pr),$(pr)],
  ['Negocios pagando al cierre del año 1',es(C.o.pagF,1),es(B.o.pagF,1),es(O.o.pagF,1)],
  ['Negocios pagando al cierre del año 2',es(C.f3.pagF,1),es(B.f3.pagF,1),es(O.f3.pagF,1)]],
 [3.4,1.6,1.6,1.6],'Elaboración propia. La captación mensual del escenario base en el año 1 es de '+B.nuevos.slice(0,-1).join(', ')+' y '+B.nuevos.slice(-1)+' negocios; para el año 2 se supone una captación 25 % mayor.'));
c.push(...figura('Negocios que pagan la suscripción cada mes, según el escenario','fig1.png','Elaboración propia. Las zonas sombreadas indican la fase de la estructura de costos vigente en cada período.'));
c.push(P('La Figura 1 muestra cómo la captación y la retención determinan la base de clientes. Al cierre del segundo año, los negocios que pagan van de '+es(C.f3.pagF)+' en el escenario conservador a '+es(O.f3.pagF)+' en el optimista. La cuestión que interesa al contador es cómo debe responder la estructura de costos a esa diferencia de volumen, y eso es lo que se analiza en las tres fases.'));

c.push(H2('Hoja de ruta de la estructura de costos'));
c.push(...tabla('Las tres fases de la estructura de costos',
 ['Fase','Período','Enfoque','Herramienta de costos'],
 [['1. Estructura base','Meses 1 a 3 (oct. a dic. 2026)','Iniciar operaciones con costos mínimos y validar el mercado','Presupuesto estático por partidas'],
  ['2. Análisis y ajustes','Meses 4 a 12 (ene. a sep. 2027)','Medir los costos reales por cliente y por actividad','Presupuesto flexible y análisis CVU'],
  ['3. Estructura objetivo','Año 2 (oct. 2027 a sep. 2028)','Operar con una estructura completa, profesional y escalable','Costeo por actividades y costeo variable']],
 [2,2.2,3,2.4],'Elaboración propia.',{izq:[1,2,3]}));

// ---- FASE 1
c.push(H2('Fase 1. Estructura base de lanzamiento'));
c.push(P('La estructura con la que bookeaa inicia operaciones es deliberadamente liviana. La plataforma funciona sobre servicios en la nube de bajo costo, de modo que los desembolsos se concentran en tres grupos: los **costos operativos** de la plataforma (dominio, alojamiento y almacenamiento), los **gastos de operación** (comunicaciones y transporte para visitar negocios) y los **gastos de comercialización** (publicidad en redes sociales, marketing de influencia y material promocional). En esta fase todas las partidas se presupuestan como montos mensuales fijos, un criterio práctico y adecuado cuando todavía no existe historia de operaciones que permita medir cómo se comporta cada costo.'));
c.push(...tabla('Estructura de costos de la fase 1',
 ['Partida','Monto presupuestado','Comportamiento','Función'],
 [['Dominio y presencia web',$(PA.dominio)+' al año','Fijo','Administración'],
  ['Alojamiento de la plataforma','Sin costo en esta etapa','Fijo (escalonado al crecer)','Costo del servicio'],
  ['Almacenamiento en la nube',$2(PA.googleOne)+' al mes','Fijo escalonado','Costo del servicio'],
  ['Teléfono e internet',$(PA.telefono)+' al mes','Fijo','Administración'],
  ['Transporte para visitas comerciales',$(PA.transporte)+' al mes','Monto fijo presupuestado','Venta'],
  ['Publicidad en redes sociales',$(PA.ads)+' al mes desde el mes 2','Fijo discrecional','Venta'],
  ['Marketing de influencia',$(PA.precioVideo)+' por pieza desde el mes 2','Fijo discrecional','Venta'],
  ['Material promocional impreso',$(PA.tarjetas)+' cada '+PA.tarjetasCada+' meses','Fijo periódico','Venta'],
  ['Reserva para imprevistos','5 % de los costos','Reserva','—']],
 [2.8,2.4,2.2,1.8],'Elaboración propia con base en la herramienta de proyección de bookeaa (2026). La primera pieza de marketing de influencia no tiene costo.',{izq:[1,2,3]}));
c.push(P('Con esta estructura, el costo total del primer trimestre es de **'+$2(B.q1.ct)+'**, igual en los tres escenarios, porque ninguna partida depende todavía del número de clientes. La Tabla 4 resume los resultados del trimestre y la proyección inicial del año con esta estructura.'));
c.push(...tabla('Resultados del primer trimestre y proyección inicial del año con la estructura base',
 ['Indicador','Conservador','Base','Optimista'],
 [['Negocios incorporados en el trimestre',es(C.q1.captados),es(B.q1.captados),es(O.q1.captados)],
  ['Negocios pagando al cierre del trimestre',es(C.q1.pag,1),es(B.q1.pag,1),es(O.q1.pag,1)],
  ['Ingresos del trimestre',$2(C.q1.ing),$2(B.q1.ing),$2(O.q1.ing)],
  ['Costos del trimestre',$2(C.q1.ct),$2(B.q1.ct),$2(O.q1.ct)],
  ['Resultado del trimestre',$2(C.q1.res),$2(B.q1.res),$2(O.q1.res)],
  ['Proyección inicial del año: ingresos',$2(C.o.ing),$2(B.o.ing),$2(O.o.ing)],
  ['Proyección inicial del año: costos',$2(C.o.eg),$2(B.o.eg),$2(O.o.eg)],
  ['Proyección inicial del año: resultado',$2(C.o.res),$2(B.o.res),$2(O.o.res)]],
 [3.4,1.6,1.6,1.6],'Elaboración propia. La proyección inicial supone que la estructura base se mantiene durante los doce meses.',{negr:[4]}));
c.push(P('El primer trimestre es, por naturaleza, un período de inversión: los negocios que se incorporan usan su mes de prueba y la cartera que paga apenas comienza a formarse. La estructura base cumple su propósito, porque permite arrancar con un desembolso trimestral muy bajo, en torno a '+$(B.q1.ct)+', y obtener la información necesaria para diseñar la siguiente fase. Sin embargo, la proyección inicial del año supone que los costos serán los mismos atendiendo a '+es(C.o.pagF)+' negocios que a '+es(O.o.pagF)+'. Ese supuesto es razonable para arrancar, pero no para crecer, y es lo que se revisa en la fase 2.'));

// ---- FASE 2
c.push(H2('Fase 2. Análisis y ajustes al cierre del primer trimestre'));
c.push(H3('Qué se analiza al cierre del trimestre'));
c.push(P('Al terminar el primer trimestre, el contador compara lo presupuestado con lo real y separa las variaciones en tres causas: el **volumen** (más o menos negocios de los previstos), el **precio** y la **eficiencia** (horas y recursos consumidos por cada negocio). Con la información del trimestre se realizan cuatro ajustes a la estructura:'));
c.push(LI('**Clasificación por comportamiento.** Cada partida se reclasifica como fija, variable o escalonada. El transporte, por ejemplo, deja de ser un monto mensual y pasa a calcularse por cada visita a un negocio nuevo.','vin'));
c.push(LI('**Costeo de las actividades por cliente.** Se miden las horas que toma incorporar a un negocio (preparar su página, cargar servicios y horarios) y atenderlo cada mes, y se valoran a una tarifa horaria. Estas horas son el principal recurso de la empresa y pasan a formar parte del costo del servicio.','vin'));
c.push(LI('**Criterio de devengo.** Los pagos anuales o trimestrales, como el dominio y el material promocional, se distribuyen en los meses que benefician, para que el resultado de cada mes refleje su costo real.','vin'));
c.push(LI('**Tributos y costos de cobro.** Se incorporan como costos variables sobre los ingresos el tributo municipal a las actividades económicas y las comisiones de los medios de cobro.','vin'));
c.push(H3('Presupuesto flexible de la fase 2'));
c.push(...tabla('Inductores y tarifas de la estructura ajustada (fase 2)',
 ['Partida','Inductor','Tarifa o monto','Comportamiento'],
 [['Incorporación de cada negocio','Negocio nuevo',PA.hAlta+' h × '+$2(H)+' = '+$2(PA.hAlta*H),'Variable'],
  ['Visita comercial','Negocio nuevo',$2(PA.transpAlta)+' por visita','Variable'],
  ['Atención y soporte','Negocio activo','0,5 h × '+$2(H)+' = '+$2(sopF2)+' al mes','Variable'],
  ['Tributos sobre ventas y costos de cobro','Ingreso facturado',PA.isae+' % + '+PA.cobro+' % = '+(PA.isae+PA.cobro)+' %','Variable'],
  ['Mantenimiento de la plataforma','Período',PA.hMant+' h × '+$2(H)+' = '+$(PA.hMant*H)+' al mes','Fijo'],
  ['Almacenamiento y comunicaciones','Período',$2(PA.googleOne+PA.telefono)+' al mes','Fijo'],
  ['Dominio y material promocional (devengados)','Período',$2(PA.dominio/12+PA.tarjetas/PA.tarjetasCada)+' al mes','Fijo'],
  ['Publicidad y marketing de influencia','Decisión de la gerencia',$(PA.ads+PA.precioVideo)+' al mes','Fijo discrecional'],
  ['Servicios en la nube ampliados','Más de 100 negocios activos',$2(PA.ws)+' al mes','Escalonado'],
  ['Reserva para imprevistos','Costos fijos','5 %','Reserva']],
 [3,2.2,2.6,1.6],'Elaboración propia. La tarifa de '+$2(H)+' por hora valora el tiempo dedicado a cada actividad. El costo por visita resulta de distribuir el presupuesto de transporte de la fase 1 entre los negocios que se incorporan en un mes típico.',{izq:[1,2,3]}));
c.push(P('Con esta estructura, el **costo variable por negocio que paga** es de '+$2(B.a.cvu)+' al mes ('+$2(sopF2)+' de atención más '+$2(tribU)+' de tributos y cobro), y el **margen de contribución unitario** es de '+$2(B.a.mcu)+', es decir, '+pc(B.a.mcu/pr)+' de la cuota. Cada negocio nuevo, además, consume '+$2(altaF2)+' de incorporación y '+$2(sopF2)+' de atención durante su mes de prueba: es la inversión que la empresa hace en cada cliente antes de que comience a pagar.'));
c.push(H3('Resultados de la fase 2'));
c.push(...tabla('Resultados de la estructura ajustada (meses 4 a 12) y del año 1',
 ['Indicador','Conservador','Base','Optimista'],
 [['Ingresos de los meses 4 a 12',$2(C.r29.ing),$2(B.r29.ing),$2(O.r29.ing)],
  ['(−) Costos variables',$2(C.r29.cv),$2(B.r29.cv),$2(O.r29.cv)],
  ['= Margen de contribución',$2(C.r29.ing-C.r29.cv),$2(B.r29.ing-B.r29.cv),$2(O.r29.ing-O.r29.cv)],
  ['(−) Costos fijos',$2(C.r29.cf),$2(B.r29.cf),$2(O.r29.cf)],
  ['= Resultado de los meses 4 a 12',$2(C.r29.res),$2(B.r29.res),$2(O.r29.res)],
  ['Resultado del año 1 (fases 1 y 2)',$2(C.a1.res),$2(B.a1.res),$2(O.a1.res)],
  ['Caja acumulada al cierre del año 1',$2(C.a1.caja),$2(B.a1.caja),$2(O.a1.caja)]],
 [3.4,1.6,1.6,1.6],'Elaboración propia bajo costeo variable.',{negr:[2,4],sombra:[5]}));
c.push(P('Al incorporar los costos variables, la estructura de costos **responde al volumen de ventas**: el costo variable de los meses 4 a 12 va de '+$(C.r29.cv)+' en el escenario conservador a '+$(O.r29.cv)+' en el optimista, mientras que los costos fijos se mantienen prácticamente iguales. El escenario base cierra el primer año con un resultado de '+$(B.a1.res)+' y el optimista con '+$(O.a1.res)+'. El escenario conservador, en cambio, cierra con '+$(C.a1.res)+', lo que confirma que en ese nivel de ventas la empresa debe mantener una estructura de costos austera, como se plantea más adelante.'));
c.push(H3('Análisis costo–volumen–utilidad de la fase 2'));
c.push(P('El punto de equilibrio en su forma clásica se obtiene dividiendo los costos fijos mensuales entre el margen de contribución unitario: '+$2(B.a.cfEst)+' ÷ '+$2(B.a.mcu)+' = **'+es(B.a.pe,1)+' negocios pagando**. En una empresa que incorpora clientes cada mes, sin embargo, cada negocio nuevo representa una inversión de '+$2(altaF2+sopF2)+' antes de pagar, por lo que el equilibrio de una empresa en crecimiento incluye ese costo:'));
c.push(P0('*PE con crecimiento = (Costos fijos + Negocios nuevos del mes × costo de incorporación) ÷ Margen de contribución unitario*',{alignment:AlignmentType.CENTER}));
c.push(...tabla('Indicadores costo–volumen–utilidad de la fase 2 (septiembre de 2027)',
 ['Indicador','Conservador','Base','Optimista'],
 [['Margen de contribución unitario',$2(C.a.mcu),$2(B.a.mcu),$2(O.a.mcu)],
  ['Costos fijos mensuales',$2(C.a.cfEst),$2(B.a.cfEst),$2(O.a.cfEst)],
  ['Punto de equilibrio (negocios pagando)',es(C.a.pe,1),es(B.a.pe,1),es(O.a.pe,1)],
  ['Punto de equilibrio con crecimiento',es(C.a.peCrec,1),es(B.a.peCrec,1),es(O.a.peCrec,1)],
  ['Negocios pagando',es(C.a.pagF,1),es(B.a.pagF,1),es(O.a.pagF,1)],
  ['Margen de seguridad',pc(C.a.ms,1),pc(B.a.ms,1),pc(O.a.ms,1)],
  ['Grado de apalancamiento operativo',es(C.a.gao,2),es(B.a.gao,2),es(O.a.gao,2)],
  ['Costo de adquisición por negocio que paga (CAC)',$2(cacF2(C)),$2(cacF2(B)),$2(cacF2(O))],
  ['Valor de vida del cliente sobre margen (LTV)',$2(ltvF2(C)),$2(ltvF2(B)),$2(ltvF2(O))],
  ['Relación LTV / CAC',es(ltvF2(C)/cacF2(C),1)+' veces',es(ltvF2(B)/cacF2(B),1)+' veces',es(ltvF2(O)/cacF2(O),1)+' veces']],
 [3.4,1.6,1.6,1.6],'Elaboración propia. La captación usada en el punto de equilibrio con crecimiento es el promedio de los últimos tres meses. El GAO es el margen de contribución entre la utilidad operativa del mes 12. El CAC incluye incorporación, visitas, publicidad, marketing de influencia y material promocional, dividido entre los negocios que pasan a pagar.'));
c.push(P('La Tabla 7 permite tres lecturas. Primero, el punto de equilibrio **depende del ritmo de crecimiento**: mientras más negocios se incorporan, más clientes que pagan se necesitan para cubrir los costos del mes, porque la incorporación se paga por adelantado. Segundo, los escenarios base y optimista operan con márgenes de seguridad holgados ('+pc(B.a.ms)+' y '+pc(O.a.ms)+'), mientras que el conservador opera cerca del equilibrio, con un GAO de '+es(C.a.gao,1)+': allí una variación de 10 % en las ventas modifica la utilidad en cerca de '+es(C.a.gao*10)+' %. Tercero, la relación entre el valor de vida del cliente y su costo de adquisición supera las 3 veces en todos los escenarios, el umbral que Skok (2013) considera saludable para una empresa por suscripción.'));
c.push(...tabla('Resultado del año 1 (escenario base, estructura de la fase 2) según cuota mensual y cancelación',
 ['Cuota mensual','Cancelación 3 %','Cancelación 5 %','Cancelación 8 %'],
 D.sens.map(([p,v])=>[$(p),...v.map(x=>$(x))]),
 [2.4,2.2,2.2,2.2],'Elaboración propia. Con conversión de 50 %, 60 %, 70 % y 80 %, el resultado sería de '+D.sensConv.map(x=>$(x[1])).join(', ').replace(/, ([^,]*)$/,' y $1')+', respectivamente.'));
c.push(P('El análisis de sensibilidad muestra que la cuota mensual es la variable con mayor efecto: cada dólar adicional por mes agrega cerca de '+$(pasoPrecio)+' al resultado del año, porque casi toda la cuota es margen de contribución. La tasa de conversión y la tasa de cancelación le siguen en importancia. Estas tres variables son, por tanto, los indicadores que la gerencia debe seguir mes a mes.'));

// ---- FASE 3
c.push(H2('Fase 3. Estructura de costos objetivo'));
c.push(P('La fase 3 describe la estructura de costos a la que bookeaa quiere llegar en su segundo año de operaciones. Se trata de una estructura completa y profesional, organizada por actividades, que incorpora tres elementos nuevos: la **remuneración de la dirección**, los **servicios contables externos** y una **infraestructura en la nube escalable**. Al mismo tiempo, la experiencia acumulada permite hacer más eficientes las dos actividades que más recursos consumen: la incorporación de clientes, que pasa a un esquema de autoservicio guiado con visitas sólo a los prospectos que lo requieran, y la atención, que se apoya en guías y respuestas estandarizadas.'));
c.push(...tabla('Estructura de costos objetivo (fase 3)',
 ['Partida','Comportamiento','Función','Monto o inductor'],
 [['**Costos variables**','','',''],
  ['Incorporación asistida','Variable','Venta',P3.hAlta.toString().replace('.',',')+' h × '+$2(P3.hora)+' = '+$2(altaF3)+' por negocio nuevo'],
  ['Visitas comerciales selectivas','Variable','Venta',$2(visF3)+' promedio por negocio nuevo'],
  ['Atención y soporte','Variable','Costo del servicio',P3.hSoporte.toString().replace('.',',')+' h × '+$2(P3.hora)+' = '+$2(sopF3)+' por negocio activo'],
  ['Tributos sobre ventas y costos de cobro','Variable','Venta',(P3.isae+P3.cobro)+' % de los ingresos'],
  ['**Costos fijos**','','',''],
  ['Remuneración de la dirección','Fijo','Administración',$(P3.direccion)+' al mes'],
  ['Mantenimiento y desarrollo','Fijo','Costo del servicio',$(P3.mant)+' al mes'],
  ['Infraestructura en la nube','Escalonado','Costo del servicio',$(P3.nube)+' al mes; +'+$(P3.nubeExtra)+' sobre '+P3.nubeUmbral+' negocios activos'],
  ['Servicios contables externos','Fijo','Administración',$(P3.contador)+' al mes'],
  ['Dominio, teléfono e internet','Fijo','Administración',$2(P3.dominio+P3.telefono)+' al mes'],
  ['Publicidad en redes sociales','Fijo discrecional','Venta',$(P3.ads)+' al mes'],
  ['Marketing de influencia','Fijo discrecional','Venta',$(P3.influencer)+' al mes (2 piezas)'],
  ['Material promocional','Fijo','Venta',$(P3.material)+' al mes'],
  ['Reserva para imprevistos','Reserva','—',P3.impr+' % de los costos fijos']],
 [2.8,1.7,1.9,3],'Elaboración propia. Se supone una captación 25 % mayor que la del año 1 y las mismas tasas de conversión y cancelación de cada escenario.',{izq:[1,2,3]}));
c.push(P('Los desembolsos para mejorar la plataforma reciben un tratamiento definido como política contable. Bajo la NIIF para las PYMES, adoptada en Venezuela dentro de los principios VEN-NIF, los desembolsos de investigación y desarrollo generados internamente se reconocen como gasto del período en que se incurren (Consejo de Normas Internacionales de Contabilidad [IASB], 2015, sección 18). Si en el futuro la empresa aplicara las NIIF completas, la NIC 38 permitiría capitalizar la fase de desarrollo cuando se demuestren, entre otros requisitos, su factibilidad técnica y la capacidad de medir con fiabilidad el desembolso (IASB, 2004). Por eso, en esta fase se registran las horas de mantenimiento y desarrollo como una partida separada.'));
const k=B.f3.comp, fijos=[['Remuneración de la dirección',P3.direccion],['Mantenimiento y desarrollo',P3.mant],['Infraestructura en la nube',P3.nube],['Servicios contables externos',P3.contador],['Dominio, teléfono e internet',P3.dominio+P3.telefono]];
const venta=[['Publicidad en redes sociales',P3.ads],['Marketing de influencia',P3.influencer],['Material promocional',P3.material]];
const sumF=fijos.reduce((a,x)=>a+x[1]*12,0), sumV=venta.reduce((a,x)=>a+x[1]*12,0), resv=(sumF+sumV)*P3.impr/100;
c.push(...tabla('Estado de resultados proyectado bajo costeo variable, fase 3, escenario base (octubre de 2027 a septiembre de 2028)',
 ['Concepto','Parcial','Total'],
 [['Ingresos por suscripciones','',$2(B.f3.ing)],
  ['Costos variables','',''],
  ['   Incorporación asistida y visitas',$2(k.alta),''],
  ['   Atención y soporte',$2(k.sop),''],
  ['   Tributos sobre ventas y costos de cobro',$2(k.trib),'('+$2(B.f3.cv)+')'],
  ['Margen de contribución','',$2(B.f3.ing-B.f3.cv)],
  ['Costos fijos del servicio y de administración','',''],
  ...fijos.map(([n,v],i)=>['   '+n,$2(v*12),'']),
  ['   Reserva para imprevistos',$2(resv),'('+$2(sumF+resv)+')'],
  ['Costos fijos de comercialización','',''],
  ...venta.map(([n,v],i)=>['   '+n,$2(v*12),i===venta.length-1?'('+$2(sumV)+')':'']),
  ['Utilidad operativa antes de impuesto sobre la renta','',$2(B.f3.res)]],
 [5,2,2],'Elaboración propia. En una empresa de servicios sin inventarios, el costeo variable y el costeo absorbente producen la misma utilidad; el costeo variable se usa porque separa lo que cambia con las ventas de lo que no.',{negr:[0,5,17],izq:[]}));
c.push(...tabla('Indicadores de la estructura objetivo (fase 3, septiembre de 2028)',
 ['Indicador','Conservador','Base','Optimista'],
 [['Ingresos del año 2',$2(C.f3.ing),$2(B.f3.ing),$2(O.f3.ing)],
  ['Costos del año 2',$2(C.f3.ct),$2(B.f3.ct),$2(O.f3.ct)],
  ['Resultado del año 2',$2(C.f3.res),$2(B.f3.res),$2(O.f3.res)],
  ['Razón de margen de contribución',pc(C.f3.mcRatio,1),pc(B.f3.mcRatio,1),pc(O.f3.mcRatio,1)],
  ['Margen de contribución unitario',$2(C.f3.mcu),$2(B.f3.mcu),$2(O.f3.mcu)],
  ['Punto de equilibrio con crecimiento (negocios)',es(C.f3.peC,1),es(B.f3.peC,1),es(O.f3.peC,1)],
  ['Negocios pagando al cierre',es(C.f3.pagF,1),es(B.f3.pagF,1),es(O.f3.pagF,1)],
  ['Margen de seguridad',pc(C.f3.ms,1),pc(B.f3.ms,1),pc(O.f3.ms,1)],
  ['Grado de apalancamiento operativo',C.f3.gao?es(C.f3.gao,2):'—',es(B.f3.gao,2),es(O.f3.gao,2)],
  ['Relación LTV / CAC',es(C.f3.ltv/C.f3.cac,1)+' veces',es(B.f3.ltv/B.f3.cac,1)+' veces',es(O.f3.ltv/O.f3.cac,1)+' veces']],
 [3.4,1.6,1.6,1.6],'Elaboración propia. El GAO no se calcula cuando la utilidad operativa del mes es negativa.',{negr:[2]}));
c.push(P('La estructura objetivo eleva la razón de margen de contribución a '+pc(B.f3.mcRatio)+' en el escenario base, gracias a la mayor eficiencia en la incorporación y la atención de clientes: el costo variable por negocio que paga baja de '+$2(B.a.cvu)+' a '+$2(B.f3.cvu)+'. A cambio, los costos fijos suben a unos '+$(cfF3)+' al mes, porque la empresa remunera a su dirección y contrata servicios profesionales. El resultado es una empresa con más apalancamiento operativo: en los escenarios base y optimista, el segundo año cierra con resultados de '+$(B.f3.res)+' y '+$(O.f3.res)+'.'));
c.push(P('En el escenario conservador, la empresa llegaría a '+es(C.f3.pagF)+' negocios pagando, todavía por debajo del punto de equilibrio de la estructura objetivo ('+es(C.f3.peC)+'). Por eso la fase 3 no se activa por fecha, sino **por volumen**: los costos fijos nuevos —remuneración de la dirección, servicios contables y el plan de marketing ampliado— se incorporan de forma gradual a medida que la cartera supera el punto de equilibrio. Esta regla protege la caja de la empresa y es una aplicación directa del análisis costo–volumen–utilidad a la toma de decisiones.'));

// ---- EVOLUCIÓN
c.push(H2('Evolución de los costos en las tres fases'));
c.push(...tabla('Costo mensual promedio y costo por negocio activo en cada fase',
 ['Indicador','Conservador','Base','Optimista'],
 [['**Fase 1 (meses 1 a 3)**','','',''],
  ['Costo fijo mensual promedio',...ESC.map(([,x])=>$2(prom(x,1,'cf')))],
  ['Costo variable mensual promedio',...ESC.map(()=>'—')],
  ['Costo por negocio activo al cierre',...ESC.map(([,x])=>$2(x.cu.f1))],
  ['**Fase 2 (meses 4 a 12)**','','',''],
  ['Costo fijo mensual promedio',...ESC.map(([,x])=>$2(prom(x,2,'cf')))],
  ['Costo variable mensual promedio',...ESC.map(([,x])=>$2(prom(x,2,'cv')))],
  ['Costo por negocio activo al cierre',...ESC.map(([,x])=>$2(x.cu.f2))],
  ['**Fase 3 (año 2)**','','',''],
  ['Costo fijo mensual promedio',...ESC.map(([,x])=>$2(prom(x,3,'cf')))],
  ['Costo variable mensual promedio',...ESC.map(([,x])=>$2(prom(x,3,'cv')))],
  ['Costo por negocio activo al cierre',...ESC.map(([,x])=>$2(x.cu.f3))]],
 [3.4,1.6,1.6,1.6],'Elaboración propia. Los negocios activos incluyen a los que pagan y a los que están en su mes de prueba.',{izq:[]}));
c.push(...figura('Costo mensual promedio de cada fase, separado en fijo y variable','fig2.png','Elaboración propia. F1, F2 y F3 indican la fase de la estructura de costos.'));
c.push(P('La Tabla 12 y la Figura 2 resumen cómo afectan las proyecciones de ventas a los costos en cada fase. En la fase 1 el costo es el mismo en todos los escenarios porque se presupuesta por partidas. Desde la fase 2, la porción variable crece con las ventas: en el escenario optimista el costo variable mensual promedio es casi el triple que en el conservador. En la fase 3 los costos fijos aumentan por la profesionalización de la estructura, pero el costo variable por cliente disminuye por la mayor eficiencia de los procesos.'));
c.push(...figura('Costo por negocio activo a lo largo de las tres fases','fig3.png','Elaboración propia. Los saltos al inicio de cada fase corresponden a la incorporación de nuevos costos; luego, la escala los distribuye entre más clientes.'));
c.push(P('La Figura 3 muestra el efecto de las **economías de escala**. Cada fase comienza con un aumento del costo por cliente, porque incorpora costos nuevos, y luego ese costo desciende a medida que la cartera crece y los costos fijos se reparten entre más negocios. En el escenario base el costo por negocio activo termina el segundo año en '+$2(B.cu.f3)+', por debajo del cierre de la fase 2 ('+$2(B.cu.f2)+'), aunque la estructura es más completa. En el optimista termina en '+$2(O.cu.f3)+'. La conclusión para la fijación de precios es clara: el costo unitario depende del volumen, por lo que siempre debe indicarse a qué nivel de clientes corresponde.'));
c.push(...figura('Caja acumulada a lo largo de las tres fases','fig4.png','Elaboración propia. La línea en $0 marca el punto en que la empresa recupera todo lo invertido.'));
c.push(P('En términos de liquidez (Figura 4), la caja disminuye durante el primer trimestre, que concentra la inversión en la captación de clientes. El escenario optimista recupera lo invertido en '+largo(cruce(O))+' y el base en '+largo(cruce(B))+'; al cierre del segundo año, la caja acumulada alcanza '+$(B.a2.caja)+' en el escenario base y '+$(O.a2.caja)+' en el optimista. En el escenario conservador, la activación gradual de la fase 3 descrita antes es la que permite sostener la caja mientras la cartera crece.'));

// ---------- CONCLUSIONES ----------
c.push(H1('Conclusiones y recomendaciones',1));
c.push(H2('Conclusiones'));
c.push(P('La estructura de costos de una empresa de software por suscripción no es un dato estático: se construye por etapas. bookeaa inicia con una **estructura base** liviana, presupuestada por partidas, que le permite arrancar con un desembolso trimestral de alrededor de '+$(B.q1.ct)+' y validar su mercado. Al cierre del primer trimestre, la información real permite pasar a un **presupuesto flexible**, en el que los costos se clasifican por comportamiento y se miden por cliente y por actividad. Finalmente, la **estructura objetivo** del segundo año incorpora la remuneración de la dirección, los servicios profesionales y una infraestructura escalable, con procesos más eficientes.'));
c.push(P('Las proyecciones de ventas afectan a los costos de tres maneras. En el **total**, a partir de la fase 2 los costos crecen con el número de clientes por la porción variable (incorporación, atención y tributos sobre ventas). En el **costo unitario**, ocurre lo contrario: a mayor volumen, el costo por cliente disminuye gracias a la distribución de los costos fijos, y en la fase 3 llega a '+$2(B.cu.f3)+' en el escenario base y '+$2(O.cu.f3)+' en el optimista. Y en el **riesgo**, los escenarios con menos ventas operan más cerca del punto de equilibrio y con mayor apalancamiento operativo, por lo que requieren una estructura más austera.'));
c.push(P('El modelo de negocio es viable: el margen de contribución unitario representa más del '+es(Math.floor(B.a.mcu/pr*100/5)*5)+' % de la cuota, la relación entre el valor de vida del cliente y su costo de adquisición supera las 3 veces en todos los escenarios y, en el escenario base, el segundo año cierra con un resultado de '+$(B.f3.res)+'. Su éxito depende, sobre todo, de tres variables: la cuota mensual, la tasa de conversión y la tasa de cancelación.'));
c.push(H2('Recomendaciones'));
[
 '**Mantener la estructura base durante el primer trimestre** y registrar desde el inicio las horas dedicadas a incorporar y atender a cada negocio, para contar con datos reales al pasar a la fase 2.',
 '**Implementar el presupuesto flexible al cierre del trimestre**, con inductores por negocio nuevo, por negocio activo y por ingreso, y compararlo cada mes con los resultados reales separando las variaciones de volumen, precio y eficiencia.',
 '**Llevar el estado de resultados por devengo junto con el flujo de caja**, para medir la rentabilidad de cada mes y, al mismo tiempo, conocer las necesidades de liquidez.',
 '**Activar la estructura objetivo por volumen y no por fecha**: incorporar la remuneración de la dirección y los servicios profesionales cuando la cartera supere el punto de equilibrio de la fase 3, cerca de '+es(Math.round(B.f3.peC/5)*5)+' negocios pagando.',
 '**Reducir el costo de incorporación** mediante un proceso de autoservicio guiado, porque es el costo variable más alto por cliente y el que más influye en el punto de equilibrio de una empresa en crecimiento.',
 '**Evaluar un plan anual con descuento**, que adelanta la caja y reduce la cancelación; el análisis de sensibilidad muestra que cada dólar de cuota agrega cerca de '+$(pasoPrecio3)+' al resultado del segundo año.',
 '**Definir un tablero mensual de indicadores** con el margen de contribución, el punto de equilibrio, el margen de seguridad, el costo de adquisición, el valor de vida del cliente y las tasas de conversión y cancelación.',
 '**Formalizar las políticas contables y tributarias** con el apoyo del contador externo: tratamiento de los desembolsos de desarrollo, tributos sobre las ventas e impuesto sobre la renta.',
].forEach(t=>c.push(LI(t,'rec')));

// ---------- REFERENCIAS ----------
c.push(H1('Referencias',1));
[
 'bookeaa. (2026). *Costos y proyección de ventas* [Modelo de proyección interactivo no publicado]. Documento interno de la empresa.',
 'Consejo de Normas Internacionales de Contabilidad. (2004). *Norma Internacional de Contabilidad 38: Activos intangibles*. Fundación IFRS.',
 'Consejo de Normas Internacionales de Contabilidad. (2015). *Norma Internacional de Información Financiera para las Pequeñas y Medianas Entidades (NIIF para las PYMES)*. Fundación IFRS.',
 'Garrison, R. H., Noreen, E. W., y Brewer, P. C. (2007). *Contabilidad administrativa* (11.ª ed.). McGraw-Hill Interamericana.',
 'Horngren, C. T., Datar, S. M., y Rajan, M. V. (2012). *Contabilidad de costos: Un enfoque gerencial* (14.ª ed.). Pearson Educación.',
 'Kaplan, R. S., y Cooper, R. (1999). *Coste y efecto: Cómo usar el ABC, el ABM y el ABB para mejorar la gestión, los procesos y la rentabilidad*. Gestión 2000.',
 'Polimeni, R. S., Fabozzi, F. J., Adelberg, A. H., y Kole, M. A. (1997). *Contabilidad de costos: Conceptos y aplicaciones para la toma de decisiones gerenciales* (3.ª ed.). McGraw-Hill Interamericana.',
 'Ramírez Padilla, D. N. (2013). *Contabilidad administrativa: Un enfoque estratégico para competir* (9.ª ed.). McGraw-Hill.',
 'Skok, D. (2013). *SaaS metrics 2.0: A guide to measuring and improving what matters*. For Entrepreneurs. https://www.forentrepreneurs.com/saas-metrics-2/',
].forEach(t=>c.push(ref(t)));

// ---------- ANEXO ----------
c.push(H1('Anexo A',1),cen('**Proyección mensual del escenario base en las tres fases**'));
c.push(...tabla('Proyección mensual del escenario base (USD)',
 ['Mes','Fase','Nuevos','Pagando','Ingresos','C. fijos','C. variables','Flujo','Caja'],
 B.plan.map(m=>[m.et,String(m.fase),es(m.nuevos),es(m.pag,1),$2(m.ing),$2(m.cf),$2(m.cv),$2(m.flujo),$2(m.caja)]),
 [1,0.6,0.8,0.9,1.15,1.05,1.1,1.1,1.15],'Elaboración propia. Los negocios pagando incluyen decimales porque resultan de aplicar las tasas de conversión y de cancelación.',{size:16}));

const doc=new Document({creator:'Estudiante',title:'Estructura de costos en tres fases: caso bookeaa',
 styles:{default:{document:{run:{font:FONT,size:24}}},
  paragraphStyles:[
   {id:'Heading1',name:'Heading 1',basedOn:'Normal',next:'Normal',quickFormat:true,run:{font:FONT,size:24,bold:true,color:'000000'},paragraph:{alignment:AlignmentType.CENTER,outlineLevel:0,spacing:{before:0,after:0,line:480}}},
   {id:'Heading2',name:'Heading 2',basedOn:'Normal',next:'Normal',quickFormat:true,run:{font:FONT,size:24,bold:true,color:'000000'},paragraph:{outlineLevel:1,spacing:{before:0,after:0,line:480}}},
   {id:'Heading3',name:'Heading 3',basedOn:'Normal',next:'Normal',quickFormat:true,run:{font:FONT,size:24,bold:true,italics:true,color:'000000'},paragraph:{outlineLevel:2,spacing:{before:0,after:0,line:480}}}]},
 numbering:{config:[
  {reference:'obj',levels:[{level:0,format:LevelFormat.DECIMAL,text:'%1.',alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:1080,hanging:360}}}}]},
  {reference:'rec',levels:[{level:0,format:LevelFormat.DECIMAL,text:'%1.',alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:1080,hanging:360}}}}]},
  {reference:'vin',levels:[{level:0,format:LevelFormat.BULLET,text:'•',alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:1080,hanging:360}}}}]}]},
 sections:[{properties:{page:{size:{width:12240,height:15840},margin:{top:1440,bottom:1440,left:1440,right:1440}}},
  headers:{default:new Header({children:[new Paragraph({alignment:AlignmentType.RIGHT,children:[new TextRun({children:[PageNumber.CURRENT]})]})]})},
  children:c}]});
Packer.toBuffer(doc).then(b=>{fs.writeFileSync('../Proyecto_Final_Contabilidad_VI_bookeaa.docx',b);console.log('ok')});
