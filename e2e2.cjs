const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
  const erros = [];
  page.on('pageerror', (e) => erros.push('pageerror: ' + e.stack.split('\n').slice(0,3).join(' | ')));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') erros.push(m.type() + ': ' + m.text().slice(0,200)); });
  page.on('dialog', (d) => d.accept());
  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'v2-menu.png' });
  await page.click('button[data-acao="novo"]');
  await page.waitForSelector('.topo');
  await page.click('button[data-acao="aba"][data-id="arenas"]');
  await page.screenshot({ path: 'v2-arenas.png', fullPage: true });
  // luta no Poço (sem depender de honra)
  await page.click('button[data-acao="lutar"][data-id="poco"]');
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'v2-poco.png' });
  await page.waitForTimeout(20000);
  const box = await page.locator('canvas').first().boundingBox();
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * (350 / 540));
  await page.waitForTimeout(800);
  console.log('ui visible after fight:', await page.locator('#ui').isVisible());
  await page.click('button[data-acao="aba"][data-id="campanha"]');
  await page.screenshot({ path: 'v2-campanha.png', fullPage: true });
  console.log('erros:', JSON.stringify(erros, null, 1));
  await browser.close();
})().catch((e) => { console.error('FALHA', e.message.slice(0, 500)); process.exit(1); });
