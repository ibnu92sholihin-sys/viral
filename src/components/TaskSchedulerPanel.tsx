import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, Trash2, Plus, ExternalLink, RefreshCw, Clock, Moon, ShieldCheck, AlertCircle, Sparkles, Layers, CheckCircle2, Loader2, Video, Eye, Heart, Bookmark, Zap, Share2 } from "lucide-react";
import { ScheduledTask, PreviewResult } from "../types";

interface TaskSchedulerPanelProps {
  tasks: ScheduledTask[];
  onToggleTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onCreateTask: (taskData: {
    url: string;
    title: string;
    targetComments: number;
    minIntervalSec: number;
    maxIntervalSec: number;
    maintenanceStartHour: number;
    maintenanceEndHour: number;
  }) => Promise<void>;
  onInspectAnalysis?: (task: ScheduledTask) => void;
  onRefreshTasks?: () => Promise<void> | void;
}

export const TaskSchedulerPanel: React.FC<TaskSchedulerPanelProps> = ({
  tasks,
  onToggleTask,
  onDeleteTask,
  onCreateTask,
  onInspectAnalysis,
  onRefreshTasks,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form states
  const [urlInput, setUrlInput] = useState("");
  const [titleInput, setTitleInput] = useState("");
  const [targetCommentsInput, setTargetCommentsInput] = useState(50);
  const [minIntervalSec, setMinIntervalSec] = useState(10);
  const [maxIntervalSec, setMaxIntervalSec] = useState(30);
  const [maintStart, setMaintStart] = useState(1);
  const [maintEnd, setMaintEnd] = useState(4);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Preview-First Validation States
  const [isCheckingPreview, setIsCheckingPreview] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewResult | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [isTriggeringCron, setIsTriggeringCron] = useState(false);
  const [cronFeedback, setCronFeedback] = useState<string | null>(null);

  const handleTriggerCronQueue = async () => {
    setIsTriggeringCron(true);
    setCronFeedback(null);
    try {
      const res = await fetch("/api/cron/process-queue?force=true", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setCronFeedback(data.message || `Berhasil mengeksekusi antrean cron!`);
        if (onRefreshTasks) await onRefreshTasks();
        setTimeout(() => setCronFeedback(null), 4000);
      } else {
        setCronFeedback("Gagal: " + (data.error || "Terjadi kesalahan"));
      }
    } catch (err: any) {
      setCronFeedback("Gagal memproses cron: " + err.message);
    } finally {
      setIsTriggeringCron(false);
    }
  };
  useEffect(() => {
    const trimmed = urlInput.trim();
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!trimmed) {
      setPreviewData(null);
      setIsCheckingPreview(false);
      setErrorMsg(null);
      return;
    }

    setIsCheckingPreview(true);
    setErrorMsg(null);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/preview/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: trimmed }),
        });
        const data: PreviewResult = await res.json();
        setPreviewData(data);
        if (!data.valid) {
          setErrorMsg(data.error_message || "Link tidak dikenali, pastikan link publik dan aktif.");
        } else {
          setErrorMsg(null);
          // Autofill title if user has not typed one
          if (!titleInput.trim() && data.title) {
            setTitleInput(data.title);
          }
        }
      } catch (err: any) {
        setPreviewData({ valid: false, error_message: "Gagal memverifikasi preview video." });
        setErrorMsg("Link tidak dikenali, pastikan link publik dan aktif.");
      } finally {
        setIsCheckingPreview(false);
      }
    }, 500);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [urlInput]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) {
      setErrorMsg("URL video sasaran wajib diisi.");
      return;
    }

    // Strict Preview-First condition: preview MUST be valid!
    if (!previewData || !previewData.valid) {
      setErrorMsg("Link tidak dikenali, pastikan link publik dan aktif.");
      return;
    }

    if (minIntervalSec > maxIntervalSec) {
      setErrorMsg("Interval minimum tidak boleh lebih besar dari interval maksimum.");
      return;
    }

    setIsCreating(true);
    setErrorMsg(null);

    try {
      // Call /api/campaign/start (or create task with validated preview)
      const res = await fetch("/api/campaign/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video_url: urlInput.trim(),
          title: titleInput.trim() || previewData.title || `Target (${urlInput.slice(-10)})`,
          targetComments: Number(targetCommentsInput) || 50,
          minIntervalSec: Number(minIntervalSec),
          maxIntervalSec: Number(maxIntervalSec),
          maintenanceStartHour: Number(maintStart),
          maintenanceEndHour: Number(maintEnd),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal meluncurkan campaign.");
      }

      // Reset form & notify parent
      await onCreateTask({
        url: urlInput.trim(),
        title: titleInput.trim() || previewData.title || `Target (${urlInput.slice(-10)})`,
        targetComments: Number(targetCommentsInput) || 50,
        minIntervalSec: Number(minIntervalSec),
        maxIntervalSec: Number(maxIntervalSec),
        maintenanceStartHour: Number(maintStart),
        maintenanceEndHour: Number(maintEnd),
      });

      setUrlInput("");
      setTitleInput("");
      setPreviewData(null);
      setShowAddForm(false);
    } catch (err: any) {
      setErrorMsg(err.message || "Link tidak dikenali, pastikan link publik dan aktif.");
    } finally {
      setIsCreating(false);
    }
  };

  const getPlatformBadge = (platform: ScheduledTask["platform"]) => {
    switch (platform) {
      case "tiktok":
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-pink-500/20 text-pink-300 border border-pink-500/30">TikTok</span>;
      case "instagram":
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">Instagram Reels</span>;
      case "youtube":
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-red-500/20 text-red-300 border border-red-500/30">YouTube Shorts</span>;
      case "facebook":
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-600/20 text-blue-300 border border-blue-600/30">Facebook Video</span>;
      case "twitter":
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-sky-500/20 text-sky-300 border border-sky-500/30">X / Twitter</span>;
      case "threads":
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-700/40 text-zinc-300 border border-zinc-600/40">Threads</span>;
      case "linkedin":
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-600/20 text-cyan-300 border border-cyan-600/30">LinkedIn</span>;
      case "pinterest":
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-600/20 text-rose-300 border border-rose-600/30">Pinterest</span>;
      case "snapchat":
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">Snapchat Spotlight</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">Universal Link</span>;
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-sm">
      {/* Panel Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 mb-5 gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">
              Task Scheduler & URL Manager
            </h2>
            <p className="text-xs text-slate-400">
              Jadwal otomatis independen untuk setiap link dengan interval acak dan jendela istirahat
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <button
            onClick={handleTriggerCronQueue}
            disabled={isTriggeringCron}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
            title="Picu Vercel Cron Job secara manual untuk memproses antrean sekarang"
          >
            {isTriggeringCron ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Zap className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
            )}
            <span>Picu Cron Antrean</span>
          </button>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold shadow-sm shadow-sky-500/20 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>{showAddForm ? "Tutup Form" : "Tambah URL Target Baru"}</span>
          </button>
        </div>
      </div>

      {/* Cron Feedback Notification */}
      {cronFeedback && (
        <div className="mb-4 px-4 py-2.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-400" />
            <span>{cronFeedback}</span>
          </div>
          <button onClick={() => setCronFeedback(null)} className="text-slate-400 hover:text-white text-[11px]">
            ✕
          </button>
        </div>
      )}

      {/* Add New Task Form Modal / Accordion */}
      {showAddForm && (
        <form
          noValidate
          onSubmit={handleSubmit}
          className="mb-6 p-4 sm:p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-4 transition-all"
        >
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
            <span className="text-xs font-semibold text-slate-200">
              Konfigurasi URL Sasaran & Perilaku Scheduler
            </span>
            <span className="text-[11px] text-slate-400">
              Multi-worker (bisa jalan bersamaan)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-300">
                  URL Video Target (Platform Manapun) *
                </label>
                <span className="text-[10px] text-sky-400 font-mono">
                  Bebas Format & Fleksibel
                </span>
              </div>
              <input
                type="text"
                autoComplete="off"
                spellCheck="false"
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="Contoh: tiktok.com/@user/video/123 atau instagram.com/reel/abc"
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
              <div className="mt-1 flex items-center gap-1.5 flex-wrap text-[10px] text-slate-400">
                <span>Format yang diterima:</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-800/80 font-mono text-slate-300 border border-slate-700">tiktok.com</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-800/80 font-mono text-slate-300 border border-slate-700">instagram.com/reel</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-800/80 font-mono text-slate-300 border border-slate-700">youtu.be / shorts</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-800/80 font-mono text-slate-300 border border-slate-700">fb.watch</span>
              </div>

              {/* Realtime Preview-First Visual Feedback Box */}
              {urlInput.trim() && (
                <div className="mt-3 p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                  {isCheckingPreview ? (
                    <div className="flex items-center gap-2 text-xs text-sky-400 py-2">
                      <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                      <span>Memeriksa dan mengekstrak visual video preview...</span>
                    </div>
                  ) : previewData?.valid ? (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                          <CheckCircle2 className="h-4 w-4 shrink-0" />
                          <span>Preview Video Berhasil Diverifikasi ({previewData.platform?.toUpperCase()})</span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono">
                          Siap Kampanye
                        </span>
                      </div>

                      {/* Video Embed Player or Thumbnail */}
                      <div className="relative rounded-lg overflow-hidden border border-slate-700 bg-black aspect-video max-h-48 flex items-center justify-center">
                        {previewData.embed_url ? (
                          <iframe
                            src={previewData.embed_url}
                            title="Video Preview Embed"
                            className="w-full h-full border-0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            sandbox="allow-scripts allow-same-origin allow-presentation"
                          />
                        ) : previewData.thumbnail ? (
                          <div className="relative w-full h-full">
                            <img
                              src={previewData.thumbnail}
                              alt="Video Thumbnail"
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-2.5">
                              <span className="text-[11px] text-white font-medium truncate">
                                {previewData.title || urlInput}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400 flex items-center gap-2">
                            <Video className="h-4 w-4 text-sky-400" />
                            <span>Media terverifikasi dan siap diproses</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">Link tidak dikenali, pastikan link publik dan aktif.</p>
                        <p className="text-[11px] text-rose-300/80 mt-0.5">
                          Sistem Preview-First hanya mengizinkan video yang dapat diakses secara publik.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Label / Judul Konten (Opsional)
              </label>
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                placeholder="Contoh: Video Tips Sukses FYP"
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
              <span className="mt-1 text-[10px] text-slate-400 block">
                Jika kosong, sistem otomatis membuat nama berdasarkan link video.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Target Comments */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Target Komentar
              </label>
              <input
                type="number"
                min="1"
                value={targetCommentsInput}
                onChange={(e) => setTargetCommentsInput(Math.max(1, Number(e.target.value)))}
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-sky-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Views otomatis diset min {targetCommentsInput * 20} (20x)
              </span>
            </div>

            {/* Interval Random X to Y sec */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Interval Acak (Detik)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="5"
                  value={minIntervalSec}
                  onChange={(e) => setMinIntervalSec(Number(e.target.value))}
                  placeholder="Min"
                  className="w-1/2 px-2.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono text-center"
                />
                <span className="text-slate-500 text-xs">s/d</span>
                <input
                  type="number"
                  min="5"
                  value={maxIntervalSec}
                  onChange={(e) => setMaxIntervalSec(Number(e.target.value))}
                  placeholder="Max"
                  className="w-1/2 px-2.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono text-center"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Jeda bervariasi meniru ritme manusia
              </span>
            </div>

            {/* Maintenance Window */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Maintenance Window (Jam Istirahat)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={maintStart}
                  onChange={(e) => setMaintStart(Number(e.target.value))}
                  className="w-1/2 px-2.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono text-center"
                />
                <span className="text-slate-500 text-xs">-</span>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={maintEnd}
                  onChange={(e) => setMaintEnd(Number(e.target.value))}
                  className="w-1/2 px-2.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono text-center"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Contoh: {maintStart}:00 s/d {maintEnd}:00 (tugas auto-skip)
              </span>
            </div>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isCreating || isCheckingPreview || !previewData?.valid}
              className="px-5 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold shadow-sm shadow-sky-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Memulai Campaign...</span>
                </>
              ) : isCheckingPreview ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Memverifikasi Preview...</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Start Campaign</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* List of Tasks */}
      <div className="space-y-3">
        {tasks.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-dashed border-slate-800 text-slate-500 text-xs">
            Belum ada URL video yang dipantau. Klik "Tambah URL Target Baru" di atas untuk memulai.
          </div>
        ) : (
          tasks.map((task) => {
            const isRunning = task.status === "running" || (task.status as string) === "active";
            const isMaint = task.status === "maintenance";
            const isCompleted = task.status === "completed";
            const currComments = task.currentComments || 0;
            const targetComments = task.targetComments || 50;
            const commentPct = Math.min(100, Math.round((currComments / targetComments) * 100));

            return (
              <div
                key={task.id}
                className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 hover:border-slate-700 transition-all flex flex-col gap-3.5"
              >
                {/* Top row: Thumbnail/Avatar + Title + Status + Action Controls */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Thumbnail or Video Platform Icon */}
                    {task.thumbnail ? (
                      <img
                        src={task.thumbnail}
                        alt="Media Preview"
                        className="w-12 h-12 rounded-lg object-cover border border-slate-700 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 text-slate-400">
                        <Video className="h-5 w-5 text-sky-400" />
                      </div>
                    )}

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getPlatformBadge(task.platform)}
                        <h3 className="font-semibold text-sm text-white truncate max-w-md">
                          {task.title}
                        </h3>
                        {/* Status badge */}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 ${
                            isCompleted
                              ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                              : isRunning
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : isMaint
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                              : "bg-slate-800 text-slate-400 border border-slate-700"
                          }`}
                        >
                          {isRunning && (
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          )}
                          {isMaint && (
                            <Moon className="h-2.5 w-2.5 text-amber-400" />
                          )}
                          {isCompleted && (
                            <CheckCircle2 className="h-2.5 w-2.5 text-purple-400" />
                          )}
                          {isCompleted
                            ? "Target Tercapai (Selesai)"
                            : isRunning
                            ? "Aktif Berjalan"
                            : isMaint
                            ? "Dalam Jam Tidur (Maint)"
                            : "Dihentikan (Paused)"}
                        </span>
                      </div>

                      {/* URL link */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <span className="truncate max-w-xs sm:max-w-md font-mono text-[11px]">
                          {task.url}
                        </span>
                        <a
                          href={task.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sky-400 hover:text-sky-300"
                          title="Buka link di tab baru"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Right side controls */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center flex-wrap">
                    {/* Trigger 1 cycle immediate button */}
                    <button
                      onClick={handleTriggerCronQueue}
                      disabled={isTriggeringCron}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-300 text-xs font-medium flex items-center gap-1 transition-colors"
                      title="Picu 1 siklus interaksi sekarang via endpoint /api/cron/process-queue"
                    >
                      <Zap className="h-3 w-3 fill-current text-amber-400" />
                      <span>Siklus</span>
                    </button>

                    {onInspectAnalysis && (
                      <button
                        onClick={() => onInspectAnalysis(task)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-sky-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
                        title="Lihat Rekomendasi AI"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-sky-400" />
                        <span>Analisis AI</span>
                      </button>
                    )}

                    {/* Toggle Start / Pause */}
                    <button
                      onClick={() => onToggleTask(task.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        isRunning
                          ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-600/20"
                      }`}
                    >
                      {isRunning ? (
                        <>
                          <Pause className="h-3.5 w-3.5" />
                          <span>Hentikan</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5" />
                          <span>Jalankan</span>
                        </>
                      )}
                    </button>

                    {/* Delete button */}
                    <button
                      onClick={() => onDeleteTask(task.id)}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 border border-slate-800 hover:border-rose-500/30 transition-colors"
                      title="Hapus task ini"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Bottom row: Live Engagement Metrics & Progress Bar */}
                <div className="pt-2 border-t border-slate-900 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {/* Comments Progress */}
                  <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Target Komentar</span>
                      <span className="font-semibold text-white font-mono">
                        {currComments} / {targetComments} ({commentPct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-sky-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${commentPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Views Metric */}
                  <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <Eye className="h-3.5 w-3.5 text-teal-400" />
                      <span>Tayangan (Views)</span>
                    </div>
                    <span className="font-mono font-bold text-teal-300 text-xs">
                      {(task.currentViews || 0).toLocaleString()}
                    </span>
                  </div>

                  {/* Likes & Saves Metric */}
                  <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Heart className="h-3.5 w-3.5 text-pink-400" />
                        <strong className="text-pink-300 font-mono">{task.currentLikes || 0}</strong>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Bookmark className="h-3 w-3 text-amber-400" />
                        <strong className="text-amber-300 font-mono">{task.currentSaves || 0}</strong>
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Rasio Aman
                    </span>
                  </div>

                  {/* Schedule info */}
                  <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Clock className="h-3 w-3 text-sky-400" />
                      Siklus #{task.totalCycles}
                    </span>
                    <span className="font-mono text-slate-300 text-[10px]">
                      Next: {task.nextRunAt ? new Date(task.nextRunAt).toLocaleTimeString() : "-"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
