# PRD — TANIA Talent Profile

**Product:** TANIA — Talent Intelligence & AI Assistant  
**Feature:** Talent Profile  
**Version:** v1.0  
**Status:** Proposed  
**Target:** Q3–Q4 2026  
**Platform:** TANIA Portal  
**Primary Users:** Talent, Line Manager, Chapter Leader, HR/Talent Management, Authorized Management

---

## 1. Executive Summary

**Talent Profile** adalah feature pada Portal TANIA yang menyediakan **360° digital profile setiap talent**, mencakup:

- Talent identity & current position
- Career/talent journey
- Capability
- Competency
- Expertise
- Certification
- Work/project experience
- Performance history
- Competency gap
- Development needs
- Recommended next journey
- AI-powered Talent Copilot

Feature ini mengubah TANIA dari sekadar platform monitoring menjadi:

> **TANIA — AI-Powered Talent Intelligence & Development Platform**

Konsep utama:

```text
Talent Data
     ↓
Talent Profile
     ↓
Capability & Experience
     ↓
Performance History
     ↓
Competency Gap
     ↓
AI Talent Analysis
     ↓
Recommended Journey
     ↓
Development Action
     ↓
Progress & Reassessment
```

---

## 2. Problem Statement

Data talent biasanya tersebar pada beberapa sumber:

```text
HR / HRIS
   +
Performance Management
   +
Learning Management
   +
Certification
   +
Project Experience
   +
Manager Assessment
   +
Self Assessment
```

Akibatnya, talent dan manager sulit mendapatkan satu pandangan terpadu mengenai:

1. Siapa talent tersebut?
2. Apa capability dan expertise-nya?
3. Project apa yang pernah dikerjakan?
4. Apa kekuatan utamanya?
5. Apa competency gap-nya?
6. Bagaimana performance trajectory-nya?
7. Capability apa yang perlu ditingkatkan?
8. Journey berikutnya yang relevan?
9. Evidence apa yang mendukung assessment tersebut?

TANIA Talent Profile menyatukan informasi tersebut menjadi **single talent intelligence view**.

---

## 3. Product Objective

### Primary Objective

Membangun **single source of talent intelligence** di dalam TANIA yang dapat digunakan untuk:

- Talent self-development
- Manager coaching
- Capability development
- Career development
- Project staffing
- Talent mobility
- Succession planning
- Performance improvement

### Success Definition

Talent dapat membuka TANIA dan dalam <2 menit memahami:

> **Where am I → What can I do → What is my gap → What should I improve → Where should my journey go next.**

---

## 4. Product Vision

```text
                    TANIA
                      │
                      ▼
              TALENT PROFILE
                      │
       ┌──────────────┼──────────────┐
       ▼              ▼              ▼
    CAPABILITY     EXPERIENCE     PERFORMANCE
       │              │              │
       └──────────────┼──────────────┘
                      ▼
               TALENT ANALYTICS
                      │
                      ▼
                GAP ANALYSIS
                      │
                      ▼
             JOURNEY RECOMMENDATION
                      │
                      ▼
              DEVELOPMENT ACTION
                      │
                      ▼
                 RE-ASSESSMENT
```

---

## 5. Target Users

| User | Primary Need |
|---|---|
| Talent | Memahami profile, gap dan development journey |
| Line Manager | Coaching dan development planning |
| Chapter Leader | Capability management chapter |
| Talent Management/HR | Talent mapping dan workforce development |
| Management | Talent intelligence dan strategic capability |
| TANIA AI | Personalized talent assistance |

---

## 6. Feature Scope

### 6.1 Talent Overview

Halaman pertama menampilkan ringkasan talent:

```text
┌────────────────────────────────────────────────────┐
│ TALENT PROFILE                                     │
│                                                    │
│ [PHOTO]  Talent Name                               │
│          Current Position                          │
│          Organization                              │
│                                                    │
│ Experience       X Years                           │
│ Career Level     Leader                            │
│                                                    │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐       │
│ │Capability│ │Expertise│ │Certif. │ │Performance│  │
│ │   XX%  │ │   XX%  │ │   XX%  │ │   XX%  │       │
│ └────────┘ └────────┘ └────────┘ └────────┘       │
│                                                    │
│ AI INSIGHT                                         │
│ Strongest capability: [Capability]                │
│ Development focus: [Development Area]             │
└────────────────────────────────────────────────────┘
```

Requirements:

- Display photo
- Name
- Employee ID
- Organization
- Current position
- Career level
- Manager
- Experience
- Join date
- Talent status
- Summary capability
- Summary performance

---

## 7. Career & Talent Journey

Menampilkan perjalanan karier talent secara timeline.

```text
2008        2013        2018        2023        2026
 │           │           │           │           │
 ▼           ▼           ▼           ▼           ▼
Specialist → Manager → Digital → Strategic → Chapter
                                              Leader
```

Setiap career node mempunyai:

- Position
- Organization
- Duration
- Responsibility
- Major projects
- Key achievements
- Capability acquired
- Certification
- Performance

### Acceptance Criteria

User dapat:

- melihat seluruh career history;
- membuka detail setiap position;
- melihat project pada periode tersebut;
- melihat capability yang diperoleh.

---

## 8. Capability Profile

Capability dikelompokkan berdasarkan domain.

Contoh:

```text
DIGITAL PRODUCT
█████████░ 90%

AI / GENAI
███████░░░ 74%

SOLUTION ARCHITECTURE
████████░░ 82%

BUSINESS
█████████░ 89%

LEADERSHIP
█████████░ 93%
```

Setiap capability mempunyai:

```text
Capability
├── Current Level
├── Target Level
├── Assessment
├── Evidence
├── Last Updated
├── Experience
└── Development Need
```

---

## 9. Competency Profile

Capability lebih bersifat domain kemampuan, sedangkan competency menunjukkan kemampuan yang dapat diukur berdasarkan framework organisasi.

Contoh:

| Competency | Current | Target |
|---|---|---|
| Product Management | Advanced | Expert |
| AI Product Management | Intermediate | Expert |
| Solution Design | Advanced | Expert |
| Strategic Thinking | Expert | Expert |
| Leadership | Expert | Expert |
| Commercial Acumen | Advanced | Expert |

Level configurable:

```text
1 — Foundation
2 — Beginner
3 — Intermediate
4 — Advanced
5 — Expert
```

Framework level harus configurable sehingga dapat mengikuti competency framework organisasi.

---

## 10. Expertise

Menampilkan bidang expertise talent.

```text
AI & GenAI                    Expert
Digital Product               Expert
Digital Strategy              Expert
Enterprise Architecture       Advanced
Business Transformation       Expert
Cloud                         Intermediate
Data & Analytics              Advanced
```

Setiap expertise memiliki evidence:

- Project
- Role
- Certification
- Assessment
- Publication
- Training
- Manager validation

---

## 11. Certification

```text
CERTIFICATIONS

┌──────────────────────────────────────┐
│ Certification Name                  │
│ Issuer                              │
│ Date Obtained                       │
│ Expiry Date                         │
│ Status                              │
│ Certificate                         │
└──────────────────────────────────────┘
```

Status:

```text
ACTIVE
EXPIRING
EXPIRED
PENDING VERIFICATION
```

TANIA dapat memberikan reminder certification expiry.

---

## 12. Experience & Project

Talent dapat melihat seluruh project experience.

```text
PROJECT EXPERIENCE

Project
[TANIA / Project Name]

Role
[Role]

Period
[Period]

Domain
[Domain]

Capabilities Used
• Product Management
• AI Strategy
• Business Case
• Solution Design

Outcome
[Project Outcome]
```

### Project Evidence

Project dapat menjadi evidence untuk capability:

```text
PROJECT
   ↓
ROLE
   ↓
RESPONSIBILITY
   ↓
CAPABILITY
   ↓
EVIDENCE
```

---

## 13. Performance History

Menampilkan historical performance.

```text
PERFORMANCE HISTORY

2026    █████████░ 88%
2025    ████████░░ 84%
2024    ████████░░ 81%
2023    ███████░░░ 79%
```

Detail:

```text
2026 Performance

Business Impact       92
Customer Impact       89
Innovation            94
Leadership            91
Collaboration         86
Execution             84
```

Performance history harus **read-only** bagi talent jika berasal dari official performance system.

---

## 14. Competency Gap Analysis

Feature utama:

```text
COMPETENCY GAP

                         Current Target Gap

AI Product Management      74      90    -16
Agentic AI                 61      85    -24
Data Product               68      85    -17
Architecture               82      90     -8
Leadership                 93      95     -2
Commercial                 84      90     -6
```

TANIA memberikan:

### Gap Explanation

```text
WHY?

Agentic AI
Current: 61%

Evidence:
• Limited formal training
• Limited production project
• Basic knowledge demonstrated

Recommended:
• Agentic AI training
• Lead one AI agent project
• Expert mentoring
```

---

## 15. Recommended Talent Journey

TANIA menghasilkan rekomendasi development journey berdasarkan:

```text
Current Role
       +
Target Role
       +
Capability
       +
Competency
       +
Experience
       +
Performance
       +
Gap
       +
Business Requirement
       ↓
AI Talent Journey Engine
```

Output:

```text
RECOMMENDED JOURNEY

Current
Chapter Leader DPS

        ↓

AI Product Leadership
        ↓
Agentic AI
        ↓
AI Governance
        ↓
AI Product Delivery
        ↓
AI Product Scaling

Target Capability
AI-Native Product Leader
```

Journey mempunyai:

- Objective
- Duration
- Required capability
- Learning
- Certification
- Project assignment
- Mentoring
- Milestone
- Assessment
- Completion status

---

## 16. Talent Development Plan

Recommended Journey dapat dikonversi menjadi development plan.

```text
DEVELOPMENT PLAN — 6 MONTHS

Month 1
☐ AI Product Management

Month 2
☐ Agentic AI Training

Month 3
☐ AI Governance

Month 4
☐ AI Project Assignment

Month 5
☐ Mentoring

Month 6
☐ Competency Reassessment
```

Progress:

```text
████████████░░░░ 72%
```

---

## 17. AI Talent Copilot

Tambahkan CTA:

> **Ask TANIA**

Contoh pertanyaan:

- "Apa capability yang paling perlu saya tingkatkan?"
- "Apa competency gap saya?"
- "Project apa yang cocok dengan profile saya?"
- "Bagaimana journey saya menuju AI Product Leader?"
- "Certification apa yang relevan?"
- "Apa yang berubah dari performance saya dibanding tahun lalu?"

AI harus menyertakan evidence.

---

## 18. Evidence-Based AI

AI tidak boleh memperlakukan inference sebagai fakta.

Setiap informasi memiliki classification:

```text
FACT
Data berasal dari sumber resmi.

INFERENCE
Kesimpulan AI berdasarkan evidence.

RECOMMENDATION
Saran development dari AI.

UNKNOWN
Data belum tersedia.
```

Contoh:

```text
FACT
Talent memiliki pengalaman 3 tahun
pada digital product.

INFERENCE
Talent menunjukkan strong product
management exposure.

RECOMMENDATION
Pertimbangkan development pada
AI Product Management.

UNKNOWN
Belum tersedia evidence formal
untuk Agentic AI production experience.
```

---

## 19. Talent 360 Dashboard

Manager mendapatkan dashboard tambahan.

```text
TEAM TALENT

                  Capability   Performance

Talent A              91%          89%
Talent B              82%          92%
Talent C              74%          81%
Talent D              88%          87%
```

Manager dapat melihat:

- Capability distribution
- Competency gaps
- Certification status
- Performance trend
- Critical capability
- Development progress
- Project experience

Akses manager harus mengikuti organizational hierarchy dan authorization.

---

## 20. Talent Search

Tambahkan global talent search.

Contoh query:

> "Cari talent yang memiliki expertise AI, Product Management dan pernah mengerjakan enterprise project."

Output:

```text
MATCHING TALENTS

1. Talent A
   AI              Expert
   Product         Advanced
   Enterprise      Expert

2. Talent B
   AI              Advanced
   Product         Expert
   Enterprise      Advanced
```

Talent search dapat menjadi dasar **project staffing**, bukan otomatis menetapkan penugasan.

---

## 21. Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| TP-001 | View talent profile | P0 |
| TP-002 | Career journey | P0 |
| TP-003 | Capability profile | P0 |
| TP-004 | Competency profile | P0 |
| TP-005 | Expertise | P0 |
| TP-006 | Certification | P1 |
| TP-007 | Project experience | P0 |
| TP-008 | Performance history | P0 |
| TP-009 | Competency gap | P0 |
| TP-010 | Recommended journey | P0 |
| TP-011 | Development plan | P1 |
| TP-012 | AI Talent Copilot | P0 |
| TP-013 | Evidence tracking | P0 |
| TP-014 | Talent search | P1 |
| TP-015 | Manager dashboard | P1 |
| TP-016 | Audit trail | P0 |

---

## 22. Non-Functional Requirements

### Security

- RBAC
- Row Level Security
- Data encryption
- Audit trail
- Sensitive HR data protection
- Manager scope restriction

### Performance

Target:

- Profile load < 2 sec
- Search < 2 sec
- AI initial response < 5 sec
- Dashboard < 3 sec

### Reliability

- 99.9% application availability
- No loss of performance records
- Versioned assessment history

---

## 23. Role-Based Access Control

```text
                 TALENT
                   │
          Own Profile Only
                   │
                   ▼
              ┌─────────┐
              │  TANIA  │
              └─────────┘
                   ▲
                   │
            Manager Scope
                   │
                   ▼
               MANAGER

                   │
                   ▼
             CHAPTER LEADER

                   │
                   ▼
          TALENT MANAGEMENT / HR

                   │
                   ▼
              MANAGEMENT
```

| Data | Talent | Manager | HR | Management |
|---|---:|---:|---:|---:|
| Own profile | RW | R | R | R |
| Career | R | R | RW | R |
| Capability | RW | R/W | RW | R |
| Certification | RW | R | RW | R |
| Project | RW | R | R | R |
| Performance | R | R | RW | R |
| Competency gap | R | RW | RW | R |
| Journey | RW | RW | RW | R |
| Personal data | Own | Limited | RW | Limited |

---

## 24. Data Architecture

```text
                     TANIA PORTAL
                           │
                           ▼
                  TALENT PROFILE UI
                           │
                    API / Service
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
      Talent DB        AI Engine       Evidence Store
          │                │                │
          ▼                ▼                ▼
       Profile        Gap Analysis       Projects
       Capability     Journey AI         Certifications
       Competency     Copilot            Assessments
       Performance                       Documents
```

---

## 25. Database Schema

Core tables:

```text
talents
talent_positions
talent_experiences
talent_projects
talent_capabilities
talent_competencies
talent_expertise
talent_certifications
performance_reviews
talent_assessments
competency_gaps
journey_recommendations
development_plans
development_activities
talent_evidence
talent_audit_logs
```

Relationship:

```text
Talent
 │
 ├── Positions
 ├── Experiences
 ├── Projects
 ├── Capabilities
 ├── Competencies
 ├── Expertise
 ├── Certifications
 ├── Performance
 ├── Assessments
 ├── Gaps
 └── Journey
```

---

## 26. AI Architecture

```text
                 TANIA AI ASSISTANT
                         │
                         ▼
                TALENT CONTEXT ENGINE
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
  Talent Profile       RAG          Business Context
        │                │                │
        └────────────────┼────────────────┘
                         ▼
                 TALENT AI ENGINE
                         │
       ┌─────────────────┼──────────────────┐
       ▼                 ▼                  ▼
  Assessment        Gap Analysis       Journey Agent
       │                 │                  │
       └─────────────────┼──────────────────┘
                         ▼
                   AI COPILOT
```

---

## 27. AI Agents

Tahap berikutnya dapat menggunakan specialized agents:

```text
Talent Agent
     │
     ├── Profile Agent
     ├── Capability Agent
     ├── Competency Agent
     ├── Performance Agent
     ├── Gap Analysis Agent
     ├── Career Journey Agent
     ├── Learning Recommendation Agent
     └── Talent Matching Agent
```

Orchestrator TANIA menentukan agent berdasarkan intent.

---

## 28. Recommended Technology

Mengikuti stack TANIA:

```text
Frontend
Next.js
React
Tailwind CSS

Backend
Next.js API / Server Actions

Database
Supabase PostgreSQL

Authentication
Supabase Auth

Authorization
Supabase RLS

AI
LLM Gateway
RAG
Agent Orchestrator

Hosting
Vercel

Storage
Supabase Storage

Analytics
TANIA Analytics
```

---

## 29. MVP Scope

### Phase 1 — Talent Profile

```text
✓ Profile
✓ Position
✓ Career Journey
✓ Capability
✓ Competency
✓ Expertise
✓ Certification
✓ Project Experience
✓ Performance History
```

### Phase 2 — Intelligence

```text
✓ Competency Gap
✓ Evidence Engine
✓ AI Assessment
✓ Journey Recommendation
```

### Phase 3 — Action

```text
✓ Development Plan
✓ Learning Recommendation
✓ Project Matching
✓ Mentoring
✓ Progress Tracking
```

---

## 30. MVP User Journey

```text
LOGIN
  ↓
TANIA DASHBOARD
  ↓
TALENT PROFILE
  ↓
VIEW PROFILE
  ↓
CAPABILITY
  ↓
PERFORMANCE
  ↓
COMPETENCY GAP
  ↓
ASK TANIA
  ↓
RECOMMENDED JOURNEY
  ↓
DEVELOPMENT PLAN
  ↓
TRACK PROGRESS
```

---

## 31. KPI / Product Success Metrics

| KPI | Target |
|---|---:|
| Talent Profile Adoption | >80% |
| Profile Completion | >90% |
| Monthly Active Talent | >70% |
| AI Talent Copilot Usage | >50% |
| Development Journey Adoption | >60% |
| Competency Assessment Coverage | >90% |
| Journey Completion | >70% |
| Manager Usage | >70% |
| Data Accuracy | >95% |
| User Satisfaction | >85% |

---

## 32. Strategic KPI

TANIA perlu mengukur **capability improvement**, bukan hanya adoption.

```text
Baseline Capability
        ↓
Development Journey
        ↓
Reassessment
        ↓
Capability Improvement
```

Contoh:

```text
AI Product Management

Before       68%
     ↓
Journey
     ↓
After        84%

Improvement  +16 pts
```

Tujuan akhirnya adalah menjawab:

> **"Apakah investasi pengembangan talent benar-benar meningkatkan capability organisasi?"**

---

## 33. Future Evolution — TANIA Talent OS

```text
                 TANIA TALENT OS
                       │
     ┌─────────────────┼─────────────────┐
     ▼                 ▼                 ▼
Talent Profile    Capability        Performance
     │                 │                 │
     └─────────────────┼─────────────────┘
                       ▼
                Talent Intelligence
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
       Learning      Project      Career
       Matching      Matching     Journey
          │            │            │
          └────────────┼────────────┘
                       ▼
                 AI TALENT COPILOT
```

---

## 34. Product Definition

> **TANIA Talent Profile is an AI-powered digital talent twin that consolidates a talent's career journey, capabilities, competencies, expertise, certifications, project experience, and performance history, then transforms these data into evidence-based competency gap analysis and personalized development journey recommendations.**

TANIA Talent Profile menjadi fondasi evolusi:

```text
Performance Monitoring
        ↓
Talent Profile
        ↓
Talent Intelligence
        ↓
Talent Development
        ↓
Talent OS
```

---

## 35. Definition of Done — MVP

Feature dianggap siap untuk production apabila:

- [ ] Talent dapat melihat Talent Profile.
- [ ] Career history tersedia.
- [ ] Position history tersedia.
- [ ] Capability profile tersedia.
- [ ] Competency profile tersedia.
- [ ] Expertise tersedia.
- [ ] Certification tersedia.
- [ ] Project experience tersedia.
- [ ] Performance history tersedia.
- [ ] Evidence dapat ditelusuri.
- [ ] Competency gap dapat dihitung.
- [ ] AI dapat memberikan gap explanation.
- [ ] AI dapat memberikan recommended journey.
- [ ] Talent dapat melihat development plan.
- [ ] RBAC dan RLS aktif.
- [ ] Audit trail aktif.
- [ ] AI membedakan FACT, INFERENCE, RECOMMENDATION dan UNKNOWN.
- [ ] Tidak ada perubahan terhadap official performance record melalui AI.
- [ ] User acceptance test selesai.
- [ ] Security test selesai.
- [ ] Production monitoring aktif.
