import { formatCents } from "@/lib/format";
import type { Item } from "@/types";

export const LOW_CONFIDENCE_THRESHOLD = 0.6;

export function ItemRow({
  item,
  currency,
  onEdit,
  onQuantityChange,
  onDuplicate,
  readOnly = false,
}: {
  item: Item;
  currency: string;
  onEdit: () => void;
  onQuantityChange?: (delta: number) => void;
  onDuplicate?: () => void;
  readOnly?: boolean;
}) {
  const isLowConfidence =
    item.source === "ocr" &&
    item.ocrConfidence !== null &&
    item.ocrConfidence < LOW_CONFIDENCE_THRESHOLD;
  const isPendingSync = item.id.startsWith("local-");

  return (
    <div className="flex items-center gap-3 card px-4 py-3">
      {onQuantityChange ? (
        <div className="flex shrink-0 items-center rounded-full border border-border">
          <button
            type="button"
            onClick={() => onQuantityChange(-1)}
            disabled={readOnly || item.quantity <= 1}
            aria-label="Decrease quantity"
            className="flex h-7 w-7 items-center justify-center text-muted disabled:opacity-40"
          >
            −
          </button>
          <span className="w-5 text-center text-sm font-medium text-accent">
            {item.quantity}
          </span>
          <button
            type="button"
            onClick={() => onQuantityChange(1)}
            disabled={readOnly}
            aria-label="Increase quantity"
            className="flex h-7 w-7 items-center justify-center text-muted disabled:opacity-40"
          >
            +
          </button>
        </div>
      ) : (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full icon-well text-sm font-medium text-accent">
          {item.quantity}
        </div>
      )}

      <button
        onClick={onEdit}
        disabled={readOnly}
        className="min-w-0 flex-1 text-left"
      >
        <div className="flex items-center gap-1.5">
          <p className="truncate font-medium text-text">{item.name}</p>
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
      </button>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="font-medium text-text">
          {formatCents(item.totalPriceCents, currency)}
        </span>
        {onDuplicate && !readOnly ? (
          <button
            type="button"
            onClick={onDuplicate}
            aria-label="Duplicate item"
            className="text-xs font-medium text-accent"
          >
            Duplicate
          </button>
        ) : null}
      </div>
    </div>
  );
}
