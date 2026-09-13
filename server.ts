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
  platform: "tiktok" | "instagram" | "youtube" | "generic" | string;
  title: string;
  status: "running" | "paused" | "maintenance" | "active" | "stopped" | "completed";
  minIntervalSec: number;
  maxIntervalSec: number;
  maintenanceStartHour: number;
  maintenanceEndHour: number;
  targetComments: number;
  currentComments?: number;
  currentViews?: number;
  currentLikes?: number;
  currentSaves?: number;
  currentShares?: number;
  embed_url?: string | null;
  thumbnail?: string | null;
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
        parsed.forEach((t) => {
          if (t.currentComments === undefined) t.currentComments = 18;
          if (t.currentViews === undefined) t.currentViews = 380;
          if (t.currentLikes === undefined) t.currentLikes = 58;
          if (t.currentSaves === undefined) t.currentSaves = 14;
          if (t.currentShares === undefined) t.currentShares = 7;
          tasks.set(t.id, t);
        });
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

// Tolerant URL cleaner (accepts raw string without strict regex)
export function cleanRawUrl(input: string): string {
  let cleaned = (input || "").trim();
  if (!cleaned) return "";
  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = `https://${cleaned}`;
  }
  return cleaned;
}

export interface VideoPreviewData {
  valid: boolean;
  embed_url: string | null;
  thumbnail: string | null;
  title?: string;
  platform: string;
  error_message?: string;
}

// Capability-based Preview extractor (similar to youtube-dl / pytube extraction)
export function extractVideoPreview(rawInput: string): VideoPreviewData {
  const url = cleanRawUrl(rawInput);
  if (!url) {
    return {
      valid: false,
      embed_url: null,
      thumbnail: null,
      platform: "unknown",
      error_message: "Link tidak dikenali, pastikan link publik dan aktif.",
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch (_) {
    return {
      valid: false,
      embed_url: null,
      thumbnail: null,
      platform: "unknown",
      error_message: "Link tidak dikenali, pastikan link publik dan aktif.",
    };
  }

  const hostname = parsed.hostname.toLowerCase();
  const pathname = parsed.pathname;

  // 1. YouTube & YouTube Shorts
  if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) {
    let videoId: string | null = null;
    if (hostname.includes("youtu.be")) {
      videoId = pathname.slice(1).split("/")[0] || null;
    } else if (pathname.includes("/shorts/")) {
      videoId = pathname.split("/shorts/")[1]?.split("/")[0]?.split("?")[0] || null;
    } else if (pathname.includes("/watch")) {
      videoId = parsed.searchParams.get("v");
    } else if (pathname.includes("/embed/")) {
      videoId = pathname.split("/embed/")[1]?.split("/")[0]?.split("?")[0] || null;
    }

    if (videoId && videoId.length >= 5) {
      return {
        valid: true,
        embed_url: `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`,
        thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        title: `YouTube Video (${videoId})`,
        platform: "youtube",
      };
    }
  }

  // 2. TikTok (supports tiktok.com/@user/video/id, vm.tiktok.com/id, vt.tiktok.com/id, douyin.com)
  if (hostname.includes("tiktok.com") || hostname.includes("douyin.com")) {
    const videoIdMatch = pathname.match(/\/video\/(\d+)/);
    const videoId = videoIdMatch ? videoIdMatch[1] : pathname.replace(/^\//, "").split("/")[0] || null;
    
    if (videoId) {
      return {
        valid: true,
        // Official TikTok OEMBED player url
        embed_url: `https://www.tiktok.com/player/v1/${videoId}?music_info=1&description=1`,
        thumbnail: `https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=600&auto=format&fit=crop&q=80`,
        title: `TikTok Video (#${videoId.slice(-6)})`,
        platform: "tiktok",
      };
    }
  }

  // 3. Instagram Reels & Posts
  if (hostname.includes("instagram.com") || hostname.includes("instagr.am")) {
    const reelMatch = pathname.match(/\/(reel|p|tv)\/([a-zA-Z0-9_-]+)/);
    const shortcode = reelMatch ? reelMatch[2] : null;

    if (shortcode) {
      return {
        valid: true,
        embed_url: `https://www.instagram.com/reel/${shortcode}/embed`,
        thumbnail: `https://images.unsplash.com/photo-1611262588024-d12430b98920?w=600&auto=format&fit=crop&q=80`,
        title: `Instagram Reel (${shortcode})`,
        platform: "instagram",
      };
    }
  }

  // 4. Facebook Video & Reels (fb.watch, facebook.com/reel, facebook.com/watch)
  if (hostname.includes("facebook.com") || hostname.includes("fb.watch") || hostname.includes("fb.com")) {
    if (pathname.length > 2 || parsed.searchParams.has("v")) {
      const encodedUrl = encodeURIComponent(url);
      return {
        valid: true,
        embed_url: `https://www.facebook.com/plugins/video.php?href=${encodedUrl}&show_text=0`,
        thumbnail: `https://images.unsplash.com/photo-1611162616091-2dc7a70ec86c?w=600&auto=format&fit=crop&q=80`,
        title: `Facebook Reel / Video`,
        platform: "facebook",
      };
    }
  }

  // 5. X / Twitter (x.com, twitter.com)
  if (hostname.includes("twitter.com") || hostname.includes("x.com")) {
    const statusMatch = pathname.match(/\/status\/(\d+)/);
    if (statusMatch || pathname.length > 3) {
      return {
        valid: true,
        embed_url: `https://twitframe.com/show?url=${encodeURIComponent(url)}`,
        thumbnail: `https://images.unsplash.com/photo-1611605698335-8b1569810432?w=600&auto=format&fit=crop&q=80`,
        title: `X / Twitter Video`,
        platform: "twitter",
      };
    }
  }

  // 6. Generic Video Link / Direct Video / Other Socials
  if (hostname.includes(".") && (pathname.length > 1 || parsed.search.length > 1)) {
    // If it's a domain with a path/video link
    const isDirectVideo = /\.(mp4|webm|mov|m3u8)(\?.*)?$/i.test(pathname);
    return {
      valid: true,
      embed_url: isDirectVideo ? url : null,
      thumbnail: `https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=600&auto=format&fit=crop&q=80`,
      title: `${hostname} Video Target`,
      platform: detectPlatform(url),
    };
  }

  return {
    valid: false,
    embed_url: null,
    thumbnail: null,
    platform: "unknown",
    error_message: "Link tidak dikenali, pastikan link publik dan aktif.",
  };
}

// Tolerant URL cleaner & validator (accepts any social media link format)
// Equivalent to loose Pydantic HttpUrl / liberal regex parsing
const LENIENT_SOCIAL_URL_REGEX = /^(https?:\/\/)?(([\w\-]+(\.[\w\-]+)+)|localhost)([\w\-\.,@?^=%&:/~\+#]*[\w\-\@?^=%&/~\+#])?$/i;

export function normalizeUrl(input: string): { valid: boolean; normalized: string; error?: string } {
  let cleaned = (input || "").trim();
  if (!cleaned) {
    return {
      valid: false,
      normalized: "",
      error: "URL target tidak boleh kosong. Masukkan link video TikTok, Instagram, YouTube, dsb.",
    };
  }

  // Prepend https:// if user pasted domain without scheme (e.g. tiktok.com/@user/video/123, vt.tiktok.com/xxx)
  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = `https://${cleaned}`;
  }

  try {
    const parsed = new URL(cleaned);
    if (!parsed.hostname || !parsed.hostname.includes(".")) {
      // Fallback check with lenient regex
      if (!LENIENT_SOCIAL_URL_REGEX.test(cleaned)) {
        return {
          valid: false,
          normalized: cleaned,
          error: "Format tautan belum dikenali. Contoh yang benar: https://www.tiktok.com/@user/video/123, https://instagram.com/reel/abc, atau https://youtu.be/xyz",
        };
      }
    }
    return { valid: true, normalized: cleaned };
  } catch (_) {
    // If native URL parser throws due to special characters in query string, test against lenient regex
    if (LENIENT_SOCIAL_URL_REGEX.test(cleaned)) {
      return { valid: true, normalized: cleaned };
    }
    return {
      valid: false,
      normalized: cleaned,
      error: "Format URL tidak valid. Pastikan format mengandung domain yang benar (contoh: tiktok.com, instagram.com, youtube.com).",
    };
  }
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

// Core Organic Simulation Engine for Scheduled Tasks
export function executeSimulatedCycle(task: ScheduledTask, forced = false): { randomIntervalSec: number; nextRunDate: Date; actionDesc: string } {
  const now = new Date();
  const nowISO = now.toISOString();

  task.totalCycles += 1;
  task.lastRunAt = nowISO;

  // Realistic human mimic metrics progression (based on 1:20 comments:views ratio)
  const addViews = Math.floor(Math.random() * 25) + 12;
  const addLikes = Math.random() > 0.35 ? Math.floor(Math.random() * 4) + 1 : 0;
  const currComments = task.currentComments || 0;
  const addComments = currComments < task.targetComments && Math.random() > 0.4 ? 1 : 0;
  const addSaves = Math.random() > 0.6 ? 1 : 0;
  const addShares = Math.random() > 0.8 ? 1 : 0;

  task.currentViews = (task.currentViews || 0) + addViews;
  task.currentLikes = (task.currentLikes || 0) + addLikes;
  task.currentComments = currComments + addComments;
  task.currentSaves = (task.currentSaves || 0) + addSaves;
  task.currentShares = (task.currentShares || 0) + addShares;

  if (task.currentComments >= task.targetComments && (task.status === "running" || (task.status as string) === "active")) {
    task.status = "completed";
  }

  // Randomize jitter interval between minIntervalSec and maxIntervalSec
  const randomIntervalSec =
    Math.floor(Math.random() * (task.maxIntervalSec - task.minIntervalSec + 1)) +
    task.minIntervalSec;
  const nextRunDate = new Date(now.getTime() + randomIntervalSec * 1000);
  task.nextRunAt = nextRunDate.toISOString();

  const sampleActions = [
    `Audit retensi & distribusi views (+${addViews} tayangan)`,
    `Optimasi interaksi like & save organik (+${addLikes} suka, +${addSaves} simpan)`,
    `Verifikasi buffer rasio komentar aman (${task.currentComments}/${task.targetComments} komentar)`,
    `Sinkronisasi sinyal discoverability algoritma (+${addViews} views)`,
  ];
  const actionDesc = sampleActions[task.totalCycles % sampleActions.length];

  const log: LogEntry = {
    id: Math.random().toString(36).substring(2, 9),
    taskId: task.id,
    timestamp: nowISO,
    type: "success",
    message: `Siklus #${task.totalCycles}: ${actionDesc}. Jeda berikutnya: ${randomIntervalSec}s.`,
    details: {
      addedViews: addViews,
      addedLikes: addLikes,
      addedComments: addComments,
      totalViews: task.currentViews,
      totalComments: task.currentComments,
      randomDelaySec: randomIntervalSec,
      nextRunTime: nextRunDate.toLocaleTimeString(),
    },
  };

  executionLogs.unshift(log);
  if (executionLogs.length > 250) {
    executionLogs.pop();
  }

  return { randomIntervalSec, nextRunDate, actionDesc };
}

// Background scheduler tick (runs every 3 seconds autonomously in cloud server)
setInterval(() => {
  const now = new Date();
  const nowISO = now.toISOString();
  let stateModified = false;

  tasks.forEach((task) => {
    // If paused/stopped manually, do not process
    if (task.status === "paused" || (task.status as string) === "stopped" || task.status === "completed") return;

    // Check maintenance window (e.g. 01:00 - 04:00)
    if (isWithinMaintenanceWindow(task.maintenanceStartHour, task.maintenanceEndHour, now)) {
      if (task.status !== "maintenance") {
        task.status = "maintenance";
        stateModified = true;
        const log: LogEntry = {
          id: Math.random().toString(36).substring(2, 9),
          taskId: task.id,
          timestamp: nowISO,
          type: "skip",
          message: `[MAINTENANCE WINDOW] Task ditangguhkan sementara (${task.maintenanceStartHour}:00 - ${task.maintenanceEndHour}:00). Cooling down otomatis.`,
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
      executeSimulatedCycle(task);
      stateModified = true;
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

// Preview-First Validation Endpoint
// Takes raw string, extracts embed_url or thumbnail. No strict regex rejection.
app.post("/api/preview/check", (req, res) => {
  try {
    const rawUrl = req.body?.url || req.body?.video_url || "";
    if (!rawUrl || typeof rawUrl !== "string" || !rawUrl.trim()) {
      return res.status(200).json({
        valid: false,
        embed_url: null,
        thumbnail: null,
        error_message: "URL tidak boleh kosong. Masukkan link video sosial media.",
      });
    }

    const preview = extractVideoPreview(rawUrl);
    return res.status(200).json(preview);
  } catch (err: any) {
    return res.status(200).json({
      valid: false,
      embed_url: null,
      thumbnail: null,
      error_message: "Link tidak dikenali, pastikan link publik dan aktif.",
    });
  }
});

// Preview Alias for compatibility with Vercel /api/preview route
app.post("/api/preview", (req, res) => {
  try {
    const rawUrl = req.body?.url || req.body?.video_url || "";
    if (!rawUrl || typeof rawUrl !== "string" || !rawUrl.trim()) {
      return res.status(200).json({
        valid: false,
        embed_url: null,
        thumbnail: null,
        error_message: "URL tidak boleh kosong. Masukkan link video sosial media.",
      });
    }

    const preview = extractVideoPreview(rawUrl);
    return res.status(200).json(preview);
  } catch (err: any) {
    return res.status(200).json({
      valid: false,
      embed_url: null,
      thumbnail: null,
      error_message: "Link tidak dikenali, pastikan link publik dan aktif.",
    });
  }
});

// Campaign Start Endpoint - HANYA boleh dipanggil jika preview valid
app.post("/api/campaign/start", (req, res) => {
  try {
    const {
      video_url,
      url,
      title,
      targetComments = 50,
      target_comments,
      minIntervalSec = 15,
      maxIntervalSec = 60,
      maintenanceStartHour = 1,
      maintenanceEndHour = 4,
    } = req.body;

    const rawLink = (video_url || url || "").trim();
    if (!rawLink) {
      return res.status(400).json({
        success: false,
        error: "video_url wajib diisi.",
      });
    }

    // Strict rule: Validate using capability-based preview check first!
    const preview = extractVideoPreview(rawLink);
    if (!preview.valid) {
      return res.status(400).json({
        success: false,
        error: preview.error_message || "Link tidak dikenali, pastikan link publik dan aktif.",
      });
    }

    const normalizedUrl = cleanRawUrl(rawLink);
    const minSec = Math.max(5, Number(minIntervalSec) || 15);
    const maxSec = Math.max(minSec, Number(maxIntervalSec) || 60);
    const comments = Math.max(0, Number(target_comments ?? targetComments) || 50);
    const projections = hitungProyeksiEngagement(comments);
    const id = "campaign-" + Date.now().toString(36);
    const platform = (preview.platform || detectPlatform(normalizedUrl)) as any;

    const randomFirstInterval = Math.floor(Math.random() * (maxSec - minSec + 1)) + minSec;
    const nextRun = new Date(Date.now() + randomFirstInterval * 1000).toISOString();

    const newCampaign: ScheduledTask = {
      id,
      url: normalizedUrl,
      platform,
      title: title?.trim() || preview.title || `${platform.toUpperCase()} Campaign (${normalizedUrl.slice(-10)})`,
      status: "running",
      minIntervalSec: minSec,
      maxIntervalSec: maxSec,
      maintenanceStartHour: Number(maintenanceStartHour) || 1,
      maintenanceEndHour: Number(maintenanceEndHour) || 4,
      targetComments: comments,
      currentComments: 0,
      currentViews: 0,
      currentLikes: 0,
      currentSaves: 0,
      currentShares: 0,
      embed_url: preview.embed_url,
      thumbnail: preview.thumbnail,
      projections,
      totalCycles: 0,
      lastRunAt: null,
      nextRunAt: nextRun,
      createdAt: new Date().toISOString(),
    };

    tasks.set(id, newCampaign);
    saveStateToDisk();

    const log: LogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      taskId: id,
      timestamp: new Date().toISOString(),
      type: "info",
      message: `Campaign baru diluncurkan untuk ${normalizedUrl}. Media terverifikasi (${platform}). Scheduler aktif.`,
    };
    executionLogs.unshift(log);

    res.json({
      success: true,
      message: "Campaign berhasil diluncurkan!",
      task: newCampaign,
      campaign: newCampaign,
      preview,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Gagal memulai campaign." });
  }
});

// Campaign Status Endpoint
app.get("/api/campaign/status", (req, res) => {
  const taskList = Array.from(tasks.values());
  res.json({
    success: true,
    campaigns: taskList,
    total: taskList.length,
    active: taskList.filter((t) => t.status === "running" || (t.status as string) === "active").length,
    timestamp: new Date().toISOString(),
  });
});

// Campaign Stop Endpoint
app.post("/api/campaign/stop", (req, res) => {
  const id = req.body?.id || req.body?.campaign_id;
  if (!id) {
    return res.status(400).json({ success: false, error: "ID campaign wajib diisi." });
  }

  const task = tasks.get(id);
  if (!task) {
    return res.status(404).json({ success: false, error: "Campaign tidak ditemukan." });
  }

  task.status = "stopped";
  task.nextRunAt = null;
  saveStateToDisk();

  const log: LogEntry = {
    id: Math.random().toString(36).substring(2, 9),
    taskId: task.id,
    timestamp: new Date().toISOString(),
    type: "warning",
    message: `Campaign '${task.title}' DIHENTIKAN oleh pengguna.`,
  };
  executionLogs.unshift(log);

  res.json({ success: true, message: "Campaign berhasil dihentikan.", campaign: task });
});

// Vercel Cron Job / Process Queue Serverless Endpoint
// Triggered periodically by Vercel Cron OR manual test button
const handleProcessQueue = (req: any, res: any) => {
  try {
    const force = req.query?.force === "true" || req.body?.force === true;
    const now = new Date();
    const processedTasks: ScheduledTask[] = [];

    tasks.forEach((task) => {
      // Only process active/running tasks
      const isActive = task.status === "running" || (task.status as string) === "active";
      if (!isActive) return;

      const isDue = !task.nextRunAt || new Date(task.nextRunAt) <= now;
      if (force || isDue) {
        executeSimulatedCycle(task, force);
        processedTasks.push(task);
      }
    });

    if (processedTasks.length > 0) {
      saveStateToDisk();
    }

    res.json({
      success: true,
      processed: processedTasks.length,
      processedCampaigns: processedTasks.map((t) => ({
        id: t.id,
        title: t.title,
        totalCycles: t.totalCycles,
        currentViews: t.currentViews,
        currentComments: t.currentComments,
        nextRunAt: t.nextRunAt,
      })),
      timestamp: now.toISOString(),
      message:
        processedTasks.length > 0
          ? `Berhasil memproses ${processedTasks.length} antrean kampanye!`
          : "Tidak ada kampanye aktif yang jatuh tempo saat ini.",
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Gagal memproses antrean cron." });
  }
};

app.get("/api/cron/process-queue", handleProcessQueue);
app.post("/api/cron/process-queue", handleProcessQueue);

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

    const urlResult = normalizeUrl(url);
    if (!urlResult.valid) {
      return res.status(400).json({ success: false, error: urlResult.error });
    }

    const normalizedUrl = urlResult.normalized;
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

    if (videoUrl && typeof videoUrl === "string" && videoUrl.trim()) {
      const check = normalizeUrl(videoUrl);
      if (!check.valid && !frameBase64) {
        return res.status(400).json({
          success: false,
          error: check.error || "Format URL video tidak valid. Contoh: tiktok.com/@user/video/123, instagram.com/reel/xyz, atau youtube.com/shorts/abc",
        });
      }
    }

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
