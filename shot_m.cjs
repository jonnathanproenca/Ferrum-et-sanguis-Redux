const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 420, height: 1400 } });
  const erros=[]; p.on('pageerror',e=>erros.push(e.message)); p.on('console',m=>{if(m.type()==='error')erros.push(m.text())});
  await p.goto('http://localhost:5173/',{waitUntil:'networkidle'});
  await p.click('[data-acao="novo"]'); await p.click('[data-acao="marcar-lanista"][data-id="lanista-5"]'); await p.click('[data-acao="confirmar-lanista"]'); await p.waitForSelector('.ludus-cena');
  await p.click('[data-acao="aba"][data-valor="mercado"]'); await p.waitForTimeout(500);
  await p.screenshot({path:'../testes/mercado.png'});
  await p.click('[data-acao="recrutar"]:not([disabled])');
  await p.click('[data-acao="aba"][data-valor="ludus"]'); await p.waitForTimeout(500);
  await p.locator('.card:has([data-acao="estilo"])').first().screenshot({path:'../testes/card_escravo.png'});
  await p.selectOption('[data-campo="estilo"]','tracio'); await p.click('[data-acao="estilo"]'); await p.waitForTimeout(500);
  await p.locator('.card:not(.campeao)').first().screenshot({path:'../testes/card_pos_estilo.png'});
  console.log(erros.join('\n')||'sem erros'); await b.close();
})();
