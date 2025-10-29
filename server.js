import express from "express";
import { exec } from "child_process";
import fs from "fs";
import path from "path";

const app = express();
const PORT = process.env.PORT || 10000;

// variabel buat nyimpan hasil terbaru
let latestData = null;
let lastUpdated = null;

// jalankan crawler pakai child_process
function runCrawler() {
  console.log("🕐 Menjalankan crawler...");
  exec("node crawl_lottery.js", { cwd: path.resolve("./crawler") }, (err, stdout, stderr) => {
    if (err) {
      console.error("❌ Gagal menjalankan crawler:", err.message);
      return;
    }
    if (stderr) console.error("⚠️ stderr:", stderr);
    console.log(stdout);

    // lokasi hasil JSON
    const filePath = path.resolve("./crawler/public/json/lottery.json");
    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, "utf8");
        const json = JSON.parse(raw);
        latestData = json;
        lastUpdated = new Date().toISOString();
        console.log(`✅ Data diperbarui: ${lastUpdated}`);
      } catch (e) {
        console.error("❌ Gagal parse JSON:", e);
      }
    } else {
      console.warn("⚠️ File JSON belum ditemukan:", filePath);
    }
  });
}

// Jalankan pertama kali saat server start
runCrawler();

// Jalankan ulang tiap 5 menit (5 * 60 * 1000)
setInterval(runCrawler, 5 * 60 * 1000);

// Endpoint hasil JSON
app.get("/json/lottery.json", (req, res) => {
  if (!latestData) return res.status(503).json({ error: "Belum ada data" });
  res.json({ updatedAt: lastUpdated, ...latestData });
});

// Root endpoint
app.get("/", (req, res) => {
  res.send("🟢 Crawler BB188 aktif — auto-refresh tiap 5 menit");
});

// Jalankan server
app.listen(PORT, () => {
  console.log(`🚀 Server aktif di port ${PORT}`);
});
