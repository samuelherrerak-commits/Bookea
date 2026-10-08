from modelo import *
P=dict(hora=3.5,hAlta=2,hSoporte=0.5,transpAlta=1.60,hMant=20,isae=2,cobro=1,ws=7.20,wsUmbral=100)
def calc2(s,p=P):
    N=12;conv=s['conversion']/100;churn=s['churn']/100;pag=0;caja=0;filas=[]
    for m in range(N):
        nuevos=s['nuevos'][m]; convd=s['nuevos'][m-1]*conv if m>=1 else 0
        bajas=pag*churn; pag=pag-bajas+convd; prueba=nuevos; act=pag+prueba
        ing=pag*s['precio']
        # fijos (devengados)
        dom=s['dominio']/12; tar=s['tarjetas']/s['tarjetasCada']; g1=s['googleOne']
        ws=p['ws'] if act>p['wsUmbral'] else 0
        tel=s['telefono']; ads=s['ads'] if m>=1 else 0; inf=s['precioVideo'] if m>=1 else 0
        mant=p['hMant']*p['hora']
        cfBase=dom+tar+g1+ws+tel+ads+inf+mant; impr=cfBase*0.05; cf=cfBase+impr
        # variables
        alta=nuevos*(p['hAlta']*p['hora']+p['transpAlta']); sop=act*p['hSoporte']*p['hora']
        trib=ing*(p['isae']+p['cobro'])/100; cv=alta+sop+trib
        ct=cf+cv; flujo=ing-ct; caja+=flujo
        filas.append(dict(et=ETQ[m],nuevos=nuevos,pag=pag,act=act,ing=ing,dom=dom,tar=tar,g1=g1,ws=ws,tel=tel,ads=ads,inf=inf,mant=mant,impr=impr,
          cf=cf,alta=alta,sop=sop,trib=trib,cv=cv,ct=ct,flujo=flujo,caja=caja,cu=ct/act if act else 0,mc=ing-cv))
    S=lambda k:sum(f[k] for f in filas)
    eq=next((i for i,f in enumerate(filas) if f['flujo']>=0),-1)
    capital=-min(0,min(f['caja'] for f in filas))
    u=filas[-1]
    cvu=p['hSoporte']*p['hora']+s['precio']*(p['isae']+p['cobro'])/100; mcu=s['precio']-cvu
    cfEst=u['cf']
    pe=cfEst/mcu
    nuevosProm=sum(s['nuevos'][-3:])/3
    peCrec=(cfEst+nuevosProm*(p['hAlta']*p['hora']+p['transpAlta']+p['hSoporte']*p['hora']))/mcu
    ms=(u['pag']-peCrec)/u['pag']
    utilOp=u['ing']-u['ct']; gao=u['mc']/utilOp if utilOp>0 else float('nan')
    return dict(filas=filas,eq=ETQ[eq] if eq>=0 else 'No alcanza',capital=capital,ing=S('ing'),cf=S('cf'),cv=S('cv'),ct=S('ct'),res=S('flujo'),
      cvu=cvu,mcu=mcu,cfEst=cfEst,pe=pe,peCrec=peCrec,ms=ms,gao=gao,cuF=u['cu'],cu0=filas[1]['cu'],pagF=u['pag'],actF=u['act'],
      cacTotal=(S('alta')+S('tar')+S('ads')+S('inf'))/S('nuevos'), mcRatio=(S('ing')-S('cv'))/S('ing'))
if __name__=='__main__':
    for n in ESC:
        r=calc2(esc(n)); print(n,{k:(round(v,2) if isinstance(v,float) else v) for k,v in r.items() if k!='filas'})
        for f in r['filas']: print('  ',f['et'],round(f['pag'],1),round(f['act'],1),round(f['ing'],1),round(f['cf'],1),round(f['cv'],1),round(f['ct'],1),round(f['flujo'],1),round(f['caja'],1),round(f['cu'],2))
    print('sens precio x churn (base) resultado anual ajustado')
    for pr in (8,10,12):
        print(pr,[round(calc2(esc('base',precio=pr,churn=c))['res']) for c in (3,5,8)])
    print('sens conversion (base)',[(c,round(calc2(esc('base',conversion=c))['res'])) for c in (50,60,70,80)])
