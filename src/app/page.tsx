import { LogoWordmark } from "@/components/Logo";
import { NewBillButton } from "@/components/NewBillButton";
import { RecentBillsList } from "@/components/RecentBillsList";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-24 pt-12">
      <LogoWordmark size={44} />
      <p className="mt-2 text-muted">Split it fair. Pay it easy.</p>

      <div className="mt-10">
        <NewBillButton />
      </div>

      <RecentBillsList />
    </main>
  );
}
