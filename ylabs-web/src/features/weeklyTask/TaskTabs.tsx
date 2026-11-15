import type { WeeklyTask } from "./types";

interface TaskTabsProps {
  tasks: WeeklyTask[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function TaskTabs({ tasks, selectedId, onSelect }: TaskTabsProps) {
  return (
    <nav className="tabs" aria-label="Weekly tasks">
      {tasks.map((t) => {
        const isCurrent = t.id === selectedId;
        return (
          <button
            key={t.id}
            type="button"
            data-tab={t.id}
            aria-current={isCurrent ? "page" : undefined}
            className={isCurrent ? "active" : ""}
            onClick={() => onSelect(t.id)}
          >
            {t.name}
          </button>
        );
      })}
    </nav>
  );
}
