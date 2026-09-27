"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
import { friendlyError } from "@/lib/errors";
import { ROLE_LABELS } from "@/lib/roles";
import { supabase } from "@/lib/supabase";
import { KIND_LABELS, LEVEL_LABELS, groupByKind, type Skill } from "@/lib/talent";
import type { UserRole } from "@/lib/types";

interface Row {
  id: string;
  full_name: string;
  email: string | null;
  role: UserRole;
  squad: string | null;
  grade: string | null;
  location: string | null;
  profile_skills?: { level: number; is_certified: boolean }[];
}

const PAGE_SIZE = 25;
const MEMBER_ROLES: UserRole[] = ["talent", "pm", "manager", "chapter_lead", "executive", "admin"];
const selectClass = "h-8 rounded-md border border-input bg-background px-2 text-sm";

function sanitize(raw: string) {
  return raw.replace(/[^\p{L}\p{N}@.\- ]/gu, "").trim().slice(0, 100);
}

export function TalentDirectory({ skills, squads }: { skills: Skill[]; squads: string[] }) {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [squad, setSquad] = useState("");
  const [role, setRole] = useState("");
  const [skillId, setSkillId] = useState("");
  const [minLevel, setMinLevel] = useState(3);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setQuery(sanitize(search)), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => setPage(0), [query, squad, role, skillId, minLevel]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const columns = skillId
        ? "id, full_name, email, role, squad, grade, location, profile_skills!inner(level, is_certified)"
        : "id, full_name, email, role, squad, grade, location";
      let req = supabase
        .from("profiles")
        .select(columns, { count: "exact" })
        .eq("is_active", true)
        .in("role", role ? [role as UserRole] : MEMBER_ROLES)
        .order("full_name")
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      if (squad) req = req.eq("squad", squad);
      if (query) req = req.or(`full_name.ilike.%${query}%,email.ilike.%${query}%,location.ilike.%${query}%`);
      if (skillId) req = req.eq("profile_skills.skill_id", skillId).gte("profile_skills.level", minLevel);
      const { data, count, error } = await req;
      setLoading(false);
      if (error) return toast.error(friendlyError(error));
      setRows((data ?? []) as unknown as Row[]);
      setTotal(count ?? 0);
    })();
  }, [query, squad, role, skillId, minLevel, page]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
        <Input
          className="lg:max-w-xs"
          placeholder="Cari nama, email, lokasi…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Cari talent"
        />
        <select className={selectClass} value={squad} onChange={(e) => setSquad(e.target.value)} aria-label="Filter squad">
          <option value="">Semua squad</option>
          {squads.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select className={selectClass} value={role} onChange={(e) => setRole(e.target.value)} aria-label="Filter role">
          <option value="">Semua role</option>
          {MEMBER_ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
        <select className={selectClass} value={skillId} onChange={(e) => setSkillId(e.target.value)} aria-label="Filter skill">
          <option value="">Semua skill</option>
          {groupByKind(skills).map(([kind, list]) => (
            <optgroup key={kind} label={KIND_LABELS[kind]}>
              {list.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        {skillId && (
          <select
            className={selectClass}
            value={minLevel}
            onChange={(e) => setMinLevel(Number(e.target.value))}
            aria-label="Level minimum"
          >
            {[1, 2, 3, 4, 5].map((l) => (
              <option key={l} value={l}>
                Level ≥ {LEVEL_LABELS[l]}
              </option>
            ))}
          </select>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Squad</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Lokasi</TableHead>
                {skillId && <TableHead>Level</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    Memuat…
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    Tidak ada talent yang cocok dengan filter.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Link href={`/talent/profil?id=${r.id}`} className="font-medium hover:text-telkom-red hover:underline">
                        {r.full_name || r.email}
                      </Link>
                      <div className="text-xs text-muted-foreground">{r.email}</div>
                    </TableCell>
                    <TableCell>{ROLE_LABELS[r.role]}</TableCell>
                    <TableCell>{r.squad ?? "—"}</TableCell>
                    <TableCell>{r.grade ?? "—"}</TableCell>
                    <TableCell>{r.location ?? "—"}</TableCell>
                    {skillId && (
                      <TableCell>
                        {r.profile_skills?.[0] ? LEVEL_LABELS[r.profile_skills[0].level] : "—"}
                        {r.profile_skills?.[0]?.is_certified && (
                          <span className="ml-1 text-xs text-emerald-700">· Tersertifikasi</span>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {total} talent · halaman {page + 1} dari {pageCount}
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
