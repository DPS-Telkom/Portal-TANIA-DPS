# TANIA — Product Requirement Document (PRD)

**Portal Digital Product & Solution** · *Talent · Analytics · Insight · Action*
**Version 3.0 — Development Ready, As-Architected** · September 2026
PT Telkom Indonesia (Persero) Tbk — Digital Product, Chapter Product & Solution (DPS)

> Versi markdown dari `TANIA_PRD_v3_0_Development_Ready.docx` (dokumen formal) **+ Addendum B (v3.1, Sep 2026)** di bagian akhir — bila bertentangan, Addendum B yang berlaku. Versi ini untuk dibaca di repo & oleh Claude Code.

## Document Control

| **Attribute**           | **Detail**                                                                                                                                                                                                                                                                                                                                            |
|-------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Version                 | 3.0 — Development Ready (As-Architected)                                                                                                                                                                                                                                                                                                              |
| Baseline                | PRD v2.0 Development Ready (struktur & elaborasi dipertahankan); Requirement Document v1.0; keputusan implementasi Agustus 2026                                                                                                                                                                                                                       |
| Perubahan utama vs v2.0 | (1) Arsitektur teknis diganti ke stack terimplementasi: Supabase + Netlify static export + Edge Function (zero-cost MVP). (2) Modul Avatar/Copilot AI masuk scope Release 1 (AV-01..AV-07). (3) Data contract diganti dari abstrak menjadi skema terimplementasi (5 migrasi). (4) Bab baru: Cost Model & Free-Tier Guardrails. Rincian: Appendix A. |
| Owner                   | Chapter Product & Solution (DPS), Digital Product                                                                                                                                                                                                                                                                                                     |
| Prepared by             | Henri Setiawan W. — Chapter Leader DPS                                                                                                                                                                                                                                                                                                                |
| Status                  | Ready for build; item berlabel Approval Gate (Section 17) belum final                                                                                                                                                                                                                                                                                 |


## 1. Product Definition

TANIA (Talent · Analytics · Insight · Action) adalah enterprise portal
Chapter Product & Solution (DPS) yang mengonsolidasikan data people,
project, dan financial menjadi decision-support platform. Enam modul
membentuk closed loop: timesheet → workload → feasibility resource check
→ budget commitment → management decision — dengan AI copilot yang
mengubah data menjadi insight proaktif.

### 1.1 Product Vision

Menjadikan TANIA management cockpit DPS: satu platform, satu data model,
satu alur keputusan untuk mengelola talent, workload, effort, project
pipeline, dan budget — dengan asisten AI yang menjawab pertanyaan
manajemen dalam hitungan detik, bukan hari.

### 1.2 Core Management Questions

| **Pertanyaan manajemen**        | **Kapabilitas TANIA**                                                        |
|---------------------------------|------------------------------------------------------------------------------|
| Who do we have?                 | Talent profile, competency matrix, certification, assignment history         |
| Who is available / overloaded?  | Allocation, capacity, utilization, alert, heatmap                            |
| Where is our effort going?      | Weekly timesheet, approval workflow, compliance                              |
| Which project should we pursue? | Feasibility intake, weighted scoring, resource check, decision gate beraudit |
| Are we on budget?               | Plan vs commitment vs realization, threshold alerts                          |
| What should I look at today?    | Copilot briefing proaktif + tanya-jawab berbasis data live                   |

### 1.3 Product Principles

- Single source of truth untuk domain yang dimiliki TANIA.

- Data-first: keputusan memakai data actual/approved dengan period &
  freshness yang terlihat.

- Workflow-first: setiap approval, rejection, dan decision punya state
  dan audit trail.

- Security by database: Row Level Security (RLS) PostgreSQL adalah
  satu-satunya pagar otorisasi; UI hanya kenyamanan.

- Zero-cost by design untuk MVP: arsitektur dipilih agar berjalan penuh
  di free tier; satu-satunya biaya adalah AI pay-per-use.

- AI grounded, never invented: copilot hanya menjawab dari data via
  tools, read-only, dengan hak akses identik user.

- No silent automation: sistem menunjukkan source, period, status, dan
  freshness data.

## 2. Problem, Objectives & Outcomes

### 2.1 Problem Statement

- Tidak ada single source of truth untuk profil, kompetensi, dan
  penugasan talent.

- Workload dan utilisasi tidak terukur; over-allocation dan idle
  capacity terlambat terdeteksi.

- Effort per project tidak tercatat sistematis; biaya delivery aktual
  tidak diketahui.

- Keputusan go/no-go project tanpa framework feasibility terstandar dan
  audit trail.

- Realisasi budget vs RKAP direkonsiliasi manual dan terlambat.

- Menjawab pertanyaan manajemen dasar membutuhkan 1–2 hari rekap manual.

### 2.2 Release 1 Outcomes & Success Metrics

| **Metric**                                        | **Baseline**     | **Target (6 bulan pasca-launch)**                  |
|---------------------------------------------------|------------------|----------------------------------------------------|
| Kepatuhan submit timesheet mingguan               | Tidak terukur    | ≥ 95% talent aktif, tepat deadline mingguan        |
| Waktu menyusun laporan workload manajemen         | Manual, 1–2 hari | Self-service, \< 5 menit                           |
| Project baru melewati feasibility gate terstandar | 0%               | 100%                                               |
| Lag visibilitas realisasi budget                  | Bulanan, manual  | Mingguan, otomatis dari data portal                |
| Visibilitas utilisasi chapter                     | Tidak ada        | Live per orang/squad                               |
| Adopsi copilot                                    | —                | ≥ 60% user aktif memakai briefing/chat tiap minggu |

## 3. Scope & Release Boundary

### 3.1 In Scope — Release 1

- Enam modul: Talent Management, Workload Analysis, Project Timesheet,
  Project Feasibility, Budget Control, Avatar/Copilot AI (perubahan vs
  v2.0 yang mengecualikan AI copilot).

- Executive dashboard dengan copilot panel menyatu (briefing proaktif
  harian + chat).

- Auth invite-only (email+password) dengan RBAC 6 role; audit log;
  export Excel.

- Fase MVP demo lokal (MacBook + Supabase cloud free tier) sebelum
  deploy Netlify.

### 3.2 Out of Scope — Release 1

- Payroll/kompensasi/HR system-of-record (TANIA konsumen data HR, bukan
  pemilik).

- Full project management (task board, sprint) — tetap di Jira/Azure
  DevOps.

- Eksekusi procurement/invoicing — tetap di SAP; TANIA mencatat posisi
  budget.

- SSO Entra ID — digeser ke production hardening (lihat Section 11 &
## Appendix A).

- AI dengan tool aksi/write (arah "Flows") — fase berikutnya, butuh
  approval eksplisit.

- Multi-chapter rollout (data model siap; UI R1 hanya DPS).

## 4. Personas, Roles & Access

Enam role disimpan di profiles.role dan di-enforce oleh RLS via helper
get_my_role() dan is_manager_of(). Matriks berikut adalah ringkasan
policy yang terimplementasi:

| **Kapabilitas**                | **talent**  | **pm**          | **manager**             | **chapter_lead**  | **executive** | **admin**         |
|--------------------------------|-------------|-----------------|-------------------------|-------------------|---------------|-------------------|
| Profil/skill/timesheet sendiri | CRUD        | CRUD            | CRUD                    | CRUD              | CRUD          | CRUD              |
| Timesheet orang lain           | —           | —               | direct report (approve) | semua             | baca semua    | semua             |
| Allocations                    | baca        | tulis           | tulis                   | tulis             | baca          | tulis             |
| Master project/activity        | baca        | project sendiri | tulis                   | tulis             | baca          | tulis             |
| Feasibility: submit / putuskan | baca / —    | submit / —      | submit / —              | submit / putuskan | baca / —      | submit / putuskan |
| Budget                         | tanpa akses | baca + entry    | baca + entry            | penuh             | baca          | penuh             |
| Audit log                      | —           | —               | —                       | baca              | —             | baca              |
| Kelola user & role             | —           | —               | —                       | —                 | —             | penuh             |

### 4.1 Authorization Rules

- Cek role di frontend (sembunyikan menu, disable tombol) adalah UX,
  bukan enforcement.

- Non-admin tidak dapat mengubah role, is_active, atau manager_id
  (trigger guard menolak).

- Kolom jejak (submitted_at, approved_by, decided_by, decided_at)
  di-stamp server-side oleh trigger — klien tidak bisa memalsukan.

- Percakapan copilot & briefing privat mutlak per user; tidak ada akses
  admin (lihat AG-06).

## 5. End-to-End Business Process

### 5.1 Weekly Timesheet Cycle

Senin–Jumat talent mencatat jam per project/activity (draft) → Jumat
submit → manager approve/reject dengan catatan (reject kembali editable)
→ jam approved masuk perhitungan utilisasi & effort. Kartu compliance
menampilkan yang belum submit; kebijakan chapter: submit wajib tiap
Jumat.

### 5.2 Feasibility-to-Budget Gate

PM submit case (deskripsi, estimasi revenue/effort/durasi, kompetensi
dibutuhkan) → skor 5 dimensi → resource check otomatis ke data alokasi &
kompetensi → chapter lead memutuskan go/no-go/hold dengan rasional wajib
(ditolak DB tanpa rasional) → case go menjadi dasar budget commitment
(entry ber-link ke case).

### 5.3 Daily Copilot Loop

Saat dashboard dibuka, copilot menyusun briefing harian sesuai role
(di-cache 1×/user/hari): kondisi utilisasi, compliance, pipeline, dan
posisi budget yang perlu perhatian — lalu user menindaklanjuti via chat
atau drill-down modul. Alert badge KPI (utilisasi \>100%, budget
≥80%/100%) memakai logika threshold biasa, bukan AI.

## 6. Functional Requirements — Development Specification

Prioritas MoSCoW (Must = R1 tidak bisa rilis tanpanya). Behavior &
acceptance diringkas satu baris; format Given/When/Then lengkap
mengikuti elaborasi PRD v2.0 yang tetap berlaku kecuali dinyatakan
berbeda di sini.

### 6.1 Talent Management (TM)

| **ID** | **Requirement**          | **Behavior & acceptance (ringkas)**                                                                                                               | **Prio** |
|--------|--------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------|----------|
| TM-01  | Talent profile           | Profil lengkap (identitas, role, grade, squad, lokasi, status, manager) auto-terbentuk saat user dibuat; semua atribut wajib tampil & searchable. | Must     |
| TM-02  | Competency matrix        | Skill level 1–5 + sertifikasi; filter by skill & level minimum mengembalikan talent yang cocok.                                                   | Must     |
| TM-03  | Assignment history       | Penugasan kini & lampau dengan periode + alokasi %; alokasi tumpang-tindih tervalidasi.                                                           | Must     |
| TM-04  | Talent search & staffing | Cari by kompetensi + ketersediaan periode; hasil bisa diranking kapasitas & proficiency.                                                          | Must     |
| TM-05  | Development plan         | IDP + target sertifikasi dengan owner, due date, status; review manager auditable.                                                                | Should   |
| TM-06  | Talent analytics         | Coverage kompetensi, gap sertifikasi, komposisi bench; filter periode/squad.                                                                      | Should   |
| TM-07  | HR data sync             | Batch import master pegawai dengan validasi & error report; tidak menimpa field terlindungi diam-diam.                                            | Should   |

### 6.2 Workload Analysis (WA)

| **ID** | **Requirement**         | **Behavior & acceptance (ringkas)**                                                                                                                   | **Prio** |
|--------|-------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------|----------|
| WA-01  | Allocation register     | Alokasi rencana per talent/project/bulan (persen 0–150, period = tanggal 1); duplikat dicegah unique key; over-allocation ditandai.                   | Must     |
| WA-02  | Utilization calculation | Utilisasi = jam approved / kapasitas × 100 dari view utilization_monthly; kapasitas 0 → N/A, bukan tak-hingga; planned vs actual tampil berdampingan. | Must     |
| WA-03  | Over/underload alerts   | Threshold configurable (default \>100% & \<60%); pelanggaran ditandai dengan waktu deteksi.                                                           | Must     |
| WA-04  | Squad/chapter heatmap   | Heatmap squad × bulan, drill-down ke orang; filter periode/squad/role.                                                                                | Must     |
| WA-05  | Capacity forecast       | Pandangan 1–3 bulan ke depan: committed allocation vs kapasitas, dengan label freshness.                                                              | Should   |
| WA-06  | What-if simulation      | Simulasi penugasan kandidat project tanpa mengubah data produksi; berlabel skenario.                                                                  | Could    |

### 6.3 Project Timesheet (TS)

| **ID** | **Requirement**         | **Behavior & acceptance (ringkas)**                                                                                                                          | **Prio** |
|--------|-------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------|----------|
| TS-01  | Weekly entry            | Grid mingguan project+activity × hari; jam 0–24; upsert pada unique key (orang, project, activity, tanggal); simpan draft, submit per minggu.                | Must     |
| TS-02  | Approval workflow       | Manager approve/reject submitted milik direct report; reject wajib catatan; rejected kembali editable; transisi state idempoten; jejak di-stamp server-side. | Must     |
| TS-03  | Master project/activity | Entry hanya bisa memilih project & activity aktif (DEL/PRE/INT/LEA/TRN).                                                                                     | Must     |
| TS-04  | Reminder & compliance   | Kartu compliance per squad (siapa belum submit); banner pengingat; notifikasi email menyusul R2.                                                             | Must     |
| TS-05  | Effort-to-cost          | Jam approved × standard rate per role → indikasi biaya project; menunggu AG-03, tanpa rate tidak ada angka ditebak.                                          | Should   |
| TS-06  | Copy last week          | Isi cepat dari minggu sebelumnya / template pribadi.                                                                                                         | Could    |

### 6.4 Project Feasibility (PF)

| **ID** | **Requirement**      | **Behavior & acceptance (ringkas)**                                                                                                       | **Prio** |
|--------|----------------------|-------------------------------------------------------------------------------------------------------------------------------------------|----------|
| PF-01  | Case intake          | Form: judul, customer, deskripsi, estimasi revenue/effort/durasi, kompetensi dibutuhkan; editable oleh submitter selama belum diputuskan. | Must     |
| PF-02  | Weighted scoring     | 5 dimensi skor 0–5, total 0–100 dihitung sistem; bobot configurable (AG-01, lihat 7.3 termasuk delta implementasi).                       | Must     |
| PF-03  | Resource check       | Cek otomatis kompetensi & sisa kapasitas periode diminta terhadap data alokasi; hasil tampil di detail case.                              | Must     |
| PF-04  | Decision gate        | Chapter lead memutuskan go/no-go/hold; rasional wajib (DB menolak tanpa rasional); decided_by/at ter-stamp; seluruh perubahan teraudit.   | Must     |
| PF-05  | Pipeline view        | Kanban Undecided/Go/Hold/No-Go dengan skor; filter & sort.                                                                                | Must     |
| PF-06  | Attachment           | Lampiran proposal/cost model ke bucket attachments (≤10 MB).                                                                              | Should   |
| PF-07  | Post-delivery review | Bandingkan aktual vs estimasi untuk kalibrasi scoring.                                                                                    | Could    |

### 6.5 Budget Control (BC)

| **ID** | **Requirement**       | **Behavior & acceptance (ringkas)**                                                                                                       | **Prio** |
|--------|-----------------------|-------------------------------------------------------------------------------------------------------------------------------------------|----------|
| BC-01  | Budget plan register  | Budget line per fiscal year/program/kategori (unique) selaras RKAP; plan_amount ≥ 0.                                                      | Must     |
| BC-02  | Commitment tracking   | Entry commitment (opsional ber-link feasibility case) terhadap line; pencipta tercatat.                                                   | Must     |
| BC-03  | Realization tracking  | Entry realization manual/import; plan vs committed vs realized vs remaining dari view budget_summary (angka tidak pernah disimpan ganda). | Must     |
| BC-04  | Threshold alerts      | Badge kuning ≥80%, merah ≥100% dari plan; configurable.                                                                                   | Must     |
| BC-05  | Budget dashboard      | Ringkasan per program/kategori + burn rate; role talent tanpa akses sama sekali.                                                          | Must     |
| BC-06  | Reallocation workflow | Transfer antar line dengan approval & audit; update saldo atomik.                                                                         | Should   |
| BC-07  | SAP import            | Import/rekonsiliasi realisasi periodik dari SAP.                                                                                          | Could    |

### 6.6 Avatar / Copilot AI (AV) — baru masuk scope R1

| **ID** | **Requirement**             | **Behavior & acceptance (ringkas)**                                                                                                                            | **Prio** |
|--------|-----------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------|----------|
| AV-01  | Chat widget & copilot panel | Panel copilot menyatu 360px di dashboard (bottom sheet di mobile) + bubble melayang di halaman lain; riwayat percakapan per user; chip pertanyaan sesuai role. | Must     |
| AV-02  | Grounded answers            | Jawaban dari data live via 6 read-tools (profil, timesheet, utilisasi, pencarian talent, pipeline, budget); dilarang mengarang angka; angka penting di-bold.   | Must     |
| AV-03  | Hak akses identik user      | Semua query tools memakai JWT penanya → RLS berlaku; user tanpa akses mendapat jawaban 'tidak punya akses', bukan data.                                        | Must     |
| AV-04  | Read-only                   | Bot tidak pernah mengubah data; untuk aksi, mengarahkan ke halaman modul.                                                                                      | Must     |
| AV-05  | Proactive briefing          | Briefing harian sesuai role saat dashboard dibuka; cache 1×/user/hari (regenerate hanya via tombol force); maksimal 5 kalimat, soroti ≤2 risiko utama.         | Must     |
| AV-06  | Cost monitoring             | Token usage tercatat per pesan & briefing; laporan biaya bulanan via SQL; cap: model Haiku, 1024 max_tokens, riwayat 12 pesan, pertanyaan ≤2.000 karakter.     | Must     |
| AV-07  | Bahasa & privasi            | Jawaban Bahasa Indonesia; percakapan privat mutlak per user (AG-06).                                                                                           | Must     |

### 6.7 Cross-Module (XM)

| **ID** | **Requirement**      | **Behavior & acceptance (ringkas)**                                                                                 | **Prio** |
|--------|----------------------|---------------------------------------------------------------------------------------------------------------------|----------|
| XM-01  | Executive dashboard  | 4 kartu KPI sesuai role + copilot panel; talent melihat ringkasan pribadi.                                          | Must     |
| XM-02  | Integrated data flow | Timesheet → utilisasi; alokasi+kompetensi → resource check; keputusan feasibility → budget commitment.              | Must     |
| XM-03  | Export               | Export Excel di tabel utama (TANIA\_\<modul\>\_\<tanggal\>.xlsx).                                                   | Must     |
| XM-04  | Notifications        | Notifikasi in-app; email/Teams menyusul R2.                                                                         | Should   |
| XM-05  | Audit log            | Semua perubahan pada tabel keputusan & uang teraudit (aktor, waktu, before/after); baca hanya chapter lead & admin. | Must     |

## 7. Business Rules & Calculation Specification

### 7.1 Capacity & Utilization

| **Rule** | **Definisi**                                                                                                                           |
|----------|----------------------------------------------------------------------------------------------------------------------------------------|
| BR-WA-01 | Kapasitas MVP = 8 jam × hari kerja Sen–Jum per bulan; libur nasional belum dikurangkan (tabel kalender libur = enhancement terjadwal). |
| BR-WA-02 | Actual hours = hanya jam timesheet status approved; draft/submitted/rejected tidak dihitung.                                           |
| BR-WA-03 | Utilisasi % = actual / kapasitas × 100; kapasitas 0 → N/A.                                                                             |
| BR-WA-04 | Planned % = alokasi terdaftar; over-allocation default \>100% (configurable).                                                          |
| BR-WA-05 | Semua metrik menampilkan periode & freshness data.                                                                                     |

### 7.2 Timesheet Validation

- Jam \> 0 dan ≤ 24 per entry (constraint DB); satu entry per kombinasi
  orang-project-activity-tanggal.

- Hanya project & activity aktif yang bisa dipilih.

- Edit oleh talent hanya pada status draft/rejected; approve/reject
  hanya pada submitted; transisi lain ditolak RLS.

- Reopen minggu approved hanya via proses berwenang (admin) — default
  R1: tidak ada reopen.

### 7.3 Feasibility Scoring — Default & Delta Implementasi

Prinsip v2.0 dipertahankan: bobot configurable tanpa perubahan kode,
menunggu AG-01. Ada dua delta yang harus direkonsiliasi terhadap
implementasi saat ini:

| **Item**        | **PRD v2.0**                                                       | **Terimplementasi (migrasi 1)**                                    | **Aksi**                                                                                                                                                           |
|-----------------|--------------------------------------------------------------------|--------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Bobot dimensi   | Strategic 25 / Financial 25 / Risk 15 / Resource 20 / Technical 15 | Strategic 25 / Financial 25 / Risk 20 / Resource 15 / Technical 15 | AG-01 menetapkan bobot final; satu migrasi lanjutan mengganti generated column menjadi kalkulasi berbasis tabel scoring_config agar bobot bisa diubah tanpa deploy |
| Nilai keputusan | GO / CONDITIONAL GO / HOLD / NO-GO                                 | go / no_go / hold                                                  | R1 memakai 3 nilai; CONDITIONAL GO dipetakan ke hold + rasional, ditinjau ulang di R2                                                                              |

### 7.4 Budget Calculation

- Committed & realized tidak pernah disimpan di budget_lines — selalu
  dihitung view budget_summary dari budget_entries (single source, tidak
  bisa out-of-sync).

- Remaining = plan − realized. Threshold badge: kuning ≥80%, merah ≥100%
  (configurable).

- Commitment idealnya ber-link ke feasibility case ber-status go.

### 7.5 Copilot Cost Rules

- Model Claude Haiku; max_tokens 1024; riwayat 12 pesan; pertanyaan
  ≤2.000 karakter; briefing di-cache 1×/user/hari.

- Menaikkan cap mana pun membutuhkan approval; token in/out dicatat per
  pesan untuk laporan biaya.

- Spend limit dipasang di console Anthropic sebagai pagar terakhir.

## 8. Data Contract — As-Implemented

Menggantikan model data abstrak v2.0 dengan skema terimplementasi (5
migrasi di supabase/migrations/). Perubahan skema hanya via migrasi
baru; setelahnya types TypeScript di-regenerate.

### 8.1 Enums

| **Enum**             | **Nilai**                                                |
|----------------------|----------------------------------------------------------|
| user_role            | executive · chapter_lead · manager · pm · talent · admin |
| project_status       | candidate · active · on_hold · completed · cancelled     |
| activity_category    | delivery · presales · internal · leave · training        |
| timesheet_status     | draft · submitted · approved · rejected                  |
| feasibility_decision | go · no_go · hold                                        |
| budget_entry_type    | commitment · realization                                 |

### 8.2 Tabel & Perilaku Kunci

| **Tabel**                                            | **Perilaku yang wajib diingat engineering**                                                                        |
|------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------|
| profiles                                             | 1:1 auth.users, auto-created trigger saat user dibuat; guard: non-admin tak bisa ubah role/is_active/manager_id    |
| skills, profile_skills                               | Matrix kompetensi; PK komposit → upsert; level 1–5                                                                 |
| projects, activities                                 | Master data; code unique                                                                                           |
| allocations                                          | Unique (orang, project, bulan); period_month wajib tanggal 1 (check); persen 0–150                                 |
| timesheets                                           | Unique (orang, project, activity, tanggal) → grid wajib upsert; jam 0–24; trigger stamp submitted_at/approved_by   |
| feasibility_cases                                    | total_score = GENERATED column (jangan ditulis); keputusan tanpa rasional ditolak trigger; decided_by/at ter-stamp |
| budget_lines, budget_entries                         | Lines = plan saja (unique year+program+kategori); angka committed/realized dihitung view                           |
| audit_log                                            | Diisi trigger pada tabel keputusan/uang; insert manual dilarang                                                    |
| chat_conversations, chat_messages, copilot_briefings | Penyimpanan Avatar; kolom token untuk biaya; privat per user; briefings unique (user, tanggal)                     |

### 8.3 Views (sumber layar, jangan agregasi ulang di client)

| **View**            | **Isi**                                                                          | **Konsumen**                   |
|---------------------|----------------------------------------------------------------------------------|--------------------------------|
| utilization_monthly | approved_hours, capacity_hours (8h×Sen-Jum), utilization_pct per orang per bulan | WA screens, dashboard, copilot |
| budget_summary      | plan, committed, realized, remaining per budget line                             | BC screens, dashboard, copilot |

Kedua view security_invoker: hasil sudah mengikuti RLS pemanggil.

### 8.4 Data Quality Rules

- Import/seed idempotent (on conflict do nothing) dan melaporkan error,
  tidak menimpa diam-diam.

- Setiap record punya created_at/updated_at (trigger).

- Free tier tanpa backup otomatis → dump mingguan via GitHub Actions
  adalah bagian dari kontrak operasional.

## 9. Workflow & State Machines

| **Domain**       | **State & transisi (terimplementasi di RLS + trigger)**                                                                     |
|------------------|-----------------------------------------------------------------------------------------------------------------------------|
| Timesheet        | draft → submitted → approved \| rejected; rejected → (edit) → submitted; tanpa reopen approved di R1                        |
| Feasibility      | editable (decision null) → decided (go/no_go/hold); rasional wajib; setelah decided hanya chapter_lead/admin yang bisa ubah |
| Budget entry     | dibuat pm+ → koreksi/hapus hanya chapter_lead/admin; reallocation workflow (BC-06) menyusul sebagai state PENDING_APPROVAL  |
| Copilot briefing | generated → cached (per user per hari) → regenerated hanya via force                                                        |

State machine v2.0 yang lebih kaya (SCORING, RESOURCE_CHECK, CLOSED;
commitment PENDING_APPROVAL) dipertahankan sebagai target R2; R1 memakai
bentuk sederhana di atas.

## 10. UX & Screen Requirements

| **Layar**    | **Isi minimum**                                                                                                                          |
|--------------|------------------------------------------------------------------------------------------------------------------------------------------|
| /login       | Email+password, tanpa signup; pesan error ramah                                                                                          |
| /dashboard   | 4 kartu KPI sesuai role dengan alert badge threshold + panel TANIA Copilot 360px (briefing, chat, chip pertanyaan, tombol refresh force) |
| /talent      | Tabel + pencarian skill & level; detail talent (skill, riwayat penugasan)                                                                |
| /timesheet   | Grid mingguan, submit; tab Persetujuan (manager) + kartu compliance                                                                      |
| /workload    | Heatmap squad × bulan, daftar alert, planned vs actual                                                                                   |
| /feasibility | Kanban 4 kolom, form intake 5 slider, detail case (resource check, keputusan + rasional)                                                 |
| /budget      | Kartu per line dengan progress bar kuning/merah, form entry (tersembunyi & tertutup untuk talent)                                        |
| /admin       | Kelola user (role, manager, aktif), master projects & activities                                                                         |

### 10.1 UX Acceptance

- UI Bahasa Indonesia; aksen merah Telkom \#E1231A; responsive
  (desktop-first, copilot jadi bottom sheet di mobile).

- Entry timesheet mingguan selesai \< 3 menit.

- Hasil kosong karena RLS ditampilkan sebagai empty state ramah, bukan
  error.

- Library berat (chart, xlsx) dynamic import; daftar selalu paginated.

## 11. API & Integration Contract

Menggantikan asumsi REST API layer v2.0: R1 tidak punya API server. Data
plane = supabase-js langsung dari browser dengan RLS sebagai kontrak
otorisasi; satu-satunya endpoint custom adalah Edge Function copilot.

### 11.1 Endpoint tania-assistant

| **Aspek**     | **Kontrak**                                                                                                                              |
|---------------|------------------------------------------------------------------------------------------------------------------------------------------|
| URL           | POST {SUPABASE_URL}/functions/v1/tania-assistant                                                                                         |
| Auth          | Header Authorization: Bearer \<access_token sesi user\>; tanpa token → 401                                                               |
| Mode chat     | Body {mode:"chat", message ≤2000 char, conversation_id?} → {conversation_id, reply}                                                      |
| Mode briefing | Body {mode:"briefing", force?} → {reply, cached}; cached=true berarti tanpa panggilan API                                                |
| Keamanan      | API key Anthropic hanya sebagai function secret; semua query DB memakai JWT pemanggil; CORS dikencangkan ke domain Netlify saat produksi |

### 11.2 Integrasi R1 vs R2

| **Sistem**                        | **Arah**                     | **Tujuan**                      | **Rilis**                                                      |
|-----------------------------------|------------------------------|---------------------------------|----------------------------------------------------------------|
| Anthropic Claude API              | Outbound (via Edge Function) | Copilot AV-01..07               | R1                                                             |
| Supabase Auth (email invite-only) | —                            | Autentikasi MVP                 | R1                                                             |
| Microsoft Entra ID (SSO)          | Inbound                      | Menggantikan email auth         | Production hardening (digeser dari R1 v1.0 — lihat Appendix A) |
| HR System                         | Inbound                      | Sync master pegawai (TM-07)     | R2                                                             |
| Jira / Azure DevOps               | Inbound                      | Referensi metadata project      | R2                                                             |
| SAP                               | Inbound                      | Import realisasi budget (BC-07) | R2                                                             |
| M365 (Outlook/Teams)              | Outbound                     | Notifikasi (XM-04)              | R2                                                             |

## 12. Non-Functional Requirements

| **Kategori** | **Requirement**                                                                                                                          |
|--------------|------------------------------------------------------------------------------------------------------------------------------------------|
| Keamanan     | RLS di semua tabel; tidak ada service_role di aplikasi; secrets terpisah per lingkungan; audit log; TLS; guard anti privilege-escalation |
| Performa     | Page load \< 2,5 dtk; query p95 \< 500 ms; briefing cached tampil instan                                                                 |
| Ketersediaan | Target 99,9% jam kerja; mitigasi auto-pause free tier via keep-alive tiap 3 hari                                                         |
| Usability    | Timesheet mingguan \< 3 menit; copilot menjawab dalam Bahasa Indonesia                                                                   |
| Privasi data | Data talent terbatas atribut kerja; akses per role; selaras tata kelola data Telkom & UU PDP; chat copilot privat mutlak                 |
| Auditability | Keputusan feasibility & perubahan budget tertelusur penuh (siapa, kapan, mengapa)                                                        |
| Skalabilitas | Data model siap multi-chapter (AG-05); jalur scale-out arsitektur di Section 13.2                                                        |
| Biaya        | Infrastruktur MVP Rp 0 (free tier); AI pay-per-use dengan cap (Section 15)                                                               |

## 13. Technical Architecture — As-Decided

Bab ini MENGGANTIKAN baseline v2.0 (NestJS, Prisma, Redis, Docker,
Kubernetes). Keputusan zero-cost MVP mengubah arsitektur menjadi:

| **Layer**   | **Keputusan**                                                                                                   |
|-------------|-----------------------------------------------------------------------------------------------------------------|
| Frontend    | Next.js (App Router) static export murni — tanpa SSR/API routes/server actions; TypeScript, Tailwind, shadcn/ui |
| Data & Auth | Supabase: PostgreSQL + RLS (pagar otorisasi tunggal), Auth invite-only, Storage (attachments), region Singapore |
| AI runtime  | Supabase Edge Function tania-assistant (Deno) → Anthropic API (Claude Haiku); satu-satunya komponen server-side |
| Hosting     | Netlify Free (kredit 300/bulan, hard-stop tanpa tagihan); deploy hanya dari main, deploy preview mati           |
| Otomasi     | GitHub Actions: keep-alive Supabase tiap 3 hari + dump backup mingguan                                          |
| Tooling     | Claude Code sebagai development agent dengan CLAUDE.md sebagai kontrak konteks                                  |
| Lingkungan  | Fase demo: localhost + Supabase cloud; produksi: Netlify + project Supabase yang sama/baru                      |

### 13.1 Rasional & Konsekuensi

- Frontend statis + RLS menghilangkan seluruh biaya & permukaan serangan
  API layer; konsekuensinya RLS wajib sempurna (di-test eksplisit,
  Section 18).

- Netlify SSR akan memakan kredit compute — karena itu static export
  adalah aturan keras, bukan preferensi.

- Kapabilitas v2.0 yang bergantung server (notifikasi terjadwal, import
  batch besar) diimplementasi via Edge Functions/pg_cron saat
  dibutuhkan.

### 13.2 Jalur Scale-Out

Baseline lama (NestJS/Kubernetes) tidak dibuang — ia menjadi opsi
scale-out enterprise bila TANIA di-rollout lintas chapter/divisi dengan
kebutuhan integrasi berat. Trigger evaluasi: \>200 user aktif, integrasi
SAP/HR dua arah, atau mandat infrastruktur on-prem Telkom. Sebelum titik
itu, upgrade cukup Supabase Pro (\$25/bln) lalu Netlify berbayar.

## 14. Security, Privacy & Audit

- RLS aktif di 12 tabel dengan ±30 policy; role anon tanpa policy apa
  pun (anonymous = nol akses).

- Helper get_my_role()/is_manager_of() SECURITY DEFINER mencegah rekursi
  policy.

- Trigger guard: non-admin tak bisa menaikkan role sendiri; kolom jejak
  di-stamp server-side.

- Avatar: API key hanya di function secret; tools read-only; query
  ber-JWT pemanggil — jailbreak prompt tidak bisa menembus RLS.

- Audit log (aktor, waktu, before/after) pada profiles, timesheets,
  feasibility, budget; baca terbatas chapter lead & admin.

- Privasi: chat & briefing privat mutlak per user (AG-06); data talent
  terbatas atribut pekerjaan (selaras UU PDP).

- Secrets terpisah: .env.local (anon key), .env seed lokal
  (service_role, gitignored), Supabase secrets (Anthropic), Netlify env,
  GitHub secrets.

## 15. Cost Model & Free-Tier Guardrails

| **Komponen**                                                | **Biaya**                                                | **Guardrail**                                                                                           |
|-------------------------------------------------------------|----------------------------------------------------------|---------------------------------------------------------------------------------------------------------|
| Supabase (DB 500MB, Auth, Storage 1GB, Edge Functions 500k) | Rp 0                                                     | Keep-alive tiap 3 hari (anti auto-pause); dump mingguan (pengganti backup); paginasi query (egress 5GB) |
| Netlify (300 kredit/bln, hard stop)                         | Rp 0                                                     | Deploy hanya main 2–3×/minggu (15 kredit/deploy); deploy preview mati; tanpa risiko tagihan             |
| GitHub (repo privat + Actions 2.000 mnt)                    | Rp 0                                                     | —                                                                                                       |
| Claude API (Haiku) — copilot                                | ±Rp 50–150/pertanyaan; estimasi chapter ±Rp 50–150rb/bln | Cap di kode (Section 7.5); cache briefing harian; token dicatat per pesan; spend limit di console       |
| Claude Code (development)                                   | Langganan Claude Pro/Max milik developer                 | Di luar biaya platform                                                                                  |

Trigger upgrade: portal jadi sistem resmi harian → Supabase Pro \$25/bln
dulu (backup harian, tanpa pause); Netlify menyusul bila kredit rutin
habis.

## 16. Data Migration & Seed

- Master seed (migrasi 3): 5 activity type, 12 skill awal.

- Demo seed: skrip seed-users.mjs (Admin API, service_role lokal)
  membuat 15+3 user demo → seed_demo.sql mengisi 4 minggu timesheet,
  alokasi, 5 feasibility case, budget dengan 1 line kuning & 1 merah —
  data yang bercerita untuk demo.

- Onboarding produksi: admin membuat akun seluruh talent (invite-only),
  set role & manager, input projects aktif & budget lines RKAP; data
  demo dibersihkan atau memakai project Supabase baru.

- Sync HR (TM-07) menyusul R2 setelah AG-02.

## 17. Approval Gates & Decisions Required

Engineering boleh membangun dengan proposed default, tetapi fitur
pengambilan keputusan produksi di-feature-flag sampai gate
ditandatangani.

| **Gate** | **Keputusan**                         | **Default pengembangan**                                                               | **Owner**              | **Blocking**          |
|----------|---------------------------------------|----------------------------------------------------------------------------------------|------------------------|-----------------------|
| AG-01    | Bobot & threshold scoring feasibility | 25/25/20/15/15 (terimplementasi); migrasi lanjutan ke scoring_config agar configurable | Chapter Lead + Mgmt    | YA untuk PF produksi  |
| AG-02    | Sumber & cadence HR master            | Batch periodik                                                                         | HR + Corporate IT      | YA untuk TM sync (R2) |
| AG-03    | Standard cost rate per role           | TS-05 menunggu rate; tanpa rate tak ada angka ditebak                                  | Finance + Mgmt         | TIDAK untuk core R1   |
| AG-04    | Granularitas budget                   | Year → Program → Kategori (terimplementasi unique key)                                 | Finance + Chapter Lead | YA untuk BC produksi  |
| AG-05    | Rollout multi-chapter                 | Data model siap; UI R1 khusus DPS                                                      | Digital Product Mgmt   | TIDAK untuk R1        |
| AG-06    | Kebijakan privasi chat copilot        | Privat mutlak per user (tanpa akses admin); audit keputusan tetap di tabel modul       | Chapter Lead + Mgmt    | YA sebelum go-live AV |

## 18. Test Strategy & Acceptance

### 18.1 Level Uji

- Unit: kalkulasi view (utilisasi, budget), helper RLS.

- Integrasi: transisi state timesheet & feasibility terhadap policy +
  trigger.

- RLS security test (wajib, otomatis bila memungkinkan): matriks role ×
  tabel — termasuk pembuktian talent 0 baris budget & tak bisa baca
  timesheet orang lain.

- E2E demo path: login → isi → submit → approve → utilisasi berubah →
  feasibility diputuskan → commitment tercatat → dashboard & copilot
  konsisten.

- Avatar security: (a) talent bertanya budget → ditolak halus; (b)
  prompt injection tidak menghasilkan data di luar RLS; (c) briefing
  kedua di hari sama → cached.

### 18.2 Definition of Done (per fitur)

- Memenuhi acceptance requirement terkait; npm run build (static export)
  hijau; RLS policy ada & teruji untuk tabel baru; types regenerate
  tanpa error; UI Bahasa Indonesia; keputusan produk tercatat di
  CLAUDE.md.

## 19. Development Plan & Backlog

| **Fase**                   | **Referensi**                        | **Isi**                                                                                                                                        |
|----------------------------|--------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------|
| Sprint demo 5 hari (lokal) | docs/TANIA_MVP_Demo_Local_MacBook.md | Fondasi → seed demo + timesheet → talent/workload/feasibility/budget → dashboard + copilot → gladi & skrip demo 10 menit                       |
| Runbook produksi 6 minggu  | docs/TANIA_StepByStep_ClaudeCode.md  | 5 sesi modul + deploy Netlify + otomasi + Avatar + UAT & go-live                                                                               |
| Backlog pasca-R1           | PRD ini                              | Should/Could items, integrasi R2 (HR, SAP, M365, Entra), scoring_config, kalender libur, reallocation workflow, arah Flows (aksi ber-approval) |

Struktur backlog: Epic = modul (prefix ID), Story = requirement ID,
commit message mereferensikan ID.

## 20. Product Analytics & Operational KPIs

| **KPI**                                   | **Sumber**                                 | **Target awal**                     |
|-------------------------------------------|--------------------------------------------|-------------------------------------|
| Timesheet compliance mingguan             | Kartu compliance / query status            | ≥95%                                |
| Waktu approve (submit → decided)          | Timestamp timesheet                        | \< 3 hari kerja                     |
| Feasibility lead time (intake → decision) | created_at vs decided_at                   | \< 10 hari kerja                    |
| Adopsi copilot mingguan                   | chat_messages & copilot_briefings per user | ≥60% user aktif                     |
| Biaya AI bulanan                          | SUM(token) × harga model                   | ≤ anggaran cap; laporan SQL bulanan |
| Konsumsi kredit Netlify & kuota Supabase  | Dashboard vendor                           | Review akhir bulan pertama          |

## 21. Governance, Change Control & Readiness

- Perubahan scope/aturan bisnis = perubahan PRD (versi baru) + entri
  Decisions di CLAUDE.md; perubahan skema = migrasi baru, tidak pernah
  mengedit migrasi ter-apply.

- Permintaan yang melanggar arsitektur (SSR, API layer, service_role di
  app, tool aksi AI) harus ditolak dengan alternatif — aturan ini
  tertanam di CLAUDE.md.

- Checklist siap-build: 5 migrasi ter-apply; 3 akun demo + admin;
  self-signup mati; Edge Function terdeploy dengan secret & spend limit;
  CLAUDE.md di root repo; approval gate berstatus jelas.

## Appendix A — Delta Summary v2.0 → v3.0

| **Area**                    | **v2.0**                                      | **v3.0 (dokumen ini)**                                                         | **Alasan**                                                                     |
|-----------------------------|-----------------------------------------------|--------------------------------------------------------------------------------|--------------------------------------------------------------------------------|
| Arsitektur                  | NestJS + Prisma + Redis + Docker + Kubernetes | Supabase + Netlify static export + Edge Function                               | Keputusan MVP zero-cost; baseline lama menjadi jalur scale-out (13.2)          |
| AI copilot                  | Out of scope                                  | In scope R1 (AV-01..07: chat + briefing + copilot panel)                       | Keputusan produk Agustus 2026; sudah terspesifikasi & sebagian terimplementasi |
| Data model                  | Abstrak (minimum common fields)               | Skema terimplementasi 5 migrasi + views + trigger                              | Development ready secara harfiah                                               |
| API                         | REST API layer + standards                    | supabase-js + RLS sebagai kontrak; 1 endpoint Edge Function                    | Konsekuensi arsitektur statis                                                  |
| Bobot scoring               | 25/25/15/20/15, configurable                  | 25/25/20/15/15 terimplementasi; konvergensi via AG-01 + migrasi scoring_config | Rekonsiliasi jujur — angka final milik management                              |
| Nilai keputusan feasibility | 4 nilai (termasuk CONDITIONAL GO)             | 3 nilai; conditional = hold + rasional                                         | Penyederhanaan R1; ditinjau R2                                                 |
| SSO Entra ID                | R1                                            | Production hardening (MVP: email invite-only)                                  | Dependensi Corporate IT tidak boleh memblokir MVP                              |
| Biaya                       | Tidak dibahas                                 | Bab 15 lengkap dengan guardrails                                               | Konstrain utama proyek                                                         |

Semua elaborasi v2.0 yang tidak disebut di tabel ini (acceptance
criteria Given/When/Then, aturan validasi, struktur backlog, prinsip
governance) tetap berlaku dan diadopsi v3.0.

## Addendum B — Perubahan September 2026 (berlaku sebagai PRD v3.1)

Perubahan keputusan berikut MENGGANTIKAN bagian terkait di badan dokumen v3.0. Bila bertentangan, Addendum B yang berlaku.

| # | Area | v3.0 | v3.1 (berlaku) | Dampak implementasi |
|---|------|------|----------------|---------------------|
| B-1 | Hosting production | Netlify Free (kredit 300/bln, disiplin deploy) | **Vercel Hobby** — GitHub auto-deploy tiap push ke `main`, tanpa jatah deploy; syarat Hobby non-commercial → rencanakan Vercel Pro saat TANIA resmi | §13 & §15 baris Netlify diganti Vercel; seluruh aturan disiplin kredit deploy dihapus; arsitektur tetap static export (fitur server Vercel dilarang) |
| B-2 | Autentikasi & onboarding | Email invite-only (self-signup mati) | **Registrasi terbuka + pola Guest**: pendaftar baru otomatis role `guest` tanpa akses data, diarahkan ke `/menunggu-akses` sampai Admin memberi role di `/admin` | Migrasi ke-6: tambah `guest` ke enum user_role (migrasi terpisah — enum ADD VALUE harus commit dulu), default role → guest, perketat semua policy SELECT `using (true)` agar tidak bocor ke guest; §4 & §11.2 menyesuaikan |
| B-3 | Role set (user-facing) | 6 role tanpa guest | **Admin, Executive, Chapter Leader, Manager, Talent, Guest**; `pm` tetap ada internal untuk modul Feasibility (varian Manager) | Matriks §4 bertambah kolom guest: tanpa akses apa pun kecuali baris profil sendiri |
| B-4 | Halaman publik | Tidak ada (semua di balik login) | **HOME publik di `/`**: penjelasan TANIA (visi & 6 modul dari §1) + tombol LOGIN (tab Masuk/Daftar) | Requirement baru XM-06: landing page publik; route publik = `/`, `/login`, `/menunggu-akses` |

Requirement tambahan:

| ID | Requirement | Behavior & acceptance | Prio |
|----|-------------|----------------------|------|
| XM-06 | Public home page | Route `/` dapat diakses tanpa sesi; berisi penjelasan TANIA + CTA LOGIN; tidak menampilkan data apa pun dari database | Must |
| XM-07 | Guest onboarding | Signup → role guest → `/menunggu-akses`; guest tidak dapat membaca data modul (diuji RLS); Admin mengubah role dari `/admin`; opsional: batasi pendaftaran ke domain email @telkom.co.id (Approval Gate AG-07) | Must |

Approval Gate baru — **AG-07**: kebijakan pendaftaran (terbuka vs terbatas domain @telkom.co.id) · Owner: Chapter Lead + Management · Blocking: TIDAK untuk build, YA sebelum diumumkan publik.

## Addendum C — Talent Profile (berlaku sebagai PRD v3.2, 28 Sep 2026)

Menambahkan scope **TANIA Talent Profile** sesuai `docs/prd-talent.md` (TP-001..TP-016). Bila bertentangan dengan badan PRD atau Addendum B, **Addendum C berlaku untuk scope talent**; aturan arsitektur (static export, RLS sebagai satu-satunya batas otorisasi, satu Edge Function LLM) tetap berlaku penuh.

| # | Area | Sebelumnya | v3.2 (berlaku) | Dampak |
|---|------|-----------|----------------|--------|
| C-1 | Scope data talent | §3.2: TANIA bukan system-of-record HR; data talent terbatas atribut kerja | TANIA menyimpan **profil talent 360°**: riwayat karier, capability/competency/expertise (current + target), sertifikasi, project experience, evidence, **performance history** (input HR, read-only bagi talent), development plan. Tetap bukan payroll/kompensasi. | Migrasi 10–12; tab Talent Profile |
| C-2 | Role | 7 role | Role baru **`hr` (HR / Talent Management)**: kelola atribut kerja, riwayat karier, performance, verifikasi sertifikasi; tanpa akses budget/admin user | Enum `user_role` + RLS |
| C-3 | Hierarki manager | Hanya bawahan langsung | Akses Talent Profile mengikuti **reporting line (langsung & tidak langsung)** | Helper `is_in_reporting_line()` |
| C-4 | AI | Copilot chat & briefing | **Talent AI** (Ask TANIA, AI Insight, Recommended Journey) dengan respons terstruktur **FACT / INFERENCE / RECOMMENDATION / UNKNOWN**; konteks hanya dari `talent_context()` (RLS pemanggil); AI tidak pernah menulis data HR/performance | Mode `talent` di `tania-assistant` |
| C-5 | Performance | Tidak ada | Input manual HR (sumber `official`/`manual`), read-only bagi talent/manager, teraudit; siap diganti import resmi (AG-08) | `performance_reviews/scores` |

Belum termasuk (fase berikutnya): Manager Talent 360 dashboard (TP-015), talent search bahasa natural (TP-014), integrasi HRIS/LMS/performance resmi, analytics event (belum ada infrastruktur analytics).

Approval Gate baru:
- **AG-08** — Sumber resmi performance & integrasi HRIS · Owner: HR + Corporate IT · Blocking: YA sebelum data performance produksi dipakai untuk keputusan.
- **AG-09** — Kebijakan privasi Talent Profile (siapa melihat performance & penilaian; retensi) selaras UU PDP · Owner: HR + Legal · Blocking: YA sebelum go-live Talent Profile.
