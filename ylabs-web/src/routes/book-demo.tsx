import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { StandardHeader } from "@/components/StandardHeader";
import { Check } from "lucide-react";

export const Route = createFileRoute("/book-demo")({
  head: () => ({
    meta: [{ title: "Book a Demo — Yuvro Labs" }],
  }),
  component: BookDemoPage,
});

function BookDemoPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (document.getElementById("zoho-bookings-script")) {
      if ((window as any).Bookings) {
        if (containerRef.current.innerHTML) {
          containerRef.current.innerHTML = "";
        }
        (window as any).Bookings.inlineEmbed({
          url: "https://yuvro.zohobookings.in/portal-embed#/democall",
          parent: "#inline-container",
          height: "700px",
        });
      }
      return;
    }

    const script = document.createElement("script");
    script.id = "zoho-bookings-script";
    script.src = "https://bookings.nimbuspop.com/assets/embed.js";
    script.async = true;
    script.onload = () => {
      if ((window as any).Bookings) {
        (window as any).Bookings.inlineEmbed({
          url: "https://yuvro.zohobookings.in/portal-embed#/democall",
          parent: "#inline-container",
          height: "700px",
        });
      }
    };
    document.body.appendChild(script);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-[#f8f9fb] dark:bg-[#0d1120] text-[#14192b] dark:text-[#f1f4fc]">
      <StandardHeader />

      <main className="flex-1 px-6 py-16 lg:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <h1 className="mb-4 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#14192b] dark:text-[#f1f4fc]">
              Book a Yuvro Labs Demo
            </h1>
            <p className="mx-auto mb-3 max-w-2xl text-base sm:text-lg text-[#646d84] dark:text-[#a1abc4]">
              See how Yuvro Labs helps companies evaluate engineering capability, run realistic simulations, and hire with confidence.
            </p>
            <p className="mb-6 text-sm font-semibold text-[#f7931e]">
              30-minute tailored walkthrough with our technical team
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-[14px] font-medium text-[#14192b] dark:text-[#f1f4fc]">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-[#f7931e]" strokeWidth={2.5} /> Live Product Simulation
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-[#f7931e]" strokeWidth={2.5} /> Vitarka AI Interview Walkthrough
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-[#f7931e]" strokeWidth={2.5} /> Custom Hiring Stack Discussion
              </div>
            </div>
          </div>

          <div className="w-full rounded-2xl border border-[#646d84]/15 bg-white dark:bg-card p-4 sm:p-6 shadow-sm">
            <div id="inline-container" ref={containerRef} className="w-full h-full min-h-[700px]" />
          </div>
        </div>
      </main>

      <footer className="mt-auto border-t border-[#646d84]/15 py-8 text-center text-xs text-[#646d84] dark:text-[#a1abc4]">
        <div className="mx-auto max-w-[1120px] px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>© {new Date().getFullYear()} Yuvro Labs. All rights reserved.</span>
          <a href="mailto:contact@yuvrolabs.com" className="hover:text-[#14192b] dark:hover:text-white transition-colors">
            contact@yuvrolabs.com
          </a>
        </div>
      </footer>
    </div>
  );
}
