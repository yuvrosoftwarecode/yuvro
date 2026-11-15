import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { loadLabs, type AdminLab } from "@/lib/adminLabs";
import {
  loadLabSprintsAndTickets,
  createWeeklyTask,
  updateWeeklyTask,
  getDayNameForDate,
  getFormattedDateForDay,
  type WeeklyTask,
  type WeeklyTaskDay,
  type LabSprintOption,
  type RecurringTaskType,
} from "@/lib/weeklyTasks";
import {
  Save,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Check,
  CalendarDays,
  ChevronDown,
  X,
} from "lucide-react";
import { useClickOutside } from "@/hooks/use-click-outside";

interface WeeklyTaskFormProps {
  initialTask?: WeeklyTask;
  isEdit?: boolean;
}

function addDays(dateStr: string, days: number): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function getTodayStr(): string {
  const d = new Date();
  return d.toISOString().split("T")[0];
}

interface TicketMultiSelectDropdownProps {
  sprint: LabSprintOption | undefined;
  selectedIds: string[];
  excludedTicketIds?: Set<string>;
  onToggleTicket: (ticket: {
    id: string;
    title: string;
    ticket_slug: string;
    difficulty: "EASY" | "MEDIUM" | "HARD";
    yuvro_points: number;
  }) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}

function TicketMultiSelectDropdown({
  sprint,
  selectedIds,
  excludedTicketIds,
  onToggleTicket,
  onSelectAll,
  onClearAll,
}: TicketMultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  useClickOutside(containerRef, () => setIsOpen(false));

  if (!sprint) {
    return (
      <button
        type="button"
        disabled
        className="w-full bg-muted/20 border border-border/50 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground flex items-center justify-between cursor-not-allowed opacity-75"
      >
        <span>Select a sprint first</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-50 shrink-0" />
      </button>
    );
  }

  const allSprintTickets = sprint.tickets || [];
  const uniqueSelectedIds = Array.from(new Set(selectedIds.map(String).filter(Boolean)));
  // Filter out tickets already assigned to other days, while keeping any ticket selected on this day
  const tickets = allSprintTickets.filter(
    (t) => !excludedTicketIds?.has(String(t.id)) || uniqueSelectedIds.includes(String(t.id))
  );

  const selectedCount = uniqueSelectedIds.length;
  const selectedTickets = allSprintTickets.filter((t) => uniqueSelectedIds.includes(String(t.id)));
  const totalPoints = selectedTickets.reduce(
    (sum, t) => sum + (t.yuvro_points || 10),
    0
  );

  let labelText = "Select tickets...";
  if (selectedCount === 1) {
    labelText = selectedTickets[0]?.title || "1 ticket selected";
  } else if (selectedCount > 1) {
    labelText = `${selectedCount} tickets selected (${totalPoints} YP)`;
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full bg-card border rounded-md px-2.5 py-1.5 text-xs text-left flex items-center justify-between transition outline-none ${
          isOpen
            ? "border-primary ring-1 ring-primary/30"
            : selectedCount > 0
            ? "border-primary/50 text-foreground"
            : "border-border text-muted-foreground hover:border-primary/60"
        }`}
      >
        <span
          className={`truncate mr-2 ${
            selectedCount > 0
              ? "text-foreground font-medium"
              : "text-muted-foreground"
          }`}
        >
          {labelText}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {selectedCount > 0 && (
            <span className="text-[10px] bg-primary/10 text-primary font-semibold px-1.5 py-0.5 rounded">
              {selectedCount}
            </span>
          )}
          <ChevronDown
            className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-150 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {/* Floating Dropdown Panel */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-card border border-border rounded-lg shadow-xl p-2.5 space-y-2 animate-in fade-in-50 duration-150">
          {/* Header row with quick actions */}
          <div className="flex items-center justify-between border-b border-border/40 pb-1.5 px-0.5">
            <span className="text-[11px] font-semibold text-foreground">
              {tickets.length} {tickets.length === 1 ? "ticket" : "tickets"} available
            </span>
            <div className="flex items-center gap-2">
              {tickets.length > 1 && (
                <button
                  type="button"
                  onClick={onSelectAll}
                  className="text-[11px] text-primary hover:underline font-medium"
                >
                  Select All
                </button>
              )}
              {selectedCount > 0 && (
                <>
                  <span className="text-muted-foreground/40 text-[10px]">|</span>
                  <button
                    type="button"
                    onClick={onClearAll}
                    className="text-[11px] text-muted-foreground hover:text-foreground font-medium"
                  >
                    Clear
                  </button>
                </>
              )}
              <span className="text-muted-foreground/40 text-[10px]">|</span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-[11px] text-primary hover:underline font-semibold"
              >
                Done
              </button>
            </div>
          </div>

          {/* Ticket list with checkboxes */}
          {tickets.length === 0 ? (
            <div className="py-3 text-center text-xs text-muted-foreground italic">
              {allSprintTickets.length > 0
                ? "All tickets in this sprint are already assigned to other days."
                : "No tickets found in this sprint."}
            </div>
          ) : (
            <div className="max-h-56 overflow-y-auto space-y-1 pr-0.5">
              {tickets.map((tk) => {
                const checked = selectedIds.includes(tk.id);
                return (
                  <label
                    key={tk.id}
                    className={`flex items-start gap-2.5 p-2 rounded-md cursor-pointer select-none transition-colors border ${
                      checked
                        ? "bg-primary/10 border-primary/40 text-foreground"
                        : "bg-transparent border-transparent hover:bg-accent/50 text-foreground"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleTicket(tk)}
                      className="mt-0.5 h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary shrink-0 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-foreground line-clamp-1">
                        {tk.title}
                      </div>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        <span className="px-1 py-0.5 rounded bg-muted/60 text-[9px]">
                          {tk.difficulty}
                        </span>
                        <span>·</span>
                        <span>{tk.yuvro_points} YP</span>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Selected tickets compact pills below the dropdown */}
      {selectedTickets.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selectedTickets.map((t) => (
            <span
              key={t.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-medium"
            >
              <span className="truncate max-w-[200px]">{t.title}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleTicket(t);
                }}
                className="hover:text-foreground text-primary/70 ml-0.5"
                title="Remove ticket"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function WeeklyTaskForm({ initialTask, isEdit = false }: WeeklyTaskFormProps) {
  const nav = useNavigate();
  const [labs, setLabs] = useState<AdminLab[]>([]);
  const [sprintOptions, setSprintOptions] = useState<LabSprintOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [taskType, setTaskType] = useState<RecurringTaskType>(
    initialTask?.type || (initialTask?.days && initialTask.days.length > 7 ? "monthly" : "weekly")
  );

  const totalDays = taskType === "weekly" ? 7 : 30;

  const defaultStart = initialTask?.start_date || getTodayStr();
  const defaultEnd = initialTask?.end_date || addDays(defaultStart, totalDays - 1);

  const [name, setName] = useState(initialTask?.name || "");
  const [description, setDescription] = useState(initialTask?.description || "");
  const [selectedLabId, setSelectedLabId] = useState(
    initialTask?.lab ||
      (typeof initialTask?.lab_details?.id === "string" ? initialTask.lab_details.id : "")
  );
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [isActive, setIsActive] = useState(initialTask?.is_active ?? true);

  // Helper to construct days array with accurate weekday names
  const buildDaysArray = (
    baseStartDate: string,
    count: number,
    existing?: WeeklyTaskDay[]
  ): WeeklyTaskDay[] => {
    const list: WeeklyTaskDay[] = [];
    for (let i = 0; i < count; i++) {
      const dayName = getDayNameForDate(baseStartDate, i);
      const dateStr = addDays(baseStartDate, i);
      const dateDisplay = getFormattedDateForDay(baseStartDate, i);
      const prev = existing?.[i];

      const rawIds =
        prev?.ticket_ids && prev.ticket_ids.length > 0
          ? prev.ticket_ids
          : prev?.ticket_id
          ? [prev.ticket_id]
          : [];
      const ticketIds = Array.from(new Set(rawIds.map(String).filter(Boolean)));

      const seenTickets = new Set<string>();
      const deduplicatedTickets = (prev?.tickets || []).filter((t: any) => {
        const id = String(t.ticket_id || t.id || "");
        if (!id || seenTickets.has(id)) return false;
        seenTickets.add(id);
        return true;
      });

      list.push({
        day_index: i,
        day_name: dayName,
        date: dateStr,
        date_display: dateDisplay,
        sprint_id: prev?.sprint_id || "",
        sprint_title: prev?.sprint_title || "",
        ticket_id: prev?.ticket_id || ticketIds[0] || "",
        ticket_title: prev?.ticket_title || "",
        ticket_slug: prev?.ticket_slug,
        difficulty: prev?.difficulty,
        yuvro_points: prev?.yuvro_points,
        ticket_ids: ticketIds,
        tickets: deduplicatedTickets,
      });
    }
    return list;
  };

  const [days, setDays] = useState<WeeklyTaskDay[]>(() => {
    return buildDaysArray(defaultStart, totalDays, initialTask?.days);
  });

  useEffect(() => {
    loadLabs().then((data) => {
      const activeLabs = (data || []).filter(
        (l) => l.status === "active" || l.is_active !== false
      );
      setLabs(activeLabs);
      if (!selectedLabId && activeLabs.length > 0 && !isEdit) {
        setSelectedLabId(String(activeLabs[0].id));
      }
    });
  }, []);

  useEffect(() => {
    if (!selectedLabId) return;
    setLoadingOptions(true);
    loadLabSprintsAndTickets(selectedLabId).then((options) => {
      setSprintOptions(options);
      setLoadingOptions(false);
    });
  }, [selectedLabId]);

  // Handle Type Change (Weekly vs Monthly)
  const handleTypeChange = (newType: RecurringTaskType) => {
    setTaskType(newType);
    const newCount = newType === "weekly" ? 7 : 30;
    const newEnd = addDays(startDate, newCount - 1);
    setEndDate(newEnd);
    setDays((prev) => buildDaysArray(startDate, newCount, prev));
  };

  // Handle Start Date Change - recalculates end_date and day_names dynamically
  const handleStartDateChange = (newStart: string) => {
    setStartDate(newStart);
    const newEnd = addDays(newStart, totalDays - 1);
    setEndDate(newEnd);
    setDays((prev) => buildDaysArray(newStart, totalDays, prev));
  };

  // Handle Sprint selection for a day
  const handleDaySprintChange = (dayIndex: number, sprintId: string) => {
    const sprint = sprintOptions.find((s) => s.id === sprintId);

    setDays((prev) => {
      // Collect tickets selected on other days
      const otherSelectedIds = new Set<string>();
      prev.forEach((d) => {
        if (d.day_index !== dayIndex) {
          (d.ticket_ids || []).forEach((id) => otherSelectedIds.add(String(id)));
          if (d.ticket_id) otherSelectedIds.add(String(d.ticket_id));
        }
      });

      // Find first available ticket in this sprint not taken by another day
      const availableTickets = (sprint?.tickets || []).filter(
        (t) => !otherSelectedIds.has(String(t.id))
      );
      const firstAvailable = availableTickets[0];

      return prev.map((d) => {
        if (d.day_index !== dayIndex) return d;
        const initialTickets = firstAvailable
          ? [
              {
                ticket_id: String(firstAvailable.id),
                id: String(firstAvailable.id),
                title: firstAvailable.title,
                ticket_title: firstAvailable.title,
                ticket_slug: firstAvailable.ticket_slug,
                difficulty: firstAvailable.difficulty,
                yuvro_points: firstAvailable.yuvro_points,
              },
            ]
          : [];

        return {
          ...d,
          sprint_id: sprintId,
          sprint_title: sprint?.title || "",
          ticket_ids: firstAvailable ? [String(firstAvailable.id)] : [],
          tickets: initialTickets,
          ticket_id: firstAvailable ? String(firstAvailable.id) : "",
          ticket_title: firstAvailable?.title || "",
          difficulty: firstAvailable?.difficulty,
          ticket_slug: firstAvailable?.ticket_slug,
          yuvro_points: firstAvailable?.yuvro_points || 10,
        };
      });
    });
  };

  // Toggle ticket selection within a day's selected sprint
  const handleToggleDayTicket = (
    dayIndex: number,
    ticket: {
      id: string;
      title: string;
      ticket_slug: string;
      difficulty: "EASY" | "MEDIUM" | "HARD";
      yuvro_points: number;
    }
  ) => {
    setDays((prev) =>
      prev.map((d) => {
        if (d.day_index !== dayIndex) return d;

        const currentIds = (d.ticket_ids || []).map(String);
        const ticketId = String(ticket.id);
        const isSelected = currentIds.includes(ticketId);
        let updatedIds: string[];
        let updatedTickets: any[];

        if (isSelected) {
          // Deselect
          updatedIds = currentIds.filter((id) => id !== ticketId);
          updatedTickets = (d.tickets || []).filter(
            (t) => String(t.ticket_id || t.id) !== ticketId
          );
        } else {
          // Select (deduplicating)
          updatedIds = Array.from(new Set([...currentIds, ticketId]));
          const newItem = {
            ticket_id: ticketId,
            id: ticketId,
            title: ticket.title,
            ticket_title: ticket.title,
            ticket_slug: ticket.ticket_slug,
            difficulty: ticket.difficulty,
            yuvro_points: ticket.yuvro_points,
          };
          const existingWithoutThis = (d.tickets || []).filter(
            (t) => String(t.ticket_id || t.id) !== ticketId
          );
          updatedTickets = [...existingWithoutThis, newItem];
        }

        const firstItem = updatedTickets[0];
        const totalPoints = updatedTickets.reduce(
          (sum, t) => sum + (t.yuvro_points || 10),
          0
        );

        return {
          ...d,
          ticket_ids: updatedIds,
          tickets: updatedTickets,
          ticket_id: firstItem ? firstItem.ticket_id || firstItem.id : "",
          ticket_title: updatedTickets.map((t) => t.title || t.ticket_title).join(", "),
          difficulty: firstItem?.difficulty,
          ticket_slug: firstItem?.ticket_slug,
          yuvro_points: totalPoints,
        };
      })
    );
  };

  // Select all available tickets from sprint for that day (excluding tickets assigned to other days)
  const handleSelectAllSprintTickets = (dayIndex: number) => {
    setDays((prev) => {
      const otherSelectedIds = new Set<string>();
      prev.forEach((d) => {
        if (d.day_index !== dayIndex) {
          (d.ticket_ids || []).forEach((id) => otherSelectedIds.add(String(id)));
          if (d.ticket_id) otherSelectedIds.add(String(d.ticket_id));
        }
      });

      return prev.map((d) => {
        if (d.day_index !== dayIndex) return d;
        const sprint = sprintOptions.find((s) => s.id === d.sprint_id);
        if (!sprint) return d;

        const availableTickets = (sprint.tickets || []).filter(
          (t) => !otherSelectedIds.has(String(t.id))
        );

        const allIds = availableTickets.map((t) => String(t.id));
        const allTicketItems = availableTickets.map((t) => ({
          ticket_id: String(t.id),
          id: String(t.id),
          title: t.title,
          ticket_title: t.title,
          ticket_slug: t.ticket_slug,
          difficulty: t.difficulty,
          yuvro_points: t.yuvro_points,
        }));

        const totalPoints = allTicketItems.reduce(
          (sum, t) => sum + (t.yuvro_points || 10),
          0
        );

        return {
          ...d,
          ticket_ids: allIds,
          tickets: allTicketItems,
          ticket_id: allIds[0] || "",
          ticket_title: allTicketItems.map((t) => t.title).join(", "),
          difficulty: allTicketItems[0]?.difficulty,
          ticket_slug: allTicketItems[0]?.ticket_slug,
          yuvro_points: totalPoints,
        };
      });
    });
  };

  // Clear all tickets for a day
  const handleClearDayTickets = (dayIndex: number) => {
    setDays((prev) =>
      prev.map((d) => {
        if (d.day_index !== dayIndex) return d;
        return {
          ...d,
          ticket_ids: [],
          tickets: [],
          ticket_id: "",
          ticket_title: "",
          difficulty: undefined,
          ticket_slug: undefined,
          yuvro_points: 0,
        };
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Please provide a task name.");
      return;
    }
    if (!selectedLabId) {
      setError("Please select a lab.");
      return;
    }
    if (!startDate || !endDate) {
      setError("Please select valid start and end dates.");
      return;
    }

    const missingDays = days.filter(
      (d) => (!d.ticket_ids || d.ticket_ids.length === 0) && !d.ticket_id
    );
    if (missingDays.length > 0) {
      setError(
        `Please select at least one ticket for all ${totalDays} days. Missing on: ${missingDays
          .slice(0, 5)
          .map((d) => `Day ${d.day_index + 1} (${d.day_name})`)
          .join(", ")}${missingDays.length > 5 ? ` and ${missingDays.length - 5} more` : ""}`
      );
      return;
    }

    // Ensure each ticket is assigned to at most one day
    const assignedTickets = new Set<string>();
    for (const d of days) {
      const ids = Array.from(new Set((d.ticket_ids || (d.ticket_id ? [d.ticket_id] : [])).map(String).filter(Boolean)));
      for (const tid of ids) {
        if (assignedTickets.has(tid)) {
          setError(`Ticket assigned to Day ${d.day_index + 1} (${d.day_name}) is already assigned to another day. Each ticket can only be selected once.`);
          return;
        }
        assignedTickets.add(tid);
      }
    }

    setSaving(true);
    try {
      const payload: Partial<WeeklyTask> = {
        name: name.trim(),
        description: description.trim(),
        lab: selectedLabId,
        type: taskType,
        start_date: startDate,
        end_date: endDate,
        days: days.map((d, i) => {
          const rawIds =
            d.ticket_ids && d.ticket_ids.length > 0
              ? d.ticket_ids
              : d.ticket_id
              ? [d.ticket_id]
              : [];
          const dedupIds = Array.from(new Set(rawIds.map(String).filter(Boolean)));
          const seenT = new Set<string>();
          const dedupTickets = (d.tickets || []).filter((t: any) => {
            const tid = String(t.ticket_id || t.id || "");
            if (!tid || seenT.has(tid)) return false;
            seenT.add(tid);
            return true;
          });
          const firstT = dedupTickets[0];
          return {
            day_index: i,
            day_name: d.day_name,
            date: d.date,
            date_display: d.date_display,
            sprint_id: d.sprint_id,
            sprint_title: d.sprint_title,
            ticket_id: dedupIds[0] || (firstT ? String(firstT.ticket_id || firstT.id) : ""),
            ticket_title: d.ticket_title,
            ticket_slug: d.ticket_slug,
            difficulty: d.difficulty,
            yuvro_points: d.yuvro_points || 10,
            ticket_ids: dedupIds,
            tickets: dedupTickets,
          };
        }),
        is_active: isActive,
      };

      if (isEdit && initialTask?.id) {
        await updateWeeklyTask(initialTask.id, payload);
      } else {
        await createWeeklyTask(payload);
      }
      nav({ to: "/admin/weekly-tasks" });
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to save recurring task. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell
      title={
        isEdit
          ? `Edit ${taskType === "monthly" ? "Monthly" : "Weekly"} Task · ${name || "Untitled"}`
          : `Create Learn Recurring Task (${taskType === "monthly" ? "30 Days" : "7 Days"})`
      }
      breadcrumb={["Content", "Learn Recurring Tasks", isEdit ? "Edit" : "New"]}
      right={
        <div className="flex items-center gap-2">
          <Link
            to="/admin/weekly-tasks"
            className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-accent inline-flex items-center gap-1.5 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Link>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="text-xs px-3.5 py-1.5 rounded-md bg-primary text-primary-foreground inline-flex items-center gap-1.5 font-medium hover:opacity-90 disabled:opacity-50 transition"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Publish Task"}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl">
        {error && (
          <div className="p-3.5 rounded-lg border border-destructive/40 bg-destructive/10 text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Section 1: Task Details & Schedule Type */}
        <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur p-5 space-y-4">
          <h2 className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <Calendar className="h-4 w-4 text-primary" /> Task Overview & Type
          </h2>

          {/* Type Selector Tabs */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5 font-medium">
              Recurring Schedule Type *
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleTypeChange("weekly")}
                className={`px-4 py-2 rounded-lg text-xs font-medium border transition-colors flex items-center gap-2 ${
                  taskType === "weekly"
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card border-border text-foreground hover:bg-accent"
                }`}
              >
                <CalendarDays className="h-3.5 w-3.5" />
                Weekly (7 Days)
              </button>

              <button
                type="button"
                onClick={() => handleTypeChange("monthly")}
                className={`px-4 py-2 rounded-lg text-xs font-medium border transition-colors flex items-center gap-2 ${
                  taskType === "monthly"
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card border-border text-foreground hover:bg-accent"
                }`}
              >
                <Calendar className="h-3.5 w-3.5" />
                Monthly (30 Days)
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              {taskType === "weekly"
                ? "Weekly tasks run for exactly 7 days from the chosen start date."
                : "Monthly challenges run for exactly 30 days from the chosen start date."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs text-muted-foreground mb-1 font-medium">
                Task Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={taskType === "weekly" ? "e.g. Django Week 1 Sprint" : "e.g. 30-Day Full Stack Mastery"}
                className="w-full bg-card border border-border rounded-md px-3 py-1.5 text-xs text-foreground outline-none focus:border-primary transition"
              />
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1 font-medium">
                Simulation Lab *
              </label>
              <select
                required
                value={selectedLabId}
                onChange={(e) => setSelectedLabId(e.target.value)}
                className="w-full bg-card border border-border rounded-md px-3 py-1.5 text-xs text-foreground outline-none focus:border-primary transition"
              >
                <option value="">Select a Lab...</option>
                {labs.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title} ({l.type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1 font-medium">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief summary of what learners will accomplish in this challenge..."
              className="w-full bg-card border border-border rounded-md px-3 py-1.5 text-xs text-foreground outline-none focus:border-primary transition"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            <div>
              <label className="block text-xs text-muted-foreground mb-1 font-medium">
                Start Date * (Day 1 Weekday)
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="w-full bg-card border border-border rounded-md px-3 py-1.5 text-xs text-foreground outline-none focus:border-primary transition font-mono"
              />
              <span className="text-[10px] text-muted-foreground mt-0.5 block">
                Starts on <b>{getDayNameForDate(startDate, 0)}</b>
              </span>
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1 font-medium">
                End Date (Exactly {totalDays} days)
              </label>
              <input
                type="date"
                disabled
                value={endDate}
                className="w-full bg-muted/30 border border-border/50 rounded-md px-3 py-1.5 text-xs text-muted-foreground outline-none font-mono cursor-not-allowed"
              />
              <span className="text-[10px] text-muted-foreground mt-0.5 block">
                Ends on <b>{getDayNameForDate(startDate, totalDays - 1)}</b>
              </span>
            </div>

            <div className="flex items-center pt-3">
              <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
                <span className="font-medium text-foreground">
                  Active Task (Visible to Learners)
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Section 2: Ticket Schedule with Multi-Ticket Selection from a Sprint */}
        <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <Calendar className="h-4 w-4 text-primary" /> {totalDays}-Day Ticket Schedule
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                For each day, select a single sprint from the lab, then choose one or multiple tickets.
              </p>
            </div>
            {loadingOptions && (
              <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading sprints & tickets...
              </span>
            )}
          </div>

          {sprintOptions.length === 0 && !loadingOptions ? (
            <div className="p-6 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
              No sprints or tickets found for this lab. Please select a lab with existing sprints and tickets.
            </div>
          ) : (
            <div className="space-y-4">
              {days.map((d, idx) => {
                const currentSprintId = d.sprint_id || "";
                const currentSprint = sprintOptions.find((s) => s.id === currentSprintId);
                const selectedIds = d.ticket_ids || [];
                const isAssigned = selectedIds.length > 0;

                // Collect all ticket IDs assigned to other days
                const otherDaysSelectedIds = new Set<string>();
                days.forEach((otherDay) => {
                  if (otherDay.day_index !== idx) {
                    (otherDay.ticket_ids || []).forEach((id) => otherDaysSelectedIds.add(String(id)));
                    if (otherDay.ticket_id) otherDaysSelectedIds.add(String(otherDay.ticket_id));
                    (otherDay.tickets || []).forEach((t) => {
                      const tid = String(t.ticket_id || t.id || "");
                      if (tid) otherDaysSelectedIds.add(tid);
                    });
                  }
                });

                return (
                  <div
                    key={d.day_index}
                    className="p-4 rounded-lg border border-border/60 bg-card/60 space-y-3 transition-colors hover:border-primary/40"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-muted/60 text-foreground font-semibold">
                          Day {idx + 1}
                        </span>
                        <div>
                          <span className="text-xs font-semibold text-foreground">
                            {d.day_name}
                          </span>
                          {d.date_display && (
                            <span className="text-[11px] text-muted-foreground ml-1.5">
                              · {d.date_display}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isAssigned ? (
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1 font-medium bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {selectedIds.length} {selectedIds.length === 1 ? "ticket" : "tickets"} ({d.yuvro_points || 10} YP)
                          </span>
                        ) : (
                          <span className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded italic">
                            No tickets assigned
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
                      {/* Sprint selector */}
                      <div>
                        <label className="block text-[11px] text-muted-foreground mb-1 font-medium">
                          Select Sprint (Single Sprint per Day):
                        </label>
                        <select
                          value={currentSprintId}
                          onChange={(e) => handleDaySprintChange(idx, e.target.value)}
                          className="w-full bg-card border border-border rounded-md px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary"
                        >
                          <option value="">Choose Sprint...</option>
                          {sprintOptions.map((sp) => (
                            <option key={sp.id} value={sp.id}>
                              {sp.title} ({sp.tickets.length} tickets)
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Ticket Multi-Select Dropdown with Checkboxes */}
                      <div>
                        <label className="block text-[11px] text-muted-foreground mb-1 font-medium">
                          Select Tickets (Checkboxes):
                        </label>
                        <TicketMultiSelectDropdown
                          sprint={currentSprint}
                          selectedIds={selectedIds}
                          excludedTicketIds={otherDaysSelectedIds}
                          onToggleTicket={(tk) => handleToggleDayTicket(idx, tk)}
                          onSelectAll={() => handleSelectAllSprintTickets(idx)}
                          onClearAll={() => handleClearDayTickets(idx)}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </form>
    </AdminShell>
  );
}
export default WeeklyTaskForm;
