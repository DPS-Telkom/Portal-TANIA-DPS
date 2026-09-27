import { cn } from "@/lib/utils";

// Official logo assets (public/brand/*.webp, transparent background).
export const LOGOS = {
  telkom: { src: "/brand/logo-telkom-indonesia.webp", alt: "Telkom Indonesia", w: 284, h: 160 },
  scale: { src: "/brand/logo-scale.webp", alt: "SCALE — One IT Digital Ecosystem", w: 608, h: 160 },
  dp: { src: "/brand/logo-digital-product.webp", alt: "Divisi Digital Product", w: 411, h: 160 },
  danantara: { src: "/brand/logo-danantara.webp", alt: "Danantara — Indonesia Sovereign Fund", w: 676, h: 160 },
} as const;

export type LogoName = keyof typeof LOGOS;

/** Height-driven logo; width follows the asset's aspect ratio. */
export function Logo({ name, className }: { name: LogoName; className?: string }) {
  const l = LOGOS[name];
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static export, local asset
    <img src={l.src} alt={l.alt} width={l.w} height={l.h} loading="lazy" className={cn("h-8 w-auto object-contain", className)} />
  );
}

/** "Part of" ecosystem strip, from holding to program. */
export function LogoStrip({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <span className="text-[11px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">Bagian dari ekosistem</span>
      <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
        {(["danantara", "telkom", "dp", "scale"] as LogoName[]).map((n) => (
          <li key={n}>
            <Logo name={n} className={n === "telkom" ? "h-12 sm:h-14" : "h-8 sm:h-10"} />
          </li>
        ))}
      </ul>
    </div>
  );
}
