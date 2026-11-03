import random, math, os
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'public', 'assets', 'arenas')
W, H = 960, 540

def svg(body, defs):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">'
            f'<defs>{defs}'
            '<radialGradient id="vig" cx="50%" cy="50%" r="75%">'
            '<stop offset="55%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="0.75"/>'
            '</radialGradient></defs>'
            f'{body}<rect width="{W}" height="{H}" fill="url(#vig)"/></svg>')

def grad(id_, stops, x1=0, y1=0, x2=0, y2=1):
    s = ''.join(f'<stop offset="{o}" stop-color="{c}"{"" if a is None else f" stop-opacity=\"{a}\""}/>' for o, c, a in stops)
    return f'<linearGradient id="{id_}" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}">{s}</linearGradient>'

def rgrad(id_, stops):
    s = ''.join(f'<stop offset="{o}" stop-color="{c}" stop-opacity="{a}"/>' for o, c, a in stops)
    return f'<radialGradient id="{id_}">{s}</radialGradient>'

def areia(defs_list):
    defs_list.append(grad('areia', [(0, '#d9b57a', None), (1, '#7a5a30', None)]))
    return '<ellipse cx="480" cy="390" rx="520" ry="130" fill="url(#areia)" stroke="#4a2a14" stroke-width="3"/>'

def poeira(rnd, n, y0, y1, cor='#e8c890'):
    out = ''
    for _ in range(n):
        x, y = rnd.uniform(0, W), rnd.uniform(y0, y1)
        out += f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{rnd.uniform(1,3):.1f}" fill="{cor}" opacity="{rnd.uniform(0.1,0.35):.2f}"/>'
    return out

def coliseu():
    rnd = random.Random(1)
    d = [grad('ceu', [(0, '#1c0a08', None), (0.55, '#6e2616', None), (1, '#c46a32', None)]),
         rgrad('sol', [(0, '#ffd27a', 0.9), (1, '#ff8a3a', 0)]),
         grad('muro', [(0, '#6b4632', None), (1, '#2a1812', None)])]
    b = f'<rect width="{W}" height="{H}" fill="url(#ceu)"/>'
    b += '<circle cx="700" cy="150" r="120" fill="url(#sol)"/>'
    b += '<rect x="0" y="130" width="960" height="190" fill="url(#muro)"/>'
    for tier, (y, h) in enumerate([(120, 60), (180, 110)]):
        for x in range(-20, 980, 74):
            b += f'<path d="M{x},{y+h} V{y+h*0.35} A37,37 0 0 1 {x+74},{y+h*0.35} V{y+h} Z" fill="#1a0c08" opacity="0.92"/>'
            b += f'<path d="M{x+6},{y+h} V{y+h*0.35} A31,31 0 0 1 {x+68},{y+h*0.35} V{y+h} Z" fill="none" stroke="#c9995c" stroke-width="2" opacity="0.5"/>'
    for x in (120, 840):
        b += f'<rect x="{x-14}" y="60" width="28" height="200" fill="#6a0f0f"/><rect x="{x-14}" y="60" width="28" height="6" fill="#c9995c"/>'
        b += f'<path d="M{x-14},260 L{x},300 L{x+14},260 Z" fill="#c9995c"/>'
    b += '<rect x="0" y="318" width="960" height="30" fill="#2a1812"/>'
    b += areia(d)
    b += poeira(rnd, 60, 330, 500)
    return svg(b, ''.join(d))

def capua():
    rnd = random.Random(2)
    d = [grad('ceu', [(0, '#24130a', None), (0.6, '#8a4a22', None), (1, '#e0985a', None)]),
         grad('pedra', [(0, '#a8896a', None), (1, '#4e3a2a', None)])]
    b = f'<rect width="{W}" height="{H}" fill="url(#ceu)"/>'
    b += '<circle cx="480" cy="210" r="90" fill="#ffe2a0" opacity="0.35"/>'
    cx, cy = 480, 330
    for i, r in enumerate(range(260, 90, -28)):
        b += f'<path d="M{cx-r},{cy} A{r},{r*0.75:.0f} 0 0 1 {cx+r},{cy} Z" fill="url(#pedra)" opacity="{0.55+0.03*i:.2f}" stroke="#2a1a10" stroke-width="2"/>'
        for k in range(-r, r, 26):
            x = cx + k
            if abs(x - cx) < r:
                yy = cy - math.sqrt(max(0, 1 - (k / r) ** 2)) * r * 0.75
                b += f'<rect x="{x}" y="{yy-3:.0f}" width="8" height="5" fill="#7a2a1a" opacity="0.6"/>'
    b += '<rect x="0" y="330" width="960" height="210" fill="#2a1a10"/>'
    b += areia(d)
    for x in (60, 900):
        b += f'<rect x="{x-12}" y="120" width="24" height="230" fill="#c8b08a"/><rect x="{x-18}" y="110" width="36" height="12" fill="#e0c9a0"/>'
    b += poeira(rnd, 45, 340, 500, '#f0d8a0')
    return svg(b, ''.join(d))

def pompeia():
    rnd = random.Random(3)
    d = [grad('ceu', [(0, '#2e2420', None), (0.5, '#6f4a3a', None), (1, '#c0805a', None)]),
         rgrad('fumaca', [(0, '#7a6a64', 0.8), (1, '#7a6a64', 0)]),
         grad('pedra', [(0, '#b89a78', None), (1, '#5a4636', None)])]
    b = f'<rect width="{W}" height="{H}" fill="url(#ceu)"/>'
    b += '<path d="M560,330 L760,80 L960,330 Z" fill="#3a2a24"/>'
    for i, (x, y, r) in enumerate([(760, 90, 60), (800, 60, 80), (700, 40, 70), (860, 30, 90)]):
        b += f'<circle cx="{x}" cy="{y}" r="{r}" fill="url(#fumaca)"/>'
    b += '<path d="M700,95 L735,130 L760,110 L790,140 L820,105 L840,120" stroke="#ff7a2a" stroke-width="3" fill="none" opacity="0.7"/>'
    for x, h, w in [(40, 220, 40), (120, 170, 34), (200, 260, 44), (760, 200, 36), (860, 150, 40)]:
        b += f'<rect x="{x}" y="{330-h}" width="{w}" height="{h}" fill="url(#pedra)"/>'
        b += f'<path d="M{x},{330-h} l8,-14 l9,10 l7,-18 l10,22 l{w-34},-6 l0,6" fill="#2a1e18" opacity="0.6"/>'
        for k in range(1, int(h / 28)):
            b += f'<line x1="{x}" y1="{330-k*28}" x2="{x+w}" y2="{330-k*28}" stroke="#3a2a20" stroke-width="2" opacity="0.5"/>'
    b += '<rect x="0" y="322" width="960" height="218" fill="#4a3428"/>'
    b += areia(d)
    for _ in range(10):
        x, y = rnd.uniform(100, 860), rnd.uniform(420, 500)
        b += f'<ellipse cx="{x:.0f}" cy="{y:.0f}" rx="{rnd.uniform(8,20):.0f}" ry="{rnd.uniform(4,9):.0f}" fill="#8a7460" opacity="0.8"/>'
    b += poeira(rnd, 70, 300, 520, '#d8b08a')
    return svg(b, ''.join(d))

def poco():
    rnd = random.Random(4)
    d = [grad('parede', [(0, '#0a0706', None), (1, '#24180f', None)]),
         rgrad('tocha', [(0, '#ffb24a', 0.9), (1, '#ff6a1a', 0)]),
         rgrad('veneno', [(0, '#6a8a2a', 0.7), (1, '#2a3a10', 0)]),
         rgrad('boca', [(0, '#050302', 1), (1, '#1a120c', 1)])]
    b = f'<rect width="{W}" height="{H}" fill="url(#parede)"/>'
    for y in range(0, 300, 30):
        off = 0 if (y // 30) % 2 == 0 else 40
        for x in range(-40, W + 40, 80):
            b += f'<rect x="{x+off}" y="{y}" width="78" height="28" fill="none" stroke="#3a2a1e" stroke-width="2" opacity="0.7"/>'
    for x in range(200, 800, 60):
        b += f'<line x1="{x}" y1="0" x2="{x}" y2="60" stroke="#2a2a2a" stroke-width="5"/>'
    b += '<rect x="180" y="58" width="600" height="8" fill="#2a2a2a"/>'
    for x in (150, 810):
        b += f'<circle cx="{x}" cy="150" r="110" fill="url(#tocha)"/><rect x="{x-6}" y="160" width="12" height="60" fill="#3a2a1e"/>'
    b += '<ellipse cx="480" cy="390" rx="380" ry="110" fill="url(#boca)" stroke="#5a2a14" stroke-width="4"/>'
    b += '<ellipse cx="480" cy="390" rx="300" ry="80" fill="url(#veneno)"/>'
    for _ in range(14):
        x, y = rnd.uniform(260, 700), rnd.uniform(350, 430)
        b += f'<ellipse cx="{x:.0f}" cy="{y:.0f}" rx="{rnd.uniform(3,8):.0f}" ry="{rnd.uniform(2,4):.0f}" fill="#7a1010" opacity="0.8"/>'
    b += poeira(rnd, 40, 300, 520, '#8a9a5a')
    return svg(b, ''.join(d))

for nome, fn in [('coliseu', coliseu), ('capua', capua), ('pompeia', pompeia), ('poco', poco)]:
    with open(os.path.join(OUT, nome + '.svg'), 'w', encoding='utf-8') as f:
        f.write(fn())
print('ok', os.listdir(OUT))
