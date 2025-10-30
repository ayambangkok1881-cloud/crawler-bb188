// server.js (versi ESM final)
import express from "express";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

// Untuk environment ESM
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
    stdio: "pipe", // penting untuk log keluar di Render
  });

  child.stdout.on("data", (data) => process.stdout.write(`📥 ${data}`));
  child.stderr.on("data", (data) => process.stderr.write(`⚠️ ${data}`));
  child.on("close", (code) => {
    console.log(`✅ Crawl selesai (kode keluar: ${code})`);
    isRunning = false;
  });
}

// 3️⃣ Endpoint utama (Render health check)
app.get("/", (_req, res) => {
  res.send("Crawler Batubara188 aktif 🟢");
});

// 4️⃣ Endpoint manual trigger (cron-job.org akan panggil ini)
app.get("/run", (_req, res) => {
  runCrawler();
  res.send("🕹️ Crawler dijalankan. Cek /json/status.json setelah beberapa detik.");
});

// 5️⃣ Jalankan server
app.listen(PORT, () => {
  console.log(`🌐 Server aktif di port ${PORT}`);
  // Otomatis jalan pertama kali startup (opsional)
  runCrawler();
});
