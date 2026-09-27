"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { addDays, addMonths, formatMonth, mondayOf, monthOf } from "@/lib/dates";
import { formatIDRCompact } from "@/lib/money";
import { useThresholds, type Thresholds } from "@/lib/settings";
import { supabase } from "@/lib/supabase";
import { STATUS_LABELS, summarizeStatus, type TimesheetStatus } from "@/lib/timesheet";
import type { Profile, UserRole } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatPct } from "@/lib/workload";

type Tone = "ok" | "warning" | "critical" | "neutral";

interface Kpi {
  key: string;
  title: string;
  value: string;
  detail: string;
  tone: Tone;
  badge?: string;
  href: string;
}

const TONE_CLASSES: Record<Tone, string> = {
  ok: "bg-emerald-100 text-emerald-900",
  warning: "bg-amber-100 text-amber-900",
  critical: "bg-red-100 text-red-900",
  neutral: "bg-muted text-muted-foreground",
};

const CHAPTER: UserRole[] = ["chapter_lead", "executive", "admin"];

function utilTone(pct: number | null, t: Thresholds): Tone {
  if (pct === null) return "neutral";
  if (pct > t.utilizationOver) return "critical";
  if (pct < t.utilizationUnder) return "warning";
  return "ok";
}

// ---------------------------------------------------------------------------
// Individual KPI loaders — plain threshold logic, no AI (PRD §5.3)
// ---------------------------------------------------------------------------
async function myUtilization(me: Profile, t: Thresholds): Promise<Kpi> {
  const month = monthOf();
  const { data } = await supabase
    .from("utilization_monthly")
    .select("utilization_pct, planned_pct, approved_hours, capacity_hours")
    .eq("profile_id", me.id)
    .eq("period_month", month)
    .maybeSingle();
  const pct = data?.utilization_pct === null || data?.utilization_pct === undefined ? null : Number(data.utilization_pct);
  return {
    key: "my-util",
    title: `Utilisasi saya · ${formatMonth(month)}`,
    value: data ? formatPct(pct) : "N/A",
    detail: data
      ? `${Number(data.approved_hours)} dari ${Number(data.capacity_hours)} jam disetujui · rencana ${formatPct(Number(data.planned_pct))}`
      : "Belum ada alokasi atau timesheet bulan ini",
    tone: data ? (pct !== null && pct > t.utilizationOver ? "critical" : "neutral") : "neutral",
    badge: pct !== null && pct > t.utilizationOver ? "Overload" : undefined,
    href: "/workload",
  };
}

async function myTimesheetWeek(me: Profile): Promise<Kpi> {
  const monday = mondayOf();
  const { data } = await supabase
    .from("timesheets")
    .select("status, hours")
    .eq("profile_id", me.id)
    .gte("work_date", monday)
    .lte("work_date", addDays(monday, 6));
  const rows = (data ?? []) as { status: TimesheetStatus; hours: number }[];
  const status = summarizeStatus(rows.map((r) => r.status));
  const hours = rows.reduce((s, r) => s + Number(r.hours), 0);
  const friday = new Date().getDay() === 0 || new Date().getDay() >= 5;
  const pending = status === "belum_isi" || status === "draft" || status === "rejected";
  return {
    key: "my-ts",
    title: "Timesheet minggu ini",
    value: STATUS_LABELS[status],
    detail: `${hours} jam tercatat · batas submit Jumat`,
    tone: status === "rejected" || (pending && friday) ? "critical" : pending ? "warning" : "ok",
    badge: status === "rejected" ? "Perlu perbaikan" : pending && friday ? "Lewat batas" : undefined,
    href: "/timesheet",
  };
}

async function myNextAllocation(me: Profile, t: Thresholds): Promise<Kpi> {
  const next = addMonths(monthOf(), 1);
  const { data } = await supabase.from("allocations").select("percent").eq("profile_id", me.id).eq("period_month", next);
  const total = (data ?? []).reduce((s, r) => s + Number(r.percent), 0);
  return {
    key: "my-next",
    title: `Alokasi ${formatMonth(next)}`,
    value: `${Math.round(total)}%`,
    detail: `${data?.length ?? 0} project direncanakan`,
    tone: total > t.utilizationOver ? "critical" : total === 0 ? "neutral" : "ok",
    badge: total > t.utilizationOver ? "Over-alokasi" : undefined,
    href: "/workload",
  };
}

async function compliance(scopeLabel: string): Promise<Kpi> {
  const lastWeek = addDays(mondayOf(), -7);
  const { data } = await supabase.rpc("timesheet_compliance", { week_start: lastWeek });
  const rows = data ?? [];
  const done = rows.filter((r) => ["submitted", "approved"].includes(r.week_status)).length;
  const pct = rows.length ? Math.round((done / rows.length) * 100) : null;
  return {
    key: "compliance",
    title: `Kepatuhan timesheet ${scopeLabel}`,
    value: pct === null ? "N/A" : `${pct}%`,
    detail: rows.length ? `${done} dari ${rows.length} orang submit minggu lalu · target ≥ 95%` : "Belum ada anggota dalam cakupan",
    tone: pct === null ? "neutral" : pct >= 95 ? "ok" : pct >= 80 ? "warning" : "critical",
    badge: pct !== null && pct < 95 ? `${rows.length - done} belum submit` : undefined,
    href: "/timesheet",
  };
}

async function pendingApprovals(me: Profile): Promise<Kpi> {
  const { count } = await supabase
    .from("timesheets")
    .select("id", { count: "exact", head: true })
    .eq("status", "submitted")
    .neq("profile_id", me.id);
  const n = count ?? 0;
  return {
    key: "pending",
    title: "Menunggu persetujuan Anda",
    value: `${n} entri`,
    detail: "Timesheet submitted dari tim Anda",
    tone: n === 0 ? "ok" : "warning",
    href: "/timesheet",
  };
}

async function teamLoad(t: Thresholds, scopeLabel: string): Promise<Kpi> {
  const month = monthOf();
  const last = addMonths(month, -1);
  const { data } = await supabase
    .from("utilization_monthly")
    .select("profile_id, period_month, planned_pct, utilization_pct")
    .in("period_month", [month, last])
    .limit(2000);
  const rows = data ?? [];
  const over = rows.filter((r) => r.period_month === month && Number(r.planned_pct) > t.utilizationOver).length;
  const under = rows.filter(
    (r) => r.period_month === last && r.utilization_pct !== null && Number(r.utilization_pct) < t.utilizationUnder,
  ).length;
  const lastRows = rows.filter((r) => r.period_month === last && r.utilization_pct !== null);
  const avg = lastRows.length ? lastRows.reduce((s, r) => s + Number(r.utilization_pct), 0) / lastRows.length : null;
  return {
    key: "load",
    title: `Beban kerja ${scopeLabel}`,
    value: avg === null ? "N/A" : formatPct(avg),
    detail: `Rata-rata utilisasi ${formatMonth(last)} · ${over} overload rencana bulan ini · ${under} underload bulan lalu`,
    tone: over > 0 ? "critical" : under > 0 ? "warning" : utilTone(avg, t),
    badge: over > 0 ? `${over} overload` : under > 0 ? `${under} underload` : undefined,
    href: "/workload",
  };
}

async function pipeline(me: Profile, mineOnly: boolean): Promise<Kpi> {
  let q = supabase.from("feasibility_cases").select("decision, total_score");
  if (mineOnly) q = q.eq("submitted_by", me.id);
  const { data } = await q.limit(1000);
  const rows = data ?? [];
  const undecided = rows.filter((r) => r.decision === null).length;
  const go = rows.filter((r) => r.decision === "go").length;
  return {
    key: "pipeline",
    title: mineOnly ? "Case feasibility saya" : "Pipeline feasibility",
    value: `${undecided} menunggu`,
    detail: `${go} Go · ${rows.length} case total · skor indikatif (AG-01)`,
    tone: undecided > 0 ? "warning" : "neutral",
    badge: undecided > 0 && !mineOnly ? "Perlu keputusan" : undefined,
    href: "/feasibility",
  };
}

async function budget(t: Thresholds): Promise<Kpi> {
  const year = new Date().getFullYear();
  const { data } = await supabase
    .from("budget_summary")
    .select("plan_amount, committed, realized, committed_pct, realized_pct")
    .eq("fiscal_year", year);
  const rows = data ?? [];
  const plan = rows.reduce((s, r) => s + Number(r.plan_amount), 0);
  const committed = rows.reduce((s, r) => s + Number(r.committed), 0);
  const realized = rows.reduce((s, r) => s + Number(r.realized), 0);
  const lineMax = rows.map((r) => Math.max(Number(r.committed_pct ?? 0), Number(r.realized_pct ?? 0)));
  const red = lineMax.filter((p) => p >= t.budgetCritical).length;
  const yellow = lineMax.filter((p) => p >= t.budgetWarning && p < t.budgetCritical).length;
  const pct = plan ? (Math.max(committed, realized) / plan) * 100 : null;
  return {
    key: "budget",
    title: `Budget ${year}`,
    value: pct === null ? "N/A" : `${Math.round(pct)}%`,
    detail: plan ? `${formatIDRCompact(Math.max(committed, realized))} dari plan ${formatIDRCompact(plan)}` : "Belum ada budget line",
    tone: red ? "critical" : yellow ? "warning" : plan ? "ok" : "neutral",
    badge: red ? `${red} line merah` : yellow ? `${yellow} line kuning` : undefined,
    href: "/budget",
  };
}

// ---------------------------------------------------------------------------
// XM-01 — four cards per role
// ---------------------------------------------------------------------------
export function KpiCards() {
  const { profile } = useAuth();
  const t = useThresholds();
  const [kpis, setKpis] = useState<Kpi[] | null>(null);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const role = profile.role;
      let loaders: Promise<Kpi>[];
      if (CHAPTER.includes(role)) {
        loaders = [compliance("chapter"), teamLoad(t, "chapter"), pipeline(profile, false), budget(t)];
      } else if (role === "manager") {
        loaders = [compliance("tim"), pendingApprovals(profile), teamLoad(t, "tim"), budget(t)];
      } else if (role === "pm") {
        loaders = [myUtilization(profile, t), myTimesheetWeek(profile), pipeline(profile, true), budget(t)];
      } else {
        loaders = [myUtilization(profile, t), myTimesheetWeek(profile), myNextAllocation(profile, t), compliance("saya")];
      }
      const settled = await Promise.allSettled(loaders);
      setKpis(settled.filter((s): s is PromiseFulfilledResult<Kpi> => s.status === "fulfilled").map((s) => s.value));
      setLoadedAt(new Date());
    })();
  }, [profile, t]);

  if (!profile) return null;
  if (!kpis) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} className="h-32 animate-pulse bg-muted/40" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid gap-4 sm:grid-cols-2">
        {kpis.map((k) => (
          <Link key={k.key} href={k.href} className="group">
            <Card className="h-full transition-colors group-hover:border-telkom-red">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardDescription>{k.title}</CardDescription>
                  {k.badge && (
                    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", TONE_CLASSES[k.tone])}>
                      {k.badge}
                    </span>
                  )}
                </div>
                <CardTitle className="text-3xl">{k.value}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">{k.detail}</CardContent>
            </Card>
          </Link>
        ))}
      </div>
      {loadedAt && (
        <p className="text-xs text-muted-foreground">
          Data per {loadedAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} · badge memakai
          threshold di Admin → Pengaturan.
        </p>
      )}
    </div>
  );
}

