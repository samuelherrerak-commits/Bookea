import json
from fase3 import *
out={}
for n in ESC:
    s=esc(n); r1=calc(s); r2=calc2(s); r3=calc3(n)
    f1=r1['filas']; f2=r2['filas']; f3=r3['filas']
    # plan combinado: fase 1 = meses 1-3 (estructura base), fase 2 = meses 4-12 (estructura ajustada), fase 3 = año 2
    plan=[]; caja=0
    for i in range(12):
        if i<3: f=f1[i]; d=dict(et=f['et'],fase=1,nuevos=f['nuevos'],pag=f['pag'],act=f['act'],ing=f['ing'],cf=f['eg'],cv=0,ct=f['eg'])
        else: f=f2[i]; d=dict(et=f['et'],fase=2,nuevos=f['nuevos'],pag=f['pag'],act=f['act'],ing=f['ing'],cf=f['cf'],cv=f['cv'],ct=f['ct'])
        plan.append(d)
    for f in f3: plan.append(dict(et=f['et'],fase=3,nuevos=f['nuevos'],pag=f['pag'],act=f['act'],ing=f['ing'],cf=f['cf'],cv=f['cv'],ct=f['ct']))
    for d in plan: d['flujo']=d['ing']-d['ct']; caja+=d['flujo']; d['caja']=caja; d['cu']=d['ct']/d['act']
    sumr=lambda rows,k:sum(r[k] for r in rows)
    q1=plan[:3]; r29=plan[3:12]; a2=plan[12:]
    out[n]=dict(nuevos=s['nuevos'],conv=s['conversion'],churn=s['churn'],
      o={k:r1[k] for k in r1 if k!='filas'}, a={k:r2[k] for k in r2 if k!='filas'}, f3={k:r3[k] for k in r3 if k!='filas'},
      comp2={k:sum(f[k] for f in f2) for k in ['alta','sop','trib','g1','ws','mant','tel','dom','tar','ads','inf','impr','ing','cf','cv','ct']},
      q1=dict(ing=sumr(q1,'ing'),ct=sumr(q1,'ct'),res=sumr(q1,'flujo'),captados=sumr(q1,'nuevos'),pag=q1[-1]['pag']),
      r29=dict(ing=sumr(r29,'ing'),cf=sumr(r29,'cf'),cv=sumr(r29,'cv'),ct=sumr(r29,'ct'),res=sumr(r29,'flujo')),
      a1=dict(ing=sumr(plan[:12],'ing'),ct=sumr(plan[:12],'ct'),res=sumr(plan[:12],'flujo'),caja=plan[11]['caja'],cajaMin=min(d['caja'] for d in plan)),
      a2=dict(ing=sumr(a2,'ing'),cf=sumr(a2,'cf'),cv=sumr(a2,'cv'),ct=sumr(a2,'ct'),res=sumr(a2,'flujo'),caja=plan[-1]['caja']),
      cu=dict(f1=plan[2]['cu'],f2=plan[11]['cu'],f3=plan[23]['cu'],f1fin=f1[-1]['eg']/f1[-1]['act']),
      plan=plan)
pr0=BASE['precio']
out['sens']=[[pr,[calc2(esc('base',precio=pr,churn=c))['res'] for c in (3,5,8)]] for pr in (pr0-2,pr0,pr0+2)]
out['sensConv']=[[c,calc2(esc('base',conversion=c))['res']] for c in (50,60,70,80)]
out['sens3']=[[pr,calc3('base',precio=pr)['res']] for pr in (pr0-2,pr0,pr0+2)]
out['par']=dict(BASE,**P); out['p3']=P3
json.dump(out,open('datos.json','w'),indent=1)
for n in ESC:
    x=out[n]; print(n,{k:{a:round(b,1) for a,b in x[k].items()} for k in ['q1','r29','a1','a2','cu']})
print(out['sens'],out['sens3'])
