"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { friendlyError } from "@/lib/errors";
import { ASSIGNABLE_ROLES, ROLE_LABELS } from "@/lib/roles";
import { supabase } from "@/lib/supabase";
import type { Profile, UserRole } from "@/lib/types";

const PAGE_SIZE = 25;
const PROFILE_COLUMNS =
  "id, full_name, email, role, squad, grade, location, manager_id, is_active, created_at";
const MANAGER_ROLES: UserRole[] = ["manager", "chapter_lead", "executive", "admin"];

type Filter = "semua" | "guest";

interface Draft {
  role: UserRole;
  manager_id: string | null;
  is_active: boolean;
}

// PostgREST `.or()` takes a filter string; keep only characters that cannot
// alter its syntax.
function sanitizeSearch(raw: string) {
  return raw.replace(/[^\p{L}\p{N}@.\- ]/gu, "").trim().slice(0, 100);
}

const selectClass =
  "h-8 w-full min-w-32 rounded-md border border-input bg-background px-2 text-sm disabled:opacity-50";

function UserRow({
  user,
  managers,
  isSelf,
  onSaved,
}: {
  user: Profile;
  managers: Profile[];
  isSelf: boolean;
  onSaved: (next: Profile) => void;
}) {
  const [draft, setDraft] = useState<Draft>({
    role: user.role,
    manager_id: user.manager_id,
    is_active: user.is_active,
  });
  const [saving, setSaving] = useState(false);

  const dirty =
    draft.role !== user.role ||
    draft.manager_id !== user.manager_id ||
    draft.is_active !== user.is_active;

  async function save() {
    setSaving(true);
    const { data, error } = await supabase
      .from("profiles")
      .update({ role: draft.role, manager_id: draft.manager_id, is_active: draft.is_active })
      .eq("id", user.id)
      .select(PROFILE_COLUMNS)
      .single();
    setSaving(false);
    if (error) {
      toast.error(friendlyError(error));
      return;
    }
    toast.success(`Perubahan untuk ${user.full_name || user.email} disimpan.`);
    onSaved(data as Profile);
  }

  return (
    <TableRow>
      <TableCell>
        <div className="font-medium">{user.full_name || "—"}</div>
        <div className="text-xs text-muted-foreground">{user.email}</div>
      </TableCell>
      <TableCell>
        <select
          aria-label={`Role ${user.full_name}`}
          className={selectClass}
          value={draft.role}
          disabled={isSelf}
          onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value as UserRole }))}
        >
          {ASSIGNABLE_ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
      </TableCell>
      <TableCell>
        <select
          aria-label={`Manager ${user.full_name}`}
          className={selectClass}
          value={draft.manager_id ?? ""}
          onChange={(e) => setDraft((d) => ({ ...d, manager_id: e.target.value || null }))}
        >
          <option value="">— Tanpa manager —</option>
          {managers
            .filter((m) => m.id !== user.id)
            .map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name || m.email}
              </option>
            ))}
        </select>
      </TableCell>
      <TableCell>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-telkom-red"
            checked={draft.is_active}
            disabled={isSelf}
            onChange={(e) => setDraft((d) => ({ ...d, is_active: e.target.checked }))}
          />
          {draft.is_active ? "Aktif" : "Nonaktif"}
        </label>
      </TableCell>
      <TableCell className="text-right">
        <Button size="sm" onClick={save} disabled={!dirty || saving}>
          {saving ? "Menyimpan…" : "Simpan"}
        </Button>
      </TableCell>
    </TableRow>
  );
}

export function UsersPanel() {
  const { profile } = useAuth();
  const [filter, setFilter] = useState<Filter>("guest");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [users, setUsers] = useState<Profile[]>([]);
  const [total, setTotal] = useState(0);
  const [managers, setManagers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const isAdmin = profile?.role === "admin";

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(sanitizeSearch(search));
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    let req = supabase
      .from("profiles")
      .select(PROFILE_COLUMNS, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    if (filter === "guest") req = req.eq("role", "guest");
    if (query) req = req.or(`full_name.ilike.%${query}%,email.ilike.%${query}%`);

    const { data, count, error } = await req;
    setLoading(false);
    if (error) {
      setLoadError(friendlyError(error));
      return;
    }
    setUsers((data ?? []) as Profile[]);
    setTotal(count ?? 0);
  }, [filter, query, page]);

  const loadManagers = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .in("role", MANAGER_ROLES)
      .eq("is_active", true)
      .order("full_name")
      .limit(500);
    setManagers((data ?? []) as Profile[]);
  }, []);

  useEffect(() => {
    if (isAdmin) loadUsers();
  }, [isAdmin, loadUsers]);

  useEffect(() => {
    if (isAdmin) loadManagers();
  }, [isAdmin, loadManagers]);

  const pageCount = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  function handleSaved(next: Profile) {
    // A guest who got a role leaves the "Menunggu akses" list.
    setUsers((prev) =>
      filter === "guest" && next.role !== "guest"
        ? prev.filter((u) => u.id !== next.id)
        : prev.map((u) => (u.id === next.id ? next : u)),
    );
    if (filter === "guest" && next.role !== "guest") setTotal((t) => Math.max(0, t - 1));
    // Role or active changes can add/remove someone from the manager list.
    loadManagers();
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Tetapkan role, manager, dan status aktif. Pendaftar baru berstatus Guest sampai diberi
        role. Perubahan ini hanya berhasil untuk Admin karena dijaga oleh database.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={filter}
          onValueChange={(v) => {
            setFilter(v as Filter);
            setPage(0);
          }}
        >
          <TabsList>
            <TabsTrigger value="guest">Menunggu akses</TabsTrigger>
            <TabsTrigger value="semua">Semua user</TabsTrigger>
          </TabsList>
        </Tabs>
        <Input
          className="sm:max-w-xs"
          placeholder="Cari nama atau email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Cari user"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Status</TableHead>
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
              ) : loadError ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-destructive">
                    {loadError}
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    {filter === "guest"
                      ? "Tidak ada user yang menunggu akses."
                      : "Tidak ada user yang cocok."}
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => (
                  <UserRow
                    key={`${u.id}-${u.role}-${u.manager_id}-${u.is_active}`}
                    user={u}
                    managers={managers}
                    isSelf={u.id === profile?.id}
                    onSaved={handleSaved}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {total} user · halaman {page + 1} dari {pageCount}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0 || loading}
            onClick={() => setPage((p) => p - 1)}
          >
            Sebelumnya
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page + 1 >= pageCount || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Berikutnya
          </Button>
        </div>
      </div>

    </div>
  );
}
