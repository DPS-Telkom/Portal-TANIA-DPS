"use client";

import { useEffect, useState } from "react";

import { TalentDirectory } from "@/components/talent/directory";
import { StaffingSearch } from "@/components/talent/staffing";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { Skill } from "@/lib/talent";
import type { UserRole } from "@/lib/types";

const STAFFING_ROLES: UserRole[] = ["pm", "manager", "chapter_lead", "hr", "executive", "admin"];

export default function TalentPage() {
  const { profile } = useAuth();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [squads, setSquads] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const [s, p] = await Promise.all([
        supabase.from("skills").select("id, name, category, kind").order("name"),
        supabase.from("profiles").select("squad").not("squad", "is", null).limit(1000),
      ]);
      setSkills((s.data ?? []) as Skill[]);
      setSquads([...new Set((p.data ?? []).map((r) => r.squad as string))].sort());
    })();
  }, []);

  if (!profile) return null;
  const canStaff = STAFFING_ROLES.includes(profile.role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Talent</h1>
        <p className="text-muted-foreground">
          Profil, kompetensi, dan ketersediaan talent Chapter DPS.
        </p>
      </div>
      <Tabs defaultValue="direktori">
        <TabsList>
          <TabsTrigger value="direktori">Direktori</TabsTrigger>
          {canStaff && <TabsTrigger value="staffing">Cari untuk staffing</TabsTrigger>}
        </TabsList>
        <TabsContent value="direktori" className="pt-4">
          <TalentDirectory skills={skills} squads={squads} />
        </TabsContent>
        {canStaff && (
          <TabsContent value="staffing" className="pt-4">
            <StaffingSearch skills={skills} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
