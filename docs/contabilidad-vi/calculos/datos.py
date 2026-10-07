import json
from ajustado import *
out={}
for n in ESC:
    s=esc(n); r0=calc(s); r=calc2(s)
    F=r['filas']; S=lambda k:sum(f[k] for f in F)
    out[n]=dict(nuevos=s['nuevos'],conv=s['conversion'],churn=s['churn'],
      o={k:r0[k] for k in r0 if k!='filas'},
      a={k:r[k] for k in r if k!='filas'},
      comp={k:S(k) for k in ['alta','sop','trib','g1','ws','mant','tel','dom','tar','ads','inf','impr','ing','cf','cv','ct']},
      mes=[{k:f[k] for k in ['et','nuevos','pag','act','ing','cf','cv','ct','flujo','caja','cu']} for f in F],
      mes0=[{k:f[k] for k in ['et','nuevos','conv','bajas','pag','ing','eg','flujo','caja']} for f in r0['filas']])
out['sens']={pr:[calc2(esc('base',precio=pr,churn=c))['res'] for c in (3,5,8)] for pr in (8,10,12)}
out['sensConv']=[[c,calc2(esc('base',conversion=c))['res']] for c in (50,60,70,80)]
json.dump(out,open('datos.json','w'),indent=1)
print(json.dumps({n:out[n]['comp'] for n in ESC},indent=0))
