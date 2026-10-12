const fs=require('fs');
const {Document,Packer,Paragraph,TextRun,AlignmentType,HeadingLevel,LevelFormat,BorderStyle,Footer,PageNumber}=require('docx');
const D=require('../calculos/datos.json');
const es=(v,d=0)=>{const s=Math.abs(v).toFixed(d).split('.');s[0]=s[0].replace(/\B(?=(\d{3})+(?!\d))/g,'.');return (v<0?'−':'')+s.join(',')};
const pc=(v,d=1)=>es(v*100,d)+' %';
const runs=t=>{const o=[];const re=/(\*\*[^*]+\*\*|\*[^*]+\*)/g;let i=0,m;while((m=re.exec(t))){if(m.index>i)o.push(new TextRun(t.slice(i,m.index)));const s=m[0];o.push(s.startsWith('**')?new TextRun({text:s.slice(2,-2),bold:true}):new TextRun({text:s.slice(1,-1),italics:true}));i=m.index+s.length}if(i<t.length)o.push(new TextRun(t.slice(i)));return o};
const P=(t,o={})=>new Paragraph({children:runs(t),spacing:{after:140,line:300},alignment:AlignmentType.JUSTIFIED,...o});
const H1=t=>new Paragraph({heading:HeadingLevel.HEADING_1,children:[new TextRun(t)],spacing:{before:120,after:160}});
const H2=t=>new Paragraph({heading:HeadingLevel.HEADING_2,children:[new TextRun(t)],spacing:{before:320,after:100},keepNext:true,border:{bottom:{style:BorderStyle.SINGLE,size:6,color:'0F0F0E',space:4}}});
const meta=t=>new Paragraph({children:[new TextRun({text:t,color:'5B5B57',size:20})],spacing:{after:120},keepNext:true});
const LI=t=>new Paragraph({numbering:{reference:'b',level:0},children:runs(t),spacing:{after:80,line:280}});
const ETQ=t=>new Paragraph({children:[new TextRun({text:t.toUpperCase(),bold:true,size:18,color:'5B5B57',characterSpacing:40})],spacing:{before:120,after:60},keepNext:true});
const DD=require('./notas.cjs')(D,es,pc);
const c=[];
c.push(H1('Guion de la presentación'));
c.push(P('Proyecto final de Estadísticas y Probabilidades · Implementación de métodos cuantitativos en contabilidad. Duración total estimada: **14 a 16 minutos** para 8 diapositivas, más preguntas. Las cifras provienen de las asignaciones I, II y III y de los cálculos complementarios del informe.'));
c.push(P('El texto entre comillas es lo que se dice; puede leerse de base y decirse con palabras propias. Los apartados «Señalar» indican qué mostrar en la diapositiva mientras se habla. Se pueden repartir así: diapositivas 1 a 3, 4, 5 y 6, y 7 y 8.'));
DD.forEach(d=>{c.push(H2('Diapositiva '+d.n+' · '+d.t));c.push(meta('Tiempo: '+d.min+'   ·   Expositor: [nombre]'));c.push(ETQ('Qué decir'));d.dec.forEach(t=>c.push(P(t)));c.push(ETQ('Señalar'));d.sen.forEach(t=>c.push(LI(t)));});
c.push(H2('Posibles preguntas y cómo responderlas'));
[['¿Por qué se usa la distribución binomial para los defectos?','Porque el número de unidades defectuosas en un lote es un conteo de éxitos en n ensayos independientes, con probabilidad constante p. Aquí n es 200 y p es 0,03, de modo que la media es n por p, igual a 6.'],
 ['¿Qué es el coeficiente de variación y por qué se usa?','Es la desviación estándar dividida entre la media, expresada en porcentaje. Permite comparar la variabilidad de variables con unidades y magnitudes distintas, como salarios, ventas, minutos y defectos.'],
 ['¿Por qué dimensionar los compromisos fijos con el decil 1 y no con la media?','Porque el decil 1 es el nivel de ventas que se supera 9 de cada 10 días. Si los compromisos se calculan con la media, en muchos días las ventas no los cubren, sobre todo en una sucursal tan variable como Maracaibo.'],
 ['¿Qué supuesto tiene el intervalo del total mensual?','Supone que las ventas de días distintos son independientes y aplica la distribución normal a la suma de 30 días. Como las ventas de Maracaibo siguen un ciclo, es una referencia para armar escenarios y no una predicción.'],
 ['¿Qué es C en los costos de calidad?','Es el costo promedio de una unidad defectuosa (reproceso, descarte o garantía). No se dispone del monto real, por lo que los costos se expresan en múltiplos de C; con el dato, se convierten en cifras en bolívares.'],
 ['¿Cómo se relaciona esto con la auditoría?','La NIA 520 usa procedimientos analíticos, en los que se construye una expectativa y se acepta una diferencia tolerable, y la NIA 530 usa muestreo, en el que la tasa de desviación de una muestra se compara con una tasa tolerable. Ambos se apoyan en la dispersión y en la probabilidad.'],
 ['¿Qué limitaciones tiene el proyecto?','Las muestras son pequeñas, de la Asignación II se usaron las medidas resumen, los modelos suponen independencia y probabilidad constante, y los casos son de empresas distintas, por lo que la integración es metodológica.']
].forEach(([q,a])=>{c.push(new Paragraph({children:[new TextRun({text:q,bold:true})],spacing:{before:160,after:60},keepNext:true}));c.push(P(a));});
const doc=new Document({styles:{default:{document:{run:{font:'Arial',size:23}}},paragraphStyles:[
 {id:'Heading1',name:'Heading 1',basedOn:'Normal',next:'Normal',quickFormat:true,run:{font:'Arial Narrow',size:44,bold:true,color:'0F0F0E'},paragraph:{outlineLevel:0}},
 {id:'Heading2',name:'Heading 2',basedOn:'Normal',next:'Normal',quickFormat:true,run:{font:'Arial Narrow',size:30,bold:true,color:'0F0F0E'},paragraph:{outlineLevel:1}}]},
 numbering:{config:[{reference:'b',levels:[{level:0,format:LevelFormat.BULLET,text:'•',alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:540,hanging:270}}}}]}]},
 sections:[{properties:{page:{size:{width:12240,height:15840},margin:{top:1300,bottom:1300,left:1440,right:1440}}},
  footers:{default:new Footer({children:[new Paragraph({alignment:AlignmentType.RIGHT,children:[new TextRun({text:'Estadísticas y Probabilidades · Guion · ',color:'5B5B57',size:18}),new TextRun({children:[PageNumber.CURRENT],color:'5B5B57',size:18})]})]})},
  children:c}]});
Packer.toBuffer(doc).then(b=>{fs.writeFileSync('Guion_Presentacion_Proyecto_Estadisticas.docx',b);console.log('ok')});
