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

type Category = "delivery" | "presales" | "internal" | "leave" | "training";

const CATEGORY_LABELS: Record<Category, string> = {
  delivery: "Delivery",
  presales: "Presales",
  internal: "Internal",
  leave: "Cuti (mengurangi kapasitas)",
  training: "Training",
};
const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];

interface Activity {
  id: string;
  code: string;
  name: string;
  category: Category;
  is_active: boolean;
}

const selectClass = "h-8 w-full rounded-md border border-input bg-background px-2 text-sm";

export function ActivitiesPanel() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category>("delivery");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("activities")
      .select("id, code, name, category, is_active")
      .order("code");
    setLoading(false);
    if (error) return toast.error(friendlyError(error));
    setActivities((data ?? []) as Activity[]);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle(a: Activity) {
    const { error } = await supabase.from("activities").update({ is_active: !a.is_active }).eq("id", a.id);
    if (error) return toast.error(friendlyError(error));
    toast.success(`Aktivitas ${a.code} ${a.is_active ? "dinonaktifkan" : "diaktifkan"}.`);
    load();
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (!/^[A-Z0-9]{2,10}$/.test(cleanCode)) return toast.error("Kode 2–10 huruf/angka, contoh: RND.");
    if (name.trim().length < 2) return toast.error("Nama aktivitas wajib diisi.");
    setBusy(true);
    const { error } = await supabase.from("activities").insert({ code: cleanCode, name: name.trim(), category });
    setBusy(false);
    if (error) {
      toast.error(error.code === "23505" ? `Kode ${cleanCode} sudah dipakai.` : friendlyError(error));
      return;
    }
    toast.success(`Aktivitas ${cleanCode} ditambahkan.`);
    setCode("");
    setName("");
    load();
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Aktivitas nonaktif tidak bisa dipilih di timesheet, tetapi entri lama tetap tersimpan. Jam
        berkategori <strong>Cuti</strong> tidak dihitung sebagai kerja dan mengurangi kapasitas
        utilisasi.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Tambah aktivitas</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={add} className="grid gap-3 sm:grid-cols-[8rem_1fr_14rem_auto] sm:items-end">
            <div className="space-y-1">
              <Label htmlFor="a-code">Kode</Label>
              <Input id="a-code" required value={code} onChange={(e) => setCode(e.target.value)} placeholder="RND" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="a-name">Nama</Label>
              <Input id="a-name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="a-cat">Kategori</Label>
              <select id="a-cat" className={selectClass} value={category} onChange={(e) => setCategory(e.target.value as Category)}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" disabled={busy}>
              Tambah
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Kategori</TableHead>
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
              ) : (
                activities.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs">{a.code}</TableCell>
                    <TableCell>{a.name}</TableCell>
                    <TableCell>{CATEGORY_LABELS[a.category]}</TableCell>
                    <TableCell>{a.is_active ? "Aktif" : "Nonaktif"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => toggle(a)}>
                        {a.is_active ? "Nonaktifkan" : "Aktifkan"}
                      </Button>
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
