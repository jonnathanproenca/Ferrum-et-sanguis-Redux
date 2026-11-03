from lib import *
import lib
import numpy as np
SR=lib.SR
def stab(m,dur=0.25,vol=1.0):
    # stab de metais curto
    n=int(dur*SR); f=mf(m); x=saw(f,n,0,0.002)+0.8*saw(f,n,0.004,0.002,.3)+0.5*saw(f*2,n,0.002,0.0,.1)
    x=lp(x,1800,2)*np.minimum(1,np.arange(n)/SR/0.02)*np.exp(-np.arange(n)/SR/(dur*0.8))
    return x*vol*0.45
def taiko(vol=1.0): return tom(95,34,0.7,vol,0.35)
def shaker(vol=0.3):
    n=int(0.06*SR); t=np.arange(n)/SR; return bp(rng.uniform(-1,1,n),4000,9000)*np.exp(-t*60)*vol
def sustain_horn(ms,dur,vol=0.7):
    x=0
    for m in ms: x=x+horn(m,dur,vol)
    return x
def drone(m,dur,vol=0.8):
    n=int(dur*SR); x=sum(saw(mf(m)*k,n,0.002*k,0.003,k) for k in (1,2))*0.5; x=lp(x,300,2)*env(n,2,2); return x*vol

def render2(name,bpm,bars,chords,bass,melody_fn,drums_fn,wet=0.32,rsec=2.6,tail=3.5,padvol=0.9,bassvol=1.6):
    beat=60/bpm; L=bars*4*beat; n=int((L+tail)*SR)
    mel=np.zeros(n); pd=np.zeros(n); bs=np.zeros(n); dr=np.zeros(n); hn=np.zeros(n)
    for b in range(bars):
        t0=b*4*beat
        place(pd,pad(chords[b%len(chords)],4*beat+0.6,padvol),t0)
        place(bs,pad([bass[b%len(bass)]],4*beat+0.2,bassvol)+0.5*pad([bass[b%len(bass)]+12],4*beat+0.2,0.6),t0)
    melody_fn(mel,hn,beat); drums_fn(dr,beat,bars)
    mix=0.55*mel+0.6*pd+0.7*bs+0.9*hn
    w=reverb(mix,rsec,wet); dry=np.stack([dr,dr],1)*0.9
    out=w+dry+0.12*reverb(dr,1.8,0.5)
    Ln=int(L*SR); res=out[:Ln].copy(); tl=out[Ln:Ln+int(tail*SR)]; res[:len(tl)]+=tl
    res/=np.abs(res).max(); res*=0.85
    open(f'{name}.raw','wb').write((res*32767).astype(np.int16).tobytes())
    subprocess.run(['ffmpeg','-loglevel','error','-y','-f','s16le','-ar',str(SR),'-ac','2','-i',f'{name}.raw','-af','loudnorm=I=-17:TP=-2','-b:a','96k',f'{name}.mp3'],check=True)
    print(name,round(L,1),'s')

# ===== POMPEIA: arena pequena, plateia vazia. D dórico, 92 bpm, tambor simples e sopro solitário =====
cp=[[50,53,57],[48,52,55],[46,50,53],[48,52,55]]*2
bp_=[38,36,34,36]*2
MP=[(0,0,69,1.5),(0,1.5,67,.5),(0,2,65,2),(1,0,64,1),(1,1,67,1),(1,2,69,2),(2,0,70,1.5),(2,1.5,69,.5),(2,2,67,2),(3,0,64,1),(3,1,65,1),(3,2,62,2),
(4,0,69,1.5),(4,1.5,72,.5),(4,2,74,2),(5,0,72,1),(5,1,69,1),(5,2,67,2),(6,0,70,1),(6,1,69,1),(6,2,65,1),(6,3,67,1),(7,0,69,3),(7,3,62,1)]
def mel_p(mel,hn,beat):
    for rnd in range(2):
        for (b,bt,m,d) in MP:
            t0=((rnd*8+b)*4+bt)*beat
            place(hn,horn(m-12,d*beat*0.95,0.55),t0)
            if rnd==1: place(mel,pluck(m,max(d*beat*1.5,1.0),0.8),t0)
        for b in range(8):
            ch=cp[b]
            for k,m in enumerate([ch[0]+12,ch[2]+12]): place(mel,pluck(m,1.2,0.3),((rnd*8+b)*4+k*2+0.0)*beat)
def dr_p(dr,beat,bars):
    for b in range(bars):
        t=b*4*beat
        place(dr,taiko(0.7),t); place(dr,tom(110,55,.4,.5),t+2*beat)
        if b>=8:
            place(dr,slap(0.3),t+beat); place(dr,slap(0.3),t+3*beat); place(dr,tom(130,60,.25,.35),t+3.5*beat)
        place(dr,shaker(0.25),t+1.5*beat); place(dr,shaker(0.2),t+3.5*beat)
render2('pompeia',92,16,cp,bp_,mel_p,dr_p,wet=0.38,rsec=2.2)

# ===== CAPUA: plateia média, 108 bpm, metais e marcha =====
cc=[[50,53,57],[46,50,53],[48,52,55],[45,49,52],[50,53,57],[43,46,50],[46,50,53],[45,49,52]]
bc=[38,34,36,33,38,31,34,33]
MC=[(0,0,74,1),(0,1,74,.5),(0,1.5,76,.5),(0,2,77,2),(1,0,77,1),(1,1,74,1),(1,2,70,2),(2,0,72,1),(2,1,72,.5),(2,1.5,74,.5),(2,2,76,2),(3,0,73,1),(3,1,76,1),(3,2,69,2),
(4,0,74,1),(4,1,77,1),(4,2,81,2),(5,0,79,1),(5,1,76,1),(5,2,74,2),(6,0,77,1),(6,1,74,1),(6,2,70,1),(6,3,74,1),(7,0,73,2),(7,2,69,2)]
def mel_c(mel,hn,beat):
    for rnd in range(2):
        for (b,bt,m,d) in MC:
            t0=((rnd*8+b)*4+bt)*beat
            place(hn,horn(m-12,d*beat*0.93,0.75),t0)
            if rnd==1 or True: place(hn,horn(m,d*beat*0.9,0.35 if rnd==0 else 0.55),t0)
        for b in range(8):
            for k in range(4): place(mel,stab(cc[b][k%3]+12,0.22,0.5 if k%2==0 else 0.3),((rnd*8+b)*4+k+0.0)*beat) if (rnd==1 or k%2==0) else None
def dr_c(dr,beat,bars):
    for b in range(bars):
        t=b*4*beat
        place(dr,taiko(0.9),t); place(dr,taiko(0.7),t+1.5*beat); place(dr,taiko(0.85),t+2*beat); place(dr,tom(120,60,.3,.6),t+3.5*beat)
        for k in range(4): place(dr,slap(0.3),t+(k+0.5)*beat)
        place(dr,shaker(0.3),t+beat); place(dr,shaker(0.3),t+3*beat)
render2('capua',108,16,cc,bc,mel_c,dr_c,wet=0.32,rsec=2.6)

# ===== COLISEU: épico, 120 bpm, tema heroico em Dm, taikos pesados =====
ce=[[50,53,57],[46,50,53],[43,46,50],[45,49,52],[50,53,57],[46,50,53],[48,52,55],[45,49,52]]
be=[38,34,31,33,38,34,36,33]
ME=[(0,0,74,1.5),(0,1.5,77,.5),(0,2,81,2),(1,0,79,1.5),(1,1.5,77,.5),(1,2,74,2),(2,0,74,1),(2,1,77,1),(2,2,79,2),(3,0,77,2),(3,2,73,2),
(4,0,86,1.5),(4,1.5,84,.5),(4,2,81,2),(5,0,81,1.5),(5,1.5,79,.5),(5,2,77,2),(6,0,76,1),(6,1,77,1),(6,2,79,1),(6,3,81,1),(7,0,81,3),(7,3,73,1)]
def mel_e(mel,hn,beat):
    for rnd in range(2):
        for (b,bt,m,d) in ME:
            t0=((rnd*8+b)*4+bt)*beat
            place(hn,horn(m-12,d*beat*0.97,0.8),t0)
            place(hn,horn(m-5,d*beat*0.97,0.45),t0)
            place(hn,horn(m,d*beat*0.95,0.35 if rnd==0 else 0.6),t0)
        for b in range(8):
            for k in range(8): place(mel,stab(ce[b][k%3]+12 if k%2==0 else ce[b][(k+1)%3]+24,0.18,0.35),((rnd*8+b)*4+k*0.5)*beat) if rnd==1 else None
def dr_e(dr,beat,bars):
    for b in range(bars):
        t=b*4*beat
        for k in (0,1,2,3): place(dr,taiko(1.0 if k%2==0 else 0.75),t+k*beat)
        place(dr,taiko(0.6),t+0.5*beat); place(dr,taiko(0.6),t+2.5*beat)
        place(dr,tom(130,60,.3,.7),t+1.75*beat); place(dr,tom(130,60,.3,.7),t+3.5*beat)
        for k in range(8): place(dr,slap(0.28),t+(k*0.5+0.25)*beat)
render2('coliseu',120,16,ce,be,mel_e,dr_e,wet=0.4,rsec=3.2,padvol=1.0)

# ===== POÇO: sombrio, 76 bpm, drones e batida seca =====
cpo=[[50,56,57],[50,56,57],[48,54,55],[47,53,54]]*2
bpo=[26,26,24,23]*2
MPO=[(0,0,62,3),(0,3,63,1),(1,0,62,4),(2,0,60,3),(2,3,61,1),(3,0,59,4),(4,0,62,2),(4,2,69,2),(5,0,68,3),(5,3,62,1),(6,0,60,2),(6,2,66,2),(7,0,65,4)]
def mel_po(mel,hn,beat):
    for rnd in range(2):
        for (b,bt,m,d) in MPO:
            t0=((rnd*8+b)*4+bt)*beat
            place(hn,horn(m-12,d*beat*0.98,0.5),t0)
            if rnd==1: place(mel,pluck(m,2.5,0.45),t0)
        for b in range(8):
            place(hn,drone(cpo[b][0]-12,4*beat+1.0,0.5),(rnd*8+b)*4*beat)
def dr_po(dr,beat,bars):
    for b in range(bars):
        t=b*4*beat
        place(dr,tom(70,32,1.0,0.9,0.1),t)
        if b%2==1: place(dr,tom(70,32,1.0,0.6,0.1),t+2.5*beat)
        if b>=8:
            for k in (1,3): place(dr,slap(0.22),t+k*beat)
        if b%4==3: place(dr,tom(110,50,.5,.7),t+3.5*beat)
render2('poco',76,16,cpo,bpo,mel_po,dr_po,wet=0.45,rsec=3.4)

# ===== CAMPANHA: duelo de lanistas, 112 bpm, intensa e dramática (Dm→Bb) =====
cca=[[50,53,57],[46,50,53],[43,46,50],[45,49,52],[50,53,57],[46,50,53],[43,46,50],[45,49,52]]
bca=[38,34,31,33,38,34,31,33]
MCA=[(0,0,62,.5),(0,.5,62,.5),(0,1,65,1),(0,2,69,2),(1,0,70,1),(1,1,69,1),(1,2,65,2),(2,0,67,1),(2,1,69,.5),(2,1.5,70,.5),(2,2,74,2),(3,0,73,2),(3,2,69,1),(3,3,76,1),
(4,0,77,1),(4,1,74,.5),(4,1.5,77,.5),(4,2,81,2),(5,0,82,1),(5,1,81,1),(5,2,77,2),(6,0,79,1),(6,1,77,.5),(6,1.5,79,.5),(6,2,74,1),(6,3,70,1),(7,0,69,2),(7,2,73,2)]
def mel_ca(mel,hn,beat):
    for rnd in range(2):
        for (b,bt,m,d) in MCA:
            t0=((rnd*8+b)*4+bt)*beat
            place(hn,horn(m-12,d*beat*0.9,0.8),t0)
            place(hn,horn(m,d*beat*0.9,0.45),t0)
        for b in range(8):
            for k in range(8): place(mel,pluck(cca[b][k%3]+12+(12 if k==3 else 0),0.6,0.4),((rnd*8+b)*4+k*0.5)*beat)
def dr_ca(dr,beat,bars):
    for b in range(bars):
        t=b*4*beat
        place(dr,taiko(1.0),t); place(dr,taiko(0.8),t+beat); place(dr,taiko(0.95),t+2*beat); place(dr,taiko(0.8),t+2.75*beat); place(dr,taiko(0.9),t+3.5*beat)
        for k in range(8): place(dr,slap(0.26),t+(k*0.5+0.25)*beat)
        if b%4==3:
            for k in range(8): place(dr,tom(150-k*6,70,.2,0.5),t+3*beat+k*0.125*beat)
render2('campanha',112,16,cca,bca,mel_ca,dr_ca,wet=0.36,rsec=2.8)
