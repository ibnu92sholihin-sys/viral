import React, { useState, useEffect } from "react";
import { Calculator, Eye, ThumbsUp, Bookmark, Share2, ShieldAlert, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import { EngagementProjections } from "../types";

interface EngagementCalculatorPanelProps {
  onApplyToNewTask?: (targetComments: number) => void;
}

export const EngagementCalculatorPanel: React.FC<EngagementCalculatorPanelProps> = ({
  onApplyToNewTask,
}) => {
  const [targetKomentarInput, setTargetKomentarInput] = useState<string>("50");
  const [error, setError] = useState<string | null>(null);
  const [projections, setProjections] = useState<EngagementProjections | null>(null);

  const calculate = (valStr: string) => {
    const num = Number(valStr);
    if (valStr.trim() === "" || isNaN(num)) {
      setError("Masukkan angka bilangan bulat yang valid.");
      setProjections(null);
      return;
    }
    if (num < 0) {
      setError("Target komentar tidak boleh bernilai negatif.");
      setProjections(null);
      return;
    }

    setError(null);
    const minViews = Math.round(num * 20);
    const minLikes = Math.round(num * 3);
    const minSaves = Math.round(num * 0.8);
    const minShares = Math.round(num * 0.4);

    const commentRatio = num === 0 ? 0 : num / minViews;
    const safetyScore = commentRatio > 0.08 ? 65 : commentRatio > 0.05 ? 82 : 98;

    setProjections({
      targetKomentar: num,
      min_views: minViews,
      min_likes: minLikes,
      min_saves: minSaves,
      min_shares: minShares,
      safetyScore,
      commentToViewRatio: `${(commentRatio * 100).toFixed(1)}%`,
      statusMessage:
        "Sesuai regulasi: Komentar berada 50%+ jauh di bawah batas views (hanya 5%), meniru interaksi organik murni.",
    });
  };

  useEffect(() => {
    calculate(targetKomentarInput);
  }, [targetKomentarInput]);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">
              Kalkulator Proyeksi Rasio Engagement
            </h2>
            <p className="text-xs text-slate-400">
              Menghitung minimum views, likes, & shares agar sinyal interaksi organik aman bagi algoritma
            </p>
          </div>
        </div>
        <span className="text-xs font-mono font-medium px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700 hidden sm:inline-block">
          Formula: Views=20x, Likes=3x
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input Section */}
        <div className="lg:col-span-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Target Komentar
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="1"
                value={targetKomentarInput}
                onChange={(e) => setTargetKomentarInput(e.target.value)}
                placeholder="Contoh: 50"
                className={`w-full px-4 py-3 bg-slate-950 border rounded-xl font-mono text-lg text-white placeholder-slate-600 focus:outline-none focus:ring-2 transition-all ${
                  error
                    ? "border-rose-500/80 focus:ring-rose-500/40"
                    : "border-slate-700 focus:border-sky-500 focus:ring-sky-500/20"
                }`}
              />
              <span className="absolute right-3.5 top-3.5 text-xs text-slate-500 font-mono">
                komentar
              </span>
            </div>

            {error && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-lg">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Quick Preset Buttons */}
          <div>
            <span className="text-xs text-slate-400 block mb-2 font-medium">Preset Cepat:</span>
            <div className="flex flex-wrap gap-2">
              {[15, 30, 50, 100, 250].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setTargetKomentarInput(preset.toString())}
                  className={`px-3 py-1.5 text-xs rounded-lg font-mono border transition-all ${
                    targetKomentarInput === preset.toString()
                      ? "bg-sky-500 text-white border-sky-400 shadow-sm shadow-sky-500/30"
                      : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white"
                  }`}
                >
                  {preset} kom
                </button>
              ))}
            </div>
          </div>

          {/* Safety Rule Card */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 text-xs space-y-2 text-slate-400">
            <div className="flex items-center gap-1.5 text-slate-200 font-semibold">
              <ShieldAlert className="h-4 w-4 text-emerald-400" />
              <span>Aturan Algoritma Organik:</span>
            </div>
            <p className="leading-relaxed">
              Algoritma media sosial menandai akun sebagai bot jika jumlah komentar mendekati atau melebihi jumlah penonton.
              Sistem ini memastikan rasio komentar selalu <strong className="text-emerald-300 font-mono">50%+ jauh di bawah penonton</strong> (standar aman ideal: 5% dari views).
            </p>
          </div>

          {onApplyToNewTask && projections && (
            <button
              onClick={() => onApplyToNewTask(projections.targetKomentar)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-md shadow-sky-600/20 transition-all"
            >
              <span>Gunakan Target Ini di Task Scheduler Baru</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Results / Projections Display */}
        <div className="lg:col-span-7">
          {projections ? (
            <div className="space-y-4">
              {/* Output Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Views */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 relative overflow-hidden">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span className="font-medium">Min Views</span>
                    <Eye className="h-4 w-4 text-sky-400" />
                  </div>
                  <div className="text-xl font-bold font-mono text-white">
                    {projections.min_views.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-sky-400/80 font-mono mt-0.5">
                    20x komentar
                  </div>
                </div>

                {/* Likes */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 relative overflow-hidden">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span className="font-medium">Min Likes</span>
                    <ThumbsUp className="h-4 w-4 text-rose-400" />
                  </div>
                  <div className="text-xl font-bold font-mono text-white">
                    {projections.min_likes.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-rose-400/80 font-mono mt-0.5">
                    3x komentar
                  </div>
                </div>

                {/* Saves */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 relative overflow-hidden">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span className="font-medium">Min Saves</span>
                    <Bookmark className="h-4 w-4 text-amber-400" />
                  </div>
                  <div className="text-xl font-bold font-mono text-white">
                    {projections.min_saves.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-amber-400/80 font-mono mt-0.5">
                    0.8x komentar
                  </div>
                </div>

                {/* Shares / Repost */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 relative overflow-hidden">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span className="font-medium">Min Repost</span>
                    <Share2 className="h-4 w-4 text-purple-400" />
                  </div>
                  <div className="text-xl font-bold font-mono text-white">
                    {projections.min_shares.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-purple-400/80 font-mono mt-0.5">
                    0.4x komentar
                  </div>
                </div>
              </div>

              {/* Safety & Realism Score Bar */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-slate-200">
                      Skor Keamanan Algoritma (Safety Score)
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    {projections.safetyScore}% / 100
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                    style={{ width: `${projections.safetyScore}%` }}
                  />
                </div>

                {/* Ratio detail tags */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                    <span className="text-slate-400 block text-[10px]">Rasio Komentar vs View:</span>
                    <span className="text-emerald-400 font-mono font-bold">
                      {projections.commentToViewRatio} (Maks 5%)
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                    <span className="text-slate-400 block text-[10px]">Rasio Like vs Komentar:</span>
                    <span className="text-sky-400 font-mono font-bold">3.0x (Optimal)</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80 col-span-2 sm:col-span-1">
                    <span className="text-slate-400 block text-[10px]">Sinyal Algoritma:</span>
                    <span className="text-amber-400 font-mono font-bold">Viral-Friendly</span>
                  </div>
                </div>

                <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-800/80 leading-relaxed">
                  {projections.statusMessage}
                </p>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[160px] flex items-center justify-center rounded-xl border border-dashed border-slate-800 text-slate-500 text-xs">
              Masukkan target komentar untuk melihat proyeksi
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
