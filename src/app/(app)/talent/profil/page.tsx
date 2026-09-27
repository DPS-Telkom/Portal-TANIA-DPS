"use client";

import { ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

import { FullPageStatus } from "@/components/full-page-status";
import { AskTania } from "@/components/talent-profile/ask-tania";
import { CareerTimeline } from "@/components/talent-profile/career-timeline";
import { CertificationList } from "@/components/talent-profile/certification-list";
import { EvidencePanel, ProjectExperience } from "@/components/talent-profile/experience-evidence";
import { DevelopmentPlans, RecommendedJourney } from "@/components/talent-profile/journey-plan";
import { CompetencyGapAnalysis, PerformanceHistory } from "@/components/talent-profile/performance-gap";
import { ErrorState, Section, SkeletonBlock } from "@/components/talent-profile/section";
import { SkillSection, type CatalogSkill } from "@/components/talent-profile/skill-section";
import { TalentHeader } from "@/components/talent-profile/talent-header";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { addMonths, formatMonth, monthOf } from "@/lib/dates";
import { friendlyError } from "@/lib/errors";
import { useThresholds } from "@/lib/settings";
import { supabase } from "@/lib/supabase";
import { levelLabel } from "@/lib/talent-profile/calc";
import { talentPermissions } from "@/lib/talent-profile/permissions";
import { isInReportingLine, listSkills, loadTalentContext } from "@/lib/talent-profile/service";
import type { TalentContext } from "@/lib/talent-profile/types";
import { cn } from "@/lib/utils";
import { LOAD_CLASSES, formatPct, loadLevel } from "@/lib/workload";

// prd-talent §5–6: one route, sections as tabs (TANIA convention).
const TABS = [
  ["overview", "Overview"],
  ["journey", "Journey"],
  ["capability", "Capability"],
  ["competency", "Competency"],
  ["expertise", "Expertise"],
  ["certification", "Certification"],
  ["experience", "Experience"],
  ["performance", "Performance"],
  ["gap", "Gap Analysis"],
  ["recommended", "Recommended Journey"],
  ["evidence", "Evidence"],
] as const;

interface UtilRow {
  period_month: string;
  utilization_pct: number | null;
  planned_pct: number;
}

function UtilizationStrip({ profileId }: { profileId: string }) {
  const t = useThresholds();
  const [rows, setRows] = useState<UtilRow[] | null>(null);
  useEffect(() => {
    supabase
      .from("utilization_monthly")
      .select("period_month, utilization_pct, planned_pct")
      .eq("profile_id", profileId)
      .gte("period_month", addMonths(monthOf(), -5))
      .order("period_month")
      .then(({ data }) => setRows((data ?? []) as UtilRow[]));
  }, [profileId]);
  if (!rows) return <SkeletonBlock className="h-16" />;
  if (!rows.length) return <p className="text-sm text-muted-foreground">Belum ada data utilisasi (atau di luar akses Anda).</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {rows.map((r) => (
        <div key={r.period_month} className="rounded-md border px-2 py-1 text-center text-xs">
          <div className="text-muted-foreground">{formatMonth(r.period_month)}</div>
          <div className={cn("mt-0.5 rounded px-1", LOAD_CLASSES[loadLevel(r.utilization_pct, t)])}>{formatPct(r.utilization_pct)}</div>
          <div className="text-muted-foreground">rencana {formatPct(r.planned_pct)}</div>
        </div>
      ))}
    </div>
  );
}

function Overview({ ctx }: { ctx: TalentContext }) {
  const top = [...ctx.skills]
    .sort((a, b) => (b.score ?? b.level * 20) - (a.score ?? a.level * 20))
    .slice(0, 5);
  const biggestGaps = [...ctx.gaps].sort((a, b) => a.gap - b.gap).slice(0, 3);
  const activePlan = ctx.development_plans.find((p) => p.status === "active");
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Section title="Kekuatan tercatat" description="Penilaian tertinggi (capability, competency, expertise).">
        {top.length ? (
          <ul className="divide-y text-sm">
            {top.map((s) => (
              <li key={s.skill_id} className="flex justify-between gap-2 py-1.5">
                <span>
                  {s.name} <span className="text-xs text-muted-foreground">{s.kind}</span>
                </span>
                <span className="font-medium">{levelLabel(s.level, ctx.level_scale)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Assessment belum dilakukan.</p>
        )}
      </Section>
      <Section title="Gap terbesar" description="Current − target.">
        {biggestGaps.length ? (
          <ul className="divide-y text-sm">
            {biggestGaps.map((g) => (
              <li key={g.skill_id} className="flex justify-between gap-2 py-1.5">
                <span>{g.name}</span>
                <span className={cn("font-semibold", g.gap < 0 ? "text-red-700" : "text-emerald-700")}>{g.gap}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Target belum ditetapkan.</p>
        )}
      </Section>
      <Section title="Development aktif">
        {activePlan ? (
          <p className="text-sm">
            <strong>{activePlan.title}</strong> — {activePlan.activities.filter((a) => a.status === "completed").length}/
            {activePlan.activities.length} aktivitas selesai.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Belum ada development plan aktif.</p>
        )}
      </Section>
      <Section title="Utilisasi 6 bulan" description="Dari timesheet disetujui & alokasi (modul Workload).">
        <UtilizationStrip profileId={ctx.talent.id} />
      </Section>
    </div>
  );
}

function ProfileContent() {
  const params = useSearchParams();
  const { profile: me } = useAuth();
  const id = params.get("id") ?? me?.id ?? "";
  const [ctx, setCtx] = useState<TalentContext | null>(null);
  const [catalog, setCatalog] = useState<CatalogSkill[]>([]);
  const [inLine, setInLine] = useState(false);
  const [state, setState] = useState<"loading" | "ready" | "forbidden" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [askOpen, setAskOpen] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [c, line] = await Promise.all([loadTalentContext(id), isInReportingLine(id)]);
      setInLine(line);
      if (!c) {
        setState("forbidden");
        return;
      }
      setCtx(c);
      setState("ready");
    } catch (e) {
      setError(friendlyError(e as { message?: string; code?: string }));
      setState("error");
    }
  }, [id]);

  useEffect(() => {
    setState("loading");
    load();
  }, [load]);

  useEffect(() => {
    listSkills()
      .then((s) => setCatalog(s as CatalogSkill[]))
      .catch(() => setCatalog([]));
  }, []);

  const perms = useMemo(
    () =>
      me && ctx
        ? talentPermissions({
            viewerId: me.id,
            viewerRole: me.role,
            profileId: ctx.talent.id,
            directManagerId: ctx.talent.manager?.id ?? null,
            inReportingLine: inLine,
          })
        : null,
    [me, ctx, inLine],
  );

  const back = (
    <Link href="/talent" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-4" /> Direktori talent
    </Link>
  );

  if (state === "loading") {
    return (
      <div className="space-y-4" aria-busy="true">
        {back}
        <SkeletonBlock className="h-56" />
        <SkeletonBlock className="h-10" />
        <SkeletonBlock className="h-64" />
      </div>
    );
  }
  if (state === "forbidden") {
    return (
      <div className="space-y-4">
        {back}
        <Card>
          <CardHeader>
            <CardTitle>Talent Profile tidak dapat ditampilkan</CardTitle>
            <CardDescription>
              Profil ini tidak ada atau di luar akses Anda. Talent Profile hanya terbuka untuk pemiliknya, atasan dalam
              reporting line, Chapter Leader, HR, Executive, dan Admin.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }
  if (state === "error" || !ctx || !perms) {
    return (
      <div className="space-y-4">
        {back}
        <ErrorState>{error ?? "Talent Profile tidak dapat dimuat."}</ErrorState>
        <Button variant="outline" size="sm" onClick={load}>
          Coba lagi
        </Button>
      </div>
    );
  }

  const common = { ctx, perms, onChanged: load };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {back}
        <Button onClick={() => setAskOpen(true)} className="gap-1">
          <Sparkles className="size-4" /> Ask TANIA
        </Button>
      </div>

      <TalentHeader {...common} />

      <Tabs defaultValue="overview">
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <TabsList className="w-max">
            {TABS.map(([v, l]) => (
              <TabsTrigger key={v} value={v}>
                {l}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value="overview" className="pt-4">
          <Overview ctx={ctx} />
        </TabsContent>
        <TabsContent value="journey" className="pt-4">
          <CareerTimeline {...common} />
        </TabsContent>
        <TabsContent value="capability" className="pt-4">
          <SkillSection kind="capability" catalog={catalog} {...common} />
        </TabsContent>
        <TabsContent value="competency" className="pt-4">
          <SkillSection kind="competency" catalog={catalog} {...common} />
        </TabsContent>
        <TabsContent value="expertise" className="pt-4">
          <SkillSection kind="expertise" catalog={catalog} {...common} />
        </TabsContent>
        <TabsContent value="certification" className="pt-4">
          <CertificationList catalog={catalog} {...common} />
        </TabsContent>
        <TabsContent value="experience" className="pt-4">
          <ProjectExperience catalog={catalog} {...common} />
        </TabsContent>
        <TabsContent value="performance" className="pt-4">
          <PerformanceHistory {...common} />
        </TabsContent>
        <TabsContent value="gap" className="pt-4">
          <CompetencyGapAnalysis ctx={ctx} />
        </TabsContent>
        <TabsContent value="recommended" className="space-y-6 pt-4">
          <RecommendedJourney catalog={catalog} {...common} />
          <DevelopmentPlans {...common} />
        </TabsContent>
        <TabsContent value="evidence" className="pt-4">
          <EvidencePanel catalog={catalog} {...common} />
        </TabsContent>
      </Tabs>

      <p className="text-xs text-muted-foreground">
        Data per {new Date(ctx.generated_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })} · setiap
        perubahan tercatat di audit log.
        {ctx.talent.is_demo && " Profil ini adalah DATA DEMO, bukan data karyawan resmi."}
      </p>

      {askOpen && (
        <AskTania profileId={ctx.talent.id} name={ctx.talent.full_name} isSelf={perms.isSelf} onClose={() => setAskOpen(false)} />
      )}
    </div>
  );
}

export default function TalentProfilePage() {
  return (
    <Suspense fallback={<FullPageStatus />}>
      <ProfileContent />
    </Suspense>
  );
}
