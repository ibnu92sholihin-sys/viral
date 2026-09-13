import React, { useState, useEffect } from "react";
import { Activity, ShieldCheck, Clock, Moon, Sparkles, RefreshCw, Server, Cloud } from "lucide-react";

interface NavbarProps {
  activeTasksCount: number;
  totalTasksCount: number;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTasksCount,
  totalTasksCount,
  onRefresh,
  isRefreshing,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const currentHour = currentTime.getHours();
  // Default sample maintenance: 01:00 - 04:00
  const isMaintenanceHour = currentHour >= 1 && currentHour < 4;

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-md shadow-sky-500/20 text-white font-black tracking-wider">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg text-white tracking-tight">ViralPulse</h1>
              <span className="text-[11px] font-semibold bg-sky-500/20 text-sky-400 border border-sky-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Studio
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              AI Vision Analyzer • Human Behavior Scheduler • Organic Calculator
            </p>
          </div>
        </div>

        {/* System Status Indicators */}
        <div className="flex items-center gap-3 sm:gap-4 text-xs">
          {/* Cloud Server 24/7 Badge */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300">
            <Cloud className="h-3.5 w-3.5 text-emerald-400" />
            <span className="font-medium">Cloud 24/7: HP Offline Aman</span>
          </div>

          {/* Live Scheduler Status */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700">
            <span className="relative flex h-2 w-2">
              {activeTasksCount > 0 ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-500"></span>
              )}
            </span>
            <span className="text-slate-300">
              Worker:{" "}
              <strong className="text-white font-mono">
                {activeTasksCount}/{totalTasksCount} Aktif
              </strong>
            </span>
          </div>

          {/* Maintenance Window Indicator */}
          <div
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${
              isMaintenanceHour
                ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                : "bg-slate-800/60 border-slate-700/80 text-slate-300"
            }`}
          >
            {isMaintenanceHour ? (
              <Moon className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
            ) : (
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            )}
            <span>
              {isMaintenanceHour ? "Maintenance Window Aktif" : "Sistem Normal"}
            </span>
          </div>

          {/* Real-time Clock */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 font-mono text-slate-300">
            <Clock className="h-3.5 w-3.5 text-sky-400" />
            <span>{currentTime.toLocaleTimeString()}</span>
          </div>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors disabled:opacity-50"
            title="Segarkan data"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin text-sky-400" : ""}`} />
          </button>
        </div>
      </div>
    </header>
  );
};
