# Gráficos de la distribución binomial y de la distribución normal (Tarea 3 y proyecto final).
import math, numpy as np, matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.ticker import FuncFormatter
from statistics import NormalDist

AZUL,NARANJA,VERDE,GRIS,OSC,VERDE_OSC='#2a78d6','#eb6834','#1baf7a','#a3a39e','#0f0f0e','#0f7a5c'
def es(v,d=2):
    s=f'{abs(v):,.{d}f}'.replace(',','X').replace('.',',').replace('X','.'); return ('−' if v<0 else '')+s
def estilo(fuente):
    plt.rcParams.update({'font.family':fuente,'font.size':10,'axes.spines.top':False,'axes.spines.right':False,'axes.edgecolor':'#8a8a85',
      'axes.labelcolor':'#222','xtick.color':'#444','ytick.color':'#444','axes.grid':True,'grid.color':'#e6e6e2','axes.axisbelow':True})

def fig_binomial(ruta,fuente='Liberation Sans',tam=(6.4,3.7)):
    estilo(fuente); n,p=200,0.03
    k=np.arange(0,13); pk=np.array([math.comb(n,int(i))*p**i*(1-p)**(n-i) for i in k])
    col=[AZUL if i<=3 else GRIS if i==4 else NARANJA if i==5 else VERDE_OSC if i==6 else VERDE for i in k]
    fig,ax=plt.subplots(figsize=tam,dpi=220)
    ax.bar(k,pk,color=col,width=0.78,zorder=3)
    for i,v in zip(k,pk): ax.text(i,v+0.003,es(v,3),ha='center',va='bottom',fontsize=7.5,color='#222',zorder=4)
    ax.plot([6,6],[0.1785,0.2],color=OSC,ls='--',lw=1.3); ax.plot([6],[0.2],marker='v',ms=7,color=OSC,clip_on=False); ax.text(6,0.2055,'Valor esperado μ = 6',ha='center',va='bottom',fontsize=9,fontweight='bold')
    def corchete(x0,x1,y,t,c):
        ax.plot([x0,x0,x1,x1],[y-0.004,y,y,y-0.004],color=c,lw=1.4); ax.text((x0+x1)/2,y+0.003,t,ha='center',va='bottom',fontsize=9,color=c,fontweight='bold')
    corchete(-0.4,3.4,0.118,'P(X ≤ 3) = '+es(sum(pk[:4]),4),AZUL)
    corchete(5.6,12.4,0.178,'P(X ≥ 6) = '+es(1-sum(pk[:6]),4),VERDE_OSC)
    ax.annotate('P(X = 5) = '+es(pk[5],4),xy=(5,pk[5]+0.012),xytext=(1.7,0.185),fontsize=9,color=NARANJA,fontweight='bold',arrowprops=dict(arrowstyle='->',color=NARANJA,lw=1.2),ha='center')
    ax.yaxis.set_major_formatter(FuncFormatter(lambda v,_:es(v,3))); ax.set_xticks(k); ax.set_xlim(-0.8,12.8); ax.set_ylim(0,0.225); ax.grid(axis='x',visible=False)
    ax.set_xlabel('Número de unidades defectuosas en el lote (k)'); ax.set_ylabel('Probabilidad P(X = k)')
    ax.set_title('Distribución binomial de defectos por lote (n = 200, p = 0,03)',fontsize=11,fontweight='bold')
    fig.tight_layout(); fig.savefig(ruta); plt.close(fig)

def fig_normal(ruta,fuente='Liberation Sans',tam=(6.4,3.8)):
    estilo(fuente); mu,sg=45,8; N=NormalDist(mu,sg)
    x=np.linspace(21,69,500); y=np.array([N.pdf(v) for v in x])
    fig,ax=plt.subplots(figsize=tam,dpi=220)
    ax.fill_between(x,y,where=x<=37,color=NARANJA,alpha=0.75,lw=0); ax.fill_between(x,y,where=(x>=37)&(x<=53),color=AZUL,alpha=0.45,lw=0); ax.fill_between(x,y,where=x>=53,color=VERDE,alpha=0.75,lw=0)
    ax.plot(x,y,color=OSC,lw=1.6)
    for v in (29,37,53,61): ax.plot([v,v],[0,N.pdf(v)],color='#777',ls=':',lw=1)
    ax.plot([45,45],[0,0.0508],color=OSC,ls='--',lw=1.4)
    for v,t,ha,dx in ((N.inv_cdf(.10),'Percentil 10\n'+es(N.inv_cdf(.10))+' min','right',-0.5),(N.inv_cdf(.90),'Percentil 90\n'+es(N.inv_cdf(.90))+' min','left',0.5)):
        ax.plot([v],[0],marker='^',ms=8,color='#b4371f',zorder=6,clip_on=False)
        ax.plot([v,v],[0,N.pdf(v)],color='#b4371f',lw=1.2,ls='-.')
        ax.text(v+dx,0.0262,t,ha=ha,va='center',fontsize=8.5,color='#b4371f',fontweight='bold',bbox=dict(fc='white',ec='none',pad=1.5,alpha=.95))
    ax.text(45,0.0525,'Media μ = 45 min',ha='center',fontsize=9,fontweight='bold')
    bb=dict(fc='white',ec='none',pad=1.5,alpha=.95)
    ax.annotate('P(X < 37) = '+es(N.cdf(37),4),xy=(31.2,0.0042),xytext=(26.3,0.0135),fontsize=8.5,fontweight='bold',ha='center',bbox=bb,arrowprops=dict(arrowstyle='->',color=OSC,lw=1))
    ax.text(45,0.0215,'P(37 < X < 53)\n'+es(N.cdf(53)-N.cdf(37),4),ha='center',fontsize=10,fontweight='bold',color=OSC,bbox=dict(fc='white',ec='none',pad=2,alpha=.75),zorder=7)
    ax.annotate('P(X > 53) = '+es(1-N.cdf(53),4),xy=(58.8,0.0042),xytext=(63.7,0.0135),fontsize=8.5,fontweight='bold',ha='center',bbox=bb,arrowprops=dict(arrowstyle='->',color=OSC,lw=1))
    ax.yaxis.set_major_formatter(FuncFormatter(lambda v,_:es(v,2))); ax.set_xticks([21,29,37,45,53,61,69]); ax.set_xticklabels(['21\n−3σ','29\n−2σ','37\n−1σ','45\nμ','53\n+1σ','61\n+2σ','69\n+3σ'])
    ax.set_xlim(21,69); ax.set_ylim(0,0.0585); ax.grid(axis='x',visible=False)
    ax.set_xlabel('Tiempo de procesamiento (minutos)'); ax.set_ylabel('Densidad de probabilidad')
    ax.set_title('Distribución normal de los tiempos de procesamiento (μ = 45 min, σ = 8 min)',fontsize=10.5,fontweight='bold')
    fig.tight_layout(); fig.savefig(ruta); plt.close(fig)

if __name__=='__main__':
    fig_binomial('fig_binomial.png'); fig_normal('fig_normal.png'); print('ok')
