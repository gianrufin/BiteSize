import { Logo, LogoWordmark } from "@/components/Logo";
import { AppNav } from "@/components/AppNav";

export function AppHeader({
  wordmark = false,
  right,
}: {
  wordmark?: boolean;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <AppNav />
        {wordmark ? <LogoWordmark size={40} /> : <Logo size={36} />}
      </div>
      {right ? <div className="flex shrink-0 items-center gap-2">{right}</div> : null}
    </div>
  );
}
