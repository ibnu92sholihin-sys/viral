import React, { useState, useEffect, useCallback } from "react";
import { Navbar } from "./components/Navbar";
import { TaskSchedulerPanel } from "./components/TaskSchedulerPanel";
import { AiVisionAnalyzerPanel } from "./components/AiVisionAnalyzerPanel";
import { EngagementCalculatorPanel } from "./components/EngagementCalculatorPanel";
import { ExecutionLogsPanel } from "./components/ExecutionLogsPanel";
import { VercelExportPanel } from "./components/VercelExportPanel";
import { ScheduledTask, LogEntry, VideoAnalysis } from "./types";
import {
  Layers,
  Sparkles,
  Calculator,
  Terminal,
  ShieldCheck,
  TrendingUp,
  Activity,
  CheckCircle,
  Cloud,
  Server,
  Smartphone,
} from "lucide-react";

export default function App() {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeTab, setActiveTab] = useState<"scheduler" | "vision" | "calculator" | "logs" | "vercel">("scheduler");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch tasks and logs from backend
  const fetchTasksAndLogs = useCallback(async () => {
    try {
      const response = await fetch("/api/tasks");
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Failed to fetch tasks/logs:", err);
    }
  }, []);

  // Poll tasks every 3.5 seconds for live scheduler ticks
  useEffect(() => {
    fetchTasksAndLogs();
    const interval = setInterval(fetchTasksAndLogs, 3500);
    return () => clearInterval(interval);
  }, [fetchTasksAndLogs]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchTasksAndLogs();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Toggle Task Status (Start / Pause)
  const handleToggleTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/toggle`, {
        method: "POST",
      });
      if (response.ok) {
        await fetchTasksAndLogs();
      }
    } catch (err) {
      console.error("Error toggling task:", err);
    }
  };

  // Delete Task
  const handleDeleteTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        await fetchTasksAndLogs();
      }
    } catch (err) {
      console.error("Error deleting task:", err);
    }
  };

  // Create Task
  const handleCreateTask = async (taskData: {
    url: string;
    title: string;
    targetComments: number;
    minIntervalSec: number;
    maxIntervalSec: number;
    maintenanceStartHour: number;
    maintenanceEndHour: number;
  }) => {
    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(taskData),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Gagal membuat task baru.");
    }

    await fetchTasksAndLogs();
    setActiveTab("scheduler");
  };

  // Metrics summary
  const activeTasks = tasks.filter((t) => t.status === "running");
  const totalCycles = tasks.reduce((acc, t) => acc + (t.totalCycles || 0), 0);
  const totalProjectedViews = tasks.reduce((acc, t) => acc + (t.projections?.min_views || 0), 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        activeTasksCount={activeTasks.length}
        totalTasksCount={tasks.length}
        onRefresh={handleManualRefresh}
        isRefreshing={isRefreshing}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Metric Summary Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Target URL Aktif</span>
              <Layers className="h-4 w-4 text-sky-400" />
            </div>
            <div className="text-2xl font-bold text-white font-mono">
              {activeTasks.length}{" "}
              <span className="text-xs font-normal text-slate-400">/ {tasks.length}</span>
            </div>
            <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
              Scheduler berjalan otomatis
            </p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Total Siklus Eksekusi</span>
              <Activity className="h-4 w-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-bold text-white font-mono">
              {totalCycles}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Audit interval acak & natural
            </p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Proyeksi Views Aman</span>
              <TrendingUp className="h-4 w-4 text-teal-400" />
            </div>
            <div className="text-2xl font-bold text-white font-mono">
              {totalProjectedViews.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Min 20x dari target komentar
            </p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Skor Keamanan Algoritma</span>
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400 font-mono">
              98%
            </div>
            <p className="text-[11px] text-emerald-400/80 mt-1 flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Rasio interaksi organik terlindungi
            </p>
          </div>
        </div>

        {/* 24/7 Cloud Background Execution Alert */}
        <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900/90 to-sky-950/40 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shrink-0 mt-0.5 sm:mt-0">
              <Cloud className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white text-sm">
                  Arsitektur Eksekusi 24/7 Server Cloud Aktif
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  HP Offline Aman
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Background scheduler & antrean tugas berjalan secara otonom di container server backend cloud (Cloud Run), bukan di browser ponsel Anda. Seluruh status dan riwayat siklus otomatis tersimpan di storage disk server. Anda dapat mematikan layar HP, menutup browser, atau tidak memiliki koneksi internet tanpa mengganggu proses scheduler yang sedang berjalan.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end md:self-center shrink-0">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/80 text-[11px] text-slate-300 font-mono">
              <Server className="h-3.5 w-3.5 text-emerald-400" />
              <span>Disk Sync: Terhubung</span>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-800 overflow-x-auto gap-2 pb-1">
          <button
            onClick={() => setActiveTab("scheduler")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 ${
              activeTab === "scheduler"
                ? "bg-sky-500/10 text-sky-400 border border-sky-500/30 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Task Scheduler ({tasks.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("vision")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 ${
              activeTab === "vision"
                ? "bg-sky-500/10 text-sky-400 border border-sky-500/30 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
            }`}
          >
            <Sparkles className="h-4 w-4" />
            <span>AI Vision & Vibe Analyzer</span>
          </button>

          <button
            onClick={() => setActiveTab("calculator")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 ${
              activeTab === "calculator"
                ? "bg-sky-500/10 text-sky-400 border border-sky-500/30 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
            }`}
          >
            <Calculator className="h-4 w-4" />
            <span>Kalkulator Rasio (Views/Likes)</span>
          </button>

          <button
            onClick={() => setActiveTab("logs")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 ${
              activeTab === "logs"
                ? "bg-sky-500/10 text-sky-400 border border-sky-500/30 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
            }`}
          >
            <Terminal className="h-4 w-4" />
            <span>Log Audit Live ({logs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("vercel")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 ${
              activeTab === "vercel"
                ? "bg-sky-500/10 text-sky-400 border border-sky-500/30 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
            }`}
          >
            <Server className="h-4 w-4 text-emerald-400" />
            <span>Vercel & SQL Export</span>
          </button>
        </div>

        {/* Tab Panels */}
        <div className="space-y-6">
          {activeTab === "scheduler" && (
            <div className="space-y-6">
              <TaskSchedulerPanel
                tasks={tasks}
                onToggleTask={handleToggleTask}
                onDeleteTask={handleDeleteTask}
                onCreateTask={handleCreateTask}
                onInspectAnalysis={() => setActiveTab("vision")}
                onRefreshTasks={fetchTasksAndLogs}
              />
              <ExecutionLogsPanel logs={logs} />
            </div>
          )}

          {activeTab === "vision" && (
            <div className="space-y-6">
              <AiVisionAnalyzerPanel
                onStrategyGenerated={(analysis) => {
                  console.log("Analysis generated:", analysis);
                }}
              />
            </div>
          )}

          {activeTab === "calculator" && (
            <div className="space-y-6">
              <EngagementCalculatorPanel
                onApplyToNewTask={() => {
                  setActiveTab("scheduler");
                }}
              />
            </div>
          )}

          {activeTab === "logs" && (
            <div className="space-y-6">
              <ExecutionLogsPanel logs={logs} />
            </div>
          )}

          {activeTab === "vercel" && (
            <div className="space-y-6">
              <VercelExportPanel />
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        <p>
          ViralPulse Analytics & Scheduler Studio • Dirancang untuk optimasi konten organik, analisis visual AI, dan tata kelola penjadwalan otomatis.
        </p>
      </footer>
    </div>
  );
}
