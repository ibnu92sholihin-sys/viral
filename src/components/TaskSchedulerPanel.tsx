import React, { useState } from "react";
import { Play, Pause, Trash2, Plus, ExternalLink, RefreshCw, Clock, Moon, ShieldCheck, AlertCircle, Sparkles, Layers } from "lucide-react";
import { ScheduledTask } from "../types";

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
}

export const TaskSchedulerPanel: React.FC<TaskSchedulerPanelProps> = ({
  tasks,
  onToggleTask,
  onDeleteTask,
  onCreateTask,
  onInspectAnalysis,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) {
      setErrorMsg("URL video sasaran wajib diisi.");
      return;
    }

    if (minIntervalSec > maxIntervalSec) {
      setErrorMsg("Interval minimum tidak boleh lebih besar dari interval maksimum.");
      return;
    }

    setIsCreating(true);
    setErrorMsg(null);

    try {
      await onCreateTask({
        url: urlInput.trim(),
        title: titleInput.trim() || `Konten Target (${urlInput.slice(-10)})`,
        targetComments: Number(targetCommentsInput) || 50,
        minIntervalSec: Number(minIntervalSec),
        maxIntervalSec: Number(maxIntervalSec),
        maintenanceStartHour: Number(maintStart),
        maintenanceEndHour: Number(maintEnd),
      });

      // Reset form
      setUrlInput("");
      setTitleInput("");
      setShowAddForm(false);
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menambahkan task.");
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
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">Video Link</span>;
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

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold shadow-sm shadow-sky-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>{showAddForm ? "Tutup Form" : "Tambah URL Target Baru"}</span>
        </button>
      </div>

      {/* Add New Task Form Modal / Accordion */}
      {showAddForm && (
        <form
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
              <label className="block text-xs font-medium text-slate-300 mb-1">
                URL Video Target *
              </label>
              <input
                type="url"
                required
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://www.tiktok.com/@user/video/..."
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
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
              disabled={isCreating}
              className="px-5 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold shadow-sm shadow-sky-500/20 transition-all disabled:opacity-50"
            >
              {isCreating ? "Menyimpan..." : "Mulai Scheduler"}
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
            const isRunning = task.status === "running";
            const isMaint = task.status === "maintenance";

            return (
              <div
                key={task.id}
                className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700/80 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left side details */}
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getPlatformBadge(task.platform)}
                    <h3 className="font-semibold text-sm text-white truncate max-w-md">
                      {task.title}
                    </h3>
                    {/* Status badge */}
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 ${
                        isRunning
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
                      {isRunning
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

                  {/* Operational parameters */}
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1 flex-wrap font-mono">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-sky-400" />
                      Jeda: {task.minIntervalSec}-{task.maxIntervalSec}s
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Moon className="h-3 w-3 text-amber-400" />
                      Maint: {task.maintenanceStartHour}:00 - {task.maintenanceEndHour}:00
                    </span>
                    <span>•</span>
                    <span className="text-emerald-400">
                      Siklus: <strong>#{task.totalCycles}</strong>
                    </span>
                    <span>•</span>
                    <span className="text-slate-300">
                      Next: {task.nextRunAt ? new Date(task.nextRunAt).toLocaleTimeString() : "-"}
                    </span>
                  </div>
                </div>

                {/* Right side controls */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  {onInspectAnalysis && (
                    <button
                      onClick={() => onInspectAnalysis(task)}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-sky-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
                      title="Lihat Rekomendasi AI"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-sky-400" />
                      <span>Analisis AI</span>
                    </button>
                  )}

                  {/* Toggle Start / Pause */}
                  <button
                    onClick={() => onToggleTask(task.id)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
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
            );
          })
        )}
      </div>
    </div>
  );
};
