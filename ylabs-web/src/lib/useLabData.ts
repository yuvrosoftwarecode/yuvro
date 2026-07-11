import { useQuery } from "@tanstack/react-query";
import restApiAuthUtil from "@/utils/RestApiAuthUtil";
import { loadSprints } from "./labSprints";

export function useLabData(slugOrId: string) {
  return useQuery({
    queryKey: ["lab-data", slugOrId],
    queryFn: async () => {
      // 1. Fetch all labs to find the ID (if slug is not a UUID)
      const labs = await restApiAuthUtil.get<any[]>("/lab/labs/");
      
      let labId = slugOrId;
      // If it doesn't look like a UUID, search by name
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId)) {
        const found = labs.find(l => l.title.toLowerCase().includes(slugOrId.toLowerCase()));
        if (found) {
          labId = found.id;
        } else {
          throw new Error("Lab not found");
        }
      }
      
      const lab = labs.find(l => l.id === labId);
      const sprints = await loadSprints(labId);
      
      // Extract all tickets from sprints
      const allTickets = sprints.flatMap(s => s.tasks.map(t => ({
        ...t,
        status: t.status || "Not Started",
        tag: t.tag || "Task"
      })));
      
      return { 
        lab: {
          ...lab,
          name: lab.title,
          slug: slugOrId,
          color: "primary",
          completed: 0,
          total: allTickets.length,
          hoursLeft: 24,
        }, 
        sprints: sprints.map(s => ({
          ...s,
          goal: s.description,
          range: "",
          ticketIds: s.tasks.map(t => t.id),
          status: "Active"
        })),
        allTickets
      };
    }
  });
}
