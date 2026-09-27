"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { formatDay, formatHours, formatWeek, mondayOf, fromISODate } from "@/lib/dates";
import { friendlyError } from "@/lib/errors";
import { supabase } from "@/lib/supabase";

interface SubmittedEntry {
  id: string;
  profile_id: string;
  work_date: string;
  hours: number;
  note: string | null;
  submitted_at: string | null;
  project: { code: string; name: string } | null;
  activity: { code: string; name: string } | null;
  owner: { full_name: string; email: string | null; squad: string | null } | null;
}

interface Group {
  key: string;
  profileId: string;
  monday: string;
  owner: SubmittedEntry["owner"];
  entries: SubmittedEntry[];
  total: number;
}

// Enough for a chapter's weekly queue; the UI says so if it is ever reached.
const LIMIT = 1000;

function GroupCard({ group, onDone }: { group: Group; onDone: () => void }) {
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const ids = group.entries.map((e) => e.id);

  async function decide(status: "approved" | "rejected") {
    if (status === "rejected" && note.trim().length < 3) {
      toast.error("Catatan penolakan wajib diisi.");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase
      .from("timesheets")
      .update(status === "rejected" ? { status, review_note: note.trim() } : { status })
      .in("id", ids)
      .eq("status", "submitted")
      .select("id");
    setBusy(false);
    if (error) {
      toast.error(friendlyError(error));
      return;
    }
    const who = group.owner?.full_name || group.owner?.email || "talent";
    toast.success(
      `${data?.length ?? 0} entri ${who} ${status === "approved" ? "disetujui" : "ditolak"}.`,
    );
    onDone();
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle>{group.owner?.full_name || group.owner?.email || "—"}</CardTitle>
            <CardDescription>
              {formatWeek(group.monday)}
              {group.owner?.squad ? ` · Squad ${group.owner.squad}` : ""}
            </CardDescription>
          </div>
          <span className="text-lg font-semibold">{formatHours(group.total)} jam</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-1 pr-2 font-medium">Hari</th>
                <th className="py-1 pr-2 font-medium">Project</th>
                <th className="py-1 pr-2 font-medium">Aktivitas</th>
                <th className="py-1 text-right font-medium">Jam</th>
              </tr>
            </thead>
            <tbody>
              {group.entries.map((e) => (
                <tr key={e.id} className="border-b last:border-0">
                  <td className="py-1 pr-2 whitespace-nowrap">{formatDay(e.work_date)}</td>
                  <td className="py-1 pr-2">{e.project ? `${e.project.code} · ${e.project.name}` : "—"}</td>
                  <td className="py-1 pr-2">{e.activity?.name ?? "—"}</td>
                  <td className="py-1 text-right">{formatHours(Number(e.hours))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {rejecting ? (
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor={`note-${group.key}`}>
              Catatan penolakan (wajib)
            </label>
            <textarea
              id={`note-${group.key}`}
              className="min-h-20 w-full rounded-md border border-input bg-background p-2 text-sm"
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Contoh: jam project X hari Selasa seharusnya aktivitas Presales."
            />
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setRejecting(false)} disabled={busy}>
                Batal
              </Button>
              <Button variant="destructive" size="sm" onClick={() => decide("rejected")} disabled={busy}>
                Tolak dengan catatan
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setRejecting(true)} disabled={busy}>
              Tolak
            </Button>
            <Button size="sm" onClick={() => decide("approved")} disabled={busy}>
              {busy ? "Memproses…" : "Setujui minggu ini"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function Approvals() {
  const { profile } = useAuth();
  const [entries, setEntries] = useState<SubmittedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setError(null);
    // RLS returns only rows this reviewer may see (direct reports, or all for
    // chapter_lead/admin); own rows are excluded — nobody approves themselves.
    const { data, error } = await supabase
      .from("timesheets")
      .select(
        "id, profile_id, work_date, hours, note, submitted_at, project:projects(code, name), activity:activities(code, name), owner:profiles!timesheets_profile_id_fkey(full_name, email, squad)",
      )
      .eq("status", "submitted")
      .neq("profile_id", profile.id)
      .order("work_date")
      .limit(LIMIT);
    setLoading(false);
    if (error) {
      setError(friendlyError(error));
      return;
    }
    setEntries((data ?? []) as unknown as SubmittedEntry[]);
  }, [profile]);

  useEffect(() => {
    load();
  }, [load]);

  const groups = useMemo(() => {
    const map = new Map<string, Group>();
    for (const e of entries) {
      const monday = mondayOf(fromISODate(e.work_date));
      const key = `${e.profile_id}|${monday}`;
      const g = map.get(key) ?? { key, profileId: e.profile_id, monday, owner: e.owner, entries: [], total: 0 };
      g.entries.push(e);
      g.total += Number(e.hours);
      map.set(key, g);
    }
    return [...map.values()].sort(
      (a, b) => a.monday.localeCompare(b.monday) || (a.owner?.full_name ?? "").localeCompare(b.owner?.full_name ?? ""),
    );
  }, [entries]);

  if (loading) return <p className="py-10 text-center text-sm text-muted-foreground">Memuat…</p>;
  if (error) return <p className="py-10 text-center text-sm text-destructive">{error}</p>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {groups.length === 0
          ? "Tidak ada timesheet yang menunggu persetujuan Anda."
          : `${groups.length} timesheet mingguan menunggu persetujuan.`}
      </p>
      {groups.map((g) => (
        <GroupCard key={g.key} group={g} onDone={load} />
      ))}
      {entries.length >= LIMIT && (
        <p className="text-sm text-amber-700">
          Menampilkan {LIMIT} entri pertama. Setujui yang ada untuk memuat sisanya.
        </p>
      )}
    </div>
  );
}
