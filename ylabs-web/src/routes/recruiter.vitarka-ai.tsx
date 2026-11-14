import { createFileRoute } from "@tanstack/react-router";
import { VitarkaPage } from "@/components/recruiter/vitarka/VitarkaPage";

export const Route = createFileRoute("/recruiter/vitarka-ai")({
  head: () => ({
    meta: [{ title: "Vitarka AI — Yuvro Recruiter" }, { name: "robots", content: "noindex" }],
  }),
  component: VitarkaPage,
});
