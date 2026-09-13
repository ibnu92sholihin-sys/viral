import React, { useState } from "react";
import { Terminal, CheckCircle2, AlertTriangle, Moon, Info, Trash2, ArrowUpDown } from "lucide-react";
import { LogEntry } from "../types";

interface ExecutionLogsPanelProps {
  logs: LogEntry[];
  onClearLogs?: () => void;
}

export const ExecutionLogsPanel: React.FC<ExecutionLogsPanelProps> = ({ logs, onClearLogs }) => {
  const [filter, setFilter] = useState<"all" | "success" | "skip" | "info">("all");

  const filteredLogs = logs.filter((log) => {
    if (filter === "all") return true;
    return log.type === filter;
  });

  const getLogBadge = (type: LogEntry["type"]) => {
    switch (type) {
      case "success":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            <span>CYCLE OK</span>
          </span>
        );
      case "skip":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
            <Moon className="h-3 w-3" />
            <span>MAINT SKIP</span>
          </span>
        );
      case "warning":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            <span>PAUSED</span>
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center gap-1">
            <Info className="h-3 w-3" />
            <span>INFO</span>
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 mb-4 gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
            <Terminal className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">
              Log Eksekusi & Audit Sinyal Algoritma
            </h2>
            <p className="text-xs text-slate-400">
              Riwayat waktu nyata siklus penjadwalan, penundaan acak (human delay), dan status window
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-medium">
            <button
              onClick={() => setFilter("all")}
              className={`px-2.5 py-1 rounded-md transition-all ${
                filter === "all" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Semua ({logs.length})
            </button>
            <button
              onClick={() => setFilter("success")}
              className={`px-2.5 py-1 rounded-md transition-all ${
                filter === "success" ? "bg-slate-800 text-emerald-400" : "text-slate-400 hover:text-white"
              }`}
            >
              Siklus OK
            </button>
            <button
              onClick={() => setFilter("skip")}
              className={`px-2.5 py-1 rounded-md transition-all ${
                filter === "skip" ? "bg-slate-800 text-amber-400" : "text-slate-400 hover:text-white"
              }`}
            >
              Maintenance
            </button>
          </div>
        </div>
      </div>

      {/* Logs Console Container */}
      <div className="bg-slate-950 rounded-xl border border-slate-800/80 p-3.5 max-h-72 overflow-y-auto font-mono text-xs space-y-2">
        {filteredLogs.length === 0 ? (
          <div className="py-8 text-center text-slate-500">
            Tidak ada log aktivitas untuk filter yang dipilih.
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className="flex flex-col sm:flex-row sm:items-baseline justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/60 hover:border-slate-700/80 gap-2 transition-colors"
            >
              <div className="flex items-start gap-2.5">
                {getLogBadge(log.type)}
                <span className="text-slate-300 font-sans text-xs leading-relaxed">
                  {log.message}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono shrink-0">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
