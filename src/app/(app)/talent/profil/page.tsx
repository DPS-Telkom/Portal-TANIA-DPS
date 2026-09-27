"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { FullPageStatus } from "@/components/full-page-status";
import { SkillMatrix, type ProfileSkill } from "@/components/talent/skill-matrix";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { addMonths, formatMonth, monthOf } from "@/lib/dates";
import { friendlyError } from "@/lib/errors";
import { ROLE_LABELS } from "@/lib/roles";
import { useThresholds } from "@/lib/settings";
import { supabase } from "@/lib/supabase";
import type { Skill } from "@/lib/talent";
import type { Profile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { LOAD_CLASSES, formatPct, loadLevel } from "@/lib/workload";

interface Allocation {
  id: string;
  period_month: string;
  percent: number;
  project: { code: string; name: string } | null;
}

interface UtilRow {
  period_month: string;
  approved_hours: number;
  capacity_hours: number;
  utilization_pct: number | null;
  planned_pct: number;
  leave_hours: number;
}

const PROFILE_COLUMNS = "id, full_name, email, role, squad, grade, location, manager_id, is_active, created_at";

function IdentityCard({
  person,
  manager,
  canEditSelf,
  canEditOrg,
  onSaved,
}: {
  person: Profile;
  manager: string | null;
  canEditSelf: boolean;
  canEditOrg: boolean;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(person.full_name);
  const [location, setLocation] = useState(person.location ?? "");
  const [squad, setSquad] = useState(person.squad ?? "");
  const [grade, setGrade] = useState(person.grade ?? "");
  const [busy, setBusy] = useState(false);

  async function save() {
    const patch: { full_name?: string; location?: string | null; squad?: string | null; grade?: string | null } = {};
    if (canEditSelf) {
      if (fullName.trim().length < 2) return toast.error("Nama wajib diisi.");
      patch.full_name = fullName.trim();
      patch.location = location.trim() || null;
    }
    if (canEditOrg) {
      patch.squad = squad.trim() || null;
      patch.grade = grade.trim() || null;
    }
    setBusy(true);
    const { error } = await supabase.from("profiles").update(patch).eq("id", person.id);
    setBusy(false);
    if (error) return toast.error(friendlyError(error));
    toast.success("Profil disimpan.");
    setEditing(false);
    onSaved();
  }

  const fields: [string, string | null][] = [
    ["Email", person.email],
    ["Role", ROLE_LABELS[person.role]],
    ["Squad", person.squad],
    ["Grade", person.grade],
    ["Lokasi", person.location],
    ["Manager", manager],
    ["Status", person.is_active ? "Aktif" : "Nonaktif"],
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-xl">{person.full_name || person.email}</CardTitle>
            <CardDescription>{person.email}</CardDescription>
          </div>
          <Badge variant="secondary">{ROLE_LABELS[person.role]}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!editing ? (
          <>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm sm:grid-cols-[auto_1fr_auto_1fr]">
              {fields.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd>{v || "—"}</dd>
                </div>
              ))}
            </dl>
            {(canEditSelf || canEditOrg) && (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                Ubah profil
              </Button>
            )}
          </>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {canEditSelf && (
              <>
                <div className="space-y-1">
                  <Label htmlFor="pf-name">Nama lengkap</Label>
                  <Input id="pf-name" value={fullName} maxLength={200} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="pf-loc">Lokasi</Label>
                  <Input id="pf-loc" value={location} maxLength={100} onChange={(e) => setLocation(e.target.value)} />
                </div>
              </>
            )}
            {canEditOrg && (
              <>
                <div className="space-y-1">
                  <Label htmlFor="pf-squad">Squad</Label>
                  <Input id="pf-squad" value={squad} maxLength={100} onChange={(e) => setSquad(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="pf-grade">Grade</Label>
                  <Input id="pf-grade" value={grade} maxLength={20} onChange={(e) => setGrade(e.target.value)} />
                </div>
              </>
            )}
            {!canEditOrg && (
              <p className="text-xs text-muted-foreground sm:col-span-2">
                Squad dan grade diatur oleh Admin atau manager langsung Anda.
              </p>
            )}
            <div className="flex gap-2 sm:col-span-2">
              <Button size="sm" onClick={save} disabled={busy}>
                {busy ? "Menyimpan…" : "Simpan"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={busy}>
                Batal
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ProfileContent() {
  const params = useSearchParams();
  const { profile: me, refreshProfile } = useAuth();
  const id = params.get("id") ?? me?.id ?? "";
  const thresholds = useThresholds();

  const [person, setPerson] = useState<Profile | null>(null);
  const [manager, setManager] = useState<string | null>(null);
  const [skills, setSkills] = useState<ProfileSkill[]>([]);
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [util, setUtil] = useState<UtilRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const from = addMonths(monthOf(), -5);
    const [p, s, all, a, u] = await Promise.all([
      supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", id).maybeSingle(),
      supabase
        .from("profile_skills")
        .select("skill_id, level, is_certified, certification_name, skill:skills(name, category)")
        .eq("profile_id", id)
        .order("level", { ascending: false }),
      supabase.from("skills").select("id, name, category").order("name"),
      supabase
        .from("allocations")
        .select("id, period_month, percent, project:projects(code, name)")
        .eq("profile_id", id)
        .order("period_month", { ascending: false })
        .limit(120),
      supabase
        .from("utilization_monthly")
        .select("period_month, approved_hours, capacity_hours, utilization_pct, planned_pct, leave_hours")
        .eq("profile_id", id)
        .gte("period_month", from)
        .order("period_month"),
    ]);
    setLoading(false);
    if (p.error) return toast.error(friendlyError(p.error));
    if (!p.data) return setNotFound(true);
    const next = p.data as Profile;
    setPerson(next);
    setSkills((s.data ?? []) as unknown as ProfileSkill[]);
    setAllSkills((all.data ?? []) as Skill[]);
    setAllocations((a.data ?? []) as unknown as Allocation[]);
    setUtil((u.data ?? []) as UtilRow[]);
    if (next.manager_id) {
      const m = await supabase.from("profiles").select("full_name, email").eq("id", next.manager_id).maybeSingle();
      setManager(m.data ? m.data.full_name || m.data.email : null);
    } else {
      setManager(null);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const byMonth = useMemo(() => {
    const map = new Map<string, Allocation[]>();
    for (const a of allocations) map.set(a.period_month, [...(map.get(a.period_month) ?? []), a]);
    return [...map.entries()];
  }, [allocations]);

  if (loading && !person) return <FullPageStatus />;
  if (notFound || !person || !me) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profil tidak ditemukan</CardTitle>
          <CardDescription>Profil ini tidak ada atau di luar akses Anda.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const isSelf = person.id === me.id;
  const isManager = person.manager_id === me.id;
  const isAdmin = me.role === "admin";
  const canEditSelf = isSelf || isAdmin;
  const canEditOrg = isManager || isAdmin;
  const canEditSkills = isSelf || isManager || me.role === "chapter_lead" || isAdmin;
  const currentMonth = monthOf();

  return (
    <div className="space-y-6">
      <Link href="/talent" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Kembali ke direktori
      </Link>

      <IdentityCard
        key={`${person.full_name}-${person.squad}-${person.grade}-${person.location}`}
        person={person}
        manager={manager}
        canEditSelf={canEditSelf}
        canEditOrg={canEditOrg}
        onSaved={async () => {
          await load();
          if (isSelf) await refreshProfile();
        }}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <SkillMatrix profileId={person.id} items={skills} allSkills={allSkills} editable={canEditSkills} onChanged={load} />

        <Card>
          <CardHeader>
            <CardTitle>Riwayat penugasan</CardTitle>
            <CardDescription>
              Alokasi rencana per project per bulan. Total di atas {thresholds.utilizationOver}% ditandai.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {byMonth.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada alokasi.</p>
            ) : (
              <ul className="divide-y text-sm">
                {byMonth.map(([month, items]) => {
                  const total = items.reduce((s, a) => s + Number(a.percent), 0);
                  const level = loadLevel(total, thresholds);
                  return (
                    <li key={month} className="py-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">
                          {formatMonth(month, true)}
                          {month === currentMonth && <span className="ml-2 text-xs text-telkom-red">bulan ini</span>}
                          {month > currentMonth && <span className="ml-2 text-xs text-muted-foreground">rencana</span>}
                        </span>
                        <span className={cn("rounded-full px-2 py-0.5 text-xs", LOAD_CLASSES[level])}>{formatPct(total)}</span>
                      </div>
                      <ul className="mt-1 space-y-0.5 text-muted-foreground">
                        {items.map((a) => (
                          <li key={a.id} className="flex justify-between gap-2">
                            <span>{a.project ? `${a.project.code} · ${a.project.name}` : "—"}</span>
                            <span>{Math.round(Number(a.percent))}%</span>
                          </li>
                        ))}
                      </ul>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Utilisasi 6 bulan terakhir</CardTitle>
          <CardDescription>
            Aktual = jam timesheet disetujui ÷ kapasitas (8 jam × Sen–Jum, dikurangi cuti).
            Kosong bila di luar akses Anda.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {util.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada data utilisasi.</p>
          ) : (
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-1 font-medium">Bulan</th>
                  <th className="py-1 text-right font-medium">Rencana</th>
                  <th className="py-1 text-right font-medium">Aktual</th>
                  <th className="py-1 text-right font-medium">Jam kerja</th>
                  <th className="py-1 text-right font-medium">Cuti</th>
                  <th className="py-1 text-right font-medium">Kapasitas</th>
                </tr>
              </thead>
              <tbody>
                {util.map((u) => (
                  <tr key={u.period_month} className="border-b last:border-0">
                    <td className="py-1">{formatMonth(u.period_month)}</td>
                    <td className="py-1 text-right">
                      <span className={cn("rounded px-1.5", LOAD_CLASSES[loadLevel(Number(u.planned_pct), thresholds)])}>
                        {formatPct(u.planned_pct)}
                      </span>
                    </td>
                    <td className="py-1 text-right">
                      <span className={cn("rounded px-1.5", LOAD_CLASSES[loadLevel(u.utilization_pct, thresholds)])}>
                        {formatPct(u.utilization_pct)}
                      </span>
                    </td>
                    <td className="py-1 text-right">{Number(u.approved_hours)}</td>
                    <td className="py-1 text-right">{Number(u.leave_hours)}</td>
                    <td className="py-1 text-right">{Number(u.capacity_hours)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
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
