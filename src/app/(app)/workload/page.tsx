"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkloadAlerts } from "@/components/workload/alerts";
import { AllocationRegister } from "@/components/workload/allocations";
import { Heatmap } from "@/components/workload/heatmap";
import { UtilizationTable } from "@/components/workload/utilization-table";
import { useAuth } from "@/lib/auth";
import type { UserRole } from "@/lib/types";

// Team views need timesheet visibility beyond oneself (RLS); talent and pm
// see their own utilization only, so those tabs would be empty for them.
const TEAM_VIEWERS: UserRole[] = ["manager", "chapter_lead", "executive", "admin"];

export default function WorkloadPage() {
  const { profile } = useAuth();
  if (!profile) return null;
  const team = TEAM_VIEWERS.includes(profile.role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Workload</h1>
        <p className="text-muted-foreground">
          {team
            ? "Alokasi rencana vs utilisasi aktual per orang dan squad."
            : "Alokasi rencana dan utilisasi aktual Anda."}
        </p>
      </div>
      <Tabs defaultValue={team ? "heatmap" : "utilisasi"}>
        <TabsList>
          {team && <TabsTrigger value="heatmap">Heatmap</TabsTrigger>}
          <TabsTrigger value="utilisasi">Utilisasi</TabsTrigger>
          {team && <TabsTrigger value="alert">Alert</TabsTrigger>}
          <TabsTrigger value="alokasi">Alokasi</TabsTrigger>
        </TabsList>
        {team && (
          <TabsContent value="heatmap" className="pt-4">
            <Heatmap />
          </TabsContent>
        )}
        <TabsContent value="utilisasi" className="pt-4">
          <UtilizationTable />
        </TabsContent>
        {team && (
          <TabsContent value="alert" className="pt-4">
            <WorkloadAlerts />
          </TabsContent>
        )}
        <TabsContent value="alokasi" className="pt-4">
          <AllocationRegister />
        </TabsContent>
      </Tabs>
    </div>
  );
}
