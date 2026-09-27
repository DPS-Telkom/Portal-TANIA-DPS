"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { friendlyError } from "@/lib/errors";
import { supabase } from "@/lib/supabase";

interface Setting {
  key: string;
  value: number;
  label: string;
  updated_at: string;
}

function SettingRow({ s, onSaved }: { s: Setting; onSaved: () => void }) {
  const [value, setValue] = useState(String(s.value));
  const [busy, setBusy] = useState(false);
  const dirty = Number(value) !== Number(s.value);

  async function save() {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0 || n > 1000) return toast.error("Nilai 0–1000.");
    setBusy(true);
    const { error } = await supabase.from("app_settings").update({ value: n }).eq("key", s.key);
    setBusy(false);
    if (error) return toast.error(friendlyError(error));
    toast.success("Pengaturan disimpan.");
    onSaved();
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div>
        <div className="font-medium">{s.label}</div>
        <div className="text-xs text-muted-foreground">
          Diubah {new Date(s.updated_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          className="h-8 w-24 text-right"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label={s.label}
        />
        <span className="text-sm">%</span>
        <Button size="sm" onClick={save} disabled={!dirty || busy}>
          Simpan
        </Button>
      </div>
    </li>
  );
}

// WA-03 / BC-04 — thresholds are configuration, not code.
export function SettingsPanel() {
  const [settings, setSettings] = useState<Setting[]>([]);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("app_settings").select("key, value, label, updated_at").order("key");
    if (error) return toast.error(friendlyError(error));
    setSettings((data ?? []) as Setting[]);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Threshold alert workload dan budget. Perubahan berlaku langsung untuk semua pengguna dan tercatat di audit log.
      </p>
      <Card>
        <CardContent className="p-0">
          <ul className="divide-y text-sm">
            {settings.map((s) => (
              <SettingRow key={`${s.key}-${s.value}`} s={s} onSaved={load} />
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
