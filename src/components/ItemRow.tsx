import { formatCents } from "@/lib/format";
import type { Item } from "@/types";

export const LOW_CONFIDENCE_THRESHOLD = 0.6;

export function ItemRow({
  item,
  currency,
  onEdit,
  readOnly = false,
}: {
  item: Item;
  currency: string;
  onEdit: () => void;
  readOnly?: boolean;
}) {
  const isLowConfidence =
    item.source === "ocr" &&
    item.ocrConfidence !== null &&
    item.ocrConfidence < LOW_CONFIDENCE_THRESHOLD;
  const isPendingSync = item.id.startsWith("local-");

  return (
    <button
      onClick={onEdit}
      disabled={readOnly}
      className="flex w-full items-center gap-3 card px-4 py-3 text-left transition hover:bg-surface-muted disabled:hover:bg-surface"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full icon-well text-sm font-medium text-accent">
        {item.quantity}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-1.5">
          <p className="font-medium text-text">{item.name}</p>
          {isLowConfidence ? (
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber"
              title="Low-confidence scan — please double check"
            />
          ) : null}
          {isPendingSync ? (
            <span
              className="shrink-0 rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-medium text-accent"
              title="Saved offline — will sync when you're back online"
            >
              Pending sync
            </span>
          ) : null}
        </div>
        <p className="text-sm text-muted">
          {formatCents(item.unitPriceCents, currency)} each
        </p>
      </div>
      <span className="font-medium text-text">
        {formatCents(item.totalPriceCents, currency)}
      </span>
    </button>
  );
}
