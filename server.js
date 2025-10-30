import fs from "fs";
import express from "express";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const jsonDir = path.join(__dirname, "public", "json");
const lotteryPath = path.join(jsonDir, "lottery.json");
fs.mkdirSync(jsonDir, { recursive: true });
if (!fs.existsSync(lotteryPath)) {
  fs.writeFileSync(
    lotteryPath,
    JSON.stringify({ status: "waiting", hint: "Call /run to generate data" }, null, 2),
    "utf8"
  );
}

const app = express();
const PORT = process.env.PORT || 10000;
// setelah const app = express();
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  next();
});


// expose /public agar /json/*.json bisa diakses
app.use(express.static(path.join(__dirname, "public")));

let isRunning = false;
function runCrawler() {
  if (isRunning) {
    console.log("⏳ Crawler masih berjalan, skip dulu…");
    return;
  }
  isRunning = true;
  console.log("🚀 Menjalankan crawler…");

const crawlerPath = path.join(__dirname, "crawl_lottery.js");
  const child = spawn("node", [crawlerPath], {
    cwd: __dirname,
    env: process.env,
    stdio: "pipe",
  });

  child.stdout.on("data", (d) => process.stdout.write(`📥 ${d}`));
  child.stderr.on("data", (d) => process.stderr.write(`⚠️ ${d}`));
  child.on("close", (code) => {
    console.log(`✅ Crawl selesai (kode: ${code})`);
    isRunning = false;
  });
}

app.get("/", (_req, res) => res.send("Crawler Batubara188 aktif 🟢"));
app.get("/run", (_req, res) => {
  runCrawler();
  res.send("Crawl triggered. Cek /json/status.json nanti ya.");
});

app.listen(PORT, () => {
  console.log(`🌐 Server aktif di port ${PORT}`);
  // opsional: auto-run saat boot
  // runCrawler();
});

app.get("/status", (_req, res) => {
  const p = path.join(__dirname, "public", "json", "lottery.json");
  try {
    const stat = fs.statSync(p);
    res.json({
      ok: true,
      path: "/public/json/lottery.json",
      mtime: stat.mtime,
      size: stat.size
    });
  } catch {
    res.json({ ok: false });
  }
});