import { createFileRoute } from "@tanstack/react-router";
import { GithubSettingsTab } from "@/components/recruiter/GithubSettingsTab";

export const Route = createFileRoute("/recruiter/github")({
  head: () => ({
    meta: [{ title: "GitHub and repositories — Yuvro Recruiter" }, { name: "robots", content: "noindex" }],
  }),
  component: RecruiterGithubPage,
});

function RecruiterGithubPage() {
  return (
    <div className="gh-theme p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto">
      <h1>GitHub and repositories</h1>
      <p className="mb-8 mt-1 text-sm text-muted-foreground">
        Manage connected GitHub accounts, repository access and starter repositories for evaluations
      </p>

      <GithubSettingsTab />
    </div>
  );
}
