import { Sparkle } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

// TANIA wordmark: navy letters with the Telkom-red spark.
export function Wordmark({
  href = "/",
  compact = false,
  tagline = false,
  className,
}: {
  href?: string;
  compact?: boolean;
  tagline?: boolean;
  className?: string;
}) {
  return (
    <Link href={href} className={cn("group inline-flex flex-col leading-none", className)} aria-label="TANIA — beranda">
      <span className="relative inline-flex items-start text-2xl font-black tracking-tight text-tania-navy">
        <span className={compact ? "max-[359px]:hidden" : undefined}>TANIA</span>
        <Sparkle className="-mt-1 ml-0.5 size-3.5 fill-telkom-red text-telkom-red" aria-hidden />
      </span>
      {tagline && <span className="mt-1 text-[11px] font-medium text-muted-foreground">Chapter DPS · Telkom Indonesia</span>}
    </Link>
  );
}
