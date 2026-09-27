"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
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
import { formatMonth, isoToMonthInput, monthInputToISO, monthOf } from "@/lib/dates";
import { friendlyError } from "@/lib/errors";
import { ROLE_LABELS } from "@/lib/roles";
import { supabase } from "@/lib/supabase";
import { LEVEL_LABELS, type Skill } from "@/lib/talent";
import type { UserRole } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Candidate {
  profile_id: string;
  full_name: string;
  email: string | null;
  squad: string | null;
  grade: string | null;
  role: UserRole;
  skill_level: number | null;
  is_certified: boolean;
  allocated_pct: number;
  available_pct: number;
}

const selectClass = "h-8 w-full rounded-md border border-input bg-background px-2 text-sm";

function availabilityClass(pct: number) {
  if (pct >= 50) return "bg-emerald-100 text-emerald-900";
  if (pct > 0) return "bg-amber-100 text-amber-900";
  return "bg-red-100 text-red-900";
}

// TM-04 — who has the competency and free capacity in a given month.
export function StaffingSearch({ skills }: { skills: Skill[] }) {
  const [skillId, setSkillId] = useState("");
  const [minLevel, setMinLevel] = useState(3);
  const [month, setMonth] = useState(() => monthOf());
  const [rows, setRows] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!month) return;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.rpc("staffing_candidates", {
        p_skill_id: skillId || undefined,
        p_min_level: minLevel,
        p_month: month,
      });
      setLoading(false);
      if (error) return setError(friendlyError(error));
      setRows((data ?? []) as Candidate[]);
    })();
  }, [skillId, minLevel, month]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Kandidat diurutkan berdasarkan sisa kapasitas pada bulan terpilih (100% − total alokasi),
        lalu level kompetensi. Hanya role Talent, Project Manager, dan Manager yang aktif.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="st-skill">Kompetensi</Label>
          <select id="st-skill" className={selectClass} value={skillId} onChange={(e) => setSkillId(e.target.value)}>
            <option value="">Semua (tanpa filter skill)</option>
            {skills.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="st-level">Level minimum</Label>
          <select
            id="st-level"
            className={selectClass}
            value={minLevel}
            disabled={!skillId}
            onChange={(e) => setMinLevel(Number(e.target.value))}
          >
            {[1, 2, 3, 4, 5].map((l) => (
              <option key={l} value={l}>
                {LEVEL_LABELS[l]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="st-month">Periode</Label>
          <Input
            id="st-month"
            type="month"
            value={isoToMonthInput(month)}
            onChange={(e) => setMonth(monthInputToISO(e.target.value))}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Squad</TableHead>
                {skillId && <TableHead>Level</TableHead>}
                <TableHead className="text-right">Teralokasi</TableHead>
                <TableHead className="text-right">Tersedia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    Memuat…
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-destructive">
                    {error}
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    Tidak ada kandidat untuk kriteria ini pada {formatMonth(month, true)}.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.profile_id}>
                    <TableCell>
                      <Link href={`/talent/profil?id=${r.profile_id}`} className="font-medium hover:text-telkom-red hover:underline">
                        {r.full_name || r.email}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {ROLE_LABELS[r.role]}
                        {r.grade ? ` · ${r.grade}` : ""}
                      </div>
                    </TableCell>
                    <TableCell>{r.squad ?? "—"}</TableCell>
                    {skillId && (
                      <TableCell>
                        {r.skill_level ? LEVEL_LABELS[r.skill_level] : "—"}
                        {r.is_certified && <span className="ml-1 text-xs text-emerald-700">· Tersertifikasi</span>}
                      </TableCell>
                    )}
                    <TableCell className="text-right">{Math.round(Number(r.allocated_pct))}%</TableCell>
                    <TableCell className="text-right">
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", availabilityClass(Number(r.available_pct)))}>
                        {Math.round(Number(r.available_pct))}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
