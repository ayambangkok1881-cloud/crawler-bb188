const express = require("express");
const { spawn } = require("child_process");


const app = express();
const PORT = process.env.PORT || 10000;

function runCrawler() {
  console.log("⏳ Menjalankan crawler...");
  const crawl = spawn("node", ["crawl_lottery.js"]);

  crawl.stdout.on("data", (data) => console.log(`📥 ${data}`));
  crawl.stderr.on("data", (data) => console.error(`⚠️ ${data}`));
  crawl.on("close", (code) => console.log(`✅ Crawl selesai dengan kode ${code}`));
}

// jalankan saat server start
runCrawler();

// ulangi tiap 5 menit
setInterval(runCrawler, 5 * 60 * 1000);

// endpoint supaya Render tetap hidup
app.get("/", (req, res) => {
  res.send("Crawler Batubara188 aktif 🟢");
});

app.listen(PORT, () => console.log(`Server berjalan di port ${PORT}`));
