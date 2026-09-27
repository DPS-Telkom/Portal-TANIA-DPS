import { cn } from "@/lib/utils";

// Temporary mascot cropped from the approved reference design
// (public/brand/tania-mascot.jpg) — replace with the official asset.
export function Mascot({ className, priority = false }: { className?: string; priority?: boolean }) {
  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- static export, local asset */}
      <img
        src="/brand/tania-mascot.jpg"
        alt="TANIA, asisten AI Chapter DPS"
        width={450}
        height={576}
        loading={priority ? "eager" : "lazy"}
        // Masked edges blend the photo into whatever background the card has.
        className="h-full w-full object-cover object-top [mask-image:linear-gradient(to_right,black_72%,transparent),linear-gradient(to_bottom,black_80%,transparent)] [mask-composite:intersect]"
      />
    </div>
  );
}
