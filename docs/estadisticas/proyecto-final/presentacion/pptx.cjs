// PowerPoint con cada diapositiva como imagen de slides.html (se ve igual que el PDF); el guion va en las notas.
const fs=require('fs'),path=require('path'),pptxgen=require('pptxgenjs');
const D=require('../calculos/datos.json');
const es=(v,d=0)=>{const s=Math.abs(v).toFixed(d).split('.');s[0]=s[0].replace(/\B(?=(\d{3})+(?!\d))/g,'.');return (v<0?'−':'')+s.join(',')};
const pc=(v,d=1)=>es(v*100,d)+' %';
const DD=require('./notas.cjs')(D,es,pc);
(async()=>{const {chromium}=require('playwright');const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const p=await b.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1.5});await p.goto('file://'+path.join(__dirname,'slides.html'));await p.evaluate(()=>document.fonts.ready);
 const imgs=[];for(const s of await p.$$('section'))imgs.push((await s.screenshot({type:'png'})).toString('base64'));await b.close();
 const pres=new pptxgen();pres.layout='LAYOUT_16x9';pres.title='Métodos cuantitativos en contabilidad';
 imgs.forEach((d,i)=>{const s=pres.addSlide();s.addImage({data:'image/png;base64,'+d,x:0,y:0,w:10,h:5.625,altText:'Diapositiva '+(i+1)+': '+DD[i].t});s.addNotes(DD[i].dec.join('\n\n').replace(/\*\*/g,''));});
 await pres.writeFile({fileName:path.join(__dirname,'Presentacion_Proyecto_Estadisticas.pptx')});console.log('ok',imgs.length)})();
