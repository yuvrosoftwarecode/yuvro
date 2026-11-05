import { createFileRoute } from "@tanstack/react-router";
import { PricingPage } from "@/routes/pricing";

export const Route = createFileRoute("/yuvrolabs-pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Yuvro Labs" },
      {
        name: "description",
        content:
          "Simple pricing for Yuvro Labs, the developer-hiring platform. Coding assessments, simulation labs and AI mock interviews with a shared submission pool. Start free for 14 days.",
      },
    ],
  }),
  component: PricingPage,
});
