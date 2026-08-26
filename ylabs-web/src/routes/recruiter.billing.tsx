import { createFileRoute } from "@tanstack/react-router";
import { PricingContent } from "./pricing";

export const Route = createFileRoute("/recruiter/billing")({
  component: BillingPage,
});

function BillingPage() {
  return (
    <div className="bg-[#FAFAF8] text-[#0A0A0A] min-h-screen pb-20">
      <div className="p-10 border-b border-black/10 bg-white">
        <h1 className="text-[28px] font-semibold tracking-tight">Upgrade Plan</h1>
        <p className="mt-1 text-[13px] text-neutral-500">
          Choose a plan to upgrade your workspace.
        </p>
      </div>
      <div className="pt-8">
        <PricingContent onSubscribe={() => window.location.reload()} />
      </div>
    </div>
  );
}
