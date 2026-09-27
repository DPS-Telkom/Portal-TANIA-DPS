import { STATUS_CLASSES, STATUS_LABELS, type WeekStatus } from "@/lib/timesheet";
import { cn } from "@/lib/utils";

export function StatusPill({ status, className }: { status: WeekStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        STATUS_CLASSES[status],
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
