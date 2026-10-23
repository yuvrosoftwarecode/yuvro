import { createFileRoute } from "@tanstack/react-router";
import { GithubSettingsTab } from "@/components/recruiter/GithubSettingsTab";

export const Route = createFileRoute("/recruiter/github")({
  head: () => ({
    meta: [{ title: "GitHub & Repositories — Yuvro Recruiter" }, { name: "robots", content: "noindex" }],
  }),
  component: RecruiterGithubPage,
});

function RecruiterGithubPage() {
  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-[28px] font-semibold tracking-tight text-neutral-900 dark:text-white">
          GitHub & Repositories
        </h1>
        <p className="mt-1 text-[13px] text-neutral-500">
          Manage your connected GitHub accounts, repository access, and evaluation starter repositories.
        </p>
      </div>

      <GithubSettingsTab />
    </div>
  );
}
