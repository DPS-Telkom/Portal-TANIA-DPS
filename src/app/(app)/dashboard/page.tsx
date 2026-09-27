"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/roles";

// Placeholder until XM-01 (KPI cards + copilot panel) is built.
export default function DashboardPage() {
  const { profile } = useAuth();
  if (!profile) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Halo, {profile.full_name || profile.email}</h1>
        <p className="text-muted-foreground">Anda masuk sebagai {ROLE_LABELS[profile.role]}.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Dashboard sedang disiapkan</CardTitle>
          <CardDescription>
            Kartu KPI dan panel TANIA Copilot akan tampil di sini setelah modul Timesheet,
            Workload, Feasibility, dan Budget tersedia.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Menu yang bertanda &ldquo;Segera&rdquo; akan aktif bertahap.
        </CardContent>
      </Card>
    </div>
  );
}
