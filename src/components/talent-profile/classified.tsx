import type { TalentAiBase } from "@/lib/talent-profile/ai";
import { cn } from "@/lib/utils";

import { Pill } from "./section";

// prd-talent §19 — FACT / INFERENCE / RECOMMENDATION / UNKNOWN are always
// visibly distinct; inference is never presented as fact.
export const CLASS_STYLES = {
  fact: { label: "FACT", className: "bg-emerald-100 text-emerald-900", hint: "Data dari sumber resmi / tercatat" },
  inference: { label: "INFERENCE", className: "bg-sky-100 text-sky-900", hint: "Kesimpulan AI berdasarkan evidence" },
  recommendation: { label: "RECOMMENDATION", className: "bg-violet-100 text-violet-900", hint: "Saran pengembangan dari AI" },
  unknown: { label: "UNKNOWN", className: "bg-neutral-200 text-neutral-800", hint: "Data belum tersedia" },
} as const;

function Group({ kind, items }: { kind: keyof typeof CLASS_STYLES; items: { text: string; note?: string }[] }) {
  if (!items.length) return null;
  const s = CLASS_STYLES[kind];
  return (
    <div className="space-y-1.5">
      <Pill className={s.className}>
        <span title={s.hint}>{s.label}</span>
      </Pill>
      <ul className="space-y-1 text-sm">
        {items.map((i, idx) => (
          <li key={idx} className="border-l-2 pl-2" style={{ borderColor: "var(--border)" }}>
            {i.text}
            {i.note && <span className="block text-xs text-muted-foreground">{i.note}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ClassifiedAnswer({ data, className }: { data: TalentAiBase; className?: string }) {
  const confidence = Math.round(data.confidence * 100);
  return (
    <div className={cn("space-y-3", className)}>
      {data.answer && <p className="text-sm">{data.answer}</p>}
      <Group kind="fact" items={data.facts.map((f) => ({ text: f.statement, note: `Sumber: ${f.source}` }))} />
      <Group kind="inference" items={data.inferences.map((f) => ({ text: f.statement, note: `Berdasarkan: ${f.source}` }))} />
      <Group kind="recommendation" items={data.recommendations.map((r) => ({ text: r.action, note: r.rationale }))} />
      <Group kind="unknown" items={data.unknowns.map((u) => ({ text: u.statement, note: u.source }))} />
      {data.evidence.length > 0 && (
        <div className="flex flex-wrap gap-1.5 text-xs">
          <span className="text-muted-foreground">Evidence:</span>
          {data.evidence.map((e, i) => (
            <Pill key={i} className="border bg-background">
              {e.title} · {e.type}
            </Pill>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Keyakinan AI {confidence}% · Rekomendasi bukan keputusan HR dan tidak mengubah data resmi.
      </p>
    </div>
  );
}
