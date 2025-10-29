// crawler/crawl_lottery.js
// Jalankan: node crawler/crawl_lottery.js

const fs = require('fs');
const path = require('path');
const puppeteer = require("puppeteer-core");
const chromium = require("chromium");

(async () => {
  const url = 'https://batubara188.com/#/index?category=lottery';
  console.log('🚀 Membuka browser dan menuju halaman:', url);




console.log("🚀 Membuka browser dan menuju halaman...");

const browser = await puppeteer.launch({
  executablePath: chromium.path, // gunakan Chromium portable
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});



  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36'
    );

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

// 1) tunggu kartu lotere ter-mount
console.log('⏳ Menunggu kartu lottery muncul...');
await page.waitForSelector('.game-item.lottery', { timeout: 60000 });

// 2) tunggu angka-angka terisi (DOM yang kita butuhkan benar-benar ada)
await page.waitForFunction(
  () => document.querySelectorAll('.game-item.lottery .lottery-number').length > 0,
  { timeout: 60000 }
);

// 3) kasih buffer ekstra kecil supaya innerText final (hindari 0)
await new Promise(r => setTimeout(r, 3000));


    // ====== SCRAPE MENTAH DARI DOM ======
    const data = await page.evaluate(() => {
      const toText = el => (el ? el.innerText?.trim() : null);

      const cards = Array.from(document.querySelectorAll('.game-item.lottery'));
      return cards.map(card => {
        const titleEl = card.querySelector('h3');

        // Ambil SEMUA angka result dalam 1 kartu (result 1/2/3)
        const numEls = Array.from(card.querySelectorAll('.lottery-number'));
        const numsRawText = numEls.map(el => el.innerText?.trim() || '').join(' ');

        // Ambil 1 gameCode (dari elemen number pertama)
        const firstNum = numEls[0] || null;
        const gameCode = firstNum?.dataset?.gamecode || null;

        // Cari "PERIODE: 1075" kalau ada
        const rawCardText = card.innerText || '';
        const mPer = rawCardText.match(/PERIODE\s*:\s*(\d{2,})/i);
        const periodNumeric = mPer ? mPer[1] : null;

        return {
          name: toText(titleEl),
          resultsRaw: numsRawText,   // gabungan semua angka di kartu
          gameCode,
          periodNumeric
        };
      });
    });

    // ====== NORMALISASI & PENGURUTAN ======
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

    const normText = s => (s || '').toString().replace(/\s+/g, ' ').trim();
    const normName = s => normText(s).toUpperCase();
    const normResults = s => {
      // Ambil maksimal 3 angka 4-digit sesuai urutan tampil (Result 1/2/3)
      const matches = ((s || '').match(/\d{4}/g) || []).slice(0, 3);
      return matches;
    };

    let clean = data.map(m => {
      const nameRaw = normText(m.name || m.gameCode || '-');
      const nameUp  = normName(nameRaw);

      // tentukan key standar dari MAP_KEYS
      let key = null;
      for (const cfg of MAP_KEYS) {
        if (cfg.test.test(nameRaw) || cfg.test.test(nameUp)) { key = cfg.key; break; }
      }

      const arr = normResults(m.resultsRaw);
      const r1 = arr[0] || null, r2 = arr[1] || null, r3 = arr[2] || null;

      return {
        key,
        name: nameRaw,
        gameCode: m.gameCode || null,
        period: m.periodNumeric || null,   // angka periode; bisa null
        // kompat + lengkap
        result: r1,
        result1: r1,
        result2: r2,
        result3: r3,
        results: arr
      };
    });

    // Urutkan: PRIORITY dulu, lalu alfabet
    clean.sort((a, b) => {
      const ai = PRIORITY.indexOf(a.key || '~');
      const bi = PRIORITY.indexOf(b.key || '~');
      if (ai !== -1 || bi !== -1) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      return (a.name || '').localeCompare(b.name || '');
    });

    // Tulis file
    const payload = {
      scrapedAt: new Date().toISOString(),
      source: url,
      count: clean.length,
      markets: clean,
    };

    const outDir = path.resolve(__dirname, '../public/json');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'lottery.json'), JSON.stringify(payload, null, 2), 'utf8');

    console.log(`✅ OK: saved ${payload.count} markets -> ${path.join(outDir, 'lottery.json')}`);
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await browser.close();
  }
})();
