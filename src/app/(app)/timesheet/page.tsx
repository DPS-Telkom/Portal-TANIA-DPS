"use client";

import { Approvals } from "@/components/timesheet/approvals";
import { Compliance } from "@/components/timesheet/compliance";
import { MyWeek } from "@/components/timesheet/my-week";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import type { UserRole } from "@/lib/types";

// Tab visibility is UX only; RLS decides what each query returns.
const REVIEWERS: UserRole[] = ["manager", "chapter_lead", "admin"];
const COMPLIANCE_VIEWERS: UserRole[] = ["manager", "chapter_lead", "executive", "admin"];

export default function TimesheetPage() {
  const { profile } = useAuth();
  if (!profile) return null;

  const canReview = REVIEWERS.includes(profile.role);
  const canSeeCompliance = COMPLIANCE_VIEWERS.includes(profile.role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Timesheet</h1>
        <p className="text-muted-foreground">
          Catat jam per project dan aktivitas, simpan sebagai draft, lalu submit setiap Jumat.
        </p>
      </div>

      <Tabs defaultValue="minggu">
        <TabsList>
          <TabsTrigger value="minggu">Minggu Saya</TabsTrigger>
          {canReview && <TabsTrigger value="persetujuan">Persetujuan</TabsTrigger>}
          {canSeeCompliance && <TabsTrigger value="kepatuhan">Kepatuhan</TabsTrigger>}
        </TabsList>
        <TabsContent value="minggu" className="pt-4">
          <MyWeek />
        </TabsContent>
        {canReview && (
          <TabsContent value="persetujuan" className="pt-4">
            <Approvals />
          </TabsContent>
        )}
        {canSeeCompliance && (
          <TabsContent value="kepatuhan" className="pt-4">
            <Compliance />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
