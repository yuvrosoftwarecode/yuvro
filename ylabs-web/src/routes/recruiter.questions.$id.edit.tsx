// @ts-nocheck
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/recruiter/questions/$id/edit")({
  head: () => ({
    meta: [
      { title: "Edit Question — Yuvro Recruiter" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RecruiterEditQuestionRedirect,
});

function RecruiterEditQuestionRedirect() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  useEffect(() => {
    navigate({
      to: "/recruiter/questions/new",
      search: { edit: id },
      replace: true,
    });
  }, [id, navigate]);

  return null;
}
