"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { formatMonth } from "@/lib/dates";
import { friendlyError } from "@/lib/errors";
import { COLUMN_CLASSES, COLUMN_LABELS, type Column, type Decision } from "@/lib/feasibility";
import { formatIDRCompact } from "@/lib/money";
import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/lib/types";
import { cn } from "@/lib/utils";

interface CaseCard {
  id: string;
  title: string;
  customer: string | null;
  total_score: number;
  decision: Decision | null;
  est_revenue: number | null;
  start_month: string | null;
  submitted_by: string;
  created_at: string;
  decided_at: string | null;
  submitter: { full_name: string } | null;
}

const COLUMNS: Column[] = ["undecided", "go", "hold", "no_go"];
const SUBMITTERS: UserRole[] = ["pm", "manager", "chapter_lead", "admin"];
type Sort = "score" | "newest" | "revenue";

const selectClass = "h-8 rounded-md border border-input bg-background px-2 text-sm";

function scoreClass(score: number) {
  if (score >= 70) return "bg-emerald-100 text-emerald-900";
  if (score >= 50) return "bg-amber-100 text-amber-900";
  return "bg-red-100 text-red-900";
}

export default function FeasibilityPage() {
  const { profile } = useAuth();
  const [cases, setCases] = useState<CaseCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [mineOnly, setMineOnly] = useState(false);
  const [sort, setSort] = useState<Sort>("score");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("feasibility_cases")
        .select(
          "id, title, customer, total_score, decision, est_revenue, start_month, submitted_by, created_at, decided_at, submitter:profiles!feasibility_cases_submitted_by_fkey(full_name)",
        )
        .order("created_at", { ascending: false })
        .limit(500);
      setLoading(false);
      if (error) return setError(friendlyError(error));
      setCases((data ?? []) as unknown as CaseCard[]);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = cases.filter(
      (c) =>
        (!q || c.title.toLowerCase().includes(q) || (c.customer ?? "").toLowerCase().includes(q)) &&
        (!mineOnly || c.submitted_by === profile?.id),
    );
    const cmp: Record<Sort, (a: CaseCard, b: CaseCard) => number> = {
      score: (a, b) => Number(b.total_score) - Number(a.total_score),
      newest: (a, b) => b.created_at.localeCompare(a.created_at),
      revenue: (a, b) => Number(b.est_revenue ?? 0) - Number(a.est_revenue ?? 0),
    };
    return list.sort(cmp[sort]);
  }, [cases, search, mineOnly, sort, profile]);

  if (!profile) return null;
  const canSubmit = SUBMITTERS.includes(profile.role);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Feasibility</h1>
          <p className="text-muted-foreground">
            Pipeline kandidat project: skor 5 dimensi, resource check, dan keputusan beraudit.
          </p>
        </div>
        {canSubmit && (
          <Link href="/feasibility/case?id=baru" className={cn(buttonVariants(), "gap-1")}>
            <Plus className="size-4" /> Case baru
          </Link>
        )}
      </div>

      <p className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900">
        Skor bersifat <strong>indikatif</strong> — bobot 25/25/20/15/15 menunggu persetujuan manajemen (AG-01).
      </p>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <Input
          className="sm:max-w-xs"
          placeholder="Cari judul atau customer…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Cari case"
        />
        <select className={selectClass} value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Urutkan">
          <option value="score">Skor tertinggi</option>
          <option value="newest">Terbaru</option>
          <option value="revenue">Revenue terbesar</option>
        </select>
        {canSubmit && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-telkom-red"
              checked={mineOnly}
              onChange={(e) => setMineOnly(e.target.checked)}
            />
            Case saya saja
          </label>
        )}
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Memuat…</p>
      ) : error ? (
        <p className="py-10 text-center text-sm text-destructive">{error}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((col) => {
            const items = filtered.filter((c) => (c.decision ?? "undecided") === col);
            return (
              <section key={col} className={cn("rounded-lg border border-t-4 bg-muted/30 p-3", COLUMN_CLASSES[col])}>
                <h2 className="mb-3 flex items-center justify-between text-sm font-semibold">
                  {COLUMN_LABELS[col]}
                  <span className="rounded-full bg-background px-2 text-xs font-normal">{items.length}</span>
                </h2>
                <ul className="space-y-2">
                  {items.length === 0 && <li className="text-xs text-muted-foreground">Tidak ada case.</li>}
                  {items.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/feasibility/case?id=${c.id}`}
                        className="block rounded-md border bg-background p-3 transition-colors hover:border-telkom-red"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-medium">{c.title}</span>
                          <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold", scoreClass(Number(c.total_score)))}>
                            {Math.round(Number(c.total_score))}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {c.customer ?? "—"}
                          {c.est_revenue ? ` · ${formatIDRCompact(c.est_revenue)}` : ""}
                          {c.start_month ? ` · mulai ${formatMonth(c.start_month)}` : ""}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">oleh {c.submitter?.full_name ?? "—"}</div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
