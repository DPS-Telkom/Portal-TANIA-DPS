"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { friendlyError } from "@/lib/errors";
import { supabase } from "@/lib/supabase";

type ProjectStatus = "candidate" | "active" | "on_hold" | "completed" | "cancelled";

const STATUS_LABELS: Record<ProjectStatus, string> = {
  candidate: "Kandidat",
  active: "Aktif",
  on_hold: "Ditunda",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};
const STATUSES = Object.keys(STATUS_LABELS) as ProjectStatus[];

interface Project {
  id: string;
  code: string;
  name: string;
  customer: string | null;
  status: ProjectStatus;
  pm_id: string | null;
  start_date: string | null;
  end_date: string | null;
}

interface Person {
  id: string;
  full_name: string;
  email: string | null;
}

const PAGE_SIZE = 25;
const COLUMNS = "id, code, name, customer, status, pm_id, start_date, end_date";
const selectClass =
  "h-8 w-full min-w-28 rounded-md border border-input bg-background px-2 text-sm disabled:opacity-50";

function sanitizeSearch(raw: string) {
  return raw.replace(/[^\p{L}\p{N}@.\- ]/gu, "").trim().slice(0, 100);
}

function ProjectRow({ project, pms, onSaved }: { project: Project; pms: Person[]; onSaved: () => void }) {
  const [name, setName] = useState(project.name);
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const [pmId, setPmId] = useState(project.pm_id ?? "");
  const [saving, setSaving] = useState(false);
  const dirty = name !== project.name || status !== project.status || pmId !== (project.pm_id ?? "");

  async function save() {
    if (name.trim().length < 2) return toast.error("Nama project wajib diisi.");
    setSaving(true);
    const { error } = await supabase
      .from("projects")
      .update({ name: name.trim(), status, pm_id: pmId || null })
      .eq("id", project.id);
    setSaving(false);
    if (error) return toast.error(friendlyError(error));
    toast.success(`Project ${project.code} disimpan.`);
    onSaved();
  }

  return (
    <TableRow>
      <TableCell className="font-mono text-xs">{project.code}</TableCell>
      <TableCell>
        <Input className="h-8 min-w-40" value={name} onChange={(e) => setName(e.target.value)} aria-label={`Nama ${project.code}`} />
        {project.customer && <div className="mt-1 text-xs text-muted-foreground">{project.customer}</div>}
      </TableCell>
      <TableCell>
        <select className={selectClass} value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)} aria-label={`Status ${project.code}`}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </TableCell>
      <TableCell>
        <select className={selectClass} value={pmId} onChange={(e) => setPmId(e.target.value)} aria-label={`PM ${project.code}`}>
          <option value="">— Tanpa PM —</option>
          {pms.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name || p.email}
            </option>
          ))}
        </select>
      </TableCell>
      <TableCell className="text-right">
        <Button size="sm" onClick={save} disabled={!dirty || saving}>
          {saving ? "Menyimpan…" : "Simpan"}
        </Button>
      </TableCell>
    </TableRow>
  );
}

function NewProjectForm({ pms, onCreated }: { pms: Person[]; onCreated: () => void }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [customer, setCustomer] = useState("");
  const [pmId, setPmId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (!/^[A-Z0-9][A-Z0-9-]{1,29}$/.test(cleanCode))
      return toast.error("Kode project 2–30 karakter: huruf, angka, atau tanda hubung.");
    if (name.trim().length < 2) return toast.error("Nama project wajib diisi.");
    if (startDate && endDate && endDate < startDate)
      return toast.error("Tanggal selesai tidak boleh sebelum tanggal mulai.");

    setBusy(true);
    const { error } = await supabase.from("projects").insert({
      code: cleanCode,
      name: name.trim(),
      customer: customer.trim() || null,
      pm_id: pmId || null,
      start_date: startDate || null,
      end_date: endDate || null,
      status: "active",
    });
    setBusy(false);
    if (error) {
      toast.error(error.code === "23505" ? `Kode ${cleanCode} sudah dipakai.` : friendlyError(error));
      return;
    }
    toast.success(`Project ${cleanCode} ditambahkan.`);
    setCode("");
    setName("");
    setCustomer("");
    setPmId("");
    setStartDate("");
    setEndDate("");
    onCreated();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tambah project</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="p-code">Kode</Label>
            <Input id="p-code" required placeholder="DPS-001" value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="p-name">Nama</Label>
            <Input id="p-name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="p-customer">Customer</Label>
            <Input id="p-customer" value={customer} onChange={(e) => setCustomer(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="p-pm">Project Manager</Label>
            <select id="p-pm" className={selectClass} value={pmId} onChange={(e) => setPmId(e.target.value)}>
              <option value="">— Tanpa PM —</option>
              {pms.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name || p.email}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="p-start">Mulai</Label>
            <Input id="p-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="p-end">Selesai</Label>
            <Input id="p-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <Button type="submit" disabled={busy}>
              {busy ? "Menyimpan…" : "Tambah project"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function ProjectsPanel() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [pms, setPms] = useState<Person[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(sanitizeSearch(search));
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    let req = supabase
      .from("projects")
      .select(COLUMNS, { count: "exact" })
      .order("code")
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    if (query) req = req.or(`code.ilike.%${query}%,name.ilike.%${query}%`);
    const { data, count, error } = await req;
    setLoading(false);
    if (error) return toast.error(friendlyError(error));
    setProjects((data ?? []) as Project[]);
    setTotal(count ?? 0);
  }, [page, query]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("role", ["pm", "manager", "chapter_lead", "admin"])
        .eq("is_active", true)
        .order("full_name")
        .limit(500);
      setPms((data ?? []) as Person[]);
    })();
  }, []);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Hanya project berstatus <strong>Aktif</strong> yang bisa dipilih di timesheet. Project tidak
        dihapus — ubah statusnya menjadi Selesai atau Dibatalkan.
      </p>
      <NewProjectForm pms={pms} onCreated={load} />

      <div className="flex justify-end">
        <Input
          className="sm:max-w-xs"
          placeholder="Cari kode atau nama…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Cari project"
        />
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>PM</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    Memuat…
                  </TableCell>
                </TableRow>
              ) : projects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    Belum ada project.
                  </TableCell>
                </TableRow>
              ) : (
                projects.map((p) => (
                  <ProjectRow key={`${p.id}-${p.name}-${p.status}-${p.pm_id}`} project={p} pms={pms} onSaved={load} />
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {total} project · halaman {page + 1} dari {pageCount}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 0 || loading} onClick={() => setPage((p) => p - 1)}>
            Sebelumnya
          </Button>
          <Button variant="outline" size="sm" disabled={page + 1 >= pageCount || loading} onClick={() => setPage((p) => p + 1)}>
            Berikutnya
          </Button>
        </div>
      </div>
    </div>
  );
}
