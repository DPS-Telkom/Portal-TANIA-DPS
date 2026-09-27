"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { friendlyError } from "@/lib/errors";
import { supabase } from "@/lib/supabase";
import { LEVEL_LABELS, type Skill } from "@/lib/talent";

export interface ProfileSkill {
  skill_id: string;
  level: number;
  is_certified: boolean;
  certification_name: string | null;
  skill: { name: string; category: string | null } | null;
}

const selectClass = "h-8 rounded-md border border-input bg-background px-2 text-sm";

function SkillRow({
  profileId,
  item,
  editable,
  onChanged,
}: {
  profileId: string;
  item: ProfileSkill;
  editable: boolean;
  onChanged: () => void;
}) {
  const [level, setLevel] = useState(item.level);
  const [certified, setCertified] = useState(item.is_certified);
  const [certName, setCertName] = useState(item.certification_name ?? "");
  const [busy, setBusy] = useState(false);
  const dirty =
    level !== item.level || certified !== item.is_certified || certName !== (item.certification_name ?? "");

  async function save() {
    setBusy(true);
    const { error } = await supabase
      .from("profile_skills")
      .update({ level, is_certified: certified, certification_name: certified ? certName.trim() || null : null })
      .eq("profile_id", profileId)
      .eq("skill_id", item.skill_id);
    setBusy(false);
    if (error) return toast.error(friendlyError(error));
    toast.success(`${item.skill?.name ?? "Skill"} disimpan.`);
    onChanged();
  }

  async function remove() {
    if (!window.confirm(`Hapus ${item.skill?.name ?? "skill"} dari profil?`)) return;
    const { error } = await supabase
      .from("profile_skills")
      .delete()
      .eq("profile_id", profileId)
      .eq("skill_id", item.skill_id);
    if (error) return toast.error(friendlyError(error));
    onChanged();
  }

  if (!editable) {
    return (
      <li className="flex flex-wrap items-center justify-between gap-2 py-2">
        <div>
          <div className="font-medium">{item.skill?.name}</div>
          <div className="text-xs text-muted-foreground">{item.skill?.category}</div>
        </div>
        <div className="text-right text-sm">
          {LEVEL_LABELS[item.level]}
          {item.is_certified && (
            <div className="text-xs text-emerald-700">
              Tersertifikasi{item.certification_name ? ` · ${item.certification_name}` : ""}
            </div>
          )}
        </div>
      </li>
    );
  }

  return (
    <li className="grid gap-2 py-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
      <div>
        <div className="font-medium">{item.skill?.name}</div>
        <div className="text-xs text-muted-foreground">{item.skill?.category}</div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select
          className={selectClass}
          value={level}
          onChange={(e) => setLevel(Number(e.target.value))}
          aria-label={`Level ${item.skill?.name}`}
        >
          {[1, 2, 3, 4, 5].map((l) => (
            <option key={l} value={l}>
              {LEVEL_LABELS[l]}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-telkom-red"
            checked={certified}
            onChange={(e) => setCertified(e.target.checked)}
          />
          Sertifikasi
        </label>
        {certified && (
          <Input
            className="h-8 w-44"
            placeholder="Nama sertifikat"
            value={certName}
            maxLength={150}
            onChange={(e) => setCertName(e.target.value)}
          />
        )}
      </div>
      <div className="flex gap-1 sm:justify-end">
        <Button size="sm" onClick={save} disabled={!dirty || busy}>
          Simpan
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label={`Hapus ${item.skill?.name}`} onClick={remove}>
          <Trash2 />
        </Button>
      </div>
    </li>
  );
}

// TM-02 — competency matrix. Editable by the owner, their direct manager,
// chapter_lead and admin (RLS enforces the same).
export function SkillMatrix({
  profileId,
  items,
  allSkills,
  editable,
  onChanged,
}: {
  profileId: string;
  items: ProfileSkill[];
  allSkills: Skill[];
  editable: boolean;
  onChanged: () => void;
}) {
  const [newSkill, setNewSkill] = useState("");
  const [newLevel, setNewLevel] = useState(3);
  const owned = new Set(items.map((i) => i.skill_id));
  const available = allSkills.filter((s) => !owned.has(s.id));

  async function add() {
    if (!newSkill) return;
    const { error } = await supabase
      .from("profile_skills")
      .insert({ profile_id: profileId, skill_id: newSkill, level: newLevel });
    if (error) return toast.error(friendlyError(error));
    setNewSkill("");
    onChanged();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kompetensi</CardTitle>
        <CardDescription>Level 1 (dasar) sampai 5 (ahli), beserta sertifikasi.</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada kompetensi tercatat.</p>
        ) : (
          <ul className="divide-y">
            {items.map((i) => (
              <SkillRow
                key={`${i.skill_id}-${i.level}-${i.is_certified}-${i.certification_name}`}
                profileId={profileId}
                item={i}
                editable={editable}
                onChanged={onChanged}
              />
            ))}
          </ul>
        )}
        {editable && available.length > 0 && (
          <div className="mt-4 flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center">
            <select
              className={selectClass}
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              aria-label="Tambah kompetensi"
            >
              <option value="">Tambah kompetensi…</option>
              {available.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <select
              className={selectClass}
              value={newLevel}
              onChange={(e) => setNewLevel(Number(e.target.value))}
              aria-label="Level kompetensi baru"
            >
              {[1, 2, 3, 4, 5].map((l) => (
                <option key={l} value={l}>
                  {LEVEL_LABELS[l]}
                </option>
              ))}
            </select>
            <Button size="sm" variant="outline" onClick={add} disabled={!newSkill}>
              Tambah
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
