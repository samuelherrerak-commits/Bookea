# Fuente única de cifras del proyecto final (se lee desde el generador del Word).
import math, json, statistics as st
from statistics import NormalDist
sal=[1.2,1.3,1.3,1.3,1.4,1.4,1.4,1.5,1.5,1.5,1.5,1.5,1.6,1.6,1.6,1.6,1.6,1.7,1.7,1.7,1.7,1.7,1.8,1.8,1.8,1.8,1.8,1.8,1.9,1.9,1.9,1.9,1.9,2.0,2.0,2.0,2.0,2.0,2.0,2.1,2.1,2.1,2.1,2.1,2.2,2.2,2.2,2.3,2.3,2.4]
n=len(sal); S=round(sum(sal),4); m=S/n; sd=st.stdev(sal); s=sorted(sal)
q=lambda p:(lambda pos:(s[int(pos)-1]+(pos-int(pos))*(s[int(pos)]-s[int(pos)-1])) if pos<n else s[-1])(p*(n+1))
sk=sum((x-m)**3 for x in sal)/n/(sum((x-m)**2 for x in sal)/n)**1.5
lt=[x for x in sal if x<1.8]; md=[x for x in sal if 1.8<=x<=2.0]; hi=[x for x in sal if x>2.0]; lo2=[x for x in sal if x<1.56]
grp=lambda a,l:dict(label=l,n=len(a),pn=len(a)/n,suma=round(sum(a),2),ps=sum(a)/S)
fi=[4,8,10,11,6,8,3]; lim=[round(1.2+0.18*i,2) for i in range(8)]
sal_d=dict(n=n,suma=S,media=m,mediana=st.median(sal),sd=sd,cv=sd/m,q1=q(.25),q3=q(.75),skew=sk,anual=S*12,
  grupos=[grp(lt,'Menos de 1,8'),grp(md,'De 1,8 a 2,0'),grp(hi,'Más de 2,0')],
  esc=dict(n=len(lo2),actual=round(sum(lo2),2),costo=len(lo2)*1.77-sum(lo2),pct=(len(lo2)*1.77-sum(lo2))/S,anual=(len(lo2)*1.77-sum(lo2))*12),
  freq=[dict(lo=lim[i],hi=lim[i+1],marca=round((lim[i]+lim[i+1])/2,2),fi=fi[i],hi_=fi[i]/n,Fi=sum(fi[:i+1]),Hi=sum(fi[:i+1])/n) for i in range(7)],
  media_grup=sum(((lim[i]+lim[i+1])/2)*fi[i] for i in range(7))/n)
# ventas (medidas resumen de la Asignación II)
V=dict(car=dict(m=9.3767,med=9.35,q1=8.725,q3=9.975,d1=8.39,d9=10.41,mn=7.8,mx=11.0,s=0.8118,cv=.0866,suma=281.30),
       mar=dict(m=8.9067,med=6.90,q1=6.025,q3=12.95,d1=5.59,d9=14.02,mn=5.2,mx=15.0,s=3.6321,cv=.4078,suma=267.20))
for k,v in V.items():
    v['rango']=v['mx']-v['mn']; v['iqr']=v['q3']-v['q1']; v['d1_m']=v['d1']/v['m']; v['sd_tot']=v['s']*math.sqrt(30); v['ic']=1.96*v['sd_tot']
    v['lo']=v['suma']-v['ic']; v['hi']=v['suma']+v['ic']; v['var_pct']=v['ic']/v['suma']
V['dif_media']=V['car']['m']-V['mar']['m']; V['dif_pct']=V['dif_media']/V['mar']['m']; V['dif_mes']=V['car']['suma']-V['mar']['suma']
V['mar_media_sobre_med']=V['mar']['m']/V['mar']['med']-1
# calidad
nn=200
def cum(p,k): return sum(math.comb(nn,i)*p**i*(1-p)**(nn-i) for i in range(k+1))
pm=lambda p,k: math.comb(nn,k)*p**k*(1-p)**(nn-k)
Nrm=NormalDist(45,8)
C=dict(mu=6,var=5.82,sd=math.sqrt(5.82),p5=pm(.03,5),pge6=1-cum(.03,5),ple3=cum(.03,3),pge10=1-cum(.03,9),pge14=1-cum(.03,13),cum6=cum(.03,6),cum9=cum(.03,9),
  esc=[dict(p=pp,mu=nn*pp,costo=nn*pp,delta=nn*pp/6-1,pge10=1-cum(pp,9),pge6=1-cum(pp,5)) for pp in (.03,.02,.01)],
  z10=NormalDist().inv_cdf(.10),p_lt37=Nrm.cdf(37),p_gt53=1-Nrm.cdf(53),p_mid=Nrm.cdf(53)-Nrm.cdf(37),x10=Nrm.inv_cdf(.10),x90=Nrm.inv_cdf(.90),
  cv_t=8/45,cv_d=math.sqrt(5.82)/6,u_lt37=200*Nrm.cdf(37),u_gt53=200*(1-Nrm.cdf(53)),horas=200*45/60,holgura=(Nrm.inv_cdf(.9)-45)/45)
json.dump(dict(sal=sal_d,V=V,C=C),open('datos.json','w'),indent=1,ensure_ascii=False)
print(json.dumps(sal_d,ensure_ascii=False)[:900]); print(json.dumps({k:C[k] for k in C if k!='esc'})); print(C['esc']); print({k:V[k] for k in ('dif_media','dif_pct','dif_mes','mar_media_sobre_med')}); print(V['car']['d1_m'],V['mar']['d1_m'],V['car']['sd_tot'],V['mar']['sd_tot'],V['car']['lo'],V['car']['hi'],V['mar']['lo'],V['mar']['hi'],V['car']['var_pct'],V['mar']['var_pct'])
