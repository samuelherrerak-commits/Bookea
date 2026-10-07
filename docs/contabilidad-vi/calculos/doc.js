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
const P=t=>new Paragraph({children:runs(t),indent:{firstLine:720},spacing:{line:480}});
const P0=(t,o={})=>new Paragraph({children:runs(t),spacing:{line:480},...o});
const H1=(t,pb)=>new Paragraph({pageBreakBefore:!!pb,heading:HeadingLevel.HEADING_1,alignment:AlignmentType.CENTER,spacing:{line:480},children:[new TextRun({text:t,bold:true})]});
const H2=t=>new Paragraph({heading:HeadingLevel.HEADING_2,spacing:{line:480},children:[new TextRun({text:t,bold:true})]});
const H3=t=>new Paragraph({heading:HeadingLevel.HEADING_3,spacing:{line:480},children:[new TextRun({text:t,bold:true,italics:true})]});
const LI=(t,ref='vin')=>new Paragraph({numbering:{reference:ref,level:0},spacing:{line:480},children:runs(t)});
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
    ...(nota?[new Paragraph({spacing:{before:120,after:240,line:240},children:[new TextRun({text:'Nota. ',italics:true}),...runs(nota)]})]:[new Paragraph({spacing:{after:240},children:[]})])];
}
function figura(titulo,file,nota){nf++;
  return [new Paragraph({spacing:{before:240,line:480},keepNext:true,children:[new TextRun({text:'Figura '+nf,bold:true})]}),
    new Paragraph({spacing:{line:480},keepNext:true,children:[new TextRun({text:titulo,italics:true})]}),
    new Paragraph({keepNext:true,children:[new ImageRun({type:'png',data:fs.readFileSync(file),transformation:{width:600,height:332}})]}),
    new Paragraph({spacing:{before:120,after:240,line:240},children:[new TextRun({text:'Nota. ',italics:true}),...runs(nota)]})]}
const ref=t=>new Paragraph({children:runs(t),indent:{left:720,hanging:720},spacing:{line:480}});

// ---------- números ----------
const a=B.a, o=B.o;
const cacPag=x=>x.a.cacTotal/(x.conv/100), ltvMC=x=>x.a.mcu/(x.churn/100);
const c=[];
// ---------- PORTADA ----------
const cen=(t,o={})=>new Paragraph({alignment:AlignmentType.CENTER,spacing:{line:480},children:runs(t,o)});
c.push(...[1,2,3].map(()=>new Paragraph({spacing:{line:480},children:[]})));
c.push(cen('**Análisis de la estructura de costos de una empresa de software como servicio y efecto de las proyecciones de ventas sobre sus costos: caso bookeaa**'));
c.push(new Paragraph({spacing:{line:480},children:[]}));
c.push(cen('[Nombre y apellido del estudiante] · C.I. [número]'),cen('[Nombre y apellido del estudiante] · C.I. [número]'),
  cen('[Escuela de Contaduría Pública], [Nombre de la universidad]'),cen('Contabilidad VI (Contabilidad de Costos), sección [número]'),
  cen('Prof. [Nombre del docente]'),cen('[Día] de octubre de 2026'));
c.push(BR());

// ---------- CONTEXTO ----------
c.push(H1('Contexto'));
c.push(P('La contabilidad de costos no se limita a registrar lo que ya se gastó: su función más útil es anticipar cuánto costará operar a distintos niveles de actividad y, con esa información, apoyar las decisiones de precio, inversión y crecimiento (Horngren et al., 2012). Esa función cobra un peso especial en las empresas de software, donde casi no existen materiales, el producto no se almacena y la mayor parte de los desembolsos parece fija. Precisamente por eso es fácil caer en una proyección que trata todos los costos como constantes y deja de ver cómo cambian cuando cambian las ventas.'));
c.push(H2('Descripción de la organización'));
c.push(P('bookeaa es un emprendimiento venezolano de software como servicio (SaaS, por sus siglas en inglés) que ofrece a pequeños negocios de servicios —salones de uñas, barberías y centros de estética— una página de reservas en línea. El cliente final elige servicios, fecha y hora, indica su método de pago (por ejemplo, Pago Móvil con su comprobante) y la cita se registra automáticamente en Google Sheets, Google Calendar y Google Drive; el negocio recibe la confirmación por WhatsApp. La aplicación está construida con tecnologías web de bajo costo: el sitio se aloja en Render en un plan estático gratuito y el servidor de datos funciona sobre Google Apps Script.'));
c.push(P('El modelo comercial es una suscripción mensual: cada negocio disfruta de un **primer mes gratis** y luego paga **$10 al mes** por el plan Pro. La meta comercial declarada es captar **50 negocios en el primer trimestre**, a partir de octubre de 2026. Para respaldar esa meta, el equipo fundador construyó una herramienta de proyección (bookeaa, 2026) que estima, mes a mes y durante doce meses, los clientes, los ingresos, los egresos y la caja, bajo tres escenarios de ventas: conservador, base y optimista. Esa herramienta y sus supuestos constituyen el objeto de este levantamiento.'));
c.push(H2('Planteamiento y objetivos'));
c.push(P('El trabajo se plantea desde la mirada del contador público que recibe la proyección de la gerencia y debe opinar sobre ella. La pregunta central es: **¿cómo deben proyectarse los costos de una empresa de software y cómo se ven afectados por los distintos escenarios de ventas?** De ella se desprenden los siguientes objetivos:'));
c.push(LI('Levantar y clasificar la estructura de costos que utiliza bookeaa según su comportamiento (fijo, variable, semivariable y escalonado) y su función (costo del servicio, gastos de venta y de administración).','obj'));
c.push(LI('Evaluar el método de proyección de ventas y de costos empleado, e identificar sus debilidades técnicas.','obj'));
c.push(LI('Reconstruir la proyección con un presupuesto flexible basado en inductores de costo y medir, para cada escenario, el margen de contribución, el punto de equilibrio, el margen de seguridad y el grado de apalancamiento operativo.','obj'));
c.push(LI('Formular recomendaciones profesionales a partir de los hallazgos.','obj'));
c.push(H2('Metodología'));
c.push(P('Se revisó el modelo de cálculo de la herramienta de proyección (sus fórmulas y valores iniciales) y se replicaron sus resultados para los tres escenarios. Luego se clasificó cada partida con los criterios vistos en clase y se construyó un modelo ajustado que incorpora inductores de costo, criterio de devengo y los costos que el modelo original omite. Todas las cifras están expresadas en dólares estadounidenses; los clientes pueden aparecer con decimales porque las tasas de conversión y de cancelación producen promedios. Los supuestos agregados por el autor del análisis se identifican expresamente para que el lector pueda sustituirlos por datos reales.'));

// ---------- DESARROLLO ----------
c.push(H1('Desarrollo'));
c.push(H2('Fundamentos de costos aplicados a una empresa de software'));
c.push(P('Polimeni et al. (1997) distinguen el **costo** —el sacrificio de recursos para generar el servicio— del **gasto**, que se reconoce en el período porque no se vincula con la producción. En una empresa industrial los elementos del costo son materia prima, mano de obra directa y costos indirectos de fabricación. En un SaaS la materia prima prácticamente desaparece; la **mano de obra directa** está en las horas de configuración de cada negocio y en el soporte mensual, y los **costos indirectos** están en la infraestructura digital: alojamiento, almacenamiento, dominio y comunicaciones.'));
c.push(P('Según su comportamiento frente al volumen, los costos son **fijos** cuando su total no cambia dentro de un rango relevante, **variables** cuando su total cambia en proporción a la actividad, **semivariables** cuando tienen una parte de cada tipo y **escalonados** cuando permanecen constantes hasta un umbral y luego saltan a un nuevo nivel (Garrison et al., 2007). Esta clasificación es la base del análisis costo–volumen–utilidad (CVU): el **margen de contribución** (precio menos costo variable unitario) es lo que cada unidad aporta para cubrir los costos fijos; el **punto de equilibrio** es el volumen en el que ese aporte iguala a los fijos; el **margen de seguridad** mide cuánto pueden caer las ventas antes de entrar en pérdida, y el **grado de apalancamiento operativo** (GAO) indica cuántas veces se amplifica en la utilidad un cambio porcentual en las ventas (Ramírez Padilla, 2013).'));
c.push(P('Para proyectar, Horngren et al. (2012) diferencian el **presupuesto estático**, preparado para un solo nivel de actividad, del **presupuesto flexible**, que recalcula los costos según el volumen real o esperado a partir de sus inductores. Cuando se proyectan varios escenarios de ventas, sólo el presupuesto flexible permite comparar de manera coherente los costos de cada uno. Por último, el **costeo basado en actividades** (ABC) propone asignar los recursos a las actividades que los consumen (captar, configurar, dar soporte) y de ellas a los clientes, lo que en empresas de servicios revela costos que el costeo tradicional deja escondidos (Kaplan y Cooper, 1999).'));

c.push(H2('Levantamiento de la estructura de costos actual'));
c.push(P('La herramienta de bookeaa registra once partidas de egreso. La Tabla 1 las presenta con el monto que asume el modelo, el tratamiento que reciben en él y la clasificación técnica que les corresponde.'));
c.push(...tabla('Partidas de egreso del modelo de bookeaa y su clasificación técnica',
 ['Partida','Monto en el modelo','Cómo la trata el modelo','Por comportamiento','Por función'],
 [['Dominio bookeaa.com','$15 al año','Egreso total en el mes 1','Fijo (prepagado)','Administración'],
  ['Tarjetas de presentación','$30 cada 3 meses','Egreso en el mes de impresión','Fijo periódico (suministro)','Venta'],
  ['Google One 100 GB','$1,99 al mes','Fijo','Escalonado (capacidad)','Costo del servicio'],
  ['Google Workspace','$0 (opcional)','Fijo','Escalonado (cuotas de uso)','Costo del servicio'],
  ['Render (alojamiento)','$0','Fijo','Escalonado (plan gratuito)','Costo del servicio'],
  ['Teléfono e internet','$10 al mes','Fijo','Semivariable','Administración'],
  ['Transporte','$20 al mes','Fijo','Variable (visitas a prospectos)','Venta'],
  ['Publicidad en Instagram','$20 al mes desde el mes 2','Fijo discrecional','Fijo discrecional','Venta'],
  ['Influencer','$40 por video desde el mes 2','Fijo discrecional','Fijo discrecional','Venta'],
  ['Sueldo del fundador','$0','Omitido','Fijo (y variable en horas)','Costo del servicio y administración'],
  ['Comisiones e impuestos','0 %','Omitido','Variable sobre ingresos','Venta / tributos'],
  ['Imprevistos','5 % sobre los egresos','Porcentaje plano','No es un costo; es una reserva','—']],
 [2.3,1.7,1.9,1.9,1.7],'Elaboración propia a partir de la herramienta de proyección de bookeaa (2026). Las clasificaciones técnicas siguen a Garrison et al. (2007) y Horngren et al. (2012).',{izq:[1,2,3,4],size:18}));
c.push(P('El levantamiento muestra una estructura **muy liviana**: sin contar marketing, la operación cuesta alrededor de $32 al mes. Sin embargo, también muestra que **todas** las partidas están modeladas como montos fijos en el tiempo. Ninguna depende del número de negocios captados, activos o pagando. Esta característica, que podría parecer una simplificación inocente, es el hallazgo central del trabajo y condiciona todos los resultados que siguen.'));

c.push(H2('El proceso de proyección de ventas'));
c.push(P('En un SaaS la proyección de ventas no parte del monto en dinero, sino de las **unidades**: negocios que entran, negocios que pagan y negocios que se van. El modelo de bookeaa sigue correctamente un embudo de cuatro pasos: (a) cada mes ingresan negocios nuevos que usan su mes gratis; (b) al mes siguiente, un porcentaje de ellos pasa a pagar (tasa de conversión); (c) cada mes se pierde un porcentaje de los que pagan (tasa de cancelación o *churn*); y (d) el ingreso del mes es el número de negocios que pagan multiplicado por el precio. Este es el procedimiento que un contador debe exigir, porque obliga a explicitar los supuestos comerciales y permite verificarlos luego contra la realidad.'));
c.push(P('Los tres escenarios se construyen multiplicando la captación base por un factor y cambiando las tasas de conversión y de cancelación (Tabla 2). La meta de 50 negocios en el primer trimestre sólo se cumple en los escenarios base y optimista.'));
c.push(...tabla('Supuestos de ventas de cada escenario',
 ['Supuesto','Conservador','Base','Optimista'],
 [['Factor sobre la captación base','0,6','1,0','1,4'],
  ['Negocios captados en el año',es(C.o.captados),es(B.o.captados),es(O.o.captados)],
  ['Captados en el primer trimestre (meta: 50)',es(C.o.q1),es(B.o.q1),es(O.o.q1)],
  ['Conversión de prueba a pago','55 %','70 %','80 %'],
  ['Cancelación mensual (churn)','8 %','5 %','3 %'],
  ['Precio mensual','$10','$10','$10'],
  ['Negocios pagando en el mes 12',es(C.o.pagF,1),es(B.o.pagF,1),es(O.o.pagF,1)],
  ['Ingresos del año',$2(C.o.ing),$2(B.o.ing),$2(O.o.ing)]],
 [3.4,1.6,1.6,1.6],'Elaboración propia con base en los supuestos de bookeaa (2026). La captación mensual del escenario base es 10, 15, 25, 12, 12, 15, 15, 15, 18, 18, 20 y 20 negocios.'));
c.push(...figura('Negocios que pagan cada mes según el escenario de ventas','fig1.png','Elaboración propia con el modelo de bookeaa (2026). Las curvas son idénticas en el modelo actual y en el ajustado, porque el ajuste afecta a los costos, no a las ventas.'));
c.push(P('La Figura 1 confirma algo esperable: la captación y la retención determinan la base de clientes. Entre el escenario conservador y el optimista, los negocios pagando al cierre del año pasan de '+es(C.o.pagF)+' a '+es(O.o.pagF)+', es decir, más de cuatro veces. Lo que interesa al contador es qué ocurre con los costos ante esa diferencia.'));

c.push(H2('Resultados del modelo actual: un presupuesto estático'));
c.push(...tabla('Resultados del modelo actual para los tres escenarios',
 ['Indicador','Conservador','Base','Optimista'],
 [['Ingresos del año',$2(C.o.ing),$2(B.o.ing),$2(O.o.ing)],
  ['Egresos del año',$2(C.o.eg),$2(B.o.eg),$2(O.o.eg)],
  ['Resultado del año',$2(C.o.res),$2(B.o.res),$2(O.o.res)],
  ['Primer mes con flujo positivo',C.o.eq,B.o.eq,O.o.eq],
  ['Capital necesario (caja mínima)',$2(C.o.capital),$2(B.o.capital),$2(O.o.capital)],
  ['Costo por negocio captado (CAC)',$2(C.o.cac),$2(B.o.cac),$2(O.o.cac)],
  ['Valor de vida por negocio captado (LTV)',$2(C.o.ltvc),$2(B.o.ltvc),$2(O.o.ltvc)]],
 [3.4,1.6,1.6,1.6],'Elaboración propia replicando las fórmulas de la herramienta de bookeaa (2026). Los nombres de los meses corresponden a octubre de 2026 (Oct 26) a septiembre de 2027 (Sep 27).',{sombra:[1]}));
c.push(P('La fila sombreada de la Tabla 3 resume el problema: **los egresos son exactamente '+$2(B.o.eg)+' en los tres escenarios**. Para el modelo, atender a '+es(O.o.pagF)+' negocios cuesta lo mismo que atender a '+es(C.o.pagF)+'. En términos técnicos, la herramienta es un presupuesto estático aplicado a tres niveles de ventas distintos: varía los ingresos y deja fijos los costos. La consecuencia es que todo aumento de ventas pasa íntegro a la utilidad, de modo que el escenario optimista promete un resultado de '+$(O.o.res)+' sobre '+$(O.o.ing)+' de ingresos, un margen de '+pc(O.o.res/O.o.ing)+' que ninguna empresa de servicios con atención personalizada puede sostener.'));

c.push(H2('Hallazgos'));
c.push(P('Del levantamiento se desprenden nueve hallazgos. Se ordenan de mayor a menor efecto sobre la toma de decisiones.'));
c.push(H3('Hallazgo 1. Ningún costo responde al volumen'));
c.push(P('El modelo no tiene inductores de costo. El transporte, por ejemplo, se fija en $20 al mes aunque su causa real son las visitas a negocios prospecto: si se captan 28 negocios en un mes, se harán más visitas que si se captan 6. Lo mismo ocurre con el soporte, el almacenamiento de comprobantes y los cobros. Sin inductores, la proyección no puede responder la pregunta que justifica tener escenarios: cuánto cuesta crecer.'));
c.push(H3('Hallazgo 2. La mano de obra no está costeada'));
c.push(P('El sueldo del fundador figura en $0 "mientras se reinvierte". Desde el punto de vista de costos, eso no elimina la mano de obra: la oculta. Configurar la página de cada negocio (servicios, precios, horarios, colores y datos de pago) y responder sus dudas por WhatsApp consume horas que son el principal recurso de la empresa. Mientras esas horas no se valoren, el costo del servicio está subestimado y el precio de $10 parece más rentable de lo que es. Además, la empresa no podría contratar a nadie para hacer ese trabajo sin que el modelo cambie por completo.'));
c.push(H3('Hallazgo 3. Se mezcla flujo de caja con resultado'));
c.push(P('El modelo registra el dominio completo ($15) en el primer mes y las tarjetas ($30) en el mes en que se imprimen. Eso es correcto para el flujo de caja, pero no para medir el costo del período. Bajo el principio de devengo, el dominio es un gasto pagado por anticipado que se amortiza a $1,25 por mes, y las tarjetas son suministros que se consumen en el trimestre. La herramienta llama "resultado del año" a lo que en realidad es la variación de la caja.'));
c.push(H3('Hallazgo 4. Los tributos están en cero'));
c.push(P('Las comisiones y los impuestos se dejan en 0 %. Una empresa formal en Venezuela debe considerar, al menos, el impuesto municipal sobre actividades económicas, que se calcula sobre los ingresos brutos con una alícuota que fija cada municipio; el impuesto al valor agregado, cuya alícuota general es de 16 % (Ley que Establece el Impuesto al Valor Agregado, 2014) y que, si el precio de $10 lo incluye, reduce el ingreso neto; el impuesto a las grandes transacciones financieras, de 3 % sobre ciertos pagos en divisas (Decreto de Reforma de la Ley de Impuesto a las Grandes Transacciones Financieras, 2022); y los costos de cobro de las plataformas de pago. Todos son costos variables sobre los ingresos y todos crecen con las ventas.'));
c.push(H3('Hallazgo 5. El costo de captar clientes está subestimado'));
c.push(P('El CAC de la herramienta divide sólo el marketing entre los negocios captados ('+$2(B.o.cac)+' en el escenario base). Esa cifra omite el costo de configurar cada negocio, el soporte durante su mes gratis y el transporte de las visitas, y divide entre todos los que prueban, aunque el 30 % no llegue a pagar. Skok (2013) recomienda calcular el CAC con todos los costos de venta y alta, y relacionarlo con los clientes que efectivamente pagan.'));
c.push(H3('Hallazgo 6. El valor de vida del cliente se mide sobre el ingreso, no sobre el margen'));
c.push(P('El LTV del modelo es el precio dividido entre la tasa de cancelación ($10 ÷ 5 % = $200 por negocio que paga). Como no se descuenta ningún costo variable, el indicador mide ingresos, no contribución. El LTV técnicamente correcto es el margen de contribución unitario dividido entre la tasa de cancelación.'));
c.push(H3('Hallazgo 7. Se ignoran los costos escalonados'));
c.push(P('Las herramientas gratuitas tienen límites. Google Apps Script en cuentas personales tiene cuotas diarias de ejecución y de envío de correos, el plan de 100 GB de Google One se llena con los comprobantes de pago y el plan gratuito de Render tiene límites de ancho de banda. Al superar esos umbrales, el costo salta a un nuevo nivel: por ejemplo, la propia herramienta prevé Google Workspace como opción de unos $7 por usuario al mes. Es un costo escalonado típico, que aparece justamente en los escenarios de mayor venta.'));
c.push(H3('Hallazgo 8. Los imprevistos se calculan como porcentaje plano'));
c.push(P('El 5 % de imprevistos se aplica sobre todos los egresos, incluidos los discrecionales como la publicidad. Una reserva para contingencias es prudente, pero conviene limitarla a los costos fijos operativos y presentarla separada, para que no se confunda con un costo identificable.'));
c.push(H3('Hallazgo 9. El desarrollo del software no tiene tratamiento contable'));
c.push(P('El esfuerzo de construir la plataforma no aparece en la proyección. Si la empresa aplica la NIIF para las PYMES, adoptada en Venezuela dentro de los principios VEN-NIF, los desembolsos de investigación y desarrollo generados internamente se reconocen como gasto cuando se incurren (Consejo de Normas Internacionales de Contabilidad [IASB], 2015, sección 18). Si en el futuro aplica NIIF completas, la NIC 38 permite capitalizar la fase de desarrollo sólo si se demuestran, entre otros requisitos, la factibilidad técnica, la intención de completar el activo y la capacidad de medir con fiabilidad el desembolso (IASB, 2004). En cualquier caso, la empresa necesita registrar las horas de desarrollo para poder decidir el tratamiento.'));

c.push(H2('Propuesta: presupuesto flexible con inductores de costo'));
c.push(P('Para corregir los hallazgos se reconstruyó la proyección con un presupuesto flexible. Las ventas (clientes e ingresos) se mantienen exactamente iguales a las del modelo original, de modo que la diferencia en los resultados se explica sólo por el tratamiento de los costos. La Tabla 4 presenta los inductores y tarifas utilizados.'));
c.push(...tabla('Supuestos de costo del modelo ajustado',
 ['Partida','Inductor','Tarifa o monto','Comportamiento'],
 [['Configuración del negocio (alta)','Negocio nuevo','2 h × $3/h = $6,00','Variable'],
  ['Transporte a la visita','Negocio nuevo','$1,30 por visita','Variable'],
  ['Soporte mensual','Negocio activo (pagando o en prueba)','0,5 h × $3/h = $1,50','Variable'],
  ['Tributo municipal y costo de cobro','Ingreso facturado','2 % + 1 % = 3 %','Variable'],
  ['Mantenimiento y desarrollo','Período','20 h × $3/h = $60 al mes','Fijo'],
  ['Google One, teléfono','Período','$1,99 y $10 al mes','Fijo'],
  ['Dominio y tarjetas (devengados)','Período','$1,25 y $10 al mes','Fijo'],
  ['Publicidad e influencer','Decisión de la gerencia','$20 y $40 al mes desde el mes 2','Fijo discrecional'],
  ['Google Workspace','Más de 100 negocios activos','$7,20 al mes','Escalonado'],
  ['Imprevistos','Costos fijos','5 %','Reserva']],
 [2.6,2.4,2.4,1.6],'Supuestos del autor. La tarifa de $3 por hora es una referencia para valorar el tiempo del fundador y debe reemplazarse por la tarifa real de la empresa. El transporte de $1,30 por visita resulta de repartir los $20 mensuales del modelo original entre unos 15 negocios captados al mes.',{izq:[1,2,3]}));
c.push(P('Con estos supuestos, el **costo variable por negocio que paga** es de '+$2(B.a.cvu)+' al mes ($1,50 de soporte más $0,30 de tributos y cobro) y el **margen de contribución unitario** es de '+$2(B.a.mcu)+', es decir, '+pc(B.a.mcu/10)+' del precio. Cada negocio nuevo, además, consume $7,30 de alta y $1,50 de soporte durante su mes gratis antes de generar ingresos. Los costos fijos estabilizados rondan los '+$2(C.a.cfEst)+' al mes ('+$2(B.a.cfEst)+' cuando se activa Google Workspace).'));
c.push(...tabla('Resultados del modelo ajustado frente al modelo actual',
 ['Indicador','Conservador','Base','Optimista'],
 [['Ingresos del año',$2(C.a.ing),$2(B.a.ing),$2(O.a.ing)],
  ['(−) Costos variables',$2(C.a.cv),$2(B.a.cv),$2(O.a.cv)],
  ['= Margen de contribución',$2(C.a.ing-C.a.cv),$2(B.a.ing-B.a.cv),$2(O.a.ing-O.a.cv)],
  ['Razón de margen de contribución',pc(C.a.mcRatio,1),pc(B.a.mcRatio,1),pc(O.a.mcRatio,1)],
  ['(−) Costos fijos',$2(C.a.cf),$2(B.a.cf),$2(O.a.cf)],
  ['= Resultado del año (ajustado)',$2(C.a.res),$2(B.a.res),$2(O.a.res)],
  ['Resultado del año (modelo actual)',$2(C.o.res),$2(B.o.res),$2(O.o.res)],
  ['Diferencia',$2(C.a.res-C.o.res),$2(B.a.res-B.o.res),$2(O.a.res-O.o.res)],
  ['Primer mes con flujo positivo',C.a.eq,B.a.eq,O.a.eq],
  ['Capital necesario (caja mínima)',$2(C.a.capital),$2(B.a.capital),$2(O.a.capital)]],
 [3.4,1.6,1.6,1.6],'Elaboración propia. El resultado del modelo ajustado se presenta bajo costeo variable.',{negr:[2,5],sombra:[5]}));
c.push(...figura('Costos del año: modelo actual frente al modelo ajustado','fig2.png','Elaboración propia. En el modelo actual los costos no cambian con el escenario; en el ajustado, la porción variable crece con las ventas mientras la fija se mantiene casi constante.'));
c.push(P('La Tabla 5 y la Figura 2 responden la pregunta central del trabajo. Cuando los costos se proyectan con inductores, **los costos totales sí dependen del escenario**: pasan de '+$(C.a.ct)+' en el conservador a '+$(O.a.ct)+' en el optimista. Los costos fijos casi no se mueven (varían sólo por el escalón de Google Workspace), mientras que los variables se multiplican por '+es(O.a.cv/C.a.cv,1)+'. Con ello cambia también la lectura de los resultados: el escenario conservador, que en el modelo actual dejaba una ganancia de '+$(C.o.res)+', en realidad produce una **pérdida de '+$(-C.a.res)+'**; el escenario base conserva una utilidad, pero '+pc(1-B.a.res/B.o.res)+' menor de la estimada; y el capital que hay que aportar para no quedarse sin caja pasa de entre '+$(O.o.capital)+' y '+$(C.o.capital)+' a entre '+$(B.a.capital)+' y '+$(C.a.capital)+'.'));
c.push(...figura('Costo total por negocio activo a lo largo del año','fig3.png','Elaboración propia con el modelo ajustado. El costo unitario cae a medida que los costos fijos se reparten entre más negocios.'));
c.push(P('La Figura 3 muestra el otro efecto de las proyecciones de ventas sobre los costos: las **economías de escala**. El costo total por negocio activo al cierre del año es de '+$2(C.a.cuF)+' en el escenario conservador, '+$2(B.a.cuF)+' en el base y '+$2(O.a.cuF)+' en el optimista. Como el precio es de $10, en el escenario conservador queda poco más de $3,70 de margen por negocio aun en el último mes, mientras que en el optimista quedan más de $6. El costo unitario es, por tanto, una consecuencia del volumen y no un dato fijo: fijar el precio a partir de un costo unitario sin indicar a qué volumen corresponde es un error frecuente que el presupuesto flexible evita.'));

c.push(H2('Análisis costo–volumen–utilidad'));
c.push(P('El punto de equilibrio en su forma clásica se obtiene dividiendo los costos fijos entre el margen de contribución unitario: '+$2(C.a.cfEst)+' ÷ '+$2(B.a.mcu)+' = **'+es(C.a.pe,1)+' negocios pagando**. Esta cifra, sin embargo, supone una empresa que no crece. En un SaaS que capta clientes cada mes, cada negocio nuevo consume $8,80 (alta más soporte en el mes gratis) antes de pagar, de modo que el equilibrio de una empresa en crecimiento debe incluir ese costo de adquisición:'));
c.push(P0('*PE con crecimiento = (Costos fijos + Nuevos del mes × costo de alta y prueba) ÷ Margen de contribución unitario*',{alignment:AlignmentType.CENTER}));
c.push(...tabla('Indicadores costo–volumen–utilidad al cierre del año (septiembre de 2027)',
 ['Indicador','Conservador','Base','Optimista'],
 [['Margen de contribución unitario',$2(C.a.mcu),$2(B.a.mcu),$2(O.a.mcu)],
  ['Costos fijos mensuales',$2(C.a.cfEst),$2(B.a.cfEst),$2(O.a.cfEst)],
  ['Punto de equilibrio sin crecimiento (negocios)',es(C.a.pe,1),es(B.a.pe,1),es(O.a.pe,1)],
  ['Punto de equilibrio con la captación del período',es(C.a.peCrec,1),es(B.a.peCrec,1),es(O.a.peCrec,1)],
  ['Negocios pagando',es(C.a.pagF,1),es(B.a.pagF,1),es(O.a.pagF,1)],
  ['Margen de seguridad',pc(C.a.ms,1),pc(B.a.ms,1),pc(O.a.ms,1)],
  ['Grado de apalancamiento operativo',es(C.a.gao,2),es(B.a.gao,2),es(O.a.gao,2)],
  ['CAC completo por negocio que paga',$2(cacPag(C)),$2(cacPag(B)),$2(cacPag(O))],
  ['LTV sobre margen de contribución',$2(ltvMC(C)),$2(ltvMC(B)),$2(ltvMC(O))],
  ['Relación LTV / CAC',es(ltvMC(C)/cacPag(C),1)+' veces',es(ltvMC(B)/cacPag(B),1)+' veces',es(ltvMC(O)/cacPag(O),1)+' veces']],
 [3.4,1.6,1.6,1.6],'Elaboración propia. La captación usada en el punto de equilibrio con crecimiento es el promedio de los últimos tres meses. El GAO se calcula como margen de contribución ÷ utilidad operativa del mes 12. El CAC completo incluye alta, tarjetas, publicidad e influencer, dividido entre los negocios que pasan a pagar.'));
c.push(P('Tres lecturas se desprenden de la Tabla 6. Primero, el punto de equilibrio **depende del ritmo de crecimiento**: mientras más negocios se captan, más alto es el número de clientes que pagan necesarios para no perder, porque el alta se paga por adelantado. Segundo, el escenario conservador tiene un margen de seguridad de sólo '+pc(C.a.ms,0)+' y un GAO cercano a 3: una caída de 10 % en las ventas reduciría su utilidad mensual en casi 30 %. Es la situación típica de una empresa con costos mayoritariamente fijos operando cerca de su equilibrio. Tercero, aun con el CAC completo, la relación LTV/CAC se mantiene por encima de 3 veces en los tres escenarios, que es el umbral que Skok (2013) considera saludable; el negocio es viable, pero mucho menos holgado de lo que sugería el modelo original (35 veces en el escenario base).'));
c.push(...figura('Caja acumulada según el escenario, con el modelo ajustado','fig4.png','Elaboración propia. La línea en $0 marca el punto en que la empresa ha recuperado todo lo invertido.'));
c.push(P('La Figura 4 traduce el análisis a liquidez. En los tres escenarios la caja cae durante el primer trimestre, porque es cuando se concentran la captación, las altas y los meses gratis. El escenario optimista recupera la inversión en marzo de 2027 y el base en junio de 2027; el conservador termina el año todavía '+$(-C.a.res)+' por debajo de cero, aunque con flujo mensual positivo desde julio de 2027.'));

c.push(H2('Sensibilidad de los resultados'));
c.push(P('Como la proyección depende de supuestos comerciales inciertos, se midió cuánto cambia el resultado anual del escenario base ajustado cuando se modifican el precio y la tasa de cancelación (Tabla 7).'));
c.push(...tabla('Resultado anual del escenario base ajustado según precio y cancelación mensual',
 ['Precio mensual','Cancelación 3 %','Cancelación 5 %','Cancelación 8 %'],
 ['8','10','12'].map(p=>['$'+p,...D.sens[p].map(v=>$(v))]),
 [2.4,2.2,2.2,2.2],'Elaboración propia. Con conversión de 50 %, 60 %, 70 % y 80 % el resultado anual sería de '+D.sensConv.map(x=>$(x[1])).join(', ').replace(/, ([^,]*)$/,' y $1')+', respectivamente.'));
c.push(P('El precio es la variable más poderosa: cada dólar adicional por mes agrega unos $580 al resultado del año, porque casi todo el precio es margen de contribución. Un precio de $8 con cancelación de 8 % lleva el escenario base a pérdida. La conversión también pesa: si sólo la mitad de quienes prueban pasan a pagar, el año apenas cubre sus costos. Estas son, por consiguiente, las variables que la gerencia debe vigilar con mayor frecuencia.'));

c.push(H2('Estado de resultados proyectado del escenario base'));
c.push(P('Para cerrar el análisis se presenta el estado de resultados proyectado del escenario base bajo **costeo variable** (Tabla 8). En una empresa de software sin inventarios, el costeo variable y el costeo absorbente producen la misma utilidad, porque no hay costos fijos que queden "guardados" en el inventario final (Ramírez Padilla, 2013); la diferencia está en la presentación. El costeo variable es más útil para decidir, porque separa lo que cambia con las ventas de lo que no.'));
const k=B.comp;
const cfOp=k.g1+k.ws+k.mant+k.tel+k.dom+k.impr;
c.push(...tabla('Estado de resultados proyectado bajo costeo variable, escenario base (octubre de 2026 a septiembre de 2027)',
 ['Concepto','Parcial','Total'],
 [['Ingresos por suscripciones','',$2(k.ing)],
  ['Costos variables','',''],
  ['   Configuración y transporte de altas',$2(k.alta),''],
  ['   Soporte a negocios activos',$2(k.sop),''],
  ['   Tributo municipal y costo de cobro',$2(k.trib),'('+$2(k.cv)+')'],
  ['Margen de contribución','',$2(k.ing-k.cv)],
  ['Costos fijos de operación','',''],
  ['   Mantenimiento y desarrollo',$2(k.mant),''],
  ['   Google One y Google Workspace',$2(k.g1+k.ws),''],
  ['   Teléfono e internet',$2(k.tel),''],
  ['   Dominio (amortización)',$2(k.dom),''],
  ['   Reserva para imprevistos',$2(k.impr),'('+$2(cfOp)+')'],
  ['Costos fijos de venta','',''],
  ['   Tarjetas de presentación',$2(k.tar),''],
  ['   Publicidad en Instagram',$2(k.ads),''],
  ['   Influencer',$2(k.inf),'('+$2(k.tar+k.ads+k.inf)+')'],
  ['Utilidad operativa antes de impuesto sobre la renta','',$2(k.ing-k.ct)]],
 [5,2,2],'Elaboración propia con el modelo ajustado. No incluye impuesto sobre la renta ni la remuneración del fundador por dirección, que deberían agregarse al formalizar la empresa.',{negr:[0,5,16],izq:[]}));
c.push(P('El estado muestra que, con una razón de margen de contribución de '+pc(B.a.mcRatio,1)+', **el principal costo de bookeaa no es la tecnología, sino el tiempo de las personas**: configuración y soporte suman '+$(k.alta+k.sop)+' de los '+$(k.ct)+' de costos del año ('+pc((k.alta+k.sop)/k.ct)+'), mientras que las herramientas digitales no llegan a $40. Es exactamente el tipo de costo que el modelo original no veía.'));

// ---------- CONCLUSIONES ----------
c.push(H1('Conclusiones y recomendaciones',1));
c.push(H2('Conclusiones'));
c.push(P('La herramienta de bookeaa proyecta bien las ventas: parte de unidades, sigue el embudo de captación, conversión y cancelación, y permite comparar escenarios. Su debilidad está del lado de los costos. Al modelarlos todos como fijos, funciona como un presupuesto estático y produce una conclusión engañosa: que vender más no cuesta nada. Al reconstruir la proyección con un presupuesto flexible, se verifica que en un SaaS de atención personalizada **los costos sí cambian con las ventas**, porque el alta y el soporte de cada negocio consumen horas de trabajo, y porque los tributos y los cobros se calculan sobre los ingresos.'));
c.push(P('Los distintos escenarios de ventas afectan a los costos de tres maneras. En el **total**, los costos del año van de '+$(C.a.ct)+' a '+$(O.a.ct)+' según el escenario. En el **costo unitario**, ocurre lo contrario: a mayor volumen, el costo por negocio baja de '+$2(C.a.cuF)+' a '+$2(O.a.cuF)+' gracias a la dilución de los costos fijos. Y en el **riesgo**, el escenario conservador opera cerca de su equilibrio, con un margen de seguridad de '+pc(C.a.ms)+' y un apalancamiento operativo cercano a 3, por lo que cualquier desviación de las ventas se amplifica en la utilidad. Corregir el tratamiento de los costos convierte la ganancia de '+$(C.o.res)+' del escenario conservador en una pérdida de '+$(-C.a.res)+' y multiplica por cinco o más el capital inicial necesario.'));
c.push(P('El negocio sigue siendo viable: el margen de contribución unitario es alto ('+pc(B.a.mcu/10)+' del precio) y la relación entre el valor de vida del cliente y su costo de adquisición supera 3 veces en todos los escenarios. Pero su viabilidad depende, sobre todo, de tres variables que la gerencia controla sólo en parte: la tasa de conversión, la tasa de cancelación y el precio.'));
c.push(H2('Recomendaciones'));
[
 '**Convertir la herramienta en un presupuesto flexible.** Agregar a los supuestos las horas de alta por negocio, las horas de soporte por negocio activo, la tarifa horaria y el transporte por visita, para que los costos variables se calculen solos en cada escenario.',
 '**Valorar el tiempo del fundador.** Aunque no se pague en efectivo, registrar las horas dedicadas a configurar, dar soporte, vender y desarrollar, y asignarles una tarifa de mercado. Es el costo más importante de la empresa y la base para decidir cuándo contratar.',
 '**Llevar dos estados por separado.** Mantener el flujo de caja (útil para saber cuánto capital aportar) y agregar un estado de resultados por devengo, con el dominio y las tarjetas amortizados, para medir la rentabilidad real de cada mes.',
 '**Incluir los tributos desde ahora.** Definir con un asesor tributario el régimen aplicable (impuesto municipal, IVA, IGTF e impuesto sobre la renta) y cargar sus alícuotas en la herramienta. Decidir si el precio de $10 incluye o no el IVA.',
 '**Medir el CAC y el LTV de forma completa.** Calcular el CAC con todos los costos de venta y alta, dividido entre los negocios que pagan, y el LTV sobre el margen de contribución. Revisar la relación LTV/CAC cada mes.',
 '**Reducir el costo de alta.** La configuración y el transporte son el costo variable más alto. Un formulario de autoservicio con plantillas listas, o visitas sólo a los prospectos calificados, puede bajarlo de forma significativa y mejorar el punto de equilibrio con crecimiento.',
 '**Revisar el precio.** La sensibilidad muestra que cada dólar adicional de precio agrega cerca de $580 al año. Conviene evaluar un plan anual con descuento, que además reduce la cancelación y adelanta la caja.',
 '**Vigilar los umbrales de las herramientas gratuitas.** Monitorear el uso de las cuotas de Google Apps Script, el espacio de Google One y el plan de Render, y presupuestar con anticipación los escalones de costo.',
 '**Asegurar el capital de trabajo.** Prever un aporte de entre '+$(B.a.capital)+' y '+$(C.a.capital)+', no de entre '+$(B.o.capital)+' y '+$(C.o.capital)+' como indica la herramienta actual, para cubrir el primer trimestre en el escenario base o conservador.',
 '**Comparar lo presupuestado con lo real cada mes.** Analizar las variaciones separando el efecto del volumen (más o menos negocios), del precio y de la eficiencia (horas por negocio), para ajustar los supuestos con datos propios y avanzar hacia un costeo basado en actividades.',
].forEach(t=>c.push(LI(t,'rec')));

// ---------- REFERENCIAS ----------
c.push(H1('Referencias',1));
[
 'bookeaa. (2026). *Costos y proyección de ventas* [Modelo de proyección interactivo no publicado]. Repositorio del proyecto bookeaa.',
 'Consejo de Normas Internacionales de Contabilidad. (2004). *Norma Internacional de Contabilidad 38: Activos intangibles*. Fundación IFRS.',
 'Consejo de Normas Internacionales de Contabilidad. (2015). *Norma Internacional de Información Financiera para las Pequeñas y Medianas Entidades (NIIF para las PYMES)*. Fundación IFRS.',
 'Decreto con Rango, Valor y Fuerza de Ley de Reforma del Decreto con Rango, Valor y Fuerza de Ley que Establece el Impuesto a las Grandes Transacciones Financieras. (2022, 25 de febrero). *Gaceta Oficial de la República Bolivariana de Venezuela*, N.º 6.687 (Extraordinario).',
 'Garrison, R. H., Noreen, E. W., y Brewer, P. C. (2007). *Contabilidad administrativa* (11.ª ed.). McGraw-Hill Interamericana.',
 'Horngren, C. T., Datar, S. M., y Rajan, M. V. (2012). *Contabilidad de costos: Un enfoque gerencial* (14.ª ed.). Pearson Educación.',
 'Kaplan, R. S., y Cooper, R. (1999). *Coste y efecto: Cómo usar el ABC, el ABM y el ABB para mejorar la gestión, los procesos y la rentabilidad*. Gestión 2000.',
 'Ley que Establece el Impuesto al Valor Agregado. (2014, 18 de noviembre). *Gaceta Oficial de la República Bolivariana de Venezuela*, N.º 6.152 (Extraordinario).',
 'Polimeni, R. S., Fabozzi, F. J., Adelberg, A. H., y Kole, M. A. (1997). *Contabilidad de costos: Conceptos y aplicaciones para la toma de decisiones gerenciales* (3.ª ed.). McGraw-Hill Interamericana.',
 'Ramírez Padilla, D. N. (2013). *Contabilidad administrativa: Un enfoque estratégico para competir* (9.ª ed.). McGraw-Hill.',
 'Skok, D. (2013). *SaaS metrics 2.0: A guide to measuring and improving what matters*. For Entrepreneurs. https://www.forentrepreneurs.com/saas-metrics-2/',
].forEach(t=>c.push(ref(t)));

// ---------- ANEXO ----------
c.push(H1('Anexo A',1),cen('**Proyección mensual del escenario base con el modelo ajustado**'));
c.push(...tabla('Proyección mensual del escenario base, modelo ajustado (USD)',
 ['Mes','Nuevos','Pagando','Ingresos','C. fijos','C. variables','Flujo','Caja'],
 B.mes.map(m=>[m.et,es(m.nuevos),es(m.pag,1),$2(m.ing),$2(m.cf),$2(m.cv),$2(m.flujo),$2(m.caja)]),
 [1,0.9,1,1.25,1.15,1.25,1.2,1.25],'Elaboración propia. Los negocios pagando incluyen decimales porque resultan de aplicar las tasas de conversión y de cancelación.',{size:17}));

const doc=new Document({creator:'Estudiante',title:'Análisis de la estructura de costos: caso bookeaa',
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
