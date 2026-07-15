import { formatCents } from "@/lib/format";
import type { Item } from "@/types";

const LOW_CONFIDENCE_THRESHOLD = 0.6;

export function ItemRow({
  item,
  onEdit,
}: {
  item: Item;
  onEdit: () => void;
}) {
  const isLowConfidence =
    item.source === "ocr" &&
    item.ocrConfidence !== null &&
    item.ocrConfidence < LOW_CONFIDENCE_THRESHOLD;

  return (
    <button
      onClick={onEdit}
      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-left transition hover:bg-surface-muted"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-medium text-accent">
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
        </div>
        <p className="text-sm text-muted">{formatCents(item.unitPriceCents)} each</p>
      </div>
      <span className="font-medium text-text">
        {formatCents(item.totalPriceCents)}
      </span>
    </button>
  );
}
