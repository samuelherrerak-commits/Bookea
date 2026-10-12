// Texto del guion (qué decir y qué señalar) de cada diapositiva; lo usan el guion en Word y las notas del PowerPoint.
module.exports=(D,es,pc)=>{
const SA=D.sal,V=D.V,C=D.C;
return [
 {n:1,t:'Portada',min:'1 minuto',dec:[
  '«Buenos días, profesora y compañeros. Presentamos el proyecto final de Estadísticas y Probabilidades: la implementación de métodos cuantitativos en contabilidad.»',
  '«Integramos tres trabajos de la cátedra: la estructura de salarios de una manufacturera, las ventas de dos sucursales y el control de calidad de una planta. La pregunta que los une es cómo se traduce la estadística en decisiones de presupuesto, costos y control.»'],
  sen:['El título y los tres temas que se van a integrar.']},
 {n:2,t:'Un problema, tres casos',min:'1 minuto y medio',dec:[
  '«El contador trabaja con cifras que varían: salarios, ventas y costos de calidad. Si solo mira el promedio, puede subestimar el riesgo. Por eso planteamos como objetivo general analizar cómo se aplican los métodos cuantitativos en contabilidad, integrando tres casos.»',
  '«El **primero** es la estructura salarial de 50 empleados operativos, que se traduce en el presupuesto de nómina. El **segundo** compara las ventas diarias de Caracas y Maracaibo durante 30 días, y se traduce en el presupuesto de ingresos y la liquidez. El **tercero** es el control de calidad de una planta de electrónicos, que se traduce en costos de calidad y tiempos estándar.»',
  '«Para cada caso retomamos los resultados de las asignaciones y añadimos cálculos con enfoque contable en Excel. Aclaramos que, de la Asignación II, usamos las medidas resumen y no los datos diarios.»'],
  sen:['Las tres tarjetas, de izquierda a derecha.','La pregunta central en la franja inferior.']},
 {n:3,t:'Tarea 1: la nómina en números',min:'2 minutos y medio',dec:[
  '«Con los 50 salarios mensuales, entre 1,2 y 2,4 millones de bolívares, usamos la regla de Sturges: siete intervalos de 0,18. En el histograma, la clase modal es de 1,74 a 1,92, con 11 empleados, y la moda calculada es de **1,77 millones**.»',
  '«Con los datos originales, la media es de **'+es(SA.media,3)+'**, la mediana de '+es(SA.mediana,2)+' y el coeficiente de variación de **'+pc(SA.cv)+'**. Como media, mediana y moda casi coinciden, la distribución es simétrica y la dispersión es moderada.»',
  '«Desde el punto de vista contable, la nómina base suma **'+es(SA.suma,1)+' millones de bolívares al mes**, unos '+es(SA.anual,1)+' al año. Sobre ese salario se calculan los pasivos laborales que establece la ley: prestaciones sociales, utilidades, vacaciones y bono vacacional.»',
  '«La Asignación I recomendó revisar la banda inferior. Si los 12 empleados que ganan menos de 1,56 pasaran a 1,77, el costo sería de **'+es(SA.esc.costo,2)+' millones al mes**, un '+pc(SA.esc.pct,2)+' de la nómina. Esa cifra permite decidir con datos.»'],
  sen:['El histograma: barra naranja (clase modal) y línea de la media.','Las cuatro tarjetas de la derecha.']},
 {n:4,t:'Tarea 2: ventas y riesgo de caja',min:'2 minutos y medio',dec:[
  '«Comparamos las ventas diarias de dos sucursales durante 30 días. Caracas vende en promedio **'+es(V.car.m,2)+' millones al día** y Maracaibo '+es(V.mar.m,2)+': Caracas vende un '+pc(V.dif_pct)+' más. Pero la diferencia importante está en la dispersión.»',
  '«El coeficiente de variación de Caracas es **8,66 %**, baja variabilidad, y el de Maracaibo es **40,78 %**, casi cinco veces mayor. En el diagrama de caja se ve que la de Caracas es angosta y la de Maracaibo es muy ancha. Además, en Maracaibo la mediana es de 6,90 frente a una media de 8,91: hay días bajos y días muy altos, y la media no describe un día típico.»',
  '«¿Qué significa esto para el presupuesto? El nivel de ventas que se supera nueve de cada diez días, el decil 1, es el **'+pc(V.car.d1_m)+'** de la media en Caracas y solo el **'+pc(V.mar.d1_m)+'** en Maracaibo. Por eso los compromisos fijos diarios, como nómina, alquileres y proveedores, se deben dimensionar contra el decil 1 y no contra la media.»',
  '«Para el total del mes, con un intervalo de 95 %, Caracas varía ±'+pc(V.car.var_pct)+' y Maracaibo ±'+pc(V.mar.var_pct)+'. Maracaibo necesita un presupuesto con escenarios pesimista, base y optimista, y un fondo de contingencia.»'],
  sen:['Las dos cajas del diagrama y los rombos de la media.','Las tres tarjetas, comparando Caracas con Maracaibo.']},
 {n:5,t:'Tarea 3: defectos por lote',min:'2 minutos',dec:[
  '«En la planta de electrónicos, la tasa de defectos es de 3 % y se producen 200 unidades al día. El número de defectuosas por lote es un conteo de éxitos en ensayos independientes, así que usamos la **distribución binomial** con n igual a 200 y p igual a 0,03.»',
  '«Se esperan **6 defectos por lote**, con una desviación estándar de 2,41. La probabilidad de exactamente 5 defectos es **16,22 %**, y la de 6 o más es **'+pc(C.pge6,2)+'**: más de la mitad de los lotes iguala o supera el promedio. Los lotes de 10 o más defectos ocurren el '+pc(C.pge10,2)+' de los días.»',
  '«El vínculo contable es el costo de calidad. Si C es el costo promedio de una unidad defectuosa, el costo esperado de fallas por lote es **6C**. Bajar la tasa de 3 % a 2 % reduce ese costo a 4C, un tercio menos, así que la inversión en prevención se justifica si cuesta menos de 2C por lote.»'],
  sen:['Las barras: azul (3 o menos), naranja (exactamente 5) y verde (6 o más).','El marcador del valor esperado en k = 6.']},
 {n:6,t:'Tarea 3: tiempos de procesamiento',min:'2 minutos',dec:[
  '«Los tiempos de procesamiento son aproximadamente normales, con media de 45 minutos y desviación estándar de 8. Con la tabla normal estándar obtenemos que 37 y 53 minutos corresponden a z igual a menos 1 y a más 1.»',
  '«La probabilidad de que una unidad tarde entre 37 y 53 minutos es de **68,27 %**. Un 15,87 % tarda menos de 37 minutos y otro 15,87 % más de 53, unas 32 unidades al día. El 10 % más rápido se procesa en menos de **34,75 minutos** y el 90 % de las unidades termina en **55,25 minutos** o menos.»',
  '«En términos contables, el tiempo medio fija el estándar de mano de obra: 200 unidades por 45 minutos son 150 horas al día. Un estándar basado en el percentil 90 da una holgura de **'+pc(C.holgura)+'** sobre la media, útil para presupuestar; el percentil 10 sirve como estándar ideal de referencia.»'],
  sen:['La campana, con la media y las líneas de una, dos y tres desviaciones.','Los triángulos rojos en los percentiles 10 y 90.']},
 {n:7,t:'La variabilidad, eje común',min:'1 minuto y medio',dec:[
  '«Para integrar los tres casos usamos una misma medida: el coeficiente de variación. Dos variables tienen variabilidad alta: las ventas de Maracaibo, con '+pc(V.mar.cv,1)+', y los defectos por lote, con '+pc(C.cv_d)+'. Dos tienen variabilidad moderada: los salarios, con '+pc(SA.cv)+', y los tiempos de procesamiento, con '+pc(C.cv_t)+'. Y una tiene variabilidad baja: las ventas de Caracas, con 8,7 %.»',
  '«De aquí salen tres lecciones. **Primera**, la media no basta: dos sucursales con ventas promedio parecidas pueden tener una variabilidad casi cinco veces distinta. **Segunda**, la forma de la distribución importa: es simétrica en salarios, asimétrica en defectos y bimodal en Maracaibo. **Tercera**, la variabilidad se traduce en dinero: reservas de liquidez, provisiones y holguras en los estándares.»'],
  sen:['Las barras de colores y las líneas de 15 % y 30 %.','Las tres lecciones de la derecha.']},
 {n:8,t:'Conclusiones y recomendaciones',min:'2 minutos',dec:[
  '«En conclusión, los métodos cuantitativos son una herramienta de la contabilidad. Permiten presupuestar con intervalos y escenarios en lugar de cifras únicas, dimensionar reservas y provisiones con un nivel de prudencia explícito, y evaluar decisiones por su costo.»',
  '«Recomendamos cuatro acciones. Primero, presupuestar con escenarios cuando el coeficiente de variación supere 30 %. Segundo, usar gráficos de control np en la calidad, con alerta desde 10 defectos y acción desde 14. Tercero, valorar cada mejora por su efecto esperado antes de aprobarla. Y cuarto, mantener un plan de seguimiento con indicadores, umbrales y responsables.»',
  '«Reconocemos las limitaciones: las muestras son pequeñas, usamos medidas resumen en la Asignación II y los costos de calidad están expresados en función de C. Con datos completos se podría extender el análisis. Muchas gracias; quedamos atentos a sus preguntas.»'],
  sen:['Las tres conclusiones de la izquierda.','Las cuatro recomendaciones numeradas.']},
];};
