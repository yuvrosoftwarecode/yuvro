import { createFileRoute } from "@tanstack/react-router";
import Research from "@/pages/Research";

export const Route = createFileRoute("/research")({
  validateSearch: (search: Record<string, unknown>): { view: "latest" | "following" | "topics" } => ({
    view: search.view === "following" || search.view === "topics" ? search.view : "latest",
  }),
  head: () => ({ meta: [
    { title: "AI Research Papers | Yuvro Labs" },
    { name: "description", content: "Explore AI research on RAG, agents, language models and developer tools with Yuvro." },
    { property: "og:title", content: "AI Research Papers | Yuvro Labs" },
    { property: "og:description", content: "Explore AI research and follow the topics that matter to you." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Research,
});