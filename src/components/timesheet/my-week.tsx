"use client";

import { Copy, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { StatusPill } from "@/components/timesheet/status-pill";
import { WeekNav } from "@/components/timesheet/week-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { addDays, formatDay, formatHours, formatWeek, mondayOf, weekDays } from "@/lib/dates";
import { friendlyError } from "@/lib/errors";
import { supabase } from "@/lib/supabase";
import {
  MAX_HOURS_PER_ENTRY,
  isEditable,
  summarizeStatus,
  type TimesheetStatus,
  type WeekStatus,
} from "@/lib/timesheet";
import { cn } from "@/lib/utils";

interface Entry {
  id: string;
  project_id: string;
  activity_id: string;
  work_date: string;
  hours: number;
  status: TimesheetStatus;
  review_note: string | null;
}

interface Project {
  id: string;
  code: string;
  name: string;
  status: string;
}

interface Activity {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
}

interface Row {
  key: string;
  project_id: string;
  activity_id: string;
}

const ENTRY_COLUMNS = "id, project_id, activity_id, work_date, hours, status, review_note";
const COMPLIANCE_ROLES = ["talent", "pm", "manager", "chapter_lead"];

const rowKey = (projectId: string, activityId: string) => `${projectId}|${activityId}`;
const cellKey = (key: string, date: string) => `${key}|${date}`;

function parseHours(raw: string | undefined): number | null {
  if (raw === undefined || raw.trim() === "") return 0;
  const n = Number(raw.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

const selectClass =
  "h-8 min-w-0 rounded-md border border-input bg-background px-2 text-sm disabled:opacity-50";

export function MyWeek() {
  const { profile } = useAuth();
  const [monday, setMonday] = useState(() => mondayOf());
  const [showWeekend, setShowWeekend] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [newProject, setNewProject] = useState("");
  const [newActivity, setNewActivity] = useState("");
  const [lastWeekStatus, setLastWeekStatus] = useState<WeekStatus | null>(null);

  const allDays = useMemo(() => weekDays(monday, true), [monday]);
  const days = useMemo(() => weekDays(monday, showWeekend), [monday, showWeekend]);
  const sunday = allDays[6];

  const entryByCell = useMemo(() => {
    const map = new Map<string, Entry>();
    for (const e of entries) map.set(cellKey(rowKey(e.project_id, e.activity_id), e.work_date), e);
    return map;
  }, [entries]);

  const projectById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const activityById = useMemo(() => new Map(activities.map((a) => [a.id, a])), [activities]);
  const activeProjects = projects.filter((p) => p.status === "active");
  const activeActivities = activities.filter((a) => a.is_active);

  // Master data once.
  useEffect(() => {
    (async () => {
      const [p, a] = await Promise.all([
        supabase.from("projects").select("id, code, name, status").order("code").limit(500),
        supabase.from("activities").select("id, code, name, is_active").order("code"),
      ]);
      if (p.error || a.error) toast.error(friendlyError(p.error ?? a.error));
      setProjects((p.data ?? []) as Project[]);
      setActivities((a.data ?? []) as Activity[]);
    })();
  }, []);

  const loadWeek = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("timesheets")
      .select(ENTRY_COLUMNS)
      .eq("profile_id", profile.id)
      .gte("work_date", monday)
      .lte("work_date", sunday)
      .order("work_date");
    setLoading(false);
    if (error) {
      toast.error(friendlyError(error));
      return;
    }
    const list = (data ?? []) as Entry[];
    setEntries(list);

    const nextRows: Row[] = [];
    const nextValues: Record<string, string> = {};
    for (const e of list) {
      const key = rowKey(e.project_id, e.activity_id);
      if (!nextRows.some((r) => r.key === key)) {
        nextRows.push({ key, project_id: e.project_id, activity_id: e.activity_id });
      }
      nextValues[cellKey(key, e.work_date)] = String(e.hours);
    }
    setRows(nextRows);
    setValues(nextValues);
    setDirty(false);
    if (list.some((e) => {
      const dow = new Date(`${e.work_date}T00:00:00`).getDay();
      return dow === 0 || dow === 6;
    })) {
      setShowWeekend(true);
    }
  }, [profile, monday, sunday]);

  useEffect(() => {
    loadWeek();
  }, [loadWeek]);

  // TS-04 reminder: was last week submitted?
  useEffect(() => {
    if (!profile || !COMPLIANCE_ROLES.includes(profile.role)) return;
    (async () => {
      const { data } = await supabase.rpc("timesheet_compliance", {
        week_start: addDays(mondayOf(), -7),
      });
      const mine = (data ?? []).find((r) => r.profile_id === profile.id);
      setLastWeekStatus((mine?.week_status as WeekStatus | undefined) ?? null);
    })();
  }, [profile, entries]);

  // Warn before leaving with unsaved edits.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const weekStatus = summarizeStatus(entries.map((e) => e.status));
  const rejectedNotes = [
    ...new Set(entries.filter((e) => e.status === "rejected" && e.review_note).map((e) => e.review_note!)),
  ];
  const hasPendingEdits = entries.some((e) => isEditable(e.status));

  function valueOf(key: string, date: string) {
    return parseHours(values[cellKey(key, date)]) ?? 0;
  }
  const dayTotals = allDays.map((d) => rows.reduce((sum, r) => sum + valueOf(r.key, d), 0));
  const weekTotal = dayTotals.reduce((a, b) => a + b, 0);

  function changeWeek(next: string) {
    if (dirty && !window.confirm("Perubahan belum disimpan akan hilang. Lanjutkan?")) return;
    setMonday(next);
  }

  function setCell(key: string, date: string, raw: string) {
    setValues((v) => ({ ...v, [cellKey(key, date)]: raw }));
    setDirty(true);
  }

  function addRow() {
    if (!newProject || !newActivity) return;
    const key = rowKey(newProject, newActivity);
    if (rows.some((r) => r.key === key)) {
      toast.info("Baris project + aktivitas ini sudah ada.");
      return;
    }
    setRows((r) => [...r, { key, project_id: newProject, activity_id: newActivity }]);
    setNewProject("");
    setNewActivity("");
  }

  function rowEditable(row: Row) {
    return allDays.every((d) => isEditable(entryByCell.get(cellKey(row.key, d))?.status));
  }

  function removeRow(row: Row) {
    setRows((r) => r.filter((x) => x.key !== row.key));
    setValues((v) => {
      const next = { ...v };
      for (const d of allDays) delete next[cellKey(row.key, d)];
      return next;
    });
    setDirty(true);
  }

  async function copyLastWeek() {
    if (!profile) return;
    const prevMonday = addDays(monday, -7);
    const { data, error } = await supabase
      .from("timesheets")
      .select(ENTRY_COLUMNS)
      .eq("profile_id", profile.id)
      .gte("work_date", prevMonday)
      .lte("work_date", addDays(prevMonday, 6));
    if (error) return toast.error(friendlyError(error));

    const nextRows = [...rows];
    const nextValues = { ...values };
    let copied = 0;
    for (const e of (data ?? []) as Entry[]) {
      if (projectById.get(e.project_id)?.status !== "active") continue;
      if (!activityById.get(e.activity_id)?.is_active) continue;
      const key = rowKey(e.project_id, e.activity_id);
      const date = addDays(e.work_date, 7);
      const ck = cellKey(key, date);
      if (!isEditable(entryByCell.get(ck)?.status) || parseHours(nextValues[ck])) continue;
      if (!nextRows.some((r) => r.key === key)) {
        nextRows.push({ key, project_id: e.project_id, activity_id: e.activity_id });
      }
      nextValues[ck] = String(e.hours);
      copied++;
    }
    if (copied === 0) {
      toast.info("Tidak ada entri minggu lalu yang bisa disalin.");
      return;
    }
    setRows(nextRows);
    setValues(nextValues);
    setDirty(true);
    toast.success(`${copied} entri disalin dari minggu lalu. Periksa lalu klik Simpan draft.`);
  }

  /** Persists edits; returns false when validation or the database refuses. */
  async function save(): Promise<boolean> {
    if (!profile) return false;
    const upserts: Record<string, unknown>[] = [];
    const deletes: string[] = [];

    for (let i = 0; i < allDays.length; i++) {
      if (dayTotals[i] > 24) {
        toast.error(`Total jam ${formatDay(allDays[i])} melebihi 24 jam.`);
        return false;
      }
    }

    const liveKeys = new Set(rows.map((r) => r.key));
    // Cells of removed rows: delete their editable entries.
    for (const e of entries) {
      const key = rowKey(e.project_id, e.activity_id);
      if (!liveKeys.has(key) && isEditable(e.status)) deletes.push(e.id);
    }

    for (const row of rows) {
      for (const date of allDays) {
        const ck = cellKey(row.key, date);
        const original = entryByCell.get(ck);
        if (!isEditable(original?.status)) continue;
        const hours = parseHours(values[ck]);
        if (hours === null || hours < 0 || hours > MAX_HOURS_PER_ENTRY) {
          toast.error(`Jam tidak valid pada ${formatDay(date)} (0–24).`);
          return false;
        }
        if (hours === 0) {
          if (original) deletes.push(original.id);
          continue;
        }
        if (original && Number(original.hours) === hours) continue;
        upserts.push({
          profile_id: profile.id,
          project_id: row.project_id,
          activity_id: row.activity_id,
          work_date: date,
          hours,
          status: "draft",
        });
      }
    }

    if (upserts.length) {
      const { error } = await supabase
        .from("timesheets")
        .upsert(upserts as never, { onConflict: "profile_id,project_id,activity_id,work_date" });
      if (error) {
        toast.error(friendlyError(error));
        return false;
      }
    }
    if (deletes.length) {
      const { error } = await supabase.from("timesheets").delete().in("id", deletes);
      if (error) {
        toast.error(friendlyError(error));
        return false;
      }
    }
    return true;
  }

  async function onSave() {
    setBusy(true);
    const ok = await save();
    if (ok) {
      toast.success("Draft tersimpan.");
      await loadWeek();
    }
    setBusy(false);
  }

  async function onSubmit() {
    if (!profile) return;
    if (weekTotal === 0) {
      toast.info("Isi jam terlebih dahulu sebelum submit.");
      return;
    }
    if (!window.confirm(`Submit timesheet ${formatWeek(monday)} (${formatHours(weekTotal)} jam) ke manager?`)) return;
    setBusy(true);
    if (dirty && !(await save())) {
      setBusy(false);
      return;
    }
    const { data, error } = await supabase
      .from("timesheets")
      .update({ status: "submitted" })
      .eq("profile_id", profile.id)
      .gte("work_date", monday)
      .lte("work_date", sunday)
      .in("status", ["draft", "rejected"])
      .select("id");
    setBusy(false);
    if (error) {
      toast.error(friendlyError(error));
      return;
    }
    toast.success(
      data?.length ? `${data.length} entri disubmit ke manager.` : "Tidak ada entri baru untuk disubmit.",
    );
    await loadWeek();
  }

  const today = new Date();
  const isThisWeek = monday === mondayOf();
  const fridayOrLater = today.getDay() === 0 || today.getDay() >= 5;
  const needsSubmit = weekStatus === "belum_isi" || weekStatus === "draft" || weekStatus === "rejected";
  const expectedToSubmit = profile ? COMPLIANCE_ROLES.includes(profile.role) : false;

  return (
    <div className="space-y-4">
      {lastWeekStatus && ["belum_isi", "draft", "rejected"].includes(lastWeekStatus) && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span>
            Timesheet <strong>minggu lalu</strong> belum disubmit. Kebijakan chapter: submit setiap Jumat.
          </span>
          {monday !== addDays(mondayOf(), -7) && (
            <Button size="sm" variant="outline" onClick={() => changeWeek(addDays(mondayOf(), -7))}>
              Buka minggu lalu
            </Button>
          )}
        </div>
      )}
      {expectedToSubmit && isThisWeek && fridayOrLater && needsSubmit && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Batas submit timesheet minggu ini adalah <strong>hari Jumat</strong>.
        </div>
      )}
      {rejectedNotes.length > 0 && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
          <p className="font-medium">Timesheet ditolak manager — perbaiki lalu submit ulang.</p>
          <ul className="mt-1 list-disc pl-5">
            {rejectedNotes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <WeekNav monday={monday} onChange={changeWeek} />
        <div className="flex items-center gap-3">
          <StatusPill status={weekStatus} />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-telkom-red"
              checked={showWeekend}
              onChange={(e) => setShowWeekend(e.target.checked)}
            />
            Tampilkan Sabtu–Minggu
          </label>
        </div>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="px-3 py-2 font-medium">Project / Aktivitas</th>
                {days.map((d) => (
                  <th key={d} className="px-1 py-2 text-center font-medium whitespace-nowrap">
                    {formatDay(d)}
                  </th>
                ))}
                <th className="px-3 py-2 text-right font-medium">Total</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={days.length + 3} className="py-10 text-center text-muted-foreground">
                    Memuat…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={days.length + 3} className="py-10 text-center text-muted-foreground">
                    Belum ada entri minggu ini. Tambahkan baris project + aktivitas di bawah, atau salin
                    dari minggu lalu.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const project = projectById.get(row.project_id);
                  const activity = activityById.get(row.activity_id);
                  const rowTotal = allDays.reduce((s, d) => s + valueOf(row.key, d), 0);
                  return (
                    <tr key={row.key} className="border-b last:border-0">
                      <td className="px-3 py-2">
                        <div className="font-medium">
                          {project ? `${project.code} · ${project.name}` : "Project tidak dikenal"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {activity ? `${activity.code} · ${activity.name}` : "—"}
                        </div>
                      </td>
                      {days.map((d) => {
                        const ck = cellKey(row.key, d);
                        const entry = entryByCell.get(ck);
                        const editable = isEditable(entry?.status);
                        return (
                          <td key={d} className="px-1 py-2 text-center">
                            {editable ? (
                              <input
                                type="number"
                                inputMode="decimal"
                                min={0}
                                max={24}
                                step={0.5}
                                aria-label={`Jam ${project?.code ?? ""} ${activity?.code ?? ""} ${formatDay(d)}`}
                                className={cn(
                                  "h-8 w-16 rounded-md border border-input bg-background px-1 text-center",
                                  entry?.status === "rejected" && "border-red-400 bg-red-50",
                                )}
                                value={values[ck] ?? ""}
                                onChange={(e) => setCell(row.key, d, e.target.value)}
                              />
                            ) : (
                              <span
                                title={entry?.status === "approved" ? "Disetujui" : "Menunggu persetujuan"}
                                className={cn(
                                  "inline-block w-16 rounded-md py-1.5",
                                  entry?.status === "approved" ? "bg-emerald-50 text-emerald-900" : "bg-sky-50 text-sky-900",
                                )}
                              >
                                {formatHours(Number(entry?.hours ?? 0))}
                              </span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-right font-medium">{formatHours(rowTotal)}</td>
                      <td className="px-1 py-2">
                        {rowEditable(row) && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Hapus baris"
                            onClick={() => removeRow(row)}
                          >
                            <Trash2 />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="border-t bg-muted/40 font-medium">
                  <td className="px-3 py-2">Total per hari</td>
                  {days.map((d) => {
                    const total = dayTotals[allDays.indexOf(d)];
                    return (
                      <td key={d} className={cn("px-1 py-2 text-center", total > 24 && "text-destructive")}>
                        {formatHours(total)}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-right">{formatHours(weekTotal)}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <select
          aria-label="Pilih project"
          className={selectClass}
          value={newProject}
          onChange={(e) => setNewProject(e.target.value)}
        >
          <option value="">Pilih project aktif…</option>
          {activeProjects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.code} · {p.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Pilih aktivitas"
          className={selectClass}
          value={newActivity}
          onChange={(e) => setNewActivity(e.target.value)}
        >
          <option value="">Pilih aktivitas…</option>
          {activeActivities.map((a) => (
            <option key={a.id} value={a.id}>
              {a.code} · {a.name}
            </option>
          ))}
        </select>
        <Button variant="outline" size="sm" onClick={addRow} disabled={!newProject || !newActivity}>
          <Plus /> Tambah baris
        </Button>
        <Button variant="ghost" size="sm" onClick={copyLastWeek} disabled={busy || loading}>
          <Copy /> Salin minggu lalu
        </Button>
      </div>
      {activeProjects.length === 0 && !loading && (
        <p className="text-sm text-muted-foreground">
          Belum ada project aktif. Minta Admin menambahkan project di halaman Admin → Project.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
        {dirty && <span className="mr-auto text-sm text-amber-700">Ada perubahan belum disimpan.</span>}
        <Button variant="outline" onClick={onSave} disabled={busy || !dirty}>
          {busy ? "Menyimpan…" : "Simpan draft"}
        </Button>
        <Button onClick={onSubmit} disabled={busy || (!dirty && !hasPendingEdits)}>
          Submit minggu
        </Button>
      </div>
    </div>
  );
}
