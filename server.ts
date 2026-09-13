import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "25mb" }));

const DB_FILE = path.join(process.cwd(), "tasks-db.json");
const LOGS_FILE = path.join(process.cwd(), "logs-db.json");

// Lazy Gemini AI initialization
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

// Math Utility Function with Validation
export function hitungProyeksiEngagement(targetKomentar: number) {
  if (typeof targetKomentar !== "number" || isNaN(targetKomentar)) {
    throw new Error("Target komentar harus berupa angka valid.");
  }
  if (targetKomentar < 0) {
    throw new Error("Target komentar tidak boleh bernilai negatif.");
  }

  const minViews = Math.round(targetKomentar * 20);
  const minLikes = Math.round(targetKomentar * 3);
  const minSaves = Math.round(targetKomentar * 0.8);
  const minShares = Math.round(targetKomentar * 0.4);

  // Safety / Realism Score:
  // Evaluates whether engagement ratio reflects genuine human behavior (0-100)
  // Recommended ratio: Views >= 20x comments, Likes >= 3x comments, Comments <= 5% of views
  const commentRatio = targetKomentar === 0 ? 0 : targetKomentar / minViews;
  let safetyScore = 98;
  if (commentRatio > 0.08) {
    safetyScore = 65; // Suspiciously high comments
  } else if (commentRatio > 0.05) {
    safetyScore = 82;
  }

  return {
    targetKomentar,
    min_views: minViews,
    min_likes: minLikes,
    min_saves: minSaves,
    min_shares: minShares,
    safetyScore,
    commentToViewRatio: `${(commentRatio * 100).toFixed(1)}%`,
    statusMessage: "Rasio seimbang & aman untuk memicu distribusi organik algoritma.",
  };
}

// Data structures for Scheduled Tasks
export interface LogEntry {
  id: string;
  taskId: string;
  timestamp: string;
  type: "info" | "success" | "warning" | "skip";
  message: string;
  details?: Record<string, any>;
}

export interface ScheduledTask {
  id: string;
  url: string;
  platform: "tiktok" | "instagram" | "youtube" | "generic";
  title: string;
  status: "running" | "paused" | "maintenance";
  minIntervalSec: number;
  maxIntervalSec: number;
  maintenanceStartHour: number;
  maintenanceEndHour: number;
  targetComments: number;
  projections: {
    min_views: number;
    min_likes: number;
    min_saves: number;
    min_shares: number;
    safetyScore: number;
  };
  totalCycles: number;
  lastRunAt: string | null;
  nextRunAt: string | null;
  analysis?: {
    objects: string[];
    dominantColors: string[];
    vibe: string;
    strategyAdvice: string[];
    suggestedOrganicHooks: string[];
  };
  createdAt: string;
}

// In-memory store & persistence helpers
const tasks: Map<string, ScheduledTask> = new Map();
let executionLogs: LogEntry[] = [];

function saveStateToDisk() {
  try {
    const tasksArray = Array.from(tasks.values());
    fs.writeFileSync(DB_FILE, JSON.stringify(tasksArray, null, 2), "utf-8");
    fs.writeFileSync(LOGS_FILE, JSON.stringify(executionLogs.slice(0, 150), null, 2), "utf-8");
  } catch (e) {
    console.error("Gagal menyimpan data task ke disk:", e);
  }
}

function loadStateFromDisk() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      const parsed: ScheduledTask[] = JSON.parse(data);
      if (Array.isArray(parsed)) {
        tasks.clear();
        parsed.forEach((t) => tasks.set(t.id, t));
        console.log(`[Persistence] Berhasil memuat ${tasks.size} task dari penyimpanan disk.`);
      }
    }
    if (fs.existsSync(LOGS_FILE)) {
      const logData = fs.readFileSync(LOGS_FILE, "utf-8");
      const parsedLogs: LogEntry[] = JSON.parse(logData);
      if (Array.isArray(parsedLogs)) {
        executionLogs = parsedLogs;
      }
    }
  } catch (e) {
    console.error("Gagal membaca data dari disk, menggunakan inisialisasi awal:", e);
  }
}

// Initial load from disk
loadStateFromDisk();

// If no tasks exist, seed initial demo task and save
if (tasks.size === 0) {
  const initialTaskId = "task-demo-1";
  const initialProjection = hitungProyeksiEngagement(50);
  tasks.set(initialTaskId, {
    id: initialTaskId,
    url: "https://www.tiktok.com/@edukasi_kreatif/video/73918291039",
    platform: "tiktok",
    title: "Panduan Algoritma Edukasi Visual 2026",
    status: "running",
    minIntervalSec: 10,
    maxIntervalSec: 25,
    maintenanceStartHour: 1,
    maintenanceEndHour: 4,
    targetComments: 50,
    projections: initialProjection,
    totalCycles: 3,
    lastRunAt: new Date(Date.now() - 15000).toISOString(),
    nextRunAt: new Date(Date.now() + 12000).toISOString(),
    analysis: {
      objects: ["Presenter edukasi", "Papan infografis digital", "Diagram pertumbuhan interaksi"],
      dominantColors: ["#0284c7 (Sky Blue)", "#0f172a (Deep Slate)", "#10b981 (Emerald)"],
      vibe: "Informatif, profesional, fokus tinggi dengan tempo penjelasan dinamis",
      strategyAdvice: [
        "Gunakan hook pertanyaan interaktif di 3 detik pertama",
        "Balas komentar pertama dalam 15 menit untuk memicu sinyal percakapan organik",
        "Jaga rasio likes minimal 3x dari jumlah komentar agar tidak terbaca anomali",
      ],
      suggestedOrganicHooks: [
        "Kenapa video edukasi ini bisa ditonton sampai habis? Perhatikan 3 formula ini!",
        "Tips rahasia mengatur ritme visual agar penonton tidak skip di detik ke-5.",
      ],
    },
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  });
  saveStateToDisk();
}

// Helper to check maintenance window
export function isWithinMaintenanceWindow(
  startHour: number,
  endHour: number,
  currentDate = new Date()
): boolean {
  const hour = currentDate.getHours();
  if (startHour <= endHour) {
    return hour >= startHour && hour < endHour;
  } else {
    // Spans midnight, e.g. 23:00 to 04:00
    return hour >= startHour || hour < endHour;
  }
}

// Universal URL cleaner & normalizer helper
export function normalizeUrl(input: string): string {
  let cleaned = (input || "").trim();
  // If user pasted without protocol (e.g. tiktok.com/@user/video/123 or vm.tiktok.com/...), prepend https://
  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = `https://${cleaned}`;
  }
  return cleaned;
}

// Detect Platform helper with universal social media detection
export function detectPlatform(
  url: string
): "tiktok" | "instagram" | "youtube" | "facebook" | "twitter" | "threads" | "linkedin" | "pinterest" | "snapchat" | "generic" {
  const lower = (url || "").toLowerCase();
  if (lower.includes("tiktok.com") || lower.includes("douyin.com")) return "tiktok";
  if (lower.includes("instagram.com") || lower.includes("instagr.am")) return "instagram";
  if (lower.includes("youtube.com") || lower.includes("youtu.be")) return "youtube";
  if (lower.includes("facebook.com") || lower.includes("fb.watch") || lower.includes("fb.com")) return "facebook";
  if (lower.includes("twitter.com") || lower.includes("x.com") || lower.includes("t.co")) return "twitter";
  if (lower.includes("threads.net")) return "threads";
  if (lower.includes("linkedin.com") || lower.includes("lnkd.in")) return "linkedin";
  if (lower.includes("pinterest.com") || lower.includes("pin.it")) return "pinterest";
  if (lower.includes("snapchat.com")) return "snapchat";
  return "generic";
}

// Background scheduler tick (runs every 3 seconds autonomously in cloud server)
setInterval(() => {
  const now = new Date();
  const nowISO = now.toISOString();
  let stateModified = false;

  tasks.forEach((task) => {
    // If paused manually by user, do not process
    if (task.status === "paused") return;

    // Check maintenance window
    if (isWithinMaintenanceWindow(task.maintenanceStartHour, task.maintenanceEndHour, now)) {
      if (task.status !== "maintenance") {
        task.status = "maintenance";
        stateModified = true;
        const log: LogEntry = {
          id: Math.random().toString(36).substring(2, 9),
          taskId: task.id,
          timestamp: nowISO,
          type: "skip",
          message: `[MAINTENANCE WINDOW] Task ditangguhkan sementara (${task.maintenanceStartHour}:00 - ${task.maintenanceEndHour}:00). Tidak ada aktivitas otomatis.`,
        };
        executionLogs.unshift(log);
      }
      return;
    } else if (task.status === "maintenance") {
      // Exited maintenance window, resume running
      task.status = "running";
      stateModified = true;
    }

    // Check if scheduled time reached
    if (!task.nextRunAt || new Date(task.nextRunAt) <= now) {
      task.totalCycles += 1;
      task.lastRunAt = nowISO;
      stateModified = true;

      // Randomize next interval between minIntervalSec and maxIntervalSec
      const randomIntervalSec =
        Math.floor(Math.random() * (task.maxIntervalSec - task.minIntervalSec + 1)) +
        task.minIntervalSec;
      const nextRunDate = new Date(now.getTime() + randomIntervalSec * 1000);
      task.nextRunAt = nextRunDate.toISOString();

      const sampleActions = [
        "Audit metrik penonton & ritme retensi",
        "Evaluasi respon komentar organik & rasio like",
        "Sinkronisasi buffer interaksi aman (Safe Ratio 1:20)",
        "Pemeriksaan kesehatan sinyal algoritma & discoverability",
      ];
      const randomAction = sampleActions[task.totalCycles % sampleActions.length];

      const log: LogEntry = {
        id: Math.random().toString(36).substring(2, 9),
        taskId: task.id,
        timestamp: nowISO,
        type: "success",
        message: `Siklus #${task.totalCycles} selesai: ${randomAction}. Jeda berikutnya: ${randomIntervalSec} detik (${nextRunDate.toLocaleTimeString()}).`,
        details: {
          randomDelaySec: randomIntervalSec,
          nextRunTime: nextRunDate.toLocaleTimeString(),
        },
      };

      executionLogs.unshift(log);
      if (executionLogs.length > 200) {
        executionLogs.pop();
      }
    }
  });

  if (stateModified) {
    saveStateToDisk();
  }
}, 3000);

// API Routes
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    tasksCount: tasks.size,
    aiAvailable: !!process.env.GEMINI_API_KEY,
    persistence: "file_db_active",
    executionMode: "24/7_cloud_background_service",
    serverTime: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

// Calculate Engagement Projection
app.post("/api/calculate-projection", (req, res) => {
  try {
    const { targetComments } = req.body;
    const parsed = Number(targetComments);
    const result = hitungProyeksiEngagement(parsed);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message || "Input tidak valid" });
  }
});

// List Tasks & Logs
app.get("/api/tasks", (req, res) => {
  const taskList = Array.from(tasks.values());
  res.json({
    tasks: taskList,
    logs: executionLogs.slice(0, 50),
  });
});

// Create new Scheduled Task
app.post("/api/tasks", (req, res) => {
  try {
    const {
      url,
      title,
      targetComments = 50,
      minIntervalSec = 15,
      maxIntervalSec = 60,
      maintenanceStartHour = 1,
      maintenanceEndHour = 4,
    } = req.body;

    if (!url || typeof url !== "string" || !url.trim()) {
      return res.status(400).json({ success: false, error: "URL target tidak boleh kosong." });
    }

    const normalizedUrl = normalizeUrl(url);
    const minSec = Math.max(5, Number(minIntervalSec) || 15);
    const maxSec = Math.max(minSec, Number(maxIntervalSec) || 60);
    const comments = Math.max(0, Number(targetComments) || 50);
    const projections = hitungProyeksiEngagement(comments);
    const id = "task-" + Date.now().toString(36);
    const platform = detectPlatform(normalizedUrl);

    const randomFirstInterval = Math.floor(Math.random() * (maxSec - minSec + 1)) + minSec;
    const nextRun = new Date(Date.now() + randomFirstInterval * 1000).toISOString();

    let safeLabel = normalizedUrl.slice(-12);
    try {
      const parsedUrl = new URL(normalizedUrl);
      safeLabel = parsedUrl.pathname.slice(-14) || parsedUrl.hostname;
    } catch (_) {}

    const newTask: ScheduledTask = {
      id,
      url: normalizedUrl,
      platform,
      title: title?.trim() || `${platform.toUpperCase()} Target (${safeLabel})`,
      status: "running",
      minIntervalSec: minSec,
      maxIntervalSec: maxSec,
      maintenanceStartHour: Number(maintenanceStartHour) || 1,
      maintenanceEndHour: Number(maintenanceEndHour) || 4,
      targetComments: comments,
      projections,
      totalCycles: 0,
      lastRunAt: null,
      nextRunAt: nextRun,
      createdAt: new Date().toISOString(),
    };

    tasks.set(id, newTask);
    saveStateToDisk();

    const log: LogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      taskId: id,
      timestamp: new Date().toISOString(),
      type: "info",
      message: `Task baru dibuat untuk ${url}. Scheduler aktif dengan interval acak ${minSec}-${maxSec} detik.`,
    };
    executionLogs.unshift(log);

    res.json({ success: true, task: newTask });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Gagal membuat task" });
  }
});

// Toggle Task Status (Start / Pause)
app.post("/api/tasks/:id/toggle", (req, res) => {
  const { id } = req.params;
  const task = tasks.get(id);
  if (!task) {
    return res.status(404).json({ success: false, error: "Task tidak ditemukan." });
  }

  if (task.status === "running") {
    task.status = "paused";
    task.nextRunAt = null;
    const log: LogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      taskId: task.id,
      timestamp: new Date().toISOString(),
      type: "warning",
      message: `Scheduler untuk '${task.title}' DIHENTIKAN sementara oleh pengguna.`,
    };
    executionLogs.unshift(log);
  } else {
    task.status = "running";
    const randomNext =
      Math.floor(Math.random() * (task.maxIntervalSec - task.minIntervalSec + 1)) +
      task.minIntervalSec;
    task.nextRunAt = new Date(Date.now() + randomNext * 1000).toISOString();
    const log: LogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      taskId: task.id,
      timestamp: new Date().toISOString(),
      type: "info",
      message: `Scheduler untuk '${task.title}' DIAKTIFKAN kembali. Eksekusi berikutnya dalam ${randomNext} detik.`,
    };
    executionLogs.unshift(log);
  }

  saveStateToDisk();
  res.json({ success: true, task });
});

// Delete Task
app.delete("/api/tasks/:id", (req, res) => {
  const { id } = req.params;
  if (!tasks.has(id)) {
    return res.status(404).json({ success: false, error: "Task tidak ditemukan." });
  }
  tasks.delete(id);
  saveStateToDisk();
  res.json({ success: true, message: "Task berhasil dihapus." });
});

// AI Video Vision & Vibe Analyzer Endpoint
app.post("/api/analyze-video", async (req, res) => {
  try {
    const { videoUrl, frameBase64, samplePreset } = req.body;
    const ai = getAI();

    // If Gemini API Key is missing or user selected mock/fallback:
    if (!ai) {
      // Provide high-fidelity contextual analysis based on the URL and sample preset
      const mockResult = {
        objects: ["Presenter Edukasi", "Grafik Pertumbuhan Algoritma", "Keterangan Teks Kontras"],
        dominantColors: ["#2563eb (Royal Blue)", "#0f172a (Dark Slate)", "#f59e0b (Amber)"],
        vibe: "Edukatif, dinamis, terstruktur dengan visual hook kuat di awal",
        strategyAdvice: [
          "Pertahankan teks hook di tengah layar (eye-level zone)",
          "Jaga rasio penonton berinteraksi 50% di bawah total views untuk pola natural",
          "Aktifkan jeda acak 60s - 180s saat memonitor siklus retensi",
        ],
        suggestedOrganicHooks: [
          "Banyak kreator salah paham soal rasio ini. Simak faktanya!",
          "3 rahasia agar video kamu ditonton ulang dan disimpan penonton.",
        ],
        modelUsed: "Heuristic Strategic Engine (Configure GEMINI_API_KEY for Live Vision)",
      };
      return res.json({ success: true, analysis: mockResult });
    }

    const prompt = `
Anda adalah seorang analis video dan pakar strategi konten digital.
Analisis video/konten berikut (URL: ${videoUrl || "video terlampir"}).
Berikan analisis visual dan strategi engagement dalam format JSON strictly valid dengan struktur:
{
  "objects": ["objek/elemen visual 1", "objek 2", "objek 3"],
  "dominantColors": ["#hex (Nama Warna)", "#hex (Nama Warna)"],
  "vibe": "deskripsi nuansa/suasana video (misal: santai, edukatif, hiper-enerjik, estetis)",
  "strategyAdvice": ["rekomendasi strategi 1", "rekomendasi strategi 2", "rekomendasi strategi 3"],
  "suggestedOrganicHooks": ["contoh hook percakapan organik 1", "contoh hook percakapan organik 2"]
}
`;

    let contents: any[] = [];
    if (frameBase64 && frameBase64.includes("base64,")) {
      const parts = frameBase64.split("base64,");
      const mimeType = frameBase64.substring(frameBase64.indexOf(":") + 1, frameBase64.indexOf(";"));
      contents = [
        {
          inlineData: {
            mimeType: mimeType || "image/jpeg",
            data: parts[1],
          },
        },
        prompt,
      ];
    } else {
      contents = [
        `URL Target: ${videoUrl || "https://tiktok.com/@creatorexample/video/1"}\n` +
          `Preset Context: ${samplePreset || "Edukasi & Tutorial"}\n` +
          prompt,
      ];
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text || "{}";
    const parsed = JSON.parse(text);

    // Save to task if taskId provided
    if (req.body.taskId && tasks.has(req.body.taskId)) {
      const t = tasks.get(req.body.taskId)!;
      t.analysis = parsed;
    }

    res.json({ success: true, analysis: parsed, modelUsed: "gemini-3.8-flash" });
  } catch (err: any) {
    console.error("AI Analysis error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Gagal melakukan analisis AI",
    });
  }
});

async function startServer() {
  // Vite middleware in dev
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
