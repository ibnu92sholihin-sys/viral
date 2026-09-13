export interface EngagementProjections {
  targetKomentar: number;
  min_views: number;
  min_likes: number;
  min_saves: number;
  min_shares: number;
  safetyScore: number;
  commentToViewRatio: string;
  statusMessage: string;
}

export interface VideoAnalysis {
  objects: string[];
  dominantColors: string[];
  vibe: string;
  strategyAdvice: string[];
  suggestedOrganicHooks: string[];
  modelUsed?: string;
}

export interface ScheduledTask {
  id: string;
  url: string;
  platform: "tiktok" | "instagram" | "youtube" | "facebook" | "twitter" | "threads" | "linkedin" | "pinterest" | "snapchat" | "generic";
  title: string;
  status: "running" | "paused" | "maintenance";
  minIntervalSec: number;
  maxIntervalSec: number;
  maintenanceStartHour: number;
  maintenanceEndHour: number;
  targetComments: number;
  projections: EngagementProjections;
  totalCycles: number;
  lastRunAt: string | null;
  nextRunAt: string | null;
  analysis?: VideoAnalysis;
  createdAt: string;
}

export interface LogEntry {
  id: string;
  taskId: string;
  timestamp: string;
  type: "info" | "success" | "warning" | "skip";
  message: string;
  details?: Record<string, any>;
}
