const idr = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 });

export function formatIDR(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return idr.format(Number(n));
}

/** Short form for cards: "Rp 1,2 M". */
export function formatIDRCompact(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return `Rp ${compact.format(Number(n))}`;
}
