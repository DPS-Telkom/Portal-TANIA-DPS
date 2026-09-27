"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { FullPageStatus } from "@/components/full-page-status";
import { CaseForm, type CaseRecord, type RequiredSkill } from "@/components/feasibility/case-form";
import { Attachments, DecisionPanel, ResourceCheck } from "@/components/feasibility/case-panels";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { formatMonth } from "@/lib/dates";
import { friendlyError } from "@/lib/errors";
import { COLUMN_LABELS, DECISION_BADGE, DIMENSIONS } from "@/lib/feasibility";
import { formatIDR } from "@/lib/money";
import { supabase } from "@/lib/supabase";
import type { Skill } from "@/lib/talent";
import type { UserRole } from "@/lib/types";
import { cn } from "@/lib/utils";

const CASE_COLUMNS =
  "id, title, customer, description, est_revenue, est_effort_hours, est_duration_months, start_month, score_strategic, score_financial, score_risk, score_resource, score_technical, total_score, decision, decision_rationale, decided_at, decided_by, submitted_by, created_at";
const SUBMITTERS: UserRole[] = ["pm", "manager", "chapter_lead", "admin"];
const DECIDERS: UserRole[] = ["chapter_lead", "admin"];

function CaseContent() {
  const params = useSearchParams();
  const router = useRouter();
  const { profile } = useAuth();
  const id = params.get("id") ?? "baru";
  const isNew = id === "baru";

  const [record, setRecord] = useState<CaseRecord | null>(null);
  const [required, setRequired] = useState<RequiredSkill[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(!isNew);
  const [editing, setEditing] = useState(isNew);
  const [checkKey, setCheckKey] = useState(0);

  useEffect(() => {
    supabase
      .from("skills")
      .select("id, name, category")
      .order("name")
      .then(({ data }) => setSkills((data ?? []) as Skill[]));
  }, []);

  const load = useCallback(async () => {
    if (isNew) return;
    setLoading(true);
    const [c, r] = await Promise.all([
      supabase.from("feasibility_cases").select(CASE_COLUMNS).eq("id", id).maybeSingle(),
      supabase.from("feasibility_required_skills").select("skill_id, min_level, headcount").eq("case_id", id),
    ]);
    setLoading(false);
    if (c.error) return toast.error(friendlyError(c.error));
    const rec = c.data as CaseRecord | null;
    setRecord(rec);
    setRequired((r.data ?? []) as RequiredSkill[]);
    setCheckKey((k) => k + 1);
    if (rec) {
      const ids = [rec.submitted_by, rec.decided_by].filter(Boolean) as string[];
      const { data } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      setNames(Object.fromEntries((data ?? []).map((p) => [p.id, p.full_name])));
    }
  }, [id, isNew]);

  useEffect(() => {
    load();
  }, [load]);

  if (!profile) return null;

  const back = (
    <Link href="/feasibility" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-4" /> Kembali ke pipeline
    </Link>
  );

  if (isNew) {
    if (!SUBMITTERS.includes(profile.role)) {
      return (
        <div className="space-y-4">
          {back}
          <Card>
            <CardHeader>
              <CardTitle>Tidak dapat membuat case</CardTitle>
              <CardDescription>Case feasibility diajukan oleh Project Manager, Manager, atau Chapter Leader.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      );
    }
    return (
      <div className="space-y-4">
        {back}
        <CaseForm
          initial={null}
          initialSkills={[]}
          skills={skills}
          onSaved={(newId) => router.replace(`/feasibility/case?id=${newId}`)}
        />
      </div>
    );
  }

  if (loading && !record) return <FullPageStatus />;
  if (!record) {
    return (
      <div className="space-y-4">
        {back}
        <Card>
          <CardHeader>
            <CardTitle>Case tidak ditemukan</CardTitle>
            <CardDescription>Case ini tidak ada atau di luar akses Anda.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const isDecider = DECIDERS.includes(profile.role);
  const isSubmitter = record.submitted_by === profile.id;
  // Mirrors RLS: submitter while undecided, or chapter_lead/admin anytime.
  const canEdit = isDecider || (isSubmitter && record.decision === null && SUBMITTERS.includes(profile.role));
  const column = record.decision ?? "undecided";

  if (editing) {
    return (
      <div className="space-y-4">
        {back}
        <CaseForm
          initial={record}
          initialSkills={required}
          skills={skills}
          onSaved={() => {
            setEditing(false);
            load();
          }}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  const skillName = (sid: string) => skills.find((s) => s.id === sid)?.name ?? "—";

  return (
    <div className="space-y-6">
      {back}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", DECISION_BADGE[column])}>
                {COLUMN_LABELS[column]}
              </span>
              <CardTitle className="mt-2 text-xl">{record.title}</CardTitle>
              <CardDescription>
                {record.customer ?? "Tanpa customer"} · diajukan {names[record.submitted_by] ?? "—"},{" "}
                {new Date(record.created_at).toLocaleDateString("id-ID", { dateStyle: "medium" })}
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold">{Math.round(Number(record.total_score))}</div>
              <div className="text-xs text-muted-foreground">skor indikatif / 100</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {record.description && <p className="text-sm whitespace-pre-line">{record.description}</p>}
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">Estimasi revenue</dt>
              <dd className="font-medium">{formatIDR(record.est_revenue)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Effort</dt>
              <dd className="font-medium">{record.est_effort_hours ? `${Number(record.est_effort_hours)} jam` : "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Durasi</dt>
              <dd className="font-medium">{record.est_duration_months ? `${record.est_duration_months} bulan` : "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Mulai</dt>
              <dd className="font-medium">{record.start_month ? formatMonth(record.start_month, true) : "—"}</dd>
            </div>
          </dl>
          <div className="grid gap-2 sm:grid-cols-5">
            {DIMENSIONS.map((d) => (
              <div key={d.key} className="rounded-md border p-2 text-center">
                <div className="text-xs text-muted-foreground">
                  {d.label} ({d.weight}%)
                </div>
                <div className="text-lg font-semibold">{record[d.key]}/5</div>
              </div>
            ))}
          </div>
          {required.length > 0 && (
            <p className="text-sm">
              <span className="text-muted-foreground">Kompetensi: </span>
              {required.map((r) => `${skillName(r.skill_id)} (≥${r.min_level}, ${r.headcount} org)`).join(" · ")}
            </p>
          )}
          {canEdit && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              Ubah case
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <ResourceCheck caseId={record.id} refreshKey={checkKey} />
        <DecisionPanel
          key={`${record.decision}-${record.decided_at}`}
          caseId={record.id}
          decision={record.decision}
          rationale={record.decision_rationale}
          decidedAt={record.decided_at}
          deciderName={record.decided_by ? names[record.decided_by] ?? null : null}
          canDecide={isDecider}
          onDecided={load}
        />
      </div>

      <Attachments caseId={record.id} canUpload={canEdit} canDeleteAny={isDecider} />
    </div>
  );
}

export default function CasePage() {
  return (
    <Suspense fallback={<FullPageStatus />}>
      <CaseContent />
    </Suspense>
  );
}
