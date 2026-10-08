# Fase 3: estructura de costos objetivo, proyectada para el segundo año (meses 13 a 24)
from ajustado import *
ETQ2=['Oct 27','Nov 27','Dic 27','Ene 28','Feb 28','Mar 28','Abr 28','May 28','Jun 28','Jul 28','Ago 28','Sep 28']
P3=dict(hora=3.5,hAlta=0.75,visitas=0.3,transp=1.60,hSoporte=0.3,isae=2,cobro=1,
  direccion=250,mant=70,nube=15,nubeExtra=15,nubeUmbral=200,dominio=1.5,telefono=14,contador=40,
  ads=40,influencer=90,material=12,impr=5,crec=1.25)
def calc3(nombre,p=P3,precio=None):
    s=esc(nombre); r1=calc(s); pag=r1['pagF']; precio=precio or s['precio']
    conv=s['conversion']/100; churn=s['churn']/100
    nuevos=[round(v*p['crec']) for v in s['nuevos']]; prev=s['nuevos'][-1]
    filas=[];caja=0
    for m in range(12):
        convd=(nuevos[m-1] if m else prev)*conv; bajas=pag*churn; pag=pag-bajas+convd
        act=pag+nuevos[m]; ing=pag*precio
        nube=p['nube']+(p['nubeExtra'] if act>p['nubeUmbral'] else 0)
        cfb=p['direccion']+p['mant']+nube+p['dominio']+p['telefono']+p['contador']+p['ads']+p['influencer']+p['material']
        cf=cfb*(1+p['impr']/100)
        alta=nuevos[m]*(p['hAlta']*p['hora']+p['visitas']*p['transp']); sop=act*p['hSoporte']*p['hora']; trib=ing*(p['isae']+p['cobro'])/100
        cv=alta+sop+trib; ct=cf+cv; fl=ing-ct; caja+=fl
        filas.append(dict(et=ETQ2[m],nuevos=nuevos[m],pag=pag,act=act,ing=ing,cf=cf,cv=cv,ct=ct,flujo=fl,caja=caja,cu=ct/act,alta=alta,sop=sop,trib=trib,mc=ing-cv,
          direccion=p['direccion']*(1+p['impr']/100)))
    S=lambda k:sum(f[k] for f in filas); u=filas[-1]
    cvu=p['hSoporte']*p['hora']+precio*(p['isae']+p['cobro'])/100; mcu=precio-cvu
    altaU=p['hAlta']*p['hora']+p['visitas']*p['transp']+p['hSoporte']*p['hora']
    pe=u['cf']/mcu; peC=(u['cf']+sum(nuevos[-3:])/3*altaU)/mcu
    uo=u['ing']-u['ct']
    cac=(S('alta')+(p['ads']+p['influencer']+p['material'])*12)/sum(nuevos)/conv
    return dict(filas=filas,ing=S('ing'),cf=S('cf'),cv=S('cv'),ct=S('ct'),res=S('flujo'),pagF=u['pag'],actF=u['act'],pagI=r1['pagF'],
      cvu=cvu,mcu=mcu,altaU=altaU,pe=pe,peC=peC,ms=(u['pag']-peC)/u['pag'],gao=u['mc']/uo if uo>0 else None,cuF=u['cu'],
      mcRatio=(S('ing')-S('cv'))/S('ing'),cac=cac,ltv=mcu/churn,captados=sum(nuevos),
      comp={k:S(k) for k in ['alta','sop','trib']})
if __name__=='__main__':
    for n in ESC:
        r=calc3(n); print(n,{k:(round(v,2) if isinstance(v,float) else v) for k,v in r.items() if k not in('filas',)})
