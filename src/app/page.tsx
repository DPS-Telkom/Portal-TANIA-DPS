import Link from "next/link";

import { Wordmark } from "@/components/brand/wordmark";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Public HOME (XM-06): reachable without a session and reads nothing from
// the database. Content from PRD §1.
const MODULES = [
  {
    code: "TM",
    name: "Talent Management",
    question: "Who do we have?",
    text: "Profil talent, competency matrix, sertifikasi, dan riwayat penugasan dalam satu tempat.",
  },
  {
    code: "WA",
    name: "Workload Analysis",
    question: "Who is available / overloaded?",
    text: "Alokasi vs realisasi, utilisasi per orang dan squad, heatmap, serta alert beban kerja.",
  },
  {
    code: "TS",
    name: "Project Timesheet",
    question: "Where is our effort going?",
    text: "Entry jam mingguan per project dan aktivitas, approval manager, dan kepatuhan submit.",
  },
  {
    code: "PF",
    name: "Project Feasibility",
    question: "Which project should we pursue?",
    text: "Intake kandidat project, scoring berbobot 5 dimensi, resource check, dan keputusan beraudit.",
  },
  {
    code: "BC",
    name: "Budget Control",
    question: "Are we on budget?",
    text: "Plan vs commitment vs realisasi per program dan kategori dengan alert threshold.",
  },
  {
    code: "AV",
    name: "Copilot AI",
    question: "What should I look at today?",
    text: "Briefing harian proaktif dan tanya-jawab berbasis data live — read-only, sesuai hak akses Anda.",
  },
];

const PRINCIPLES = [
  {
    title: "Satu sumber kebenaran",
    text: "Data people, project, dan budget terkonsolidasi — keputusan memakai data approved dengan periode yang jelas.",
  },
  {
    title: "Aman sejak database",
    text: "Setiap baris data dilindungi Row Level Security. Anda hanya melihat data sesuai peran Anda.",
  },
  {
    title: "Keputusan beraudit",
    text: "Setiap approval, penolakan, dan keputusan tercatat lengkap: siapa, kapan, dan mengapa.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Wordmark />
          <Link href="/login" className={cn(buttonVariants({ size: "lg" }), "px-5 font-semibold")}>
            LOGIN
          </Link>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <p className="text-sm font-semibold tracking-widest text-telkom-red uppercase">
            Chapter Product &amp; Solution · Telkom Indonesia
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-6xl">TANIA</h1>
          <p className="mt-2 text-xl text-muted-foreground sm:text-2xl">
            Talent · Analytics · Insight · Action
          </p>
          <p className="mt-6 max-w-2xl text-base leading-relaxed sm:text-lg">
            Management cockpit Chapter DPS: satu platform, satu data model, satu alur keputusan
            untuk mengelola talent, workload, effort, project pipeline, dan budget — dengan
            asisten AI yang menjawab pertanyaan manajemen dalam hitungan detik, bukan hari.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login" className={cn(buttonVariants({ size: "lg" }), "px-6 font-semibold")}>
              LOGIN
            </Link>
            <Link
              href="/login?tab=daftar"
              className={cn(buttonVariants({ size: "lg", variant: "outline" }), "px-6")}
            >
              Daftar akun baru
            </Link>
          </div>
        </section>

        <section className="border-y bg-muted/40">
          <div className="mx-auto grid max-w-6xl gap-4 px-4 py-12 sm:grid-cols-3 sm:px-6">
            {PRINCIPLES.map((p) => (
              <div key={p.title}>
                <h3 className="font-semibold">{p.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{p.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-bold">Enam modul, satu alur keputusan</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Timesheet → workload → resource check → budget commitment → keputusan manajemen.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MODULES.map((m) => (
              <Card key={m.code}>
                <CardHeader>
                  <p className="text-xs font-semibold tracking-widest text-telkom-red">{m.code}</p>
                  <CardTitle>{m.name}</CardTitle>
                  <CardDescription className="italic">{m.question}</CardDescription>
                </CardHeader>
                <CardContent className="text-sm">{m.text}</CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-muted-foreground sm:px-6">
          Internal PT Telkom Indonesia (Persero) Tbk — Digital Product, Chapter Product &amp;
          Solution. Akun baru memerlukan persetujuan Admin sebelum dapat mengakses data.
        </div>
      </footer>
    </div>
  );
}
