"use client";

import { ActivitiesPanel } from "@/components/admin/activities-panel";
import { ProjectsPanel } from "@/components/admin/projects-panel";
import { SettingsPanel } from "@/components/admin/settings-panel";
import { UsersPanel } from "@/components/admin/users-panel";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";

export default function AdminPage() {
  const { profile } = useAuth();

  // UX only — every write below is re-checked by RLS and triggers.
  if (profile?.role !== "admin") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Halaman khusus Admin</CardTitle>
          <CardDescription>Anda tidak memiliki akses ke halaman ini.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin</h1>
      <Tabs defaultValue="user">
        <TabsList>
          <TabsTrigger value="user">User</TabsTrigger>
          <TabsTrigger value="project">Project</TabsTrigger>
          <TabsTrigger value="aktivitas">Aktivitas</TabsTrigger>
          <TabsTrigger value="pengaturan">Pengaturan</TabsTrigger>
        </TabsList>
        <TabsContent value="user" className="pt-4">
          <UsersPanel />
        </TabsContent>
        <TabsContent value="project" className="pt-4">
          <ProjectsPanel />
        </TabsContent>
        <TabsContent value="aktivitas" className="pt-4">
          <ActivitiesPanel />
        </TabsContent>
        <TabsContent value="pengaturan" className="pt-4">
          <SettingsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
