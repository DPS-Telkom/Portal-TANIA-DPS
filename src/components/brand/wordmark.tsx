import Link from "next/link";

export function Wordmark({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="flex items-center gap-2 font-bold tracking-tight">
      <span className="grid size-8 place-items-center rounded-md bg-telkom-red text-sm text-white">
        T
      </span>
      <span className={compact ? "text-lg max-[359px]:hidden" : "text-lg"}>TANIA</span>
    </Link>
  );
}
