import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, Phone, Video, Clock, Bell, TrendingUp, Target, CheckCircle } from "lucide-react";

type Nullable<T> = T | null | undefined;

export interface ProfileSummaryProps {
  personData: any;
  triageData?: {
    band: string;
    action: string;
    confidence: number;
    reasons: string[];
    blockers?: { severity: "critical"|"high"|"medium"|"low"; description: string; }[];
  } | null;
  forecast?: { probability: number; eta_days: number | null; confidence: number; drivers: string[]; risks: string[] } | null;
  anomalyDetection?: {
    risk_level: "low"|"medium"|"high"|"critical";
    overall_risk_score: number;
  } | null;
  onAction?: (action: string) => void;
  showAIScores?: boolean; // New prop to control AI score display
}

const pct = (x: Nullable<number>) => x == null ? "–" : `${Math.round(x * 100)}%`;
const days = (d: Nullable<number>) => d == null ? "—" : `${d}d`;

export default function LeadProfileSummary({
  personData,
  triageData,
  forecast,
  anomalyDetection,
  onAction,
  showAIScores = true
}: ProfileSummaryProps) {
  const convPct = forecast?.probability ?? (personData.conversion_probability ?? null);
  const eta = forecast?.eta_days ?? null;
  const nba = (personData.next_best_action || triageData?.action || "Follow up") as string;
  const riskLevel = anomalyDetection?.risk_level ?? "low";
  const lastEng = personData.last_engagement_date
    ? new Date(personData.last_engagement_date).toLocaleDateString()
    : "—";

  const actionIcon = nba.includes("Email") ? <Mail className="h-4 w-4 mr-2" /> :
                     nba.includes("Call")  ? <Phone className="h-4 w-4 mr-2" /> :
                     nba.includes("Meeting") ? <Video className="h-4 w-4 mr-2" /> : null;

  const band = triageData?.band ?? "—";
  const conf = triageData?.confidence ?? 0;
  const confLabel = conf >= 0.8 ? "High" : conf >= 0.6 ? "Medium" : "Low";
  const riskBadge =
    riskLevel === "critical" ? "bg-status-error-bg text-white" :
    riskLevel === "high" ? "bg-status-warning-bg text-white" :
    riskLevel === "medium" ? "bg-status-info-bg text-white" :
    "bg-status-success-bg text-white";

  return (
    <Card className="border border-border">
      <CardContent className="p-4 space-y-4">
        {/* Header strip: Only show AI scores if enabled */}
        {showAIScores && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3 rounded bg-surface-secondary/50">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <TrendingUp className="h-4 w-4" /> Conversion
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <p className="text-xl font-semibold text-foreground">{pct(convPct)}</p>
                <Badge variant="secondary">{eta != null ? `${eta}d ETA` : "No ETA"}</Badge>
              </div>
            </div>

            <div className="p-3 rounded bg-surface-secondary/50">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Target className="h-4 w-4" /> Next Best Action
              </div>
              <div className="mt-1 flex items-center justify-between">
                <p className="text-sm font-medium text-foreground truncate" title={nba}>{nba}</p>
                <Button size="sm" className="shrink-0" onClick={() => onAction?.(nba)}>
                  {actionIcon} Take
                </Button>
              </div>
            </div>

            <div className="p-3 rounded bg-surface-secondary/50">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Bell className="h-4 w-4" /> Risk
              </div>
              <div className="mt-1 flex items-center justify-between">
                <Badge variant="secondary" className={`${riskBadge}`}>{riskLevel.toUpperCase()}</Badge>
                <p className="text-xs text-muted-foreground">{triageData?.blockers?.length ? `${triageData.blockers.length} blocker(s)` : "No blockers"}</p>
              </div>
            </div>

            <div className="p-3 rounded bg-surface-secondary/50">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-4 w-4" /> Last Activity
              </div>
              <p className="mt-1 text-sm font-medium text-foreground">{lastEng}</p>
              <p className="text-[10px] text-muted-foreground">Band: {band} • {confLabel} confidence</p>
            </div>
          </div>
        )}

        {/* Facts first */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <FactsList
            title="Contact"
            items={[
              ["Email", personData.email],
              ["Phone", personData.phone],
              ["Owner", personData.owner || personData.agent],
              ["Source", personData.source],
            ]}
          />
          <FactsList
            title="Academic"
            items={[
              ["Course Interest", personData.latest_programme_name || personData.courseInterest],
              ["Campus", personData.campusPreference],
              ["Academic Year", personData.latest_academic_year || personData.academicYear],
            ]}
          />
          <FactsList
            title="Funnel"
            items={[
              ["Status", personData.status],
              ["Lead Score", personData.leadScore],
              ["Next Action", personData.nextAction],
              ["Follow-up", personData.followUpDate],
            ]}
          />
        </div>

        {/* AI insights (compact) - only show if AI scores enabled */}
        {showAIScores && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Top Drivers</p>
              <ul className="space-y-1 text-sm">
                {(forecast?.drivers ?? triageData?.reasons ?? []).slice(0,3).map((d, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-chart-3 mt-2" /> {d}
                  </li>
                ))}
                {(!(forecast?.drivers?.length) && !(triageData?.reasons?.length)) && (
                  <li className="text-muted-foreground">No drivers identified</li>
                )}
              </ul>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Key Blocker</p>
              <div className="text-sm">
                {triageData?.blockers?.length
                  ? <div className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-status-warning-text" />
                      <span>{triageData.blockers[0]?.description}</span>
                    </div>
                  : <span className="text-muted-foreground">No critical blockers</span>}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FactsList({ title, items }: { title: string; items: [string, Nullable<string|number>][] }) {
  const filtered = items.filter(([,v]) => v !== null && v !== undefined && v !== "");
  return (
    <div className="p-3 rounded bg-surface-secondary/50">
      <p className="text-xs text-muted-foreground mb-2">{title}</p>
      {filtered.length ? (
        <ul className="space-y-1 text-sm">
          {filtered.map(([k,v]) => (
            <li key={k} className="flex justify-between gap-3">
              <span className="text-muted-foreground">{k}</span>
              <span className="font-medium text-foreground truncate" title={String(v)}>{String(v)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">No data</p>
      )}
    </div>
  );
}
