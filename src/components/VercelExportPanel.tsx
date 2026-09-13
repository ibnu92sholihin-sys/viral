import React, { useState } from "react";
import { Copy, Check, Terminal, Database, Server, ExternalLink, Zap, Shield, Play, Loader2 } from "lucide-react";

export const VercelExportPanel: React.FC = () => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [cronTestLoading, setCronTestLoading] = useState(false);
  const [cronTestResult, setCronTestResult] = useState<any | null>(null);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const runTestCron = async () => {
    setCronTestLoading(true);
    try {
      const res = await fetch("/api/cron/process-queue?force=true", { method: "POST" });
      const data = await res.json();
      setCronTestResult(data);
    } catch (err: any) {
      setCronTestResult({ success: false, error: err.message });
    } finally {
      setCronTestLoading(false);
    }
  };

  const vercelJsonCode = `{
  "crons": [
    {
      "path": "/api/cron/process-queue",
      "schedule": "* * * * *"
    }
  ]
}`;

  const sqlSchemaCode = `-- ==========================================
-- ViralPulse Database Schema (Supabase / Neon)
-- ==========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    url TEXT NOT NULL,
    title TEXT,
    platform VARCHAR(32) NOT NULL DEFAULT 'unknown',
    target_comments INT NOT NULL DEFAULT 50,
    current_comments INT NOT NULL DEFAULT 0,
    current_views INT NOT NULL DEFAULT 0,
    current_likes INT NOT NULL DEFAULT 0,
    current_shares INT NOT NULL DEFAULT 0,
    current_saves INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'stopped', 'completed'
    next_execution_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_executed_at TIMESTAMPTZ,
    total_cycles INT NOT NULL DEFAULT 0,
    embed_url TEXT,
    thumbnail TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index query cepat untuk Vercel Cron
CREATE INDEX IF NOT EXISTS idx_campaigns_cron_queue 
ON campaigns (status, next_execution_time) 
WHERE status = 'active';

CREATE TABLE IF NOT EXISTS execution_logs (
    id BIGSERIAL PRIMARY KEY,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    cycle_number INT NOT NULL,
    action_type VARCHAR(32) NOT NULL,
    views_added INT DEFAULT 0,
    likes_added INT DEFAULT 0,
    comment_content TEXT,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`;

  const envExampleCode = `# Environment Variables (.env.local)
DATABASE_URL=postgresql://postgres:[PASSWORD]@ep-xyz.neon.tech/neondb?sslmode=require
CRON_SECRET=your_32_character_secret_token_here
GEMINI_API_KEY=your_gemini_api_key_for_vision_analysis`;

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-gradient-to-r from-sky-950/40 via-slate-900/90 to-indigo-950/40 border border-sky-500/30 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center gap-1.5">
                <Server className="h-3.5 w-3.5" />
                Vercel Serverless Ready
              </span>
              <span className="text-xs text-slate-400 font-mono">• 0% Persistent Background Server Needed</span>
            </div>
            <h2 className="text-lg font-bold text-white">Arsitektur Siap Ekspor Vercel + Neon / Supabase</h2>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              Seluruh antrean tugas berjalan secara *stateless* menggunakan endpoint <code>/api/cron/process-queue</code> yang dipicu setiap 60 detik oleh Vercel Cron. Tidak memerlukan APScheduler atau worker VM yang menyala terus-menerus.
            </p>
          </div>

          <button
            onClick={runTestCron}
            disabled={cronTestLoading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-semibold text-xs shadow-md shadow-sky-500/20 transition-all shrink-0 self-start md:self-auto disabled:opacity-50"
          >
            {cronTestLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4 fill-current text-amber-300" />
            )}
            <span>Test Vercel Cron Endpoint</span>
          </button>
        </div>

        {/* Live Test Response Box */}
        {cronTestResult && (
          <div className="mt-4 p-4 rounded-xl bg-slate-950/90 border border-slate-800 text-xs font-mono space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5" />
                Response dari /api/cron/process-queue:
              </span>
              <span className="text-[10px] text-slate-500">{new Date().toLocaleTimeString()}</span>
            </div>
            <pre className="text-slate-300 overflow-x-auto text-[11px] bg-black/40 p-2.5 rounded-lg border border-slate-900">
              {JSON.stringify(cronTestResult, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vercel JSON */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Terminal className="h-4 w-4 text-sky-400" />
              <span>vercel.json (Cron Job Configuration)</span>
            </div>
            <button
              onClick={() => handleCopy("vercel", vercelJsonCode)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
            >
              {copiedKey === "vercel" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedKey === "vercel" ? "Disalin!" : "Salin"}</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            Letakkan file ini di root folder repository Anda agar Vercel otomatis mendaftarkan cron trigger setiap menit.
          </p>
          <pre className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 font-mono text-xs text-sky-300 overflow-x-auto">
            {vercelJsonCode}
          </pre>
        </div>

        {/* .env Configuration */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Shield className="h-4 w-4 text-emerald-400" />
              <span>Environment Variables (.env.local)</span>
            </div>
            <button
              onClick={() => handleCopy("env", envExampleCode)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
            >
              {copiedKey === "env" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedKey === "env" ? "Disalin!" : "Salin"}</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            Masukkan variabel berikut di dashboard Vercel &gt; Settings &gt; Environment Variables.
          </p>
          <pre className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 font-mono text-xs text-emerald-300 overflow-x-auto">
            {envExampleCode}
          </pre>
        </div>
      </div>

      {/* SQL Schema */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Database className="h-4 w-4 text-indigo-400" />
            <span>SQL Schema (Supabase / Neon PostgreSQL Serverless)</span>
          </div>
          <button
            onClick={() => handleCopy("sql", sqlSchemaCode)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
          >
            {copiedKey === "sql" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copiedKey === "sql" ? "Disalin!" : "Salin SQL"}</span>
          </button>
        </div>
        <p className="text-[11px] text-slate-400">
          Jalankan perintah SQL ini di SQL Editor Supabase atau Neon Console untuk membuat tabel dan indeks antrean kampanye.
        </p>
        <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-[11px] text-indigo-300 overflow-x-auto max-h-80">
          {sqlSchemaCode}
        </pre>
      </div>

      {/* Deploy Steps Card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-white">Langkah Deploy ke Vercel (Ringkas & Jelas)</h3>
        <ol className="list-decimal list-inside space-y-2 text-xs text-slate-300 leading-relaxed">
          <li>
            <strong className="text-white">Persiapkan Database:</strong> Buat proyek gratis di <span className="text-sky-400">Neon.tech</span> atau <span className="text-emerald-400">Supabase.com</span>, lalu jalankan script SQL di atas.
          </li>
          <li>
            <strong className="text-white">Push Kode:</strong> Commit file proyek Anda ke repositori GitHub.
          </li>
          <li>
            <strong className="text-white">Import ke Vercel:</strong> Di Vercel Dashboard, klik <em>Add New Project</em> &gt; Import repositori GitHub Anda.
          </li>
          <li>
            <strong className="text-white">Konfigurasi Envs:</strong> Tambahkan <code>DATABASE_URL</code> dan <code>CRON_SECRET</code> di menu Environment Variables Vercel.
          </li>
          <li>
            <strong className="text-white">Otomatis Aktif:</strong> Vercel akan otomatis mengenali <code>vercel.json</code> dan memanggil <code>/api/cron/process-queue</code> setiap 1 menit.
          </li>
        </ol>
      </div>
    </div>
  );
};
