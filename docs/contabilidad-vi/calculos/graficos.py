import json, matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt, numpy as np
from matplotlib.ticker import FuncFormatter, MaxNLocator
D=json.load(open('datos.json'))
plt.rcParams.update({'font.family':'Liberation Serif','font.size':11,'axes.spines.top':False,'axes.spines.right':False,
 'axes.edgecolor':'#8a8a85','axes.labelcolor':'#333','xtick.color':'#555','ytick.color':'#555','axes.grid':True,'grid.color':'#e6e6e2','axes.axisbelow':True})
C={'conservador':'#eb6834','base':'#2a78d6','optimista':'#1baf7a'}
NOM={'conservador':'Conservador','base':'Base','optimista':'Optimista'}
ESC=list(C)
def es(v,d=0):
    t=f'{abs(v):,.{d}f}'.replace(',','X').replace('.',',').replace('X','.'); return ('−' if v<0 else '')+t
ET=[p['et'] for p in D['base']['plan']]; x=np.arange(24)
def fases(ax):
    ax.axvspan(-0.5,2.5,color='#f1f1ee',zorder=0); ax.axvspan(11.5,23.5,color='#f7f7f5',zorder=0)
    for xc,t in ((1,'Fase 1'),(7,'Fase 2'),(17.5,'Fase 3')):
        ax.text(xc,1.0,t,transform=ax.get_xaxis_transform(),ha='center',va='bottom',fontsize=9.5,color='#444')
def lineas(key,fn,ylabel,fmt,dec=0,ref=None,leg='upper left',nud=None):
    fig,ax=plt.subplots(figsize=(6.5,3.7),dpi=200); fases(ax)
    for n in ESC:
        y=[p[key] for p in D[n]['plan']]
        ax.plot(x,y,color=C[n],lw=2,marker='o',ms=3,label=NOM[n])
        ax.annotate(fmt(y[-1]),(23,y[-1]),xytext=(6,(nud or {}).get(n,0)),textcoords='offset points',va='center',fontsize=9.5,color='#222')
    if ref is not None: ax.axhline(ref,color='#555',lw=1)
    ax.set_xticks(x[::2]); ax.set_xticklabels(ET[::2],rotation=45,ha='right',fontsize=9); ax.set_ylabel(ylabel)
    ax.yaxis.set_major_locator(MaxNLocator(integer=True)); ax.yaxis.set_major_formatter(FuncFormatter(lambda v,_:es(v,dec))); ax.set_xlim(-0.5,25.5); ax.grid(axis='x',visible=False)
    ax.legend(frameon=False,ncol=3,loc=leg,fontsize=9.5,bbox_to_anchor=(0,0.97) if leg=='upper left' else None)
    fig.tight_layout(); fig.savefig(fn); plt.close(fig)
lineas('pag','fig1.png','Negocios pagando',lambda v:es(v))
lineas('cu','fig3.png','Costo por negocio activo (USD)',lambda v:'$'+es(v,2),dec=0,leg='upper right',nud={'base':4,'optimista':-4})
lineas('caja','fig4.png','Caja acumulada (USD)',lambda v:('−' if v<0 else '')+'$'+es(abs(v)),ref=0)
# fig2: costo mensual promedio por fase, fijo y variable
fig,ax=plt.subplots(figsize=(6.5,3.7),dpi=200)
w=0.26; xs=np.arange(3)
for j,f in enumerate((1,2,3)):
    cf=[np.mean([p['cf'] for p in D[n]['plan'] if p['fase']==f]) for n in ESC]
    cv=[np.mean([p['cv'] for p in D[n]['plan'] if p['fase']==f]) for n in ESC]
    xx=xs+(j-1)*(w+0.03)
    ax.bar(xx,cf,w,color='#2a78d6',label='Costos fijos' if j==0 else None)
    ax.bar(xx,cv,w,bottom=[a+3 for a in cf],color='#eb6834',label='Costos variables' if j==0 else None)
    for i in range(3):
        ax.text(xx[i],cf[i]+cv[i]+12,f'F{f}',ha='center',fontsize=8.5,color='#333')
ax.set_xticks(xs); ax.set_xticklabels([NOM[n] for n in ESC]); ax.set_ylabel('Costo mensual promedio (USD)')
ax.yaxis.set_major_formatter(FuncFormatter(lambda v,_:es(v))); ax.legend(frameon=False,fontsize=9.5,loc='upper left'); ax.grid(axis='x',visible=False)
fig.tight_layout(); fig.savefig('fig2.png'); plt.close(fig)
