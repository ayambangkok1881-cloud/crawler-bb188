// server.js (versi ESM)
import express from "express";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

// 1️⃣ Buka akses folder /public (supaya /json/status.json bisa diakses publik)
app.use(express.static(path.join(__dirname, "public")));

// 2️⃣ Hindari overlap crawl (biar gak dobel)
let isRunning = false;

function runCrawler() {
  if (isRunning) {
    console.log("⏳ Crawler masih berjalan, skip dulu...");
    return;
  }
  isRunning = true;

  console.log("🚀 Menjalankan crawler...");
  const crawlerPath = path.join(__dirname, "crawler", "crawl_lottery.js");
  const child = spawn("node", [crawlerPath], {
    cwd: __dirname,
    env: process.env,
  });

  child.stdout.on("data", (data) => process.stdout.write(`📥 ${data}`));
  child.stderr.on("data", (data) => process.stderr.write(`⚠️ ${data}`));

  child.on("close", (code) => {
    console.log(`✅ Crawl selesai (kode: ${code})`);
    isRunning = false;
  });
}

// 3️⃣ Endpoint healthcheck (buat Render lihat “live”)
app.get("/", (_req, res) => {
  res.send("Crawler Batubara188 aktif 🟢");
});

// 4️⃣ Endpoint trigger (buat cron-job.org)
app.get("/run", (_req, res) => {
  runCrawler();
  res.send("Crawl triggered. Cek /json/status.json nanti ya.");
});

app.listen(PORT, () => console.log(`🌐 Server aktif di port ${PORT}`));
