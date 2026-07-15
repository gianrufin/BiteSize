import { AppHeader } from "@/components/AppHeader";
import { NewBillButton } from "@/components/NewBillButton";
import { RecentBillsList } from "@/components/RecentBillsList";
import { JoinByCodeForm } from "@/components/JoinByCodeForm";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-24 pt-12">
      <AppHeader wordmark />
      <p className="mt-2 text-muted">Split it fair. Pay it easy.</p>

      <div className="mt-10">
        <NewBillButton />
      </div>

      <JoinByCodeForm />

      <div id="recent-bills" className="scroll-mt-8">
        <RecentBillsList />
      </div>
    </main>
  );
}
