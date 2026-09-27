#!/usr/bin/env node
// TANIA — Talent Profile DEMO data (prd-talent §33). LOCAL USE ONLY.
//
// Creates three clearly-labelled demo accounts (Talent A/B/C, is_demo = true,
// emails @demo.tania.local) with career history, assessments, certifications,
// projects, evidence, performance history and a development plan.
// Nothing here represents a real employee.
//
// Needs (never commit them):
//   .env.local  NEXT_PUBLIC_SUPABASE_URL
//   .env        SUPABASE_SERVICE_ROLE_KEY   (seed scripts only — CLAUDE.md §2.4)
//   env         DEMO_PASSWORD               (password for the three demo logins)
//
// Usage:
//   DEMO_PASSWORD='…' node --env-file=.env.local --env-file=.env scripts/seed-talent-demo.mjs
//   node --env-file=.env.local --env-file=.env scripts/seed-talent-demo.mjs --clean

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DOMAIN = "@demo.tania.local";

if (!url || !serviceKey) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL (.env.local) and SUPABASE_SERVICE_ROLE_KEY (.env).");
  process.exit(1);
}

const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

async function demoUsers() {
  const found = [];
  for (let page = 1; page < 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    found.push(...data.users.filter((u) => u.email?.endsWith(DOMAIN)));
    if (data.users.length < 200) break;
  }
  return found;
}

async function must(promise, what) {
  const { data, error } = await promise;
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
}

if (process.argv.includes("--clean")) {
  const users = await demoUsers();
  for (const u of users) await must(db.auth.admin.deleteUser(u.id), `delete ${u.email}`);
  console.log(`Removed ${users.length} demo account(s) and their talent data (cascade).`);
  process.exit(0);
}

const password = process.env.DEMO_PASSWORD;
if (!password || password.length < 12) {
  console.error("Set DEMO_PASSWORD (min. 12 characters) for the demo logins.");
  process.exit(1);
}

const PEOPLE = [
  { key: "a", name: "Talent A (DEMO)", role: "manager", position: "Product Lead (DEMO)", level: "Lead", joined: "2014-02-03" },
  { key: "b", name: "Talent B (DEMO)", role: "talent", position: "Senior Product Specialist (DEMO)", level: "Senior", joined: "2018-07-16" },
  { key: "c", name: "Talent C (DEMO)", role: "talent", position: "Solution Analyst (DEMO)", level: "Specialist", joined: "2021-09-01" },
];

const existing = await demoUsers();
if (existing.length) {
  console.log(`Demo accounts already exist (${existing.length}). Run with --clean first to re-seed.`);
  process.exit(0);
}

const skills = await must(db.from("skills").select("id, name, kind"), "skills");
const skill = (name, kind) => {
  const s = skills.find((x) => x.name === name && x.kind === kind);
  if (!s) throw new Error(`skill not found: ${name} (${kind})`);
  return s.id;
};

const ids = {};
for (const p of PEOPLE) {
  const created = await must(
    db.auth.admin.createUser({
      email: `talent-${p.key}${DOMAIN}`,
      password,
      email_confirm: true,
      user_metadata: { full_name: p.name },
    }),
    `create ${p.name}`,
  );
  ids[p.key] = created.user.id;
}

// Profiles (maintenance context: the service role has no auth.uid()).
for (const p of PEOPLE) {
  await must(
    db
      .from("profiles")
      .update({
        role: p.role,
        is_demo: true,
        full_name: p.name,
        employee_id: `DEMO-${p.key.toUpperCase()}001`,
        position_title: p.position,
        organization: "Chapter DPS (DEMO)",
        career_level: p.level,
        join_date: p.joined,
        squad: "Squad Demo",
        grade: p.key === "a" ? "G8" : p.key === "b" ? "G7" : "G6",
        location: "Jakarta",
        manager_id: p.key === "a" ? null : ids.a,
      })
      .eq("id", ids[p.key]),
    `profile ${p.name}`,
  );
}

// Career history
const positions = {
  a: [
    ["Business Analyst", "Digital Business", "2014-02-03", "2017-12-31"],
    ["Product Manager", "Digital Product", "2018-01-01", "2022-06-30"],
    ["Product Lead (DEMO)", "Chapter DPS", "2022-07-01", null],
  ],
  b: [
    ["Product Specialist", "Chapter DPS", "2018-07-16", "2022-12-31"],
    ["Senior Product Specialist (DEMO)", "Chapter DPS", "2023-01-01", null],
  ],
  c: [["Solution Analyst (DEMO)", "Chapter DPS", "2021-09-01", null]],
};
for (const [k, list] of Object.entries(positions)) {
  await must(
    db.from("talent_positions").insert(
      list.map(([position_title, organization, start_date, end_date]) => ({
        profile_id: ids[k],
        position_title,
        organization,
        start_date,
        end_date,
        responsibilities: `Contoh tanggung jawab untuk ${position_title} (data demo).`,
        achievements: "Contoh pencapaian (data demo).",
      })),
    ),
    `positions ${k}`,
  );
}

// Assessments: [name, kind, level, target, score, source]
const assessments = {
  a: [
    ["Digital Product", "capability", 5, 5, 90, "hr"],
    ["AI / GenAI", "capability", 3, 5, 62, "manager"],
    ["Leadership", "capability", 5, 5, 93, "hr"],
    ["Product Management", "competency", 5, 5, null, "hr"],
    ["AI / Machine Learning", "competency", 3, 4, null, "self"],
    ["AI & GenAI", "expertise", 3, 5, null, "self"],
    ["Digital Strategy", "expertise", 4, 5, null, "manager"],
  ],
  b: [
    ["Digital Product", "capability", 4, 5, 78, "manager"],
    ["Business", "capability", 4, 4, 80, "manager"],
    ["Product Management", "competency", 4, 5, null, "manager"],
    ["Data Analytics", "competency", 3, 4, null, "self"],
    ["Data & Analytics", "expertise", 3, 4, null, "self"],
  ],
  c: [
    ["Solution Architecture", "capability", 3, 4, 64, "manager"],
    ["Cloud Infrastructure", "competency", 3, 4, null, "self"],
    ["Solution Architecture", "competency", 3, 4, null, "manager"],
    ["Cloud", "expertise", 2, 4, null, "self"],
  ],
};
for (const [k, list] of Object.entries(assessments)) {
  await must(
    db.from("profile_skills").insert(
      list.map(([name, kind, level, target_level, score, source]) => ({
        profile_id: ids[k],
        skill_id: skill(name, kind),
        level,
        target_level,
        score,
        source,
        assessed_at: new Date().toISOString(),
        confidence: source === "self" ? "low" : "medium",
        years_experience: kind === "expertise" ? level + 1 : null,
        last_used: kind === "expertise" ? "2026-08-31" : null,
      })),
    ),
    `assessments ${k}`,
  );
}

// Certifications (mix of statuses)
await must(
  db.from("talent_certifications").insert([
    { profile_id: ids.a, name: "Contoh Product Management Certificate (DEMO)", issuer: "Demo Institute", issued_on: "2023-05-10", expires_on: "2026-11-15", verification: "verified", skill_id: skill("Product Management", "competency") },
    { profile_id: ids.a, name: "Contoh GenAI Foundations (DEMO)", issuer: "Demo Academy", issued_on: "2025-02-01", expires_on: null, verification: "pending", skill_id: skill("AI & GenAI", "expertise") },
    { profile_id: ids.b, name: "Contoh Data Analytics Certificate (DEMO)", issuer: "Demo Institute", issued_on: "2022-03-01", expires_on: "2025-03-01", verification: "verified", skill_id: skill("Data Analytics", "competency") },
    { profile_id: ids.c, name: "Contoh Cloud Associate (DEMO)", issuer: "Demo Cloud", issued_on: "2024-06-01", expires_on: "2027-06-01", verification: "verified", skill_id: skill("Cloud", "expertise") },
  ]),
  "certifications",
);

// Projects + evidence
const projectRows = await must(
  db
    .from("talent_projects")
    .insert([
      { profile_id: ids.a, name: "Contoh Platform Produk Digital (DEMO)", role: "Product Lead", organization: "Customer Demo", domain: "Digital Product", start_date: "2023-01-01", end_date: "2024-06-30", responsibilities: "Memimpin discovery & roadmap (demo).", outcomes: "Contoh outcome (demo)." },
      { profile_id: ids.a, name: "Contoh Pilot Asisten GenAI (DEMO)", role: "Product Owner", organization: "Internal", domain: "AI", start_date: "2025-03-01", end_date: "2025-09-30", responsibilities: "Pilot chatbot internal (demo).", outcomes: "Pilot selesai, belum produksi (demo)." },
      { profile_id: ids.b, name: "Contoh Dashboard Analitik (DEMO)", role: "Product Specialist", organization: "Customer Demo", domain: "Data", start_date: "2024-01-01", end_date: "2024-12-31" },
      { profile_id: ids.c, name: "Contoh Migrasi Cloud (DEMO)", role: "Solution Analyst", organization: "Customer Demo", domain: "Cloud", start_date: "2025-01-01", end_date: null },
    ])
    .select("id, profile_id, name"),
  "projects",
);
const proj = (name) => projectRows.find((p) => p.name === name);
await must(
  db.from("talent_evidence").insert([
    { profile_id: ids.a, skill_id: skill("Digital Product", "capability"), evidence_type: "project", title: "Contoh Platform Produk Digital (DEMO)", talent_project_id: proj("Contoh Platform Produk Digital (DEMO)").id, verified: true, evidence_date: "2024-06-30" },
    { profile_id: ids.a, skill_id: skill("AI / GenAI", "capability"), evidence_type: "project", title: "Contoh Pilot Asisten GenAI (DEMO)", talent_project_id: proj("Contoh Pilot Asisten GenAI (DEMO)").id, verified: false, evidence_date: "2025-09-30" },
    { profile_id: ids.a, skill_id: skill("AI / GenAI", "capability"), evidence_type: "training", title: "Contoh pelatihan GenAI dasar (DEMO)", verified: false, evidence_date: "2025-01-20" },
    { profile_id: ids.b, skill_id: skill("Data Analytics", "competency"), evidence_type: "project", title: "Contoh Dashboard Analitik (DEMO)", talent_project_id: proj("Contoh Dashboard Analitik (DEMO)").id, verified: true, evidence_date: "2024-12-31" },
    { profile_id: ids.c, skill_id: skill("Cloud", "expertise"), evidence_type: "project", title: "Contoh Migrasi Cloud (DEMO)", talent_project_id: proj("Contoh Migrasi Cloud (DEMO)").id, verified: false, evidence_date: "2025-06-30" },
  ]),
  "evidence",
);

// Performance history (demo, labelled manual)
const perf = { a: [[2023, 79], [2024, 81], [2025, 84]], b: [[2024, 86], [2025, 88]], c: [[2025, 77]] };
const DIMS = ["Business Impact", "Customer Impact", "Innovation", "Leadership", "Collaboration", "Execution"];
for (const [k, years] of Object.entries(perf)) {
  for (const [year, overall] of years) {
    const review = await must(
      db
        .from("performance_reviews")
        .insert({ profile_id: ids[k], period_year: year, overall_score: overall, source: "manual", summary: "Data demo — bukan hasil penilaian resmi." })
        .select("id")
        .single(),
      `performance ${k} ${year}`,
    );
    await must(
      db.from("performance_scores").insert(DIMS.map((dimension, i) => ({ review_id: review.id, dimension, score: Math.min(100, overall + ((i * 7) % 11) - 5) }))),
      `scores ${k} ${year}`,
    );
  }
}

// Development plan for Talent A
const plan = await must(
  db
    .from("development_plans")
    .insert({ profile_id: ids.a, title: "Contoh journey AI Product Leadership (DEMO)", objective: "Menutup gap AI / GenAI (demo)", target_role: "AI Product Lead", start_date: "2026-09-01", due_date: "2027-02-28", origin: "manual", status: "active" })
    .select("id")
    .single(),
  "plan",
);
await must(
  db.from("development_activities").insert([
    { plan_id: plan.id, title: "AI Product Management course", activity_type: "learning", month_index: 1, status: "completed", sort_order: 0 },
    { plan_id: plan.id, title: "Agentic AI training", activity_type: "learning", month_index: 2, status: "in_progress", sort_order: 1 },
    { plan_id: plan.id, title: "AI Governance", activity_type: "learning", month_index: 3, sort_order: 2 },
    { plan_id: plan.id, title: "Lead one AI agent project", activity_type: "project", month_index: 4, sort_order: 3 },
    { plan_id: plan.id, title: "Mentoring dengan expert AI", activity_type: "mentoring", month_index: 5, sort_order: 4 },
    { plan_id: plan.id, title: "Competency reassessment", activity_type: "assessment", month_index: 6, sort_order: 5 },
  ]),
  "activities",
);

console.log("Seeded 3 DEMO talents: talent-a/b/c" + DOMAIN + " (password = DEMO_PASSWORD).");
console.log("Talent A is the manager of B and C. Remove everything with --clean.");
