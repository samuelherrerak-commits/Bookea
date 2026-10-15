import sys,torch,soundfile as sf,numpy as np
from df.enhance import init_df,enhance
model,state,_=init_df("dfm/DeepFilterNet3",post_filter=True)
x,sr=sf.read(sys.argv[1],dtype="float32"); assert sr==state.sr(),sr
y=enhance(model,state,torch.from_numpy(x)[None],atten_lim_db=None)
sf.write(sys.argv[2],y[0].numpy(),sr)
