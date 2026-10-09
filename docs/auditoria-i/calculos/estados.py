# Estados financieros ilustrativos de bookeaa para el primer ejercicio (1-10-2026 a 30-09-2027),
# construidos con el escenario base del proyecto de costos (cifras modificadas por confidencialidad).
import sys, json
sys.path.insert(0,'../../contabilidad-vi/calculos')
from fase3 import *
s=esc('base'); f1=calc(s)['filas']; f2=calc2(s)['filas']; p=P
r=lambda v:round(v)
ing=sum(f['ing'] for f in f1[:3])+sum(f['ing'] for f in f2[3:])
q=f1[:3]; z=f2[3:]
nuevos2=sum(f['nuevos'] for f in z)
hon=sum(f['nuevos']*p['hAlta']*p['hora']+f['sop']+f['mant'] for f in z)          # equipo: incorporación, soporte y mantenimiento
nube=sum(f['infra'] for f in q)+sum(f['g1']+f['ws'] for f in z)                  # alojamiento y almacenamiento en la nube
dominio=s['dominio']                                                             # devengado en 12 meses
transp=s['transporte']*3+nuevos2*p['transpAlta']
tel=s['telefono']*12
pub=sum(f['ads'] for f in q)+sum(f['ads'] for f in z)
infl=sum(f['inf'] for f in q)+sum(f['inf'] for f in z)
mat=s['tarjetas']/s['tarjetasCada']*12
trib=sum(f['trib'] for f in z)+sum(f['ing'] for f in q)*0.03
otros=sum(f['impr'] for f in q)+sum(f['impr'] for f in z)
equipo=900; dep=equipo/36*12; honaud=0
E=dict(ing=r(ing),hon=r(hon),nube=r(nube),dep=r(dep),pub=r(pub),infl=r(infl),mat=r(mat),transp=r(transp),tel=r(tel),dominio=r(dominio),trib=r(trib),otros=r(otros))
E['costoServ']=E['hon']+E['nube']+E['dep']
E['bruta']=E['ing']-E['costoServ']
E['gVenta']=E['pub']+E['infl']+E['mat']+E['transp']
E['gAdm']=E['tel']+E['dominio']+E['trib']+E['otros']
E['uop']=E['bruta']-E['gVenta']-E['gAdm']
E['islr']=r(E['uop']*0.15)
E['neta']=E['uop']-E['islr']
# balance al 30-09-2027
mrrSep=f2[-1]['ing']
B=dict(cxc=60,prepag=30,equipoBruto=equipo,depAcum=r(dep),
       cxp=96,honPorPagar=r(f2[-1]['sop']+f2[-1]['mant']),tribPorPagar=r(f2[-1]['trib'])+E['islr'],difer=48,capital=2000)
B['equipoNeto']=B['equipoBruto']-B['depAcum']
B['pasivo']=B['cxp']+B['honPorPagar']+B['tribPorPagar']+B['difer']
B['patrimonio']=B['capital']+E['neta']
B['efectivo']=B['pasivo']+B['patrimonio']-B['cxc']-B['prepag']-B['equipoNeto']
B['banco']=r(B['efectivo']*0.78); B['digital']=B['efectivo']-B['banco']
B['activoCorr']=B['efectivo']+B['cxc']+B['prepag']; B['activo']=B['activoCorr']+B['equipoNeto']
# datos para la analítica de ingresos
meses=[dict(et=f['et'],pag=f['pag'],ing=f['ing']) for f in f1[:3]]+[dict(et=f['et'],pag=f['pag'],ing=f['ing']) for f in f2[3:]]
mat_=dict(base=E['ing'],pct=0.015); mat_['global']=r(mat_['base']*mat_['pct']); mat_['desemp']=r(mat_['global']*0.70); mat_['trivial']=r(mat_['global']*0.05)
out=dict(E=E,B=B,meses=meses,mat=mat_,precio=s['precio'],conv=s['conversion'],churn=s['churn'],nuevos=s['nuevos'])
json.dump(out,open('estados.json','w'),indent=1)
print(json.dumps(E),'\n',json.dumps(B),'\n',mat_)
