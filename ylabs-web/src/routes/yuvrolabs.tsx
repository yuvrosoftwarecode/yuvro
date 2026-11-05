import { createFileRoute } from "@tanstack/react-router";
import { LandingPage } from "@/routes/index";

export const Route = createFileRoute("/yuvrolabs")({
  head: () => ({
    meta: [
      { title: "Yuvro Labs — Built for the next era of development" },
      {
        name: "description",
        content:
          "Yuvro Labs is an AI-powered employability verification and software engineering education platform. Run real simulations, coding assessments and AI interviews.",
      },
    ],
  }),
  component: LandingPage,
});
