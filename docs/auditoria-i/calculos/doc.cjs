const fs=require('fs');
const {Document,Packer,Paragraph,TextRun,Table,TableRow,TableCell,WidthType,AlignmentType,ImageRun,Header,PageNumber,
  BorderStyle,ShadingType,HeadingLevel,PageBreak,LevelFormat,TableLayoutType}=require('docx');
const D=JSON.parse(fs.readFileSync('estados.json'));
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
    children:[new Paragraph({keepNext:tipo==='last'?!!nota:!opts.partir,keepLines:true,alignment:tipo==='h'?(j===0?AlignmentType.LEFT:AlignmentType.CENTER):(der?AlignmentType.RIGHT:AlignmentType.LEFT),
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
const E=D.E, Bal=D.B, M=D.mat, pr=D.precio;
const $0=v=>$(v), FIRMA='[Apellido] & Asociados, Contadores Públicos', ENT='Bookeaa, C.A.';
const CIERRE='30 de septiembre de 2027', EJ='el ejercicio económico terminado el 30 de septiembre de 2027';
const c=[];
const cen=(t,o={})=>new Paragraph({alignment:AlignmentType.CENTER,spacing:{line:480},children:runs(t,o)});
// párrafo de modelo (cartas e informe): sangría a ambos lados
const PM=(t,o={})=>new Paragraph({children:runs(t),alignment:AlignmentType.JUSTIFIED,indent:{left:567,right:567},spacing:{line:360,after:160},...o});
const PMc=t=>PM(t,{alignment:AlignmentType.CENTER});
const PMh=t=>new Paragraph({children:[new TextRun({text:t,bold:true})],indent:{left:567,right:567},spacing:{line:360,before:120,after:120},keepNext:true});
// encabezado de cédula (tabla con bordes, sin numerar)
const box={style:BorderStyle.SINGLE,size:4,color:'000000'};
function encab(ref,titulo,obj){
  const cel=(t,w,b)=>new TableCell({width:{size:w,type:WidthType.DXA},margins:{top:40,bottom:40,left:80,right:80},borders:{top:box,bottom:box,left:box,right:box},
    children:[new Paragraph({keepNext:true,keepLines:true,children:runs(t,{size:18,bold:b||undefined})})]});
  const W=[4680,2340,2340];
  return [new Paragraph({spacing:{before:240},keepNext:true,children:[]}),new Table({width:{size:9360,type:WidthType.DXA},columnWidths:W,layout:TableLayoutType.FIXED,rows:[
    new TableRow({cantSplit:true,children:[cel(FIRMA,W[0],true),cel('Ref.: **'+ref+'**',W[1]),cel('Preparado: [iniciales] · 08/10/2027',W[2])]}),
    new TableRow({cantSplit:true,children:[cel(ENT+' · '+titulo,W[0]),cel('Cierre: 30/09/2027',W[1]),cel('Revisado: [iniciales] · 15/10/2027',W[2])]}),
    new TableRow({cantSplit:true,children:[new TableCell({columnSpan:3,width:{size:9360,type:WidthType.DXA},margins:{top:40,bottom:40,left:80,right:80},borders:{top:box,bottom:box,left:box,right:box},children:[new Paragraph({keepNext:true,keepLines:true,children:runs('**Objetivo:** '+obj,{size:18})})]})]})]})];
}

// ---------- PORTADA ----------
c.push(cen('República Bolivariana de Venezuela'),cen('Universidad José María Vargas'),cen('Facultad de Ciencias Administrativas y Contables'),cen('Escuela de Contaduría Pública'),cen('Auditoría I'));
c.push(...[1,2].map(()=>new Paragraph({spacing:{line:480},children:[]})));
c.push(cen('**Auditoría financiera de una empresa de software por suscripción: planificación, ejecución y presentación de resultados. Caso Bookeaa, C.A.**'));
c.push(...[1,2].map(()=>new Paragraph({spacing:{line:480},children:[]})));
c.push(new Paragraph({alignment:AlignmentType.RIGHT,spacing:{line:480},children:runs('Profesor(a): [Nombre del docente]')}),
  new Paragraph({alignment:AlignmentType.RIGHT,spacing:{line:480},children:runs('Integrantes:')}),
  new Paragraph({alignment:AlignmentType.RIGHT,spacing:{line:480},children:runs('[Nombre y apellido] · C.I. [número]')}),
  new Paragraph({alignment:AlignmentType.RIGHT,spacing:{line:480},children:runs('[Nombre y apellido] · C.I. [número]')}));
c.push(...[1].map(()=>new Paragraph({spacing:{line:480},children:[]})));
c.push(cen('Caracas, octubre de 2026'));
c.push(BR());

// ---------- INTRODUCCIÓN ----------
c.push(H1('Introducción'));
c.push(P('La auditoría financiera es el examen independiente de los estados financieros de una entidad, realizado por un contador público con el fin de expresar una opinión sobre si dichos estados están preparados, en todos sus aspectos materiales, de conformidad con el marco de información financiera aplicable. Esa opinión aumenta el grado de confianza de los usuarios en la información (International Auditing and Assurance Standards Board [IAASB], 2016a, NIA 200). Para que la opinión sea fundada, el trabajo se organiza en tres fases: la **planificación**, en la que se conoce la entidad, se evalúan los riesgos y el control interno y se fija la materialidad; la **ejecución**, en la que se obtiene evidencia suficiente y adecuada mediante pruebas de control y pruebas sustantivas; y la **presentación de resultados**, en la que se forma la opinión y se emite el informe.'));
c.push(P('Este trabajo práctico desarrolla esas tres fases sobre un caso concreto: **Bookeaa, C.A.**, un emprendimiento venezolano que ofrece a pequeños negocios de servicios —salones de belleza, barberías y centros de estética— una plataforma digital de reservas de citas por suscripción mensual. Se trata de una auditoría simulada de los estados financieros correspondientes a '+EJ+', su primer año de operaciones. Por razones de confidencialidad, las cifras utilizadas son ilustrativas: fueron construidas a partir de las proyecciones de la empresa y modificadas respecto de los valores reales, conservando su estructura y proporciones.'));
c.push(P('El encargo se ejecuta conforme a las Normas Internacionales de Auditoría (NIA), adoptadas en Venezuela por la Federación de Colegios de Contadores Públicos de Venezuela, y toma como marco de información financiera los Principios de Contabilidad de Aceptación General en Venezuela para pequeñas y medianas entidades (VEN-NIF PYME), basados en la NIIF para las PYMES (Consejo de Normas Internacionales de Contabilidad [IASB], 2015). En cada fase se presentan ejemplos prácticos de los papeles de trabajo: oferta de servicios, programas de auditoría, cuestionarios de control interno, cálculo de la materialidad, cédulas de pruebas de control y de pruebas sustantivas, e informe del auditor independiente.'));
c.push(H2('Objetivo general'));
c.push(P('Desarrollar, con ejemplos prácticos, las fases de planificación, ejecución y presentación de resultados de una auditoría financiera a los estados financieros de Bookeaa, C.A., de acuerdo con las NIA.'));
c.push(H2('Descripción de la entidad auditada'));
c.push(P('Bookeaa, C.A. inició operaciones en octubre de 2026. Su único producto es una suscripción mensual de '+$(pr)+' que da derecho a una página de reservas configurada con los servicios, precios y horarios de cada negocio. Cada negocio nuevo disfruta de un primer mes de prueba sin costo. Los cobros se reciben por transferencia bancaria y por medios de pago digitales; la plataforma funciona sobre servicios en la nube contratados a terceros, y el equipo que configura, atiende y mantiene la plataforma presta sus servicios por honorarios profesionales. Al '+CIERRE+' la empresa contaba con unos '+es(D.meses[11].pag)+' negocios suscritos que pagan su cuota mensual. La Tabla 1 y la Tabla 2 presentan los estados financieros objeto de la auditoría.'));
const T=(n,v,o={})=>[n,v===''?'':$(v)];
c.push(...tabla('Estado de situación financiera de Bookeaa, C.A. al '+CIERRE+' (en dólares estadounidenses)',
 ['Concepto','Monto'],
 [['**Activo corriente**',''],['Efectivo en bancos',$(Bal.banco)],['Efectivo en medios de pago digitales',$(Bal.digital)],['Cuentas por cobrar a suscriptores',$(Bal.cxc)],['Gastos pagados por anticipado',$(Bal.prepag)],['**Total activo corriente**','**'+$(Bal.activoCorr)+'**'],
  ['**Activo no corriente**',''],['Equipos de computación',$(Bal.equipoBruto)],['Depreciación acumulada','('+$(Bal.depAcum)+')'],['**Total activo no corriente**','**'+$(Bal.equipoNeto)+'**'],
  ['**Total activo**','**'+$(Bal.activo)+'**'],
  ['**Pasivo corriente**',''],['Cuentas por pagar a proveedores',$(Bal.cxp)],['Honorarios por pagar',$(Bal.honPorPagar)],['Tributos por pagar',$(Bal.tribPorPagar)],['Ingresos cobrados por anticipado',$(Bal.difer)],['**Total pasivo**','**'+$(Bal.pasivo)+'**'],
  ['**Patrimonio**',''],['Capital social',$(Bal.capital)],['Resultado del ejercicio',$(E.neta)],['**Total patrimonio**','**'+$(Bal.patrimonio)+'**'],
  ['**Total pasivo y patrimonio**','**'+$(Bal.pasivo+Bal.patrimonio)+'**']],
 [6,2],'Elaboración propia. Cifras ilustrativas, después de los ajustes de auditoría aceptados por la gerencia (véase la Tabla 20). La moneda funcional y de presentación con fines académicos es el dólar estadounidense; para fines legales, las cifras se expresan además en bolívares a la tasa oficial del Banco Central de Venezuela.'));
c.push(...tabla('Estado de resultados de Bookeaa, C.A. por '+EJ+' (en dólares estadounidenses)',
 ['Concepto','Monto'],
 [['Ingresos por suscripciones',$(E.ing)],['(−) Costo del servicio: honorarios del equipo de configuración, soporte y mantenimiento','('+$(E.hon)+')'],['(−) Costo del servicio: servicios en la nube','('+$(E.nube)+')'],['(−) Costo del servicio: depreciación de equipos','('+$(E.dep)+')'],['**Utilidad bruta**','**'+$(E.bruta)+'**'],
  ['(−) Gastos de comercialización (publicidad, marketing de influencia, material promocional y visitas)','('+$(E.gVenta)+')'],['(−) Gastos de administración (comunicaciones, dominio, tributos municipales y otros)','('+$(E.gAdm)+')'],['**Utilidad antes de impuesto**','**'+$(E.uop)+'**'],['(−) Impuesto sobre la renta estimado','('+$(E.islr)+')'],['**Resultado neto del ejercicio**','**'+$(E.neta)+'**']],
 [6,2],'Elaboración propia. Cifras ilustrativas. El impuesto sobre la renta se estima con fines académicos a la tarifa marginal más baja aplicable a las personas jurídicas.'));

// ======================= FASE 1 =======================
c.push(H1('Fase 1. Planificación de la auditoría',1));
c.push(P('La planificación consiste en establecer la estrategia global de auditoría y desarrollar un plan de auditoría que permita realizar el trabajo de manera eficaz (IAASB, 2016b, NIA 300). No es una etapa aislada, sino un proceso continuo que se actualiza a medida que se obtiene nueva información. Comprende la aceptación del encargo, el conocimiento de la entidad y de su control interno, la valoración de los riesgos de incorrección material, la determinación de la materialidad y el diseño de los programas de trabajo.'));
c.push(H2('Marco normativo de la planificación'));
c.push(...tabla('Normas Internacionales de Auditoría aplicadas en la planificación',
 ['NIA','Título','Aplicación en el encargo'],
 [['200','Objetivos globales del auditor independiente','Escepticismo profesional, juicio profesional y seguridad razonable.'],
  ['210','Acuerdo de los términos del encargo','Oferta de servicios y carta de encargo firmada por la gerencia.'],
  ['220','Gestión de la calidad de una auditoría','Asignación de un equipo competente y revisión de los papeles de trabajo.'],
  ['230','Documentación de auditoría','Índice y referencias de papeles de trabajo, marcas de auditoría.'],
  ['240','Responsabilidades respecto al fraude','Riesgo presunto de fraude en el reconocimiento de ingresos.'],
  ['250','Leyes y regulaciones','Obligaciones tributarias, mercantiles y de facturación.'],
  ['260 y 265','Comunicación con la dirección y deficiencias de control interno','Carta a la gerencia con las oportunidades de mejora.'],
  ['300','Planificación de la auditoría','Estrategia global, cronograma y plan de auditoría.'],
  ['315','Identificación y valoración de los riesgos','Conocimiento de la entidad, control interno y matriz de riesgos.'],
  ['320','Importancia relativa','Materialidad global, de ejecución y umbral de incorrecciones insignificantes.'],
  ['330','Respuestas a los riesgos valorados','Programas con pruebas de control y sustantivas.'],
  ['402','Entidades que utilizan organizaciones de servicios','Servicios en la nube y procesadores de pago contratados a terceros.'],
  ['450','Evaluación de las incorrecciones identificadas','Resumen de ajustes propuestos y no corregidos.']],
 [1,3.2,4.2],'Elaboración propia con base en IAASB (2016a, 2016b).',{izq:[1,2],partir:true}));

c.push(H2('Ejemplo práctico 1: oferta de servicios profesionales'));
c.push(P('De acuerdo con la NIA 210, antes de aceptar el encargo el auditor debe determinar si existe un marco de información financiera aceptable y obtener la conformidad de la dirección sobre sus responsabilidades. El acuerdo se formaliza en una oferta de servicios (o carta de encargo) que la entidad acepta por escrito. A continuación se presenta el modelo utilizado.'));
c.push(PM('Caracas, 15 de julio de 2027'),PM('Señores'),PM('**Junta Directiva de Bookeaa, C.A.**'),PM('Presente.'));
c.push(PMh('Referencia: Oferta de servicios profesionales de auditoría de estados financieros'));
c.push(PM('Nos es grato presentarles nuestra oferta de servicios para auditar los estados financieros de Bookeaa, C.A., que comprenden el estado de situación financiera al '+CIERRE+', el estado de resultados, el estado de cambios en el patrimonio y el estado de flujos de efectivo correspondientes al ejercicio terminado en esa fecha, así como las notas explicativas.'));
c.push(PMh('1. Objetivo y alcance'));
c.push(PM('El objetivo de la auditoría es expresar una opinión sobre si los estados financieros presentan razonablemente, en todos los aspectos materiales, la situación financiera, el resultado de las operaciones y los flujos de efectivo de la compañía, de conformidad con VEN-NIF PYME. La auditoría se realizará de acuerdo con las Normas Internacionales de Auditoría, que exigen cumplir los requerimientos de ética y planificar y ejecutar el trabajo con el fin de obtener una seguridad razonable de que los estados financieros están libres de incorrección material, debida a fraude o error.'));
c.push(PMh('2. Responsabilidades de la dirección'));
c.push(PM('La dirección de Bookeaa, C.A. es responsable de preparar y presentar razonablemente los estados financieros; de diseñar, implementar y mantener el control interno que considere necesario; y de proporcionarnos acceso a toda la información relevante, a la información adicional que solicitemos y a las personas de la entidad de las cuales consideremos necesario obtener evidencia. Al término del trabajo solicitaremos una carta de manifestaciones escritas.'));
c.push(PMh('3. Responsabilidades del auditor'));
c.push(PM('Debido a las limitaciones inherentes de una auditoría y del control interno, existe un riesgo inevitable de que no se detecten algunas incorrecciones materiales, aun cuando la auditoría se planifique y ejecute adecuadamente. Les comunicaremos por escrito cualquier deficiencia significativa del control interno que identifiquemos durante el trabajo.'));
c.push(PMh('4. Equipo, cronograma y honorarios'));
c.push(PM('El trabajo será dirigido por un socio, contador público colegiado, con el apoyo de un supervisor y un asistente de auditoría. El cronograma y los honorarios estimados se detallan a continuación:'));
c.push(...tabla('Cronograma y honorarios del encargo de auditoría',
 ['Actividad','Período','Horas','Honorarios'],
 [['Planificación y evaluación del control interno','1 al 31 de agosto de 2027','24',$(24*15)],['Pruebas de control (visita preliminar)','1 al 15 de septiembre de 2027','16',$(16*15)],['Pruebas sustantivas (visita final)','1 al 31 de octubre de 2027','32',$(32*15)],['Revisión, informe y carta a la gerencia','1 al 30 de noviembre de 2027','12',$(12*15)],['**Total**','','**84**','**'+$(84*15)+'**']],
 [3.6,2.8,1,1.4],'Elaboración propia. Tarifa promedio ilustrativa de $15 por hora. Los honorarios no incluyen el impuesto al valor agregado.'));
c.push(PM('Les agradecemos firmar una copia de esta comunicación en señal de conformidad con los términos del encargo.'));
c.push(PM('Atentamente,'),PM('[Nombre del socio], Contador Público · C.P.C. N.º [número]'),PM(FIRMA),PM('Conforme: ____________________ Presidente de Bookeaa, C.A. Fecha: ____________'));

c.push(H2('Conocimiento de la entidad y evaluación del control interno'));
c.push(P('La NIA 315 exige que el auditor conozca la entidad y su entorno, el marco de información financiera aplicable y el sistema de control interno, con el fin de identificar y valorar los riesgos de incorrección material en los estados financieros y en las afirmaciones. Para evaluar el control interno se utilizan los cinco componentes del marco integrado del Committee of Sponsoring Organizations of the Treadway Commission (COSO, 2013): entorno de control, evaluación de riesgos, actividades de control, información y comunicación, y actividades de supervisión.'));
c.push(P('En Bookeaa, C.A. se identificaron tres ciclos significativos: **ingresos y cobros** (altas de suscriptores, facturación mensual y cobro de las cuotas), **egresos** (honorarios del equipo, servicios en la nube, publicidad y gastos generales) y **tesorería** (cuentas bancarias y medios de pago digitales). Como la plataforma y parte de los cobros dependen de proveedores externos, se aplicó además la NIA 402 sobre organizaciones de servicios: se obtuvieron los reportes de actividad y facturación de esos proveedores y se compararon con los registros contables.'));
c.push(H3('Ejemplo práctico 2: cuestionario de control interno del ciclo de ingresos y cobros'));
c.push(...tabla('Cuestionario de control interno: ciclo de ingresos y cobros',
 ['N.º','Pregunta','Sí','No','Observación'],
 [['1','¿Cada alta de un suscriptor queda registrada en la plataforma con fecha, plan y datos fiscales?','X','','Registro automático en la base de clientes.'],
  ['2','¿Existe una lista de precios aprobada por la junta directiva?','X','','Cuota única aprobada en acta.'],
  ['3','¿Se emite una factura por cada cuota mensual cobrada?','X','','Una factura emitida con retraso (véase PC-1).'],
  ['4','¿Los cobros se concilian con las cuentas bancarias y digitales cada mes?','X','','Conciliaciones firmadas por la gerencia.'],
  ['5','¿Están separadas las funciones de registro de cobros y de conciliación?','X','','Registra el asistente administrativo; concilia la gerencia.'],
  ['6','¿Se controla el paso de la prueba gratuita al primer cobro?','X','','Reporte mensual de conversiones.'],
  ['7','¿Existe una política para las cuotas cobradas por adelantado?','','X','Oportunidad de mejora: definir su registro como pasivo.'],
  ['8','¿El acceso a la plataforma y a los registros contables está restringido por usuario?','X','','Accesos individuales con contraseña y doble verificación.'],
  ['9','¿Se respalda la información contable y de clientes periódicamente?','X','','Respaldo automático en la nube.'],
  ['10','¿La gerencia revisa mensualmente los ingresos frente al presupuesto?','X','','Reporte mensual de suscriptores e ingresos.']],
 [0.5,4,0.5,0.5,3],'Elaboración propia. Respuestas obtenidas mediante entrevista a la gerencia, observación e inspección de documentos (agosto de 2027).',{izq:[1,4],partir:true}));
c.push(P('El resultado del cuestionario muestra un control interno adecuado para el tamaño de la entidad: nueve de las diez preguntas tienen respuesta afirmativa. La única respuesta negativa (pregunta 7) se refiere a la ausencia de una política escrita para registrar las cuotas cobradas por adelantado. Se considera una oportunidad de mejora y se cubre con una prueba sustantiva de corte de ingresos.'));
c.push(H3('Ejemplo práctico 3: matriz de valoración de riesgos'));
c.push(...tabla('Matriz de riesgos de incorrección material y respuesta del auditor',
 ['Rubro','Riesgo identificado','Afirmación','Riesgo inherente','Riesgo de control','Respuesta (NIA 330)'],
 [['Ingresos','Reconocimiento de ingresos en un período distinto (riesgo presunto de fraude, NIA 240)','Ocurrencia, corte','Alto','Bajo','Prueba de control PC-1, analítica SA-1 y corte SD-4'],
  ['Efectivo','Saldos de cuentas digitales no conciliados','Existencia, integridad','Medio','Bajo','Prueba de control PC-2, confirmación y conciliación SD-1'],
  ['Cuentas por cobrar','Cuotas vencidas no cobrables','Valoración','Bajo','Bajo','Confirmación de saldos SD-2'],
  ['Gastos','Gastos sin soporte o del período siguiente','Ocurrencia, corte','Medio','Medio','Analítica SA-2 y examen de comprobantes SD-3'],
  ['Equipos','Depreciación mal calculada','Valoración','Bajo','Bajo','Recálculo SD-5'],
  ['Revelaciones','Dependencia de proveedores en la nube (NIA 402)','Presentación','Medio','Bajo','Inspección de contratos y reportes del proveedor']],
 [1.2,2.8,1.2,1,1,2.4],'Elaboración propia. Escala cualitativa: alto, medio y bajo.',{izq:[1,2,3,4,5],size:18,partir:true}));

c.push(H2('Ejemplo práctico 4: determinación de la materialidad'));
c.push(P('La materialidad o importancia relativa es la magnitud de una incorrección que, individualmente o de forma agregada, podría influir en las decisiones económicas de los usuarios de los estados financieros (IAASB, 2016b, NIA 320). Se determina por juicio profesional aplicando un porcentaje a una referencia. Para Bookeaa, C.A. se eligieron los **ingresos** como referencia, porque en una empresa en su primer año el resultado del ejercicio todavía es volátil, mientras que los ingresos son la medida que más siguen los socios y potenciales inversionistas.'));
c.push(...tabla('Cálculo de la materialidad',
 ['Concepto','Criterio','Monto'],
 [['Referencia: ingresos por suscripciones del ejercicio','Estado de resultados',$(M.base)],['Materialidad global','1,5 % de los ingresos (rango usual: 0,5 % a 2 %)','**'+$(M.global)+'**'],['Materialidad de ejecución','70 % de la materialidad global (primer año de auditoría)','**'+$(M.desemp)+'**'],['Umbral de incorrecciones claramente insignificantes','5 % de la materialidad global','**'+$(M.trivial)+'**']],
 [3.6,3.6,1.6],'Elaboración propia con base en la NIA 320 y la NIA 450. Se fijó la materialidad de ejecución en el 70 % porque es el primer ejercicio de la entidad y no existe historia de incorrecciones. Las incorrecciones menores al umbral no se acumulan.'));
c.push(P('Con estos valores, cualquier incorrección superior a '+$(M.trivial)+' se registra en el resumen de diferencias; las que superen la materialidad de ejecución ('+$(M.desemp)+') exigen ampliar las pruebas, y si las incorrecciones no corregidas, en conjunto, superan la materialidad global ('+$(M.global)+'), el auditor debe evaluar la necesidad de modificar su opinión (NIA 450 y NIA 705).'));

c.push(H2('Ejemplo práctico 5: programas de trabajo'));
c.push(P('El plan de auditoría describe la naturaleza, el momento de realización y la extensión de los procedimientos que se aplicarán (NIA 300). Se concreta en programas de trabajo por rubro, en los que cada procedimiento se vincula con la afirmación que cubre y con la cédula donde se documenta. Se presentan los programas de los dos rubros de mayor riesgo.'));
c.push(...tabla('Programa de auditoría: ingresos y cuentas por cobrar',
 ['N.º','Procedimiento','Afirmación','Ref.','Hecho por'],
 [['1','Verificar, en una muestra de altas, que cada suscripción tenga registro, factura y cobro conciliado (prueba de control).','Ocurrencia','PC-1','[ini.]'],
  ['2','Construir una expectativa independiente de ingresos (suscriptores promedio × cuota) y compararla con lo registrado.','Integridad, exactitud','SA-1','[ini.]'],
  ['3','Enviar confirmaciones positivas a los suscriptores con saldo pendiente al cierre.','Existencia, valoración','SD-2','[ini.]'],
  ['4','Examinar los cobros de los últimos y primeros cinco días del ejercicio para verificar el corte.','Corte','SD-4','[ini.]'],
  ['5','Revisar los cobros posteriores al cierre de las cuentas por cobrar.','Valoración','SD-2','[ini.]'],
  ['6','Concluir sobre la razonabilidad del rubro.','Todas','A','[ini.]']],
 [0.5,4.6,1.4,0.8,0.9],'Elaboración propia con base en la NIA 300 y la NIA 330.',{izq:[1,2],partir:true}));
c.push(...tabla('Programa de auditoría: efectivo y gastos operativos',
 ['N.º','Procedimiento','Afirmación','Ref.','Hecho por'],
 [['1','Verificar que las conciliaciones bancarias y digitales mensuales estén preparadas y revisadas (prueba de control).','Existencia','PC-2','[ini.]'],
  ['2','Preparar la cédula sumaria de efectivo y cotejarla con el libro mayor.','Exactitud','SD-1','[ini.]'],
  ['3','Confirmar saldos con el banco y obtener los estados de cuenta de los medios digitales.','Existencia','SD-1','[ini.]'],
  ['4','Comparar los gastos por rubro con el presupuesto y analizar las variaciones significativas.','Integridad','SA-2','[ini.]'],
  ['5','Examinar los comprobantes de una muestra de egresos (factura, autorización y pago).','Ocurrencia','SD-3','[ini.]'],
  ['6','Recalcular la depreciación de los equipos de computación.','Valoración','SD-5','[ini.]'],
  ['7','Concluir sobre la razonabilidad de los rubros.','Todas','B','[ini.]']],
 [0.5,4.6,1.4,0.8,0.9],'Elaboración propia con base en la NIA 300 y la NIA 330.',{izq:[1,2],partir:true}));

// ======================= FASE 2 =======================
c.push(H1('Fase 2. Ejecución de la auditoría',1));
c.push(P('En la ejecución el auditor aplica los procedimientos de los programas para obtener **evidencia suficiente y adecuada**: suficiente en cantidad y adecuada en calidad, es decir, relevante y fiable (IAASB, 2016c, NIA 500). Los procedimientos se dividen en **pruebas de control**, que evalúan si los controles funcionaron de forma eficaz durante el período, y **pruebas sustantivas**, que buscan detectar incorrecciones materiales en las afirmaciones. Estas últimas pueden ser **procedimientos analíticos** (NIA 520) o **pruebas de detalle**, que incluyen confirmaciones externas (NIA 505), muestreo (NIA 530) e inspección de documentos.'));
c.push(...tabla('Normas Internacionales de Auditoría aplicadas en la ejecución',
 ['NIA','Título','Aplicación en el encargo'],
 [['500','Evidencia de auditoría','Inspección, observación, indagación, confirmación, recálculo y procedimientos analíticos.'],['505','Confirmaciones externas','Confirmación de saldos bancarios y de cuentas por cobrar.'],['510','Encargos iniciales: saldos de apertura','Primer ejercicio: se verificó el aporte inicial de capital.'],['520','Procedimientos analíticos','Expectativa independiente de ingresos y análisis de gastos.'],['530','Muestreo de auditoría','Muestra de altas de suscriptores y de comprobantes de egreso.'],['540','Estimaciones contables','Vida útil de los equipos e impuesto sobre la renta estimado.'],['560','Hechos posteriores al cierre','Revisión de actas, cobros y operaciones de octubre y noviembre de 2027.'],['570','Empresa en funcionamiento','Evaluación del flujo de caja y de la cartera de suscriptores.'],['580','Manifestaciones escritas','Carta de manifestaciones de la gerencia.'],['620','Utilización del trabajo de un experto','Apoyo de un especialista en tecnología para revisar accesos y respaldos.']],
 [1,3.2,4.2],'Elaboración propia con base en IAASB (2016c). Las NIA 600 y 610 no aplican porque la entidad no forma parte de un grupo ni tiene auditoría interna.',{izq:[1,2],partir:true}));
c.push(P('Para documentar el trabajo se utilizan las siguientes **marcas de auditoría**: √ verificado con el documento soporte; Σ sumado; © confirmado con terceros; ‡ recalculado; ¤ cotejado con el libro mayor; × desviación o diferencia encontrada. Cada cédula se identifica con una referencia que la vincula con el programa (por ejemplo, PC-1, SA-1 o SD-1).'));

c.push(H2('Ejemplo práctico 6: cédulas de pruebas de control'));
c.push(...encab('PC-1','Prueba de control de altas de suscriptores','Comprobar que cada alta de suscriptor está autorizada, registrada, facturada y cobrada, para confiar en el control del ciclo de ingresos.'));
const tipos=['Salón de belleza','Barbería','Centro de estética'];
const fechas=['14/11/2026','03/12/2026','19/12/2026','11/01/2027','02/02/2027','24/02/2027','09/03/2027','30/03/2027','15/04/2027','06/05/2027','27/05/2027','17/06/2027','08/07/2027','29/07/2027','19/08/2027'];
const filasPC=fechas.slice(0,10).map((f,i)=>['SUS-'+String(8+i*13).padStart(4,'0'),tipos[i%3],f,'√','√',i===6?'×':'√','√']);
c.push(...tabla('Cédula PC-1: atributos verificados en la muestra de altas (extracto)',
 ['Suscriptor','Tipo de negocio','Fecha de alta','Registro','Aceptación','Factura','Cobro conciliado'],
 [...filasPC,['…','…','…','…','…','…','…'],['**Muestra: 25**','','','**25 √**','**25 √**','**24 √ · 1 ×**','**25 √**']],
 [1.3,1.8,1.3,1,1.1,1.2,1.3],'Elaboración propia. Población: 156 altas del ejercicio; muestra de 25 seleccionada al azar (NIA 530). Desviación tolerable: 5 %. × La factura del suscriptor SUS-0086 se emitió 6 días después del cobro; el ingreso estaba correctamente registrado en el mes. Tasa de desviación de la muestra: 1 / 25 = 4 %.',{izq:[1],size:18}));
c.push(P('**Conclusión de PC-1:** la tasa de desviación observada (4 %) es menor que la desviación tolerable (5 %) y la única excepción no afectó el registro del ingreso. El control de altas, facturación y cobro **funciona de forma eficaz**, por lo que se mantiene la valoración de riesgo de control bajo para el ciclo de ingresos y se reduce la extensión de las pruebas sustantivas de detalle.'));
c.push(...encab('PC-2','Prueba de control de conciliaciones mensuales','Comprobar que las cuentas bancarias y digitales se concilian cada mes y que la gerencia revisa las conciliaciones.'));
const mesesN=['Oct 26','Nov 26','Dic 26','Ene 27','Feb 27','Mar 27','Abr 27','May 27','Jun 27','Jul 27','Ago 27','Sep 27'];
c.push(...tabla('Cédula PC-2: revisión de las conciliaciones mensuales',
 ['Mes','Conciliación bancaria','Conciliación digital','Partidas pendientes > 30 días','Revisada y firmada'],
 mesesN.map((m,i)=>[m,'√','√',i===4?'1 (aclarada en marzo)':'Ninguna','√']),
 [1.2,1.9,1.9,2.4,1.6],'Elaboración propia. √ Conciliación preparada, sumada y firmada por la gerencia. En febrero de 2027 quedó una transferencia pendiente por $12, que se identificó y aplicó en marzo.',{izq:[3],size:18}));
c.push(P('**Conclusión de PC-2:** las doce conciliaciones bancarias y digitales fueron preparadas y revisadas oportunamente. El control **funciona de forma eficaz**.'));

c.push(H2('Ejemplo práctico 7: cédulas de pruebas sustantivas analíticas'));
c.push(P('Los procedimientos analíticos sustantivos consisten en desarrollar una expectativa independiente de un saldo, compararla con lo registrado y evaluar si la diferencia es aceptable (NIA 520). En una empresa por suscripción, los ingresos dependen de dos variables que pueden obtenerse fuera del sistema contable: el número de suscriptores que pagan y la cuota mensual. Eso permite construir una expectativa muy precisa.'));
c.push(...encab('SA-1','Procedimiento analítico de ingresos','Verificar la razonabilidad de los ingresos del ejercicio mediante una expectativa independiente basada en suscriptores y cuota.'));
const ms=D.meses, tri=[0,1,2,3].map(k=>{const r=ms.slice(k*3,k*3+3);const ini=k===0?0:ms[k*3-1].pag, fin=r[2].pag;
  const esperado=r.reduce((a,m)=>a+Math.round(m.pag),0)*pr;const reg=r.reduce((a,m)=>a+m.ing,0)+(k===3?48:0);return {t:['Oct. a dic. 2026','Ene. a mar. 2027','Abr. a jun. 2027','Jul. a sep. 2027'][k],ini,fin,prom:r.reduce((a,m)=>a+m.pag,0)/3,esp:esperado,reg}});
const sumEsp=tri.reduce((a,x)=>a+x.esp,0), sumReg=tri.reduce((a,x)=>a+x.reg,0);
c.push(...tabla('Cédula SA-1: expectativa de ingresos frente a ingresos registrados',
 ['Trimestre','Suscriptores que pagan (promedio mensual)','Expectativa (suscriptores × cuota) ‡','Ingreso registrado ¤','Diferencia','%'],
 [...tri.map(x=>[x.t,es(x.prom,1),$(x.esp),$(x.reg),$(x.reg-x.esp),es((x.reg-x.esp)/x.esp*100,1)+' %']),
  ['**Total**','',`**${$(sumEsp)}** Σ`,`**${$(sumReg)}** Σ`,'**'+$(sumReg-sumEsp)+'**','**'+es((sumReg-sumEsp)/sumEsp*100,1)+' %**']],
 [1.6,1.6,1.8,1.6,1.2,0.8],'Elaboración propia. Suscriptores tomados de los reportes mensuales de la plataforma, verificados con la conciliación de cobros. La expectativa suma, para cada mes, los suscriptores que pagan según el reporte de la plataforma multiplicados por la cuota de '+$(pr)+'. Ingresos registrados antes de ajustes. Umbral de diferencia aceptable: materialidad de ejecución ('+$(M.desemp)+').',{size:18}));
c.push(P('**Conclusión de SA-1:** la diferencia total entre la expectativa y los ingresos registrados es de '+$(sumReg-sumEsp)+', inferior a la materialidad de ejecución ('+$(M.desemp)+'). En el último trimestre, la indagación con la gerencia permitió identificar cuotas de octubre de 2027 cobradas por adelantado en septiembre; el asunto se examinó en la prueba de corte SD-4. Con esa salvedad, **los ingresos son razonables**.'));
c.push(...encab('SA-2','Procedimiento analítico de gastos operativos','Identificar variaciones significativas entre los gastos registrados y los presupuestados por la gerencia.'));
const gastos=[['Honorarios del equipo',E.hon,E.hon*0.97],['Servicios en la nube',E.nube,E.nube],['Publicidad',E.pub,E.pub],['Marketing de influencia',E.infl,E.infl],['Material promocional',E.mat,E.mat],['Visitas comerciales',E.transp,E.transp*1.05],['Comunicaciones',E.tel,E.tel],['Dominio y presencia web',E.dominio+18,E.dominio],['Tributos municipales',E.trib,E.trib*1.02]];
c.push(...tabla('Cédula SA-2: gastos registrados frente a presupuesto (antes de ajustes)',
 ['Rubro','Registrado ¤','Presupuesto','Variación','%','Comentario'],
 gastos.map(([n,r,p])=>[n,$(r),$(p),$(r-p),es((r-p)/p*100,0)+' %',Math.abs(r-p)/p>0.5?'× Revisar en SD-3':(Math.abs(r-p)<1?'Sin variación':'Razonable')]),
 [2.4,1.2,1.2,1.1,0.8,1.8],'Elaboración propia. Criterio: se investigan las variaciones superiores al 25 % y a '+$(M.trivial)+'. El presupuesto proviene de la proyección de costos aprobada por la junta directiva.',{izq:[5],size:18}));
c.push(P('**Conclusión de SA-2:** las variaciones son pequeñas y explicables por el número real de negocios incorporados, salvo el rubro de dominio y presencia web, cuyo gasto duplica lo presupuestado. La indagación mostró que la renovación anual del dominio para el ejercicio siguiente se pagó en septiembre de 2027 y se registró como gasto. El hallazgo se documenta en SD-3.'));

c.push(H2('Ejemplo práctico 8: cédulas de pruebas sustantivas de detalle'));
c.push(...encab('SD-1','Cédula sumaria y conciliación de efectivo','Verificar la existencia y exactitud del efectivo al cierre mediante confirmación externa y conciliación.'));
const bancoConf=Bal.banco+36, transit=24, pend=60;
c.push(...tabla('Cédula SD-1: sumaria de efectivo y conciliación bancaria al '+CIERRE,
 ['Concepto','Banco nacional','Medios de pago digitales','Total'],
 [['Saldo según confirmación / estado de cuenta ©',$(bancoConf),$(Bal.digital),$(bancoConf+Bal.digital)],['(+) Depósitos en tránsito √',$(transit),'—',$(transit)],['(−) Pagos emitidos no debitados √','('+$(pend)+')','—','('+$(pend)+')'],['**Saldo conciliado ‡**','**'+$(bancoConf+transit-pend)+'**','**'+$(Bal.digital)+'**','**'+$(bancoConf+transit-pend+Bal.digital)+'**'],['Saldo según libro mayor ¤',$(Bal.banco),$(Bal.digital),$(Bal.efectivo)],['**Diferencia**','**$0**','**$0**','**$0**']],
 [3,1.8,2,1.6],'Elaboración propia. © Saldo confirmado directamente por el banco (NIA 505) y estado de cuenta del medio digital descargado en presencia del auditor. √ Partidas verificadas con los movimientos de octubre de 2027.',{negr:[3,5],size:18}));
c.push(P('**Conclusión de SD-1:** el efectivo de '+$(Bal.efectivo)+' existe y está correctamente registrado.'));
c.push(...encab('SD-2','Confirmación de cuentas por cobrar','Verificar la existencia y la cobrabilidad de las cuotas pendientes al cierre.'));
c.push(...tabla('Cédula SD-2: confirmaciones positivas de cuentas por cobrar',
 ['Suscriptor','Saldo según libros ¤','Respuesta ©','Diferencia','Cobro posterior √'],
 [['SUS-0021',$(12),'Conforme','—','04/10/2027'],['SUS-0047',$(12),'Conforme','—','05/10/2027'],['SUS-0063',$(12),'Conforme','—','06/10/2027'],['SUS-0098',$(12),'Conforme','—','03/10/2027'],['SUS-0114',$(12),'Sin respuesta: procedimiento alternativo','—','11/10/2027'],['**Total**','**'+$(Bal.cxc)+'** Σ','','**$0**','**100 % cobrado**']],
 [1.4,1.6,2.6,1,1.6],'Elaboración propia. Se confirmó el 100 % de la población de cuentas por cobrar (5 suscriptores). Para la cuenta sin respuesta se aplicó un procedimiento alternativo: verificación del cobro posterior y de la factura correspondiente (NIA 505).',{size:18}));
c.push(P('**Conclusión de SD-2:** las cuentas por cobrar existen y fueron cobradas en su totalidad en octubre de 2027; no se requiere estimación por incobrabilidad.'));
c.push(...encab('SD-3','Examen de comprobantes de egresos','Verificar que los gastos registrados correspondan a operaciones reales del ejercicio, autorizadas y con soporte.'));
c.push(...tabla('Cédula SD-3: muestra de egresos examinados (extracto)',
 ['Fecha','Concepto','Monto ¤','Factura','Autorización','Pago','Período'],
 [['31/10/2026','Equipos de computación',$(900),'√','√','√','√'],['30/11/2026','Publicidad en redes sociales',$(25),'√','√','√','√'],['31/01/2027','Honorarios del equipo',$(218),'√','√','√','√'],['31/03/2027','Marketing de influencia',$(45),'√','√','√','√'],['30/06/2027','Honorarios del equipo',$(271),'√','√','√','√'],['31/08/2027','Servicios en la nube',$(3),'√','√','√','√'],['26/09/2027','Renovación anual del dominio',$(18),'√','√','√','× Oct. 2027 a sep. 2028']],
 [1.2,2.6,1,0.9,1.1,0.8,1.8],'Elaboración propia. Muestra de 20 egresos (extracto de 7), seleccionada por montos superiores a la materialidad de ejecución y al azar (NIA 530). × El pago de la renovación del dominio corresponde al ejercicio siguiente.',{izq:[1],size:18}));
c.push(P('**Conclusión de SD-3:** los egresos examinados son reales, están autorizados y tienen soporte. Se propone el ajuste AJ-2 para reclasificar la renovación del dominio ($18) como gasto pagado por anticipado.'));
c.push(...encab('SD-4','Prueba de corte de ingresos','Verificar que los ingresos se registren en el período al que corresponden.'));
c.push(...tabla('Cédula SD-4: cobros registrados entre el 26 de septiembre y el 5 de octubre de 2027',
 ['Fecha','Suscriptores','Período de la cuota','Registrado en','Correcto'],
 [['26/09/2027','3','Septiembre 2027','Septiembre 2027','√'],['28/09/2027','4','Octubre 2027 (adelantado)','Septiembre 2027','×'],['30/09/2027','2','Septiembre 2027','Septiembre 2027','√'],['01/10/2027','11','Octubre 2027','Octubre 2027','√'],['03/10/2027','9','Octubre 2027','Octubre 2027','√'],['05/10/2027','7','Octubre 2027','Octubre 2027','√']],
 [1.4,1.3,2.4,2,1],'Elaboración propia. × Cuatro suscriptores pagaron en septiembre la cuota de octubre (4 × '+$(pr)+' = '+$(4*pr)+'); el cobro se registró como ingreso de septiembre.',{izq:[2,3],size:18}));
c.push(P('**Conclusión de SD-4:** se identificó un error de corte por '+$(4*pr)+'. Se propone el ajuste AJ-1 para reclasificar ese monto como ingreso cobrado por anticipado (pasivo).'));
c.push(...encab('SD-5','Recálculo de la depreciación','Verificar la valoración de los equipos de computación y de su depreciación.'));
c.push(...tabla('Cédula SD-5: recálculo de la depreciación de equipos',
 ['Activo','Costo √','Fecha de compra','Vida útil','Método','Depreciación del ejercicio ‡','Valor neto'],
 [['Equipos de computación',$(900),'01/10/2026','3 años','Línea recta',$(300),$(600)]],
 [2,1,1.3,0.9,1.1,1.6,1],'Elaboración propia. Costo verificado con la factura de compra. La vida útil de tres años es razonable para equipos de computación (NIA 540). ‡ Recalculado sin diferencias.',{size:18}));

c.push(H2('Ejemplo práctico 9: resumen de ajustes y evaluación de incorrecciones'));
c.push(P('La NIA 450 exige acumular las incorrecciones identificadas, salvo las claramente insignificantes, comunicarlas a la dirección y solicitar su corrección. La Tabla 20 resume las dos incorrecciones encontradas.'));
c.push(...tabla('Resumen de ajustes propuestos por la auditoría',
 ['Ajuste','Cuentas','Débito','Crédito','Efecto en el resultado','Estado'],
 [['AJ-1 (SD-4)','Ingresos por suscripciones a Ingresos cobrados por anticipado',$(48),$(48),'−'+$(48),'Aceptado y registrado'],
  ['AJ-2 (SD-3)','Gastos pagados por anticipado a Gasto de dominio y presencia web',$(18),$(18),'+'+$(18),'Aceptado y registrado'],
  ['**Total**','','','','**−'+$(30)+'**','**Sin incorrecciones pendientes**']],
 [1.2,3.2,0.9,0.9,1.4,1.8],'Elaboración propia. Ambas incorrecciones son inferiores a la materialidad global ('+$(M.global)+') y superiores al umbral de incorrecciones insignificantes ('+$(M.trivial)+'). La gerencia las corrigió, por lo que el saldo de incorrecciones no corregidas es cero.',{izq:[1,5],size:18}));
c.push(H2('Procedimientos de cierre'));
c.push(P('Antes de formar la opinión se completaron los procedimientos de cierre. En la **revisión de hechos posteriores** (NIA 560) se examinaron las actas de la junta directiva y las operaciones de octubre y noviembre de 2027 sin encontrar hechos que requieran ajuste o revelación. En la **evaluación de empresa en funcionamiento** (NIA 570) se verificó que la empresa genera flujos de caja positivos desde el cuarto mes de operaciones, que su cartera de suscriptores crece y que no tiene deudas financieras; no existe incertidumbre material. Por último, la gerencia firmó la **carta de manifestaciones escritas** (NIA 580), en la que confirma su responsabilidad sobre los estados financieros y que entregó toda la información relevante.'));

// ======================= FASE 3 =======================
c.push(H1('Fase 3. Presentación de resultados',1));
c.push(P('En la última fase el auditor evalúa si obtuvo seguridad razonable de que los estados financieros en su conjunto están libres de incorrección material y forma su opinión (IAASB, 2016d, NIA 700). La opinión puede ser **no modificada** (favorable), cuando los estados financieros están preparados en todos los aspectos materiales de acuerdo con el marco aplicable, o **modificada** (NIA 705): con salvedades, desfavorable o con abstención, según la naturaleza del asunto y si su efecto es generalizado. La NIA 706 regula los párrafos de énfasis y de otras cuestiones, y la NIA 701 la comunicación de las cuestiones clave de la auditoría, obligatoria sólo en entidades cotizadas, por lo que no aplica a este encargo.'));
c.push(P('En el caso de Bookeaa, C.A., las pruebas de control demostraron que los controles clave funcionan de forma eficaz; las pruebas sustantivas confirmaron la razonabilidad de los saldos; y las dos incorrecciones encontradas, ambas inferiores a la materialidad, fueron corregidas por la gerencia. En consecuencia, corresponde emitir una **opinión no modificada**. Como se trata del primer ejercicio de la entidad, no hay cifras comparativas (NIA 710).'));
c.push(H2('Ejemplo práctico 10: informe del auditor independiente'));
c.push(PMc('**INFORME DE AUDITORÍA EMITIDO POR UN CONTADOR PÚBLICO INDEPENDIENTE**'));
c.push(PM('A la Junta Directiva y a los Accionistas de **Bookeaa, C.A.**'));
c.push(PMh('Opinión'));
c.push(PM('Hemos auditado los estados financieros de Bookeaa, C.A. (la Compañía), que comprenden el estado de situación financiera al '+CIERRE+', el estado de resultados, el estado de cambios en el patrimonio y el estado de flujos de efectivo correspondientes al ejercicio terminado en dicha fecha, así como las notas explicativas de los estados financieros que incluyen un resumen de las políticas contables significativas.'));
c.push(PM('En nuestra opinión, los estados financieros adjuntos presentan razonablemente, en todos los aspectos materiales, la situación financiera de Bookeaa, C.A. al '+CIERRE+', así como sus resultados y sus flujos de efectivo correspondientes al ejercicio terminado en dicha fecha, de conformidad con los Principios de Contabilidad de Aceptación General en Venezuela para Pequeñas y Medianas Entidades (VEN-NIF PYME).'));
c.push(PMh('Fundamento de la opinión'));
c.push(PM('Hemos llevado a cabo nuestra auditoría de conformidad con las Normas Internacionales de Auditoría (NIA). Nuestras responsabilidades de acuerdo con dichas normas se describen más adelante en la sección *Responsabilidades del auditor en relación con la auditoría de los estados financieros* de nuestro informe. Somos independientes de la Compañía de conformidad con el Código de Ética Profesional del Contador Público Venezolano y con los requerimientos de ética aplicables a nuestra auditoría, y hemos cumplido las demás responsabilidades de ética de conformidad con esos requerimientos. Consideramos que la evidencia de auditoría que hemos obtenido proporciona una base suficiente y adecuada para nuestra opinión.'));
c.push(PMh('Responsabilidades de la dirección en relación con los estados financieros'));
c.push(PM('La dirección es responsable de la preparación y presentación razonable de los estados financieros adjuntos de conformidad con VEN-NIF PYME, y del control interno que considere necesario para permitir la preparación de estados financieros libres de incorrección material, debida a fraude o error. En la preparación de los estados financieros, la dirección es responsable de evaluar la capacidad de la Compañía para continuar como empresa en funcionamiento, revelando, según corresponda, las cuestiones relacionadas con ella y utilizando el principio contable de empresa en funcionamiento.'));
c.push(PMh('Responsabilidades del auditor en relación con la auditoría de los estados financieros'));
c.push(PM('Nuestros objetivos son obtener una seguridad razonable de que los estados financieros en su conjunto están libres de incorrección material, debida a fraude o error, y emitir un informe de auditoría que contiene nuestra opinión. Seguridad razonable es un alto grado de seguridad, pero no garantiza que una auditoría realizada de conformidad con las NIA siempre detecte una incorrección material cuando existe. Las incorrecciones pueden deberse a fraude o error y se consideran materiales si, individualmente o de forma agregada, puede preverse razonablemente que influyan en las decisiones económicas que los usuarios toman basándose en los estados financieros.'));
c.push(PM('Como parte de una auditoría de conformidad con las NIA, aplicamos nuestro juicio profesional y mantenemos una actitud de escepticismo profesional durante toda la auditoría. También: identificamos y valoramos los riesgos de incorrección material, diseñamos y aplicamos procedimientos de auditoría para responder a dichos riesgos y obtuvimos evidencia suficiente y adecuada para proporcionar una base para nuestra opinión; obtuvimos conocimiento del control interno relevante para la auditoría; evaluamos la adecuación de las políticas contables aplicadas y la razonabilidad de las estimaciones contables; concluimos sobre lo adecuado de la utilización, por la dirección, del principio contable de empresa en funcionamiento; y evaluamos la presentación global, la estructura y el contenido de los estados financieros. Nos comunicamos con la dirección en relación con, entre otras cuestiones, el alcance y el momento de realización de la auditoría y los hallazgos significativos, así como cualquier deficiencia significativa del control interno que identificamos en el transcurso de la auditoría.'));
c.push(PM(FIRMA),PM('[Nombre del socio]'),PM('Contador Público · C.P.C. N.º [número]'),PM('Caracas, 30 de noviembre de 2027'));

c.push(H2('Ejemplo práctico 11: comunicación de oportunidades de mejora a la gerencia'));
c.push(P('Además del informe, la NIA 265 exige comunicar por escrito a la dirección las deficiencias significativas de control interno identificadas. En este encargo no se identificaron deficiencias significativas, pero sí oportunidades de mejora que se comunican en una carta a la gerencia, cuyo contenido se resume en la Tabla 21.'));
c.push(...tabla('Resumen de la carta a la gerencia',
 ['Observación','Efecto','Recomendación','Respuesta de la gerencia'],
 [['No existe una política escrita para las cuotas cobradas por adelantado.','Riesgo de error de corte en los ingresos (AJ-1).','Registrar los cobros anticipados como pasivo y reconocerlos en el mes del servicio.','Aceptada. Política aprobada en octubre de 2027.'],
  ['Los pagos anuales se registran como gasto en el mes del pago.','Distorsión del resultado mensual (AJ-2).','Registrar los pagos que benefician a varios períodos como gastos pagados por anticipado y amortizarlos.','Aceptada. Aplicada desde octubre de 2027.'],
  ['Una factura se emitió con días de retraso respecto del cobro.','Riesgo de incumplimiento de las normas de facturación.','Emitir la factura en el mismo momento en que se concilia el cobro.','Aceptada. Factura automática al conciliar.']],
 [2.3,2,2.5,2],'Elaboración propia con base en la NIA 265.',{izq:[1,2,3],size:18}));

// ---------- CONCLUSIONES ----------
c.push(H1('Conclusiones',1));
c.push(P('El trabajo práctico permitió recorrer las tres fases de una auditoría financiera sobre una empresa real de software por suscripción. En la **planificación**, la oferta de servicios definió el objetivo, el alcance y las responsabilidades de cada parte (NIA 210); el conocimiento de la entidad y el cuestionario de control interno mostraron un control adecuado para su tamaño (NIA 315); la matriz de riesgos identificó el reconocimiento de ingresos como el riesgo principal (NIA 240); y la materialidad, fijada en '+$(M.global)+' sobre los ingresos, sirvió de guía para todo el trabajo (NIA 320).'));
c.push(P('En la **ejecución**, las pruebas de control confirmaron que los controles de altas de suscriptores y de conciliaciones funcionan de forma eficaz, lo que permitió confiar en ellos y reducir la extensión de las pruebas de detalle. El procedimiento analítico de ingresos resultó especialmente eficiente en una empresa por suscripción, porque los ingresos pueden predecirse con precisión a partir del número de suscriptores y de la cuota. Las pruebas de detalle identificaron dos incorrecciones de corte, de baja cuantía, que la gerencia corrigió.'));
c.push(P('En la **presentación de resultados**, la evidencia obtenida fue suficiente y adecuada para emitir una **opinión no modificada** sobre los estados financieros de Bookeaa, C.A. al '+CIERRE+'. El caso demuestra que una auditoría bien planificada no sólo otorga confianza a los usuarios de la información, sino que también aporta valor a la empresa a través de las recomendaciones de mejora.'));
c.push(H1('Recomendaciones'));
['**Formalizar las políticas contables** de reconocimiento de ingresos, cobros anticipados y gastos pagados por anticipado en un manual sencillo, aprobado por la junta directiva.',
 '**Mantener la facturación automática** al momento de conciliar cada cobro, para cumplir con las normas de facturación y fortalecer la evidencia del ciclo de ingresos.',
 '**Conservar los reportes mensuales de suscriptores** generados por la plataforma, porque son la base del procedimiento analítico de ingresos y una herramienta de control para la gerencia.',
 '**Solicitar a los proveedores de servicios en la nube y de medios de pago** sus reportes periódicos de actividad y, cuando estén disponibles, sus informes de control, en línea con la NIA 402.',
 '**Planificar desde ahora la auditoría del segundo ejercicio**, aprovechando el conocimiento acumulado de la entidad para concentrar el trabajo en los riesgos que cambien con el crecimiento de la empresa.'].forEach(t=>c.push(LI(t,'rec')));

// ---------- REFERENCIAS ----------
c.push(H1('Referencias',1));
['Arens, A. A., Elder, R. J., y Beasley, M. S. (2007). *Auditoría: Un enfoque integral* (11.ª ed.). Pearson Educación.',
 'Committee of Sponsoring Organizations of the Treadway Commission. (2013). *Control interno: Marco integrado. Resumen ejecutivo*. COSO.',
 'Consejo de Normas Internacionales de Contabilidad. (2015). *Norma Internacional de Información Financiera para las Pequeñas y Medianas Entidades (NIIF para las PYMES)*. Fundación IFRS.',
 'International Auditing and Assurance Standards Board. (2016a). NIA 200: Objetivos globales del auditor independiente y realización de la auditoría de conformidad con las Normas Internacionales de Auditoría. En *Manual de pronunciamientos internacionales de control de calidad, auditoría, revisión, otros encargos de aseguramiento y servicios relacionados* (Parte I). International Federation of Accountants.',
 'International Auditing and Assurance Standards Board. (2016b). NIA 300 a 450: Planificación, valoración del riesgo, importancia relativa y respuestas a los riesgos valorados. En *Manual de pronunciamientos internacionales de control de calidad, auditoría, revisión, otros encargos de aseguramiento y servicios relacionados* (Parte I). International Federation of Accountants.',
 'International Auditing and Assurance Standards Board. (2016c). NIA 500 a 620: Evidencia de auditoría y utilización del trabajo de otros. En *Manual de pronunciamientos internacionales de control de calidad, auditoría, revisión, otros encargos de aseguramiento y servicios relacionados* (Parte I). International Federation of Accountants.',
 'International Auditing and Assurance Standards Board. (2016d). NIA 700 a 720: Conclusiones de auditoría e informe. En *Manual de pronunciamientos internacionales de control de calidad, auditoría, revisión, otros encargos de aseguramiento y servicios relacionados* (Parte I). International Federation of Accountants.',
 'Ley de Ejercicio de la Contaduría Pública. (1973, 27 de septiembre). *Gaceta Oficial de la República de Venezuela*, N.º 30.216.',
 'Whittington, O. R., y Pany, K. (2005). *Principios de auditoría* (14.ª ed.). McGraw-Hill Interamericana.',
].forEach(t=>c.push(ref(t)));
const doc=new Document({creator:'Estudiante',title:'Auditoría financiera: caso Bookeaa, C.A.',
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
Packer.toBuffer(doc).then(b=>{fs.writeFileSync('../Proyecto_Final_Auditoria_I_bookeaa.docx',b);console.log('ok')});
