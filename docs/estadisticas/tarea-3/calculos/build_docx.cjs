// Informe Word de la Tarea 3: Arial 12, interlineado 1,5, márgenes de 2,54 cm (1440 DXA).
const fs=require('fs');
const {Document,Packer,Paragraph,TextRun,Table,TableRow,TableCell,WidthType,AlignmentType,ImageRun,Footer,PageNumber,BorderStyle,ShadingType,HeadingLevel,PageBreak,LevelFormat,TableLayoutType}=require('docx');
const FONT='Arial';
const runs=(t,base={})=>{const o=[];const re=/(\*\*[^*]+\*\*|\*[^*]+\*|\^\{[^}]+\})/g;let i=0,m;while((m=re.exec(t))){if(m.index>i)o.push(new TextRun({text:t.slice(i,m.index),...base}));const s=m[0];o.push(s.startsWith('^{')?new TextRun({...base,text:s.slice(2,-1),superScript:true}):s.startsWith('**')?new TextRun({...base,text:s.slice(2,-2),bold:true}):new TextRun({...base,text:s.slice(1,-1),italics:true}));i=m.index+s.length}if(i<t.length)o.push(new TextRun({text:t.slice(i),...base}));return o};
const LS=360; // 1,5 líneas
const P=(t,o={})=>new Paragraph({children:runs(t),alignment:AlignmentType.JUSTIFIED,spacing:{line:LS,after:0},...o});
const H1=t=>new Paragraph({heading:HeadingLevel.HEADING_1,spacing:{line:LS,before:120,after:0},keepNext:true,children:[new TextRun({text:t,bold:true})]});
const H2=t=>new Paragraph({heading:HeadingLevel.HEADING_2,spacing:{line:LS,before:60,after:0},keepNext:true,children:[new TextRun({text:t,bold:true})]});
const LI=(t,ref='b')=>new Paragraph({numbering:{reference:ref,level:0},alignment:AlignmentType.JUSTIFIED,spacing:{line:LS,after:0},children:runs(t)});
const cen=(t,o={})=>new Paragraph({alignment:AlignmentType.CENTER,spacing:{line:LS},children:runs(t,o)});
const thin={style:BorderStyle.SINGLE,size:4,color:'000000'},none={style:BorderStyle.NONE,size:0,color:'FFFFFF'};
let nt=0,nf=0;
function tabla(titulo,cab,filas,anchos,nota,opts={}){
  nt++;const W=9360,sum=anchos.reduce((a,b)=>a+b,0),cw=anchos.map(a=>Math.round(a/sum*W));cw[cw.length-1]+=W-cw.reduce((a,b)=>a+b,0);
  const izq=opts.izq||[0];
  const celda=(t,j,tipo,ri)=>new TableCell({width:{size:cw[j],type:WidthType.DXA},margins:{top:30,bottom:30,left:70,right:70},
    borders:{top:tipo==='h'?thin:none,bottom:(tipo==='h'||tipo==='last')?thin:{style:BorderStyle.SINGLE,size:2,color:'D9D9D9'},left:none,right:none},
    shading:(opts.sombra||[]).includes(ri)?{type:ShadingType.CLEAR,fill:'F2F2F2',color:'auto'}:undefined,
    children:[new Paragraph({keepNext:tipo!=='last'&&!opts.partir,keepLines:true,alignment:tipo==='h'?AlignmentType.CENTER:(izq.includes(j)?AlignmentType.LEFT:AlignmentType.CENTER),spacing:{line:240},
      children:runs(String(t),{size:opts.size||19,bold:(tipo==='h'||(opts.negr||[]).includes(ri))||undefined})})]});
  const rows=[new TableRow({tableHeader:true,cantSplit:true,children:cab.map((t,j)=>celda(t,j,'h',-1))}),...filas.map((f,i)=>new TableRow({cantSplit:true,children:f.map((t,j)=>celda(t,j,i===filas.length-1?'last':'b',i))}))];
  return [new Paragraph({spacing:{before:120,line:LS},keepNext:true,children:[new TextRun({text:'Tabla '+nt,bold:true})]}),
    new Paragraph({spacing:{line:LS},keepNext:true,children:[new TextRun({text:titulo,italics:true})]}),
    new Table({width:{size:W,type:WidthType.DXA},columnWidths:cw,layout:TableLayoutType.FIXED,rows}),
    new Paragraph({spacing:{before:60,after:120,line:240},alignment:AlignmentType.JUSTIFIED,children:[new TextRun({text:'Nota. ',italics:true,size:19}),...runs(nota,{size:19})]})];
}
function figura(titulo,file,nota,w=560,h=325){nf++;
  return [new Paragraph({spacing:{before:120,line:LS},keepNext:true,children:[new TextRun({text:'Figura '+nf,bold:true})]}),
    new Paragraph({spacing:{line:LS},keepNext:true,children:[new TextRun({text:titulo,italics:true})]}),
    new Paragraph({alignment:AlignmentType.CENTER,keepNext:true,children:[new ImageRun({type:'png',data:fs.readFileSync(file),transformation:{width:w,height:h}})]}),
    new Paragraph({spacing:{before:40,after:120,line:240},alignment:AlignmentType.JUSTIFIED,children:[new TextRun({text:'Nota. ',italics:true,size:19}),...runs(nota,{size:19})]})];}
const ref=t=>new Paragraph({children:runs(t),alignment:AlignmentType.LEFT,indent:{left:720,hanging:720},spacing:{line:LS}});
const c=[];
// ---- Portada
['República Bolivariana de Venezuela','Ministerio de Educación Superior','Universidad “José María Vargas”','Facultad de Administración, Gerencia y Contaduría','Cátedra: Estadísticas y Probabilidades'].forEach(t=>c.push(cen(t)));
c.push(...[1,2,3].map(()=>cen('')));
c.push(cen('**Asignación III**'),cen('**Análisis de probabilidad y dispersión: control de calidad en una planta manufacturera de Los Andes (Mérida)**'));
c.push(...[1,2,3].map(()=>cen('')));
c.push(new Paragraph({alignment:AlignmentType.RIGHT,spacing:{line:LS},children:runs('Samuel Herrera 30.580.323')}));
c.push(...[1,2].map(()=>cen('')));
c.push(cen('Caracas, octubre de 2026'));
c.push(new Paragraph({children:[new PageBreak()]}));
// ---- 1
c.push(H1('1. Introducción y contexto'));
c.push(P('Como gerente de control de calidad de una planta manufacturera de artículos electrónicos de consumo, ubicada en el área industrial de Los Andes (Mérida), debo responder al director ejecutivo cuántos defectos se esperan cada día, qué tan probable es que se acumulen y cuánto tarda el procesamiento de una unidad. Los datos históricos son: una tasa promedio de defectos de 3 % por unidad, lotes típicos de 200 unidades diarias y tiempos de procesamiento aproximadamente normales, con media de 45 minutos y desviación estándar de 8 minutos.'));
c.push(P('Se aplican los Temas 5 a 7: medidas de dispersión, conceptos generales de probabilidad y distribuciones de probabilidad. El número de unidades defectuosas por lote es un conteo de éxitos en 200 ensayos independientes con probabilidad constante, por lo que se modela con la distribución binomial (Levin & Rubin, 2004); el tiempo de procesamiento es una variable continua y simétrica, que se modela con la distribución normal (Triola, 2018). Se supone que las unidades son independientes entre sí y que la tasa de 3 % se mantiene estable. Los cálculos están en el archivo de Excel adjunto, con fórmulas que se recalculan; aquí se presentan los resultados y su interpretación.'));
// ---- Parte A
c.push(H1('2. Parte A: distribución binomial de los defectos'));
c.push(P('Sea X el número de unidades defectuosas en un lote, con X ~ Binomial(n = 200, p = 0,03). La probabilidad de exactamente k defectos es P(X = k) = C(n, k) · p^{k} · (1 − p)^{n − k} (Walpole et al., 2012). La Tabla 1 muestra la fórmula, el desarrollo y el resultado de cada cálculo.'));
c.push(...tabla('Cálculos de la distribución binomial (n = 200, p = 0,03)',['N.º','Cálculo','Fórmula','Desarrollo','Resultado'],
 [['1','Valor esperado','μ = n · p','200 × 0,03','**6 defectos**'],
  ['2','Varianza','σ² = n · p · (1 − p)','200 × 0,03 × 0,97','**5,82**'],
  ['3','Desviación estándar','σ = √(n · p · (1 − p))','√5,82','**2,4125**'],
  ['4','P(X = 5)','C(200, 5) · p^{5} · (1 − p)^{195}','2.535.650.040 × (2,43 × 10^{−8}) × 0,0026332','**0,1622**'],
  ['5','P(X ≥ 6)','1 − P(X ≤ 5)','1 − (0,0023 + 0,0140 + 0,0430 + 0,0879 + 0,1338 + 0,1622) = 1 − 0,4432','**0,5568**'],
  ['6','P(X ≤ 3)','P(0) + P(1) + P(2) + P(3)','0,0023 + 0,0140 + 0,0430 + 0,0879','**0,1472**']],
 [0.5,1.6,2.4,3.6,1.3],'Elaboración propia. Cálculos verificados en el archivo de Excel (hoja Binomial). Las probabilidades individuales se redondean a 4 decimales.',{izq:[1,2,3],size:18}));
c.push(P('**Interpretación (cálculos 1 a 3).** En un lote de 200 unidades se esperan 6 defectuosas, con una variación típica de 2,41 unidades. Cerca del 70 % de los lotes tiene entre 4 y 8 defectos (μ ± σ) y cerca del 94 % entre 2 y 10 (μ ± 2σ). Para control de calidad esto define el ruido normal del proceso: un lote con 6 defectos no es una alarma, pero uno con 14 o más (μ + 3σ = 13,24) ocurre solo en 0,31 % de los lotes y sí indica una causa asignable.'));
c.push(P('**Interpretación (cálculo 4).** Solo 16,22 % de los lotes tiene exactamente 5 defectuosas; el valor más probable es 6 (16,31 %). La probabilidad se reparte entre valores vecinos, de modo que ningún número exacto describe por sí solo un día cualquiera.'));
c.push(P('**Interpretación (cálculo 5).** En 55,68 % de los lotes se presentan 6 o más defectos: más de la mitad de los días la planta iguala o supera su promedio histórico. Con p = 3 %, superar el nivel esperado es lo normal, no la excepción.'));
c.push(P('**Interpretación (cálculo 6).** Solo 14,72 % de los lotes tiene 3 defectos o menos, es decir, un lote «limpio» ocurre cerca de una vez cada siete días. Para lograr lotes limpios con regularidad no basta vigilar: hay que reducir p.'));
// ---- Parte B
c.push(H1('3. Parte B: distribución normal de los tiempos de procesamiento'));
c.push(P('Sea T el tiempo de procesamiento en minutos, con T ~ Normal(μ = 45, σ = 8). Cada valor se estandariza con z = (x − μ)/σ y su probabilidad acumulada Φ(z) se lee en la tabla de la distribución normal estándar (Triola, 2018); en el Excel adjunto se reproduce esa tabla (hoja Tabla Z). La Tabla 2 resume los cálculos.'));
c.push(...tabla('Cálculos de la distribución normal (μ = 45 min, σ = 8 min)',['N.º','Cálculo','Desarrollo con la tabla Z','Resultado'],
 [['1','z para 37 min','(37 − 45)/8','**−1,00**'],['2','z para 53 min','(53 − 45)/8','**+1,00**'],
  ['3','z del percentil 10','Φ(−1,28) = 0,1003 ≈ 0,10','**−1,28** (exacto −1,2816)'],
  ['4','P(T < 37)','Φ(−1,00) = 1 − Φ(1,00) = 1 − 0,8413','**0,1587**'],
  ['5','P(T > 53)','1 − Φ(1,00) = 1 − 0,8413','**0,1587**'],
  ['6','P(37 < T < 53)','Φ(1,00) − Φ(−1,00) = 0,8413 − 0,1587','**0,6826** (exacto 0,6827)'],
  ['7','Tiempo del percentil 10','x = 45 + (−1,2816) × 8','**34,75 min**'],
  ['8','Tiempo del percentil 90','z = +1,2816; x = 45 + 1,2816 × 8','**55,25 min**']],
 [0.5,2.2,4,2.4],'Elaboración propia (Excel, hojas Normal y Tabla Z). Con el z redondeado de la tabla (±1,28) los tiempos serían 34,76 y 55,24 minutos; la diferencia de 0,01 se debe solo al redondeo.',{izq:[1,2],size:18}));
c.push(P('**Interpretación.** Los tiempos de 37 y 53 minutos están a una desviación estándar de la media, por lo que cerca de 68 % de las unidades (unas 137 de las 200 diarias) se procesa dentro de ese intervalo. Operativamente, 15,87 % (unas 32 unidades al día) tarda más de 53 minutos: son las unidades que generan cuellos de botella y horas extra. Otro 15,87 % tarda menos de 37 minutos; conviene verificar que esas unidades rápidas no omitan pasos de inspección.'));
c.push(P('El percentil 10 (34,75 minutos) indica que el 10 % más rápido, unas 20 unidades al día, se procesa 10,25 minutos (22,8 %) por debajo de la media: es una referencia realista de mejores prácticas. El percentil 90 (55,25 minutos) significa que 9 de cada 10 unidades terminan en ese tiempo o menos, valor útil como tiempo estándar de planificación para prometer fechas de entrega sin sobrecargar la línea.'));
// ---- Parte C
c.push(H1('4. Parte C: visualización gráfica y análisis'));
c.push(...figura('Distribución binomial del número de defectos por lote','fig_binomial.png','Elaboración propia a partir del Excel (hoja Binomial). Barras azules: P(X ≤ 3); naranja: P(X = 5); verdes: P(X ≥ 6), con la barra oscura en el valor esperado μ = 6.',560,324));
c.push(P('La Figura 1 muestra una distribución unimodal con ligera asimetría hacia la derecha: la cola de lotes con muchos defectos es más larga que la de lotes casi limpios. La mayor parte de la probabilidad se concentra entre 3 y 9 defectos. Las barras verdes, que suman 55,68 %, dejan ver que el riesgo no está en un solo día malo sino en que el nivel de 6 o más defectos es frecuente.'));
c.push(...figura('Distribución normal de los tiempos de procesamiento','fig_normal.png','Elaboración propia a partir del Excel (hoja Normal). Las líneas punteadas marcan la media y los intervalos de ±1σ, ±2σ y ±3σ; los triángulos rojos señalan los percentiles 10 y 90.',560,332));
c.push(P('La Figura 2 confirma una curva simétrica y acampanada. El 68,27 % central (en azul) se ubica entre 37 y 53 minutos; las colas naranja y verde (15,87 % cada una) son iguales por la simetría. Con ±2σ (29 a 61 minutos) se cubre 95,45 % de las unidades y con ±3σ (21 a 69 minutos), 99,73 %: un tiempo fuera de ese rango sería una señal clara de falla en el proceso.'));
// ---- Parte D
c.push(H1('5. Parte D: análisis comparativo de riesgos'));
c.push(...tabla('Comparación entre los defectos por lote y los tiempos de procesamiento',['Aspecto','Defectos por lote (binomial)','Tiempo de procesamiento (normal)'],
 [['Media','6 defectos','45 minutos'],['Desviación estándar','2,41 defectos','8 minutos'],['Coeficiente de variación','40,2 % (alto)','17,8 % (moderado)'],
  ['Forma de la distribución','Asimétrica a la derecha','Simétrica'],['Evento adverso','10 o más defectos: 8,08 %','Más de 53 min: 15,87 %'],['Evento crítico','14 o más defectos: 0,31 %','Más de 61 min: 2,28 %']],
 [2.2,3.2,3.4],'Elaboración propia. Coeficiente de variación = desviación estándar / media. Criterio de lectura: menos de 15 % bajo, de 15 % a 30 % moderado y más de 30 % alto.',{izq:[0],size:18,negr:[2]}));
c.push(P('**Hallazgos sobre calidad.** La planta produce en promedio 6 unidades defectuosas por lote, y más de la mitad de los lotes alcanza ese nivel o lo supera. Un lote con 10 o más defectos se presenta en 8,08 % de los días, aproximadamente uno de cada doce, lo que lo convierte en el principal riesgo de calidad.'));
c.push(P('**Riesgo de defectos.** La binomial muestra que el riesgo está en la cola derecha: aunque 14 defectos casi no ocurren (0,31 %), los lotes de 10 o más son frecuentes. **Eficiencia.** La normal indica que el proceso es estable y simétrico, pero 15,87 % de las unidades excede los 53 minutos.'));
c.push(P('**Predictibilidad.** Los tiempos son más predecibles que los defectos: su coeficiente de variación (17,8 %) es 2,3 veces menor que el de los defectos (40,2 %), y el 95 % de las unidades cae en un rango de 29 a 61 minutos. **Tasa de defectos.** Una tasa de 3 % equivale a 30.000 defectos por millón de unidades, un nivel sigma de aproximadamente 3,4 (z = 1,88 más el desplazamiento convencional de 1,5), lejos de la meta de seis sigma de 3,4 defectos por millón (Montgomery, 2013). Por lo tanto, no es aceptable para un fabricante que quiera competir en calidad: solo es tolerable como punto de partida.'));
// ---- Parte E
c.push(H1('6. Parte E: recomendaciones y conclusiones'));
c.push(H2('6.1 Recomendaciones'));
c.push(LI('**Control de calidad: gráfico de control np.** Implementar un gráfico np con límite superior de 13,24 defectos (acción desde 14) y una línea de alerta en 10 defectos (8,08 % de los lotes). Cada punto fuera de los límites debe activar un análisis de causa raíz (Montgomery, 2013).','r'));
c.push(LI('**Reducir la tasa de defectos de 3 % a 2 %.** Con inspección de componentes en la recepción, pruebas tempranas en la línea y mantenimiento preventivo, los defectos esperados bajan a 4 por lote (−33 %) y la probabilidad de 6 o más defectos baja de 55,68 % a 21,33 %.','r'));
c.push(LI('**Eficiencia de tiempo: reducir la variación.** Estandarizar instrucciones de trabajo y balancear estaciones para bajar σ de 8 a 6 minutos: la probabilidad de estar entre 37 y 53 minutos sube de 68,3 % a 81,8 % y la de superar 53 minutos baja de 15,9 % a 9,1 %. Mientras tanto, usar 55 minutos como tiempo estándar de planificación y 35 minutos como meta de mejores prácticas.','r'));
c.push(LI('**Áreas de riesgo crítico.** Vigilar tres focos: los lotes de 10 o más defectos (8,08 %), las unidades de más de 53 minutos (unas 32 diarias) y la posible relación entre ambos. Registrar el tiempo y el resultado de inspección de cada unidad por estación permitiría saber si las unidades más lentas o más rápidas son las defectuosas.','r'));
c.push(LI('**Competitividad.** Menos defectos y tiempos más predecibles reducen reprocesos, garantías y devoluciones, y permiten comprometer fechas de entrega con mayor confianza, que es lo que valoran los clientes de electrónica de consumo.','r'));
c.push(H2('6.2 Conclusiones'));
c.push(P('El análisis estadístico responde las preguntas del director ejecutivo con cifras concretas: se esperan 6 defectos por lote; la probabilidad de exactamente 5 es 16,22 % y la de 6 o más es 55,68 %; el 10 % más rápido se procesa en menos de 34,75 minutos; y 68,27 % de las unidades tarda entre 37 y 53 minutos. La distribución binomial revela que, con una tasa de 3 %, superar el promedio de defectos es lo habitual, mientras que la normal muestra un proceso estable pero con una cola lenta de 15,87 %. Los resultados justifican priorizar la reducción de la tasa de defectos y de la variación de los tiempos, con indicadores de control que permitan detectar a tiempo cuando el proceso se desvía.'));
// ---- Bibliografía
c.push(H1('Bibliografía'));
['Levin, R. I., & Rubin, D. S. (2004). *Estadística para administración y economía* (7.ª ed.). Pearson Educación.',
 'Montgomery, D. C. (2013). *Introduction to statistical quality control* (7th ed.). John Wiley & Sons.',
 'Triola, M. F. (2018). *Estadística* (12.ª ed.). Pearson Educación.',
 'Walpole, R. E., Myers, R. H., Myers, S. L., & Ye, K. (2012). *Probabilidad y estadística para ingeniería y ciencias* (9.ª ed.). Pearson Educación.'].forEach(t=>c.push(ref(t)));
const doc=new Document({creator:'Samuel Herrera',title:'Asignación III: Análisis de probabilidad y dispersión',
 styles:{default:{document:{run:{font:FONT,size:24}}},paragraphStyles:[
  {id:'Heading1',name:'Heading 1',basedOn:'Normal',next:'Normal',quickFormat:true,run:{font:FONT,size:24,bold:true,color:'000000'},paragraph:{outlineLevel:0}},
  {id:'Heading2',name:'Heading 2',basedOn:'Normal',next:'Normal',quickFormat:true,run:{font:FONT,size:24,bold:true,color:'000000'},paragraph:{outlineLevel:1}}]},
 numbering:{config:[{reference:'r',levels:[{level:0,format:LevelFormat.DECIMAL,text:'%1.',alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:540,hanging:360}}}}]},{reference:'b',levels:[{level:0,format:LevelFormat.BULLET,text:'•',alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:540,hanging:360}}}}]}]},
 sections:[{properties:{page:{size:{width:12240,height:15840},margin:{top:1440,bottom:1440,left:1440,right:1440}}},
  footers:{default:new Footer({children:[new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({children:[PageNumber.CURRENT],size:20})]})]})},children:c}]});
Packer.toBuffer(doc).then(b=>{fs.writeFileSync('../Tarea_3_Estadisticas_y_Probabilidades.docx',b);console.log('ok')});
