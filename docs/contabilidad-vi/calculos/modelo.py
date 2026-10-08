import copy, json
BASE=dict(meta=40,precio=12,mesesGratis=1,conversion=70,churn=5,cajaInicial=0,
 nuevos=[8,12,20,10,10,12,12,12,14,14,16,16],dominio=18,tarjetas=36,tarjetasCada=3,
 googleOne=2.99,workspace=0,render=0,telefono=14,transporte=24,otros=0,ads=25,adsDesde=2,
 videoGratis=True,precioVideo=45,videosMes=1,videoDesde=2,sueldo=0,comision=0,impuesto=0,imprevistos=5)
ESC=dict(conservador=(0.6,55,8),base=(1,70,5),optimista=(1.4,80,3))
ETQ=['Oct 26','Nov 26','Dic 26','Ene 27','Feb 27','Mar 27','Abr 27','May 27','Jun 27','Jul 27','Ago 27','Sep 27']
def esc(nombre,**kw):
    s=copy.deepcopy(BASE); f,c,ch=ESC[nombre]
    s['nuevos']=[round(v*f) for v in BASE['nuevos']]; s['conversion']=c; s['churn']=ch; s.update(kw); return s
def calc(s):
    N=12;conv=s['conversion']/100;churn=s['churn']/100;filas=[];pag=0;caja=s['cajaInicial']
    for m in range(N):
        nuevos=s['nuevos'][m]
        convd=(s['nuevos'][m-s['mesesGratis']]*conv if m-s['mesesGratis']>=0 else 0) if s['mesesGratis']>0 else nuevos*conv
        bajas=pag*churn; pag=pag-bajas+convd
        prueba=sum(s['nuevos'][k] for k in range(max(0,m-s['mesesGratis']+1),m+1)) if s['mesesGratis']>0 else 0
        ing=pag*s['precio']; com=ing*s['comision']/100; imp=ing*s['impuesto']/100
        dom=s['dominio'] if m%12==0 else 0
        tar=s['tarjetas'] if s['tarjetasCada']>0 and m%s['tarjetasCada']==0 else 0
        infra=s['googleOne']+s['workspace']+s['render']; op=s['telefono']+s['transporte']+s['otros']
        ads=s['ads'] if m+1>=s['adsDesde'] else 0
        inf=0 if (m==0 and s['videoGratis']) else (s['precioVideo']*s['videosMes'] if (m+1>=s['videoDesde'] or not s['videoGratis']) else 0)
        base=dom+tar+infra+op+ads+inf+s['sueldo']; impr=base*s['imprevistos']/100
        eg=base+impr+com+imp; flujo=ing-eg; caja+=flujo
        filas.append(dict(et=ETQ[m],nuevos=nuevos,conv=convd,bajas=bajas,pag=pag,prueba=prueba,act=pag+prueba,ing=ing,
          dom=dom,tar=tar,infra=infra,op=op,ads=ads,inf=inf,sueldo=s['sueldo'],impr=impr,com=com,imp=imp,eg=eg,flujo=flujo,caja=caja,mkt=tar+ads+inf))
    S=lambda k:sum(f[k] for f in filas)
    eq=next((i for i,f in enumerate(filas) if f['flujo']>=0 and f['pag']>0),-1)
    capital=max(0,-min(min(f['caja'] for f in filas)-s['cajaInicial'],0))
    cac=S('mkt')/S('nuevos'); margen=s['precio']*(1-(s['comision']+s['impuesto'])/100)
    ltvp=margen/churn; ltvc=ltvp*conv
    return dict(filas=filas,eq=ETQ[eq] if eq>=0 else 'No alcanza',capital=capital,res=S('flujo'),ing=S('ing'),eg=S('eg'),
      cac=cac,ltvc=ltvc,ltvp=ltvp,pagF=filas[-1]['pag'],mrr=filas[-1]['ing'],q1=sum(f['nuevos'] for f in filas[:3]),mkt=S('mkt'),captados=S('nuevos'),
      cajaF=filas[-1]['caja'])
if __name__=='__main__':
    for n in ESC:
        r=calc(esc(n)); print(n,{k:(round(v,2) if isinstance(v,float) else v) for k,v in r.items() if k!='filas'})
        for f in r['filas']: print('  ',f['et'],round(f['nuevos'],1),round(f['pag'],1),round(f['ing'],2),round(f['eg'],2),round(f['flujo'],2),round(f['caja'],2))
    # adjusted professional scenario: IVA no (impuesto sobre ventas collected separately), IGTF 3%, ISLR ignored, sueldo 150, comision 
    for n in ESC:
        r=calc(esc(n,sueldo=150,impuesto=3,comision=0)); print('AJ',n,round(r['res'],2),r['eq'],round(r['capital'],2),round(r['cajaF'],2))
