import { CopyLinkButton } from "@/components/CopyLinkButton";

export function GCashPaymentInfo({ gcashNumber }: { gcashNumber: string }) {
  return (
    <div className="flex items-center justify-between gap-2 card px-4 py-3">
      <div>
        <p className="text-sm text-muted">Send payment via GCash</p>
        <p className="font-medium text-text">{gcashNumber}</p>
      </div>
      <CopyLinkButton text={gcashNumber} />
    </div>
  );
}
