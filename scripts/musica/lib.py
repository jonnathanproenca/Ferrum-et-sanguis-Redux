import numpy as np, subprocess, sys
from scipy.signal import butter, sosfilt, fftconvolve
SR=32000
rng=np.random.default_rng(7)
def mf(m): return 440*2**((m-69)/12)
def lp(x,fc,o=2): return sosfilt(butter(o,fc,'low',fs=SR,output='sos'),x)
def bp(x,lo,hi): return sosfilt(butter(2,[lo,hi],'band',fs=SR,output='sos'),x)
def env(n,a,r):
    e=np.ones(n); na=min(n,int(a*SR)); nr=min(n,int(r*SR))
    e[:na]=np.linspace(0,1,na); e[n-nr:]*=np.linspace(1,0,nr); return e
def pluck(m,dur,vol=1.0):
    f=mf(m); N=int(SR/f); n=int(dur*SR)
    b=rng.uniform(-1,1,N); b=lp(b,4500,1)  # pulso suave
    out=np.zeros(n+N); pos=0; cur=b.copy()
    while pos<n:
        out[pos:pos+N]=cur; nxt=0.5*(cur+np.roll(cur,-1)); cur=nxt*0.9965; pos+=N
    out=out[:n]*np.exp(-np.arange(n)/SR/ (dur*0.9))
    return out*vol/ (np.abs(out).max()+1e-9)
def saw(f,n,det=0.0,vib=0.0,ph=0.0):
    t=np.arange(n)/SR; v=1+vib*np.sin(2*np.pi*5.2*t+ph)
    return 2*(((f*(1+det))*t*v+ph)%1)-1
def pad(ms,dur,vol=1.0):
    n=int(dur*SR); x=np.zeros(n)
    for m in ms:
        f=mf(m)
        for d,ph in ((-0.004,0),(0.0,.3),(0.005,.6)): x+=saw(f,n,d,0.0,ph)
    x=lp(x,900,2); x*=env(n,min(1.2,dur*0.4),min(1.2,dur*0.4))
    return x*vol/len(ms)/3
def horn(m,dur,vol=1.0):
    n=int(dur*SR); f=mf(m); x=saw(f,n,0,0.004)+0.7*saw(f,n,0.003,0.004,.2)
    x=lp(x,1100+ 300*(m>66),2)
    t=np.arange(n)/SR; x*=np.minimum(1,t/0.18)*(1+0.15*np.sin(2*np.pi*5.5*t)) * env(n,0.1,0.3)
    return x*vol*0.5
def tom(f0=110,f1=48,dec=0.45,vol=1.0,click=0.3):
    n=int(dec*2.2*SR); t=np.arange(n)/SR
    fr=f1+(f0-f1)*np.exp(-t*18); ph=2*np.pi*np.cumsum(fr)/SR
    x=np.sin(ph)*np.exp(-t/dec*3)
    x+=click*lp(rng.uniform(-1,1,n),900,1)*np.exp(-t*60)
    return x*vol
def slap(vol=1.0):
    n=int(0.12*SR); t=np.arange(n)/SR
    return bp(rng.uniform(-1,1,n),700,3200)*np.exp(-t*45)*vol
def place(buf,x,t0):
    i=int(t0*SR)
    if i>=len(buf): return
    j=min(len(buf),i+len(x)); buf[i:j]+=x[:j-i]
def reverb(x,sec=2.6,wet=0.32):
    n=int(sec*SR); t=np.arange(n)/SR
    outs=[]
    for k in range(2):
        ir=rng.normal(size=n)*np.exp(-t*2.3); ir=lp(ir,5000,1)
        ir[:int(0.02*SR)]*=np.linspace(0,1,int(0.02*SR))
        outs.append(x+wet*fftconvolve(x,ir/ np.abs(ir).sum()*40)[:len(x)])
    return np.stack(outs,1)
def render(name,bpm,bars,chords,bass,melody_fn,drums_fn,extra=None,tail=3.5):
    beat=60/bpm; L=bars*4*beat; n=int((L+tail)*SR)
    mel=np.zeros(n); pd=np.zeros(n); bs=np.zeros(n); dr=np.zeros(n); hn=np.zeros(n)
    for b in range(bars):
        t0=b*4*beat
        place(pd,pad(chords[b%len(chords)],4*beat+0.6,0.9),t0)
        place(bs,pad([bass[b%len(bass)]],4*beat+0.2,1.6)+0.5*pad([bass[b%len(bass)]+12],4*beat+0.2,0.6),t0)
    melody_fn(mel,hn,beat); drums_fn(dr,beat,bars)
    mix=0.55*mel+0.6*pd+0.7*bs+0.9*hn
    wet=reverb(mix)
    dry=np.stack([dr,dr],1)*0.9
    out=wet+dry+0.12*reverb(dr,1.8,0.5)
    Ln=int(L*SR); res=out[:Ln].copy(); tl=out[Ln:Ln+int(tail*SR)]; res[:len(tl)]+=tl
    res/=np.abs(res).max(); res*=0.85
    pcm=(res*32767).astype(np.int16)
    open(f'{name}.raw','wb').write(pcm.tobytes())
    subprocess.run(['ffmpeg','-loglevel','error','-y','-f','s16le','-ar',str(SR),'-ac','2','-i',f'{name}.raw','-af','loudnorm=I=-18:TP=-2','-b:a','96k',f'{name}.mp3'],check=True)
    print(name,L)
