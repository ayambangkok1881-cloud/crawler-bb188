// crawler/crawl_lottery.js
// Jalankan dengan: node crawl_lottery.js

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

(async () => {
  const url = 'https://batubara188.com/#/index?category=lottery';

  console.log('🚀 Membuka browser dan menuju halaman:', url);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36'
  );

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

  console.log('⏳ Tunggu elemen hasil muncul...');
 await new Promise(r => setTimeout(r, 5000));


  const data = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.game-item.lottery'));
    return cards.map(card => ({
      name: card.querySelector('h3')?.innerText?.trim() || null,
      result: card.querySelector('.lottery-number')?.innerText?.trim() || null,
      gameCode: card.querySelector('.lottery-number')?.dataset?.gamecode || null,
      period: card.querySelector('.lottery-countdown')?.innerText?.trim() || null,
    }));
  });

// ==== NORMALISASI & PENGURUTAN ====
// peta key pasar dari nama
const MAP_KEYS = [
  {key:'singapore',  test:/\bSINGAPORE\b|SGP|SINGAPORE POOL/i},
  {key:'hongkong',   test:/\bHONGKONG\b|HK|HONGKONG LOTTO/i},
  {key:'totomacau',  test:/\bTOTO\s*MACAU\b|MACAU/i},
  {key:'sydney',     test:/\bSYDNEY\b/i},
  {key:'cambodia',   test:/\bCAMBODIA\b/i},
  {key:'brunei',     test:/\bBRUNEI\b/i},
  {key:'chelsea',    test:/\bCHELSEA\b/i},
  {key:'poipet',     test:/\bPOIPET\b/i},
  {key:'magnum4d',   test:/\bMAGNUM\s*4D\b|MAGNUM4D/i},
  {key:'pcso',       test:/\bPCSO\b/i},
  {key:'huahin',     test:/\bHUAHIN\b/i},
  {key:'kingkong',   test:/\bKING\s*KONG\b|KINGKONG4D|KK4D|KK1/i},
  {key:'nevada',     test:/\bNEVADA\b/i},
  {key:'ncday',      test:/NORTH\s*CAROLINA\s*DAY/i},
  {key:'california', test:/\bCALIFORNIA\b/i},
  {key:'carolinaeve',test:/CAROLINA\s*EVENING/i},
  {key:'bullseye',   test:/\bBULLSEYE\b/i},
];
const PRIORITY = ['singapore','hongkong','totomacau'];

const normText   = s => (s||'').toString().replace(/\s+/g,' ').trim();
const normName   = s => normText(s).toUpperCase();
const normResult = s => { const d=(s||'').toString().replace(/[^\d]/g,''); return d ? d.slice(0,4) : null; };
const normPeriod = s => { if(!s) return null; const m=String(s).match(/\b([01]?\d|2[0-3]):[0-5]\d\b/); return m?m[0]:null; };

const seen = new Set();
let clean = data.map(m => {
  const nameRaw = normText(m.name || m.gameCode || '-');
  const nameUp  = normName(nameRaw);
  let key = null;
  for (const cfg of MAP_KEYS) {
    if (cfg.test.test(nameRaw) || cfg.test.test(nameUp)) { key = cfg.key; break; }
  }
  return {
    key,
    name: nameRaw,
    gameCode: m.gameCode || null,
    period: normPeriod(m.period || m.countdownText) || null,
    result: normResult(m.result),
  };
}).filter(x => {
  const tag = (x.key||'') + '|' + x.name;
  if (seen.has(tag)) return false;
  seen.add(tag);
  return true;
});

// urut: PRIORITY dulu, lalu alfabet nama
clean.sort((a,b)=>{
  const ai = PRIORITY.indexOf(a.key||'~');
  const bi = PRIORITY.indexOf(b.key||'~');
  if (ai !== -1 || bi !== -1) return (ai===-1?99:ai) - (bi===-1?99:bi);
  return (a.name||'').localeCompare(b.name||'');
});

const payload = {
  scrapedAt: new Date().toISOString(),
  source: url,
  count: clean.length,
  markets: clean,
};

const outDir = path.resolve(__dirname, '../public/json');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'lottery.json'), JSON.stringify(payload, null, 2), 'utf8');
console.log(`OK: saved ${payload.count} markets -> ${path.join(outDir, 'lottery.json')}`);


  console.log('✅ Data berhasil disimpan ke public/json/lottery.json');
  await browser.close();
})();
