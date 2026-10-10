// PowerPoint en el que cada diapositiva es la imagen de la diapositiva del PDF (slides.html), con el guion como notas.
const fs=require('fs'),path=require('path');
const pptxgen=require('pptxgenjs');
(async()=>{
  const {chromium}=require('playwright');const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const p=await b.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1.5});
  await p.goto('file://'+path.join(__dirname,'slides.html'));await p.evaluate(()=>document.fonts.ready);
  const secs=await p.$$('section'),imgs=[];
  for(const s of secs) imgs.push((await s.screenshot({type:'png'})).toString('base64'));
  await b.close();
  // notas: el texto «Qué decir» del guion
  const src=fs.readFileSync(path.join(__dirname,'guion.cjs'),'utf8');
  const D=require('../calculos/estados.json');
  const es=(v,d=0)=>{const s=Math.abs(v).toFixed(d).split('.');s[0]=s[0].replace(/\B(?=(\d{3})+(?!\d))/g,'.');return (v<0?'−':'')+s.join(',')};
  const $=(v,d=0)=>(v<0?'−':'')+'$'+es(Math.abs(v),d);
  const pre=src.slice(src.indexOf('const E=D.E'),src.indexOf('const c=[];'));
  const dd=src.slice(src.indexOf('const DD=['),src.indexOf('DD.forEach'));
  const DD=new Function('D','es','$',pre+dd+';return DD;')(D,es,$);
  const pres=new pptxgen();pres.layout='LAYOUT_16x9';pres.title='Auditoría financiera · Bookeaa, C.A.';
  imgs.forEach((data,i)=>{const s=pres.addSlide();
    s.addImage({data:'image/png;base64,'+data,x:0,y:0,w:10,h:5.625,altText:'Diapositiva '+(i+1)+': '+DD[i].t});
    s.addNotes(DD[i].dec.join('\n\n').replace(/\*\*/g,''));});
  await pres.writeFile({fileName:path.join(__dirname,'Presentacion_Auditoria_I_bookeaa.pptx')});console.log('ok',imgs.length);
})();
