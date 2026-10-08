const fs=require('fs');
const {Document,Packer,Paragraph,TextRun,AlignmentType,HeadingLevel,LevelFormat,BorderStyle,Footer,PageNumber}=require('docx');
const D=require('../calculos/datos.json');
const B=D.base,C=D.conservador,O=D.optimista,PA=D.par,pr=PA.precio;
const es=(v,d=0)=>{const s=Math.abs(v).toFixed(d).split('.');s[0]=s[0].replace(/\B(?=(\d{3})+(?!\d))/g,'.');return (v<0?'−':'')+s.join(',')};
const $=(v,d=0)=>(v<0?'−':'')+'$'+es(Math.abs(v),d);
const pe3=es(Math.round(B.f3.peC/5)*5);
const runs=t=>{const o=[];const re=/(\*\*[^*]+\*\*|\*[^*]+\*)/g;let i=0,m;while((m=re.exec(t))){if(m.index>i)o.push(new TextRun(t.slice(i,m.index)));const s=m[0];o.push(s.startsWith('**')?new TextRun({text:s.slice(2,-2),bold:true}):new TextRun({text:s.slice(1,-1),italics:true}));i=m.index+s.length}if(i<t.length)o.push(new TextRun(t.slice(i)));return o};
const P=(t,o={})=>new Paragraph({children:runs(t),spacing:{after:140,line:300},alignment:AlignmentType.JUSTIFIED,...o});
const H1=t=>new Paragraph({heading:HeadingLevel.HEADING_1,children:[new TextRun(t)],spacing:{before:120,after:160}});
const H2=t=>new Paragraph({heading:HeadingLevel.HEADING_2,children:[new TextRun(t)],spacing:{before:320,after:100},keepNext:true,border:{bottom:{style:BorderStyle.SINGLE,size:6,color:'0F0F0E',space:4}}});
const meta=t=>new Paragraph({children:[new TextRun({text:t,color:'5B5B57',size:20})],spacing:{after:120},keepNext:true});
const LI=t=>new Paragraph({numbering:{reference:'b',level:0},children:runs(t),spacing:{after:80,line:280}});
const ETQ=t=>new Paragraph({children:[new TextRun({text:t.toUpperCase(),bold:true,size:18,color:'5B5B57',characterSpacing:40})],spacing:{before:120,after:60},keepNext:true});
const c=[];
c.push(H1('Guion de la presentación'));
c.push(P('Proyecto final de Contabilidad VI · Estructura de costos de bookeaa en tres fases. Duración total estimada: **10 a 12 minutos**, más preguntas. Las cifras están modificadas por confidencialidad; conviene decirlo una vez, al presentar el negocio.'));
c.push(P('El texto entre comillas es lo que se dice; puede leerse de base y decirse con palabras propias. Los apartados «Señalar» indican qué mostrar en la diapositiva mientras se habla. Repartan las diapositivas entre los expositores como prefieran (por ejemplo, 1 a 3 y 4 a 6).'));
const D_=[
 {n:1,t:'Portada',min:'1 minuto',dec:[
  '«Buenos días, profesora y compañeros. Nosotros vamos a presentar el análisis de la estructura de costos de bookeaa, una empresa de software que funciona por suscripción.»',
  '«La pregunta que guía todo el trabajo es: ¿cómo debe construirse la estructura de costos de una empresa de este tipo, y cómo cambian sus costos según lo que vendamos? Para responderla, planteamos la estructura en tres fases, que vamos a recorrer en esta presentación.»'],
  sen:['El título: las tres fases son la idea central de toda la exposición.']},
 {n:2,t:'Un negocio por suscripción',min:'1 minuto y medio a 2 minutos',dec:[
  '«bookeaa es una plataforma digital para que salones de belleza, barberías y centros de estética reciban las reservas de sus clientes en línea. El negocio contrata el servicio y paga una cuota mensual.»',
  '«El modelo funciona así: cada negocio tiene un **mes de prueba sin costo** y después paga una cuota fija de **'+$(pr)+' al mes**. Nuestra meta es incorporar **'+PA.meta+' negocios en el primer trimestre**. Queremos aclarar que, por confidencialidad, las cifras que vamos a mostrar fueron modificadas, pero mantienen las proporciones reales del negocio.»',
  '«Algo importante de este modelo es cómo se proyectan las ventas: no se parte del dinero, sino de las **unidades**. Primero se incorporan negocios; de los que prueban, el 70 % pasa a pagar; cada mes se retira el 5 % de los que pagan; y el ingreso del mes es el número de clientes que pagan por la cuota. Así cada supuesto se puede comparar después con la realidad.»'],
  sen:['Las tres tarjetas de la derecha (1 mes, '+$(pr)+', '+PA.meta+').','Los cuatro pasos de la proyección, de izquierda a derecha.']},
 {n:3,t:'La ruta en tres fases',min:'2 minutos',dec:[
  '«Nuestro enfoque es que la estructura de costos no es algo fijo: se diseña, se pone a prueba y se perfecciona. Por eso la organizamos en tres fases.»',
  '«La **fase 1** es la estructura base, de octubre a diciembre de 2026. Es una estructura liviana: los costos se presupuestan como montos mensuales, porque al empezar todavía no hay historia que permita medir cómo se comporta cada costo. Es un **presupuesto estático**.»',
  '«La **fase 2** comienza al cerrar el primer trimestre. Con los datos reales clasificamos cada costo en **fijo, variable o escalonado**, medimos cuánto cuesta incorporar y atender a cada cliente, aplicamos el criterio de devengo e incluimos los tributos sobre las ventas. Aquí pasamos a un **presupuesto flexible** y al análisis costo–volumen–utilidad.»',
  '«La **fase 3** es la estructura objetivo para el segundo año: incorpora la remuneración de la dirección, servicios contables externos y procesos más eficientes, y se organiza por actividades, siguiendo el **costeo ABC**.»'],
  sen:['Cada tarjeta mientras se explica su fase, y la herramienta de costos que aparece abajo en cada una.']},
 {n:4,t:'Fase 2: costos fijos y variables',min:'2 minutos y medio',dec:[
  '«En la fase 1 los costos del trimestre son iguales en los tres escenarios de ventas, unos **'+$(B.q1.ct)+'**, porque se presupuestan por partidas.»',
  '«Al pasar a la fase 2 aparecen los **costos variables**: la incorporación de cada negocio nuevo, la atención mensual a cada cliente y los tributos sobre las ventas. En el gráfico se ve el efecto: la parte azul, los costos fijos, es prácticamente igual en los tres escenarios; pero la parte naranja, los variables, va de **'+$(C.r29.cv)+'** en el escenario conservador a **'+$(O.r29.cv)+'** en el optimista. Es decir, ahora los costos sí siguen a las ventas.»',
  '«Con esta estructura, cada cliente que paga deja un **margen de contribución de '+$(B.a.mcu,2)+'**, el '+es(B.a.mcu/pr*100)+' % de la cuota. El punto de equilibrio clásico es de unos '+es(B.a.pe)+' negocios, pero como cada negocio nuevo cuesta dinero antes de empezar a pagar, en una empresa que crece el equilibrio sube a unos **'+es(B.a.peCrec)+' negocios** en el escenario base.»',
  '«Y el dato de abajo es el riesgo: en el escenario conservador el **grado de apalancamiento operativo es de '+es(C.a.gao,1)+'**. Eso significa que si las ventas cambian un 10 %, la utilidad cambia cerca de un '+es(C.a.gao*10)+' %. Por eso, si las ventas son bajas, la empresa debe mantener una estructura austera.»'],
  sen:['Las barras azules (fijos, casi iguales) frente a las naranjas (variables, crecen).','Las tres tarjetas de la derecha, de arriba hacia abajo.']},
 {n:5,t:'Fase 3: la estructura objetivo',min:'2 minutos',dec:[
  '«La fase 3 es la estructura a la que queremos llegar en el segundo año. A la izquierda están sus partidas: como **costos variables**, la incorporación asistida de cada negocio, las visitas comerciales, la atención por cliente y los tributos; como **costos fijos**, la remuneración de la dirección, el mantenimiento de la plataforma, la infraestructura en la nube, que es un costo escalonado, los servicios contables y el marketing.»',
  '«Esta estructura es más completa y también más eficiente: la incorporación pasa a un esquema de autoservicio guiado y la atención se apoya en guías, así que el **costo variable por cliente baja de '+$(B.a.cvu,2)+' a '+$(B.f3.cvu,2)+'**. En el escenario base, el segundo año cierra con un resultado de **'+$(B.f3.res)+'**, y el valor de cada cliente es '+es(B.f3.ltv/B.f3.cac,1)+' veces lo que cuesta captarlo.»',
  '«Como esta fase aumenta los costos fijos, recomendamos activarla **por volumen y no por fecha**: cuando la cartera supere su punto de equilibrio, de unos '+pe3+' negocios pagando. Es una aplicación directa del análisis costo–volumen–utilidad a una decisión de la empresa.»'],
  sen:['Las dos listas de la izquierda (naranja: variables; azul: fijos).','La tarjeta oscura «Por volumen» al cerrar.']},
 {n:6,t:'Conclusiones',min:'1 minuto y medio a 2 minutos',dec:[
  '«Para cerrar, respondemos la pregunta del inicio. Las proyecciones de ventas afectan a los costos de tres maneras.»',
  '«**En el total**: desde la fase 2, los costos crecen con el número de clientes por su parte variable. **En el costo unitario**: ocurre lo contrario; mientras más clientes, menor es el costo por cliente, porque los costos fijos se reparten entre más negocios: en la fase 3 llega a '+$(B.cu.f3,2)+' en el escenario base y '+$(O.cu.f3,2)+' en el optimista. **En el riesgo**: con menos ventas la empresa opera cerca del punto de equilibrio y necesita una estructura austera.»',
  '«Nuestras recomendaciones son cuatro: registrar desde el inicio las horas que dedicamos a cada cliente; aplicar el presupuesto flexible y compararlo cada mes con lo real; activar la fase 3 por volumen; y seguir de cerca la cuota, la conversión y la cancelación, que son las variables que más mueven el resultado.»',
  '«Muchas gracias. Quedamos atentos a sus preguntas.»'],
  sen:['Las tres tarjetas de conclusiones, una por una.','Las cuatro recomendaciones numeradas.']},
];
D_.forEach(d=>{c.push(H2('Diapositiva '+d.n+' · '+d.t));c.push(meta('Tiempo: '+d.min+'   ·   Expositor: [nombre]'));
  c.push(ETQ('Qué decir'));d.dec.forEach(t=>c.push(P(t)));c.push(ETQ('Señalar'));d.sen.forEach(t=>c.push(LI(t)));});
c.push(H2('Posibles preguntas y cómo responderlas'));
[
 ['¿Por qué en la fase 1 todos los costos se tratan como fijos?','Porque al iniciar no hay datos para medir cómo se comporta cada costo. Presupuestar por partidas es práctico para arrancar; al cierre del trimestre, con información real, se pasa al presupuesto flexible.'],
 ['¿Cuál es la diferencia entre el punto de equilibrio clásico y el «con crecimiento»?','El clásico divide los costos fijos entre el margen de contribución unitario ('+es(B.a.pe)+' negocios). El que incluye el crecimiento suma el costo de incorporar a los negocios nuevos del mes, que todavía no pagan; por eso es mayor ('+es(B.a.peCrec)+' en el escenario base).'],
 ['¿Por qué usan costeo variable y no absorbente?','Porque la empresa no tiene inventarios: ambos métodos dan la misma utilidad. El costeo variable se prefiere porque separa lo que cambia con las ventas de lo que no, y eso es lo que se necesita para analizar los escenarios.'],
 ['¿Qué es el grado de apalancamiento operativo?','Es el margen de contribución dividido entre la utilidad operativa. Indica cuántas veces se amplifica en la utilidad un cambio porcentual en las ventas. Es alto cuando la empresa opera cerca de su punto de equilibrio.'],
 ['¿Cómo se trata el desarrollo de la plataforma?','Bajo la NIIF para las PYMES, sección 18, los desembolsos de investigación y desarrollo generados internamente se reconocen como gasto del período. Por eso se registran como una partida separada de mantenimiento y desarrollo.'],
 ['¿Por qué las cifras son ilustrativas?','Por confidencialidad de la empresa. Se modificaron precios, costos y captación, pero se mantuvieron las proporciones, así que las conclusiones son las mismas.'],
].forEach(([q,a])=>{c.push(new Paragraph({children:[new TextRun({text:q,bold:true})],spacing:{before:160,after:60},keepNext:true}));c.push(P(a));});
const doc=new Document({styles:{default:{document:{run:{font:'Arial',size:23}}},paragraphStyles:[
 {id:'Heading1',name:'Heading 1',basedOn:'Normal',next:'Normal',quickFormat:true,run:{font:'Arial Narrow',size:44,bold:true,color:'0F0F0E'},paragraph:{outlineLevel:0}},
 {id:'Heading2',name:'Heading 2',basedOn:'Normal',next:'Normal',quickFormat:true,run:{font:'Arial Narrow',size:30,bold:true,color:'0F0F0E'},paragraph:{outlineLevel:1}}]},
 numbering:{config:[{reference:'b',levels:[{level:0,format:LevelFormat.BULLET,text:'•',alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:540,hanging:270}}}}]}]},
 sections:[{properties:{page:{size:{width:12240,height:15840},margin:{top:1300,bottom:1300,left:1440,right:1440}}},
  footers:{default:new Footer({children:[new Paragraph({alignment:AlignmentType.RIGHT,children:[new TextRun({text:'bookeaa · Guion de la presentación · ',color:'5B5B57',size:18}),new TextRun({children:[PageNumber.CURRENT],color:'5B5B57',size:18})]})]})},
  children:c}]});
Packer.toBuffer(doc).then(b=>{fs.writeFileSync('Guion_Presentacion_bookeaa.docx',b);console.log('ok')});
