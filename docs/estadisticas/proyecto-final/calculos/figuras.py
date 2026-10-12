# Figuras del proyecto final (estilo Times New Roman, como el documento).
import sys, os, math, numpy as np
sys.path.insert(0,'../../tarea-3/calculos')
from graficos_comunes import *
import matplotlib.pyplot as plt
from matplotlib.ticker import FuncFormatter
FU='Liberation Serif'
sal=[1.2,1.3,1.3,1.3,1.4,1.4,1.4,1.5,1.5,1.5,1.5,1.5,1.6,1.6,1.6,1.6,1.6,1.7,1.7,1.7,1.7,1.7,1.8,1.8,1.8,1.8,1.8,1.8,1.9,1.9,1.9,1.9,1.9,2.0,2.0,2.0,2.0,2.0,2.0,2.1,2.1,2.1,2.1,2.1,2.2,2.2,2.2,2.3,2.3,2.4]
def fig_salarios(ruta):
    estilo(FU); plt.rcParams['font.size']=11
    lim=[1.20+0.18*i for i in range(8)]; fi=[4,8,10,11,6,8,3]; marcas=[(lim[i]+lim[i+1])/2 for i in range(7)]
    fig,ax=plt.subplots(figsize=(6.4,3.5),dpi=220)
    cols=[AZUL]*7; cols[3]=NARANJA
    ax.bar(marcas,fi,width=0.18,color=cols,edgecolor='white',lw=1.2,zorder=3)
    ax.plot([marcas[0]-0.18]+marcas+[marcas[-1]+0.18],[0]+fi+[0],color=OSC,marker='o',ms=4,lw=1.5,zorder=4)
    for m,f in zip(marcas,fi): ax.text(m,f+0.35,str(f),ha='center',fontsize=10,fontweight='bold',zorder=5)
    media=sum(sal)/len(sal); ax.axvline(media,color='#b4371f',ls='--',lw=1.3,zorder=2); ax.text(media-0.014,13.1,'Media = '+es(media,3)+' millones de Bs.',fontsize=9.5,color='#b4371f',fontweight='bold',ha='right')
    ax.annotate('Clase modal\n1,74 – 1,92',xy=(marcas[3],11.1),xytext=(2.28,12.6),fontsize=9.5,ha='center',arrowprops=dict(arrowstyle='->',lw=1),color=NARANJA,fontweight='bold')
    ax.set_xticks(lim); ax.set_xticklabels([es(v,2) for v in lim]); ax.set_xlim(1.05,2.6); ax.set_ylim(0,14.6); ax.grid(axis='x',visible=False)
    ax.set_xlabel('Salario mensual (millones de Bs.)'); ax.set_ylabel('Número de empleados (fᵢ)')
    ax.set_title('Distribución de frecuencias de los salarios de 50 empleados operativos',fontsize=11.5,fontweight='bold')
    fig.tight_layout(); fig.savefig(ruta); plt.close(fig)
def fig_ventas(ruta):
    estilo(FU); plt.rcParams['font.size']=11
    st=[dict(label='Caracas',whislo=7.80,q1=8.725,med=9.35,q3=9.975,whishi=11.00,fliers=[]),dict(label='Maracaibo',whislo=5.20,q1=6.025,med=6.90,q3=12.95,whishi=15.00,fliers=[])]
    fig,ax=plt.subplots(figsize=(6.4,3.4),dpi=220)
    bp=ax.bxp(st,orientation="horizontal",showmeans=False,patch_artist=True,widths=0.5,boxprops=dict(lw=1.3),medianprops=dict(color=OSC,lw=2),whiskerprops=dict(lw=1.3),capprops=dict(lw=1.3))
    for patch,c in zip(bp['boxes'],(AZUL,NARANJA)): patch.set_facecolor(c); patch.set_alpha(.55); patch.set_edgecolor(c)
    for y,m,c in ((1,9.3767,AZUL),(2,8.9067,NARANJA)): ax.plot([m],[y],marker='D',ms=7,color=OSC,markerfacecolor='white',zorder=6)
    ax.plot([],[],marker='D',ls='',color=OSC,markerfacecolor='white',label='Media')
    ax.text(11.15,1,'IQR = 1,250\nCV = 8,66 %',va='center',fontsize=10); ax.text(15.15,2,'IQR = 6,925\nCV = 40,78 %',va='center',fontsize=10)
    ax.set_yticks([1,2]); ax.set_yticklabels(['Caracas','Maracaibo'],fontsize=11); ax.set_xlim(4.5,18.2); ax.grid(axis='y',visible=False)
    ax.set_xlabel('Ventas diarias (millones de Bs.)'); ax.legend(loc='lower right',frameon=False,fontsize=9.5)
    ax.set_title('Diagrama de caja de las ventas diarias por sucursal (30 días)',fontsize=11.5,fontweight='bold')
    fig.tight_layout(); fig.savefig(ruta); plt.close(fig)
def fig_cv(ruta,datos):
    estilo(FU); plt.rcParams['font.size']=11
    fig,ax=plt.subplots(figsize=(6.4,3.5),dpi=220)
    nombres=[d[0] for d in datos][::-1]; v=[d[1] for d in datos][::-1]
    cols=[VERDE if x<15 else '#e0a100' if x<=30 else NARANJA for x in v]
    ax.barh(nombres,v,color=cols,height=0.6,zorder=3)
    for i,x in enumerate(v): ax.text(x+0.8,i,es(x,1)+' %',va='center',fontsize=10.5,fontweight='bold')
    for t,lab in ((15,'15 %'),(30,'30 %')): ax.axvline(t,color='#555',ls='--',lw=1.1,zorder=2); ax.text(t,len(v)-0.42,lab,ha='center',fontsize=9.5,color='#555',bbox=dict(fc='white',ec='none',pad=1.5))
    from matplotlib.patches import Patch
    ax.legend(handles=[Patch(color=VERDE,label='Baja (< 15 %)'),Patch(color='#e0a100',label='Moderada (15 % a 30 %)'),Patch(color=NARANJA,label='Alta (> 30 %)')],loc='upper center',bbox_to_anchor=(0.42,-0.2),ncol=3,frameon=False,fontsize=9.5)
    ax.set_ylim(-0.6,len(v)-0.1); ax.set_xlim(0,50); ax.grid(axis='y',visible=False); ax.set_xlabel('Coeficiente de variación (CV = desviación estándar / media)')
    ax.set_title('Coeficiente de variación de las variables de las tres tareas',fontsize=11.5,fontweight='bold')
    fig.tight_layout(); fig.savefig(ruta); plt.close(fig)
if __name__=='__main__':
    fig_binomial('fig_binomial.png',FU); fig_normal('fig_normal.png',FU)
    fig_salarios('fig_salarios.png'); fig_ventas('fig_ventas.png')
    import statistics as st
    cv_sal=st.stdev(sal)/st.mean(sal)*100
    fig_cv('fig_cv.png',[('Salarios (Tarea 1)',cv_sal),('Ventas Caracas (Tarea 2)',8.66),('Ventas Maracaibo (Tarea 2)',40.78),('Tiempo de procesamiento (Tarea 3)',8/45*100),('Defectos por lote (Tarea 3)',math.sqrt(5.82)/6*100)])
    print('ok',cv_sal)
