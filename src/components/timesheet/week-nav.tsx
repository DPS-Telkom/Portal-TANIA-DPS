"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { addDays, formatWeek, mondayOf } from "@/lib/dates";

export function WeekNav({ monday, onChange }: { monday: string; onChange: (m: string) => void }) {
  const thisWeek = mondayOf();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="icon-sm" aria-label="Minggu sebelumnya" onClick={() => onChange(addDays(monday, -7))}>
        <ChevronLeft />
      </Button>
      <span className="min-w-0 text-sm font-medium">{formatWeek(monday)}</span>
      <Button variant="outline" size="icon-sm" aria-label="Minggu berikutnya" onClick={() => onChange(addDays(monday, 7))}>
        <ChevronRight />
      </Button>
      {monday !== thisWeek && (
        <Button variant="ghost" size="sm" onClick={() => onChange(thisWeek)}>
          Minggu ini
        </Button>
      )}
    </div>
  );
}
