import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { z } from "zod";

const profileSearchSchema = z.object({
  tab: z.string().optional(),
  section: z.string().optional(),
});

export const Route = createFileRoute("/$username")({
  validateSearch: (search: Record<string, unknown>) => {
    return profileSearchSchema.parse(search);
  },
  component: UsernameRedirect,
});

/**
 * Legacy /:username route — redirects to /u/:username preserving query params.
 */
function UsernameRedirect() {
  const { username } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();

  useEffect(() => {
    navigate({
      to: "/u/$username",
      params: { username },
      search,
      replace: true,
    });
  }, [username, search, navigate]);

  return null;
}
