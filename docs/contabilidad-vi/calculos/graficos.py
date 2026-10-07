import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
from ajustado import *
plt.rcParams.update({'font.family':'Liberation Serif','font.size':11,'axes.spines.top':False,'axes.spines.right':False,
 'axes.edgecolor':'#8a8a85','axes.labelcolor':'#333','xtick.color':'#555','ytick.color':'#555','axes.grid':True,'grid.color':'#e6e6e2','axes.axisbelow':True})
C={'conservador':'#eb6834','base':'#2a78d6','optimista':'#1baf7a'}
NOM={'conservador':'Conservador','base':'Base','optimista':'Optimista'}
R={n:calc2(esc(n)) for n in ESC}; R0={n:calc(esc(n)) for n in ESC}
x=list(range(12))
from matplotlib.ticker import FuncFormatter
def es(v,d=0):
    t=f'{v:,.{d}f}'; return t.replace(',','X').replace('.',',').replace('X','.')
def lineas(key,fn,ylabel,fmt=None,src=R,ref=None,leg='upper left',nud=None):
    fig,ax=plt.subplots(figsize=(6.5,3.6),dpi=200)
    for n in ESC:
        y=[f[key] for f in src[n]['filas']]
        ax.plot(x,y,color=C[n],lw=2,marker='o',ms=4,label=NOM[n])
        ax.annotate(fmt(y[-1]) if fmt else es(y[-1]),(11,y[-1]),xytext=(6,(nud or {}).get(n,0)),textcoords='offset points',va='center',fontsize=9.5,color='#222')
    if ref is not None: ax.axhline(ref,color='#555',lw=1)
    ax.set_xticks(x); ax.set_xticklabels(ETQ,rotation=45,ha='right',fontsize=9); ax.set_ylabel(ylabel)
    ax.legend(frameon=False,ncol=3,loc=leg,fontsize=9.5); ax.yaxis.set_major_formatter(FuncFormatter(lambda v,_:es(v,1 if key=='cu' else 0))); ax.set_xlim(-0.4,12.2)
    fig.tight_layout(); fig.savefig(fn); plt.close(fig)
lineas('pag','fig1.png','Negocios pagando')
lineas('cu','fig3.png','Costo total por negocio activo (USD)',fmt=lambda v:'$'+es(v,2),leg='upper right',nud={'base':5,'optimista':-5})
lineas('caja','fig4.png','Caja acumulada (USD)',fmt=lambda v:('−' if v<0 else '')+'$'+es(abs(v)),ref=0)
# fig2: costos anuales actual vs ajustado
fig,ax=plt.subplots(figsize=(6.5,3.6),dpi=200)
import numpy as np
xs=np.arange(3); w=0.34
act=[R0[n]['eg'] for n in ESC]; cf=[R[n]['cf'] for n in ESC]; cv=[R[n]['cv'] for n in ESC]
ax.bar(xs-w/2-0.01,act,w,color='#9a9a94',label='Modelo actual (todo fijo)')
ax.bar(xs+w/2+0.01,cf,w,color='#2a78d6',label='Ajustado: costos fijos')
ax.bar(xs+w/2+0.01,cv,w,bottom=[a+8 for a in cf],color='#eb6834',label='Ajustado: costos variables')
for i in range(3):
    ax.text(xs[i]-w/2,act[i]+60,'$'+es(act[i]),ha='center',fontsize=9)
    ax.text(xs[i]+w/2,cf[i]+cv[i]+70,'$'+es(cf[i]+cv[i]),ha='center',fontsize=9)
ax.yaxis.set_major_formatter(FuncFormatter(lambda v,_:es(v))); ax.set_xticks(xs); ax.set_xticklabels([NOM[n] for n in ESC]); ax.set_ylabel('Costos del año (USD)')
ax.legend(frameon=False,fontsize=9,loc='upper left'); ax.set_ylim(0,max(a+b for a,b in zip(cf,cv))*1.25); ax.grid(axis='x',visible=False)
fig.tight_layout(); fig.savefig('fig2.png'); plt.close(fig)
