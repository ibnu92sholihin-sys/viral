import React, { useState } from "react";
import { Sparkles, Video, Eye, Palette, Compass, MessageSquare, Upload, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { VideoAnalysis } from "../types";

interface AiVisionAnalyzerPanelProps {
  onStrategyGenerated?: (analysis: VideoAnalysis, videoUrl: string) => void;
}

const SAMPLE_PRESETS = [
  {
    name: "TikTok - Edukasi & Tutorial Algoritma",
    url: "https://www.tiktok.com/@edukasi_kreatif/video/73918291039",
    thumbnail: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&auto=format&fit=crop&q=60",
    desc: "Video penjelasan konsep teknologi dan strategi konten visual.",
  },
  {
    name: "Instagram Reels - Review Produk & Estetika",
    url: "https://www.instagram.com/reel/C8921890123",
    thumbnail: "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=500&auto=format&fit=crop&q=60",
    desc: "Video visual unboxing gadget dengan pencahayaan studio.",
  },
  {
    name: "YouTube Shorts - Vlog Gaya Hidup & Alam",
    url: "https://www.youtube.com/shorts/k92019a829a",
    thumbnail: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&auto=format&fit=crop&q=60",
    desc: "Pemandangan luar ruangan dengan tone warna hangat dan alami.",
  },
  {
    name: "Facebook / X / Threads / LinkedIn Video",
    url: "https://fb.watch/videoSample1029",
    thumbnail: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=500&auto=format&fit=crop&q=60",
    desc: "Format video narasi bisnis atau edukasi lintas jejaring sosial.",
  },
];

export const AiVisionAnalyzerPanel: React.FC<AiVisionAnalyzerPanelProps> = ({
  onStrategyGenerated,
}) => {
  const [videoUrl, setVideoUrl] = useState(SAMPLE_PRESETS[0].url);
  const [selectedImage, setSelectedImage] = useState<string | null>(SAMPLE_PRESETS[0].thumbnail);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<VideoAnalysis | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!videoUrl && !selectedImage) {
      setErrorMessage("Masukkan URL video atau unggah frame sampel.");
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/analyze-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoUrl,
          frameBase64: selectedImage?.startsWith("data:") ? selectedImage : undefined,
          samplePreset: SAMPLE_PRESETS.find((p) => p.url === videoUrl)?.name || "Kustom",
        }),
      });

      const data = await response.json();
      if (data.success && data.analysis) {
        setAnalysisResult(data.analysis);
        if (onStrategyGenerated) {
          onStrategyGenerated(data.analysis, videoUrl);
        }
      } else {
        throw new Error(data.error || "Gagal mendapatkan analisis video.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Terjadi kesalahan saat memproses video.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 mb-5 gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">
              AI Vision & Content Vibe Analyzer
            </h2>
            <p className="text-xs text-slate-400">
              Membaca objek visual, palet warna dominan, dan suasana (vibe) video untuk merumuskan hook kontekstual
            </p>
          </div>
        </div>
        <span className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20 self-start sm:self-auto">
          Powered by Gemini Vision
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Input and Frame preview */}
        <div className="lg:col-span-5 space-y-4">
          {/* Target URL */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                URL Video Sasaran
              </label>
              <span className="text-[10px] text-sky-400 font-mono">
                Semua Platform Didukung
              </span>
            </div>
            <div className="relative">
              <input
                type="text"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://... (TikTok, Reels, Shorts, FB, X, dll)"
                className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
              />
              <Video className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            </div>
          </div>

          {/* Preset Buttons */}
          <div>
            <span className="text-xs text-slate-400 block mb-1.5 font-medium">
              Atau pilih sampel video edukasi:
            </span>
            <div className="grid grid-cols-1 gap-2">
              {SAMPLE_PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => {
                    setVideoUrl(p.url);
                    setSelectedImage(p.thumbnail);
                  }}
                  className={`text-left p-2.5 rounded-xl border text-xs flex items-center gap-3 transition-all ${
                    videoUrl === p.url
                      ? "bg-slate-800 border-sky-500/60 text-white shadow-sm"
                      : "bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                  }`}
                >
                  <img
                    src={p.thumbnail}
                    alt={p.name}
                    className="w-12 h-12 rounded-lg object-cover border border-slate-700 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="truncate">
                    <p className="font-semibold text-slate-200 truncate">{p.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{p.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Frame Upload option */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2 text-xs">
              <span className="text-slate-300 font-medium">Unggah Frame Video (OpenCV simulation):</span>
              <label className="cursor-pointer text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1">
                <Upload className="h-3.5 w-3.5" />
                <span>Pilih Gambar</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
            {selectedImage && (
              <div className="relative rounded-lg overflow-hidden border border-slate-800 aspect-video bg-slate-900">
                <img
                  src={selectedImage}
                  alt="Frame preview"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute bottom-2 left-2 bg-slate-950/80 backdrop-blur-md px-2 py-0.5 rounded text-[10px] text-slate-300 font-mono">
                  Frame Capture Aktif
                </div>
              </div>
            )}
          </div>

          {/* Action Button */}
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Menganalisis Visual & Vibe Video...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Jalankan AI Vision & Vibe Analysis</span>
              </>
            )}
          </button>

          {errorMessage && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Right Column: AI Analysis Result */}
        <div className="lg:col-span-7">
          {analysisResult ? (
            <div className="space-y-4">
              {/* Vibe & Tone Highlight */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-2">
                  <Compass className="h-4 w-4 text-sky-400" />
                  <span>Estimasi Suasana & Pacing (Vibe):</span>
                </div>
                <div className="p-3 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-200 text-xs font-medium leading-relaxed">
                  "{analysisResult.vibe}"
                </div>
              </div>

              {/* Dominant Colors & Visual Objects */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Dominant Colors */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-2.5">
                    <Palette className="h-4 w-4 text-amber-400" />
                    <span>Warna Dominan & Kontras:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {analysisResult.dominantColors.map((color, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-[11px] text-slate-300 font-mono"
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full border border-white/20"
                          style={{
                            backgroundColor: color.includes("#")
                              ? color.substring(color.indexOf("#"), color.indexOf("#") + 7)
                              : "#38bdf8",
                          }}
                        />
                        {color}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Detected Visual Objects */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-2.5">
                    <Eye className="h-4 w-4 text-emerald-400" />
                    <span>Elemen Visual & Objek:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {analysisResult.objects.map((obj, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-[11px] text-slate-300"
                      >
                        {obj}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Contextual Organic Strategy */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-2.5">
                  <CheckCircle2 className="h-4 w-4 text-teal-400" />
                  <span>Strategi Interaksi Sesuai Konten (Anti-Spam Bot Pattern):</span>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {analysisResult.strategyAdvice.map((adv, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-teal-400 mt-1.5 shrink-0" />
                      <span>{adv}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Suggested Organic Hooks */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-2.5">
                  <MessageSquare className="h-4 w-4 text-purple-400" />
                  <span>Saran Hook Topik Percakapan Organik:</span>
                </div>
                <div className="space-y-2">
                  {analysisResult.suggestedOrganicHooks.map((hook, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-purple-200 font-mono"
                    >
                      💬 "{hook}"
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 p-6 text-center text-slate-500">
              <Sparkles className="h-8 w-8 text-slate-600 mb-2" />
              <p className="text-xs font-medium text-slate-400">
                Belum ada analisis visual yang dijalankan
              </p>
              <p className="text-[11px] text-slate-500 max-w-sm mt-1">
                Pilih salah satu sampel video atau masukkan URL target di sebelah kiri untuk mengekstrak objek, palet warna, dan vibe video secara otomatis.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
